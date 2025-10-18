# app/main.py
from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional, Any

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from jinja2 import Environment, FileSystemLoader, Undefined, TemplateNotFound

import json
import re

app = FastAPI(title="Smart Mail Template API")

# --- Static UI (best-effort) ---
try:
    from fastapi.staticfiles import StaticFiles
    UI_DIR = Path(__file__).resolve().parent.parent / "ui"
    if UI_DIR.exists():
        app.mount("/ui", StaticFiles(directory=str(UI_DIR), html=True), name="ui")
except Exception:
    pass

# --- Schema loading (import first, file fallback) ---
def _load_schema() -> Dict[str, Any]:
    try:
        # Preferred: generated Python module
        from app.schema_generated import SCHEMA_GENERATED as SCHEMA  # type: ignore
        return dict(SCHEMA)
    except Exception:
        pass
    # Fallback: generated JSON (either /public/ or repo root mirror)
    candidates = [
        Path(__file__).resolve().parent.parent / "public" / "schema.generated.json",
        Path(__file__).resolve().parent.parent / "schema.generated.json",
    ]
    for p in candidates:
        try:
            if p.exists():
                return json.loads(p.read_text())
        except Exception:
            continue
    return {}

SCHEMA: Dict[str, Any] = _load_schema()

# Build compact intent list for cards (id + label). Always include auto_detect if present.
def _intents_list() -> List[Dict[str, str]]:
    items = []
    for iid, meta in (SCHEMA or {}).items():
        label = ""
        if isinstance(meta, dict):
            label = (meta.get("label") or iid) if isinstance(meta.get("label"), str) else iid
        items.append({"id": iid, "label": label or iid})
    # Put Auto Detect first; then alphabetical by label
    def sort_key(x):
        return (0 if x["id"] == "auto_detect" else 1, x["label"].lower())
    items.sort(key=sort_key)
    return items

def _env() -> Environment:
    # templates/ should contain one file per intent, e.g., order_request.j2
    tdir = Path(__file__).resolve().parent.parent / "templates"
    return Environment(
        loader=FileSystemLoader(str(tdir)),
        autoescape=False,
        undefined=Undefined,   # missing optionals render as empty
        trim_blocks=True,
        lstrip_blocks=True,
    )

def _label_for(intent: str) -> str:
    meta = SCHEMA.get(intent) if isinstance(SCHEMA, dict) else None
    if isinstance(meta, dict):
        lab = meta.get("label")
        if isinstance(lab, str) and lab.strip():
            return lab
    return intent

# --- Models ---
class GenerateReq(BaseModel):
    intent: str
    fields: Dict[str, Any] = {}

class GenerateResp(BaseModel):
    subject: str
    body: str
    missing: List[str] = []

# --- Utilities ---
_DATE_RE_YMD = re.compile(r"^\s*(\d{4})-(\d{1,2})-(\d{1,2})\s*$")
_DATE_RE_MDY = re.compile(r"^\s*(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?\s*$")

def _shorten_date(val: str) -> str:
    """
    Strips the year from a date string in MM/DD/YYYY or YYYY-MM-DD format,
    returning only MM/DD. Used wherever the UI or schema wants shorter dates.
    """
    if not isinstance(val, str):
        return ""
    val = val.strip()
    if not val:
        return ""
    # Convert ISO -> MM/DD first
    m = _DATE_RE_YMD.match(val)
    if m:
        _, mo, d = m.groups()
        return f"{int(mo):02d}/{int(d):02d}"
    # MM/DD/YYYY -> MM/DD
    m = _DATE_RE_MDY.match(val)
    if m:
        mo, d, _ = m.groups()
        return f"{int(mo):02d}/{int(d):02d}"
    return val

def _normalize_date(val: str, shorten: bool = True) -> str:
    """
    Accepts 'yyyy-mm-dd', 'mm/dd', or 'mm/dd/yyyy'.
    Converts ISO -> mm/dd/yyyy and, if shorten=True, strips the year -> mm/dd.
    """
    if not isinstance(val, str):
        return ""
    s = val.strip()
    if not s:
        return ""
    m = _DATE_RE_YMD.match(s)
    if m:
        y, mo, d = m.groups()
        return f"{int(mo):02d}/{int(d):02d}" if shorten else f"{int(mo):02d}/{int(d):02d}/{int(y):04d}"
    m = _DATE_RE_MDY.match(s)
    if m:
        mo, d, y = m.groups()
        if shorten:
            return f"{int(mo):02d}/{int(d):02d}"
        if y and len(y) == 2:
            y = f"20{y}"
        return f"{int(mo):02d}/{int(d):02d}/{int(y):04d}" if y else f"{int(mo):02d}/{int(d):02d}"
    return s

def _coerce_parts(v: Any) -> List[Dict[str, str]]:
    """
    Accepts:
      - list of {partNumber, quantity}
      - JSON string of the above
      - multiline text (defaults qty=1 each line)
    """
    if isinstance(v, list):
        out = []
        for row in v:
            if isinstance(row, dict):
                pn = str(row.get("partNumber", "")).strip()
                qty = str(row.get("quantity", "")).strip() or "1"
                if pn:
                    out.append({"partNumber": pn, "quantity": qty})
        return out

    if isinstance(v, str):
        s = v.strip()
        if not s:
            return []
        # Try JSON first
        try:
            js = json.loads(s)
            return _coerce_parts(js)
        except Exception:
            pass
        # Fallback: each line is a PN, qty=1
        lines = [ln.strip() for ln in s.replace("\r", "").split("\n") if ln.strip()]
        return [{"partNumber": ln, "quantity": "1"} for ln in lines]

    return []

def _strip_subject_line(body: str) -> str:
    # Remove a leading "Subject:" line if a template includes it
    if not isinstance(body, str):
        return ""
    return re.sub(r"^\s*subject\s*:\s*.*\n+", "", body, flags=re.IGNORECASE)

# --- Routes ---
@app.get("/schema")
def get_schema():
    return JSONResponse(SCHEMA)

@app.get("/intents")
def list_intents():
    return JSONResponse(_intents_list())

@app.get("/health")
def health():
    return {
        "ok": True,
        "intents": [x["id"] for x in _intents_list()],
        "templates_dir": str(Path(__file__).resolve().parent.parent / "templates"),
        "schema_keys": list(SCHEMA.keys()) if isinstance(SCHEMA, dict) else [],
    }

@app.post("/generate", response_model=GenerateResp)
def generate(req: GenerateReq) -> GenerateResp:
    intent = (req.intent or "").strip()
    if not intent:
        raise HTTPException(status_code=400, detail="Missing 'intent'.")

    if intent not in SCHEMA:
        # allow auto_detect to return a safe stub
        if intent == "auto_detect":
            return GenerateResp(
                subject="Draft",
                body="Hello,\n\nPlease review the draft and advise the best intent.\n\nThank you.",
                missing=[],
            )
        raise HTTPException(status_code=400, detail=f"Unknown intent: {intent}")

    fields = dict(req.fields or {})
    meta = SCHEMA.get(intent, {}) if isinstance(SCHEMA, dict) else {}
    required = meta.get("required", []) if isinstance(meta, dict) else []
    field_types = meta.get("fieldTypes", {}) if isinstance(meta, dict) else {}

    # Normalize date-like fields
    for k, t in field_types.items():
        if str(t).lower() == "date" and isinstance(fields.get(k), str):
            fields[k] = _normalize_date(fields.get(k) or "")

    # Normalize parts
    if "parts" in (fields.keys() | field_types.keys()):
        fields["parts"] = _coerce_parts(fields.get("parts", []))

    # Compute missing required (treat empty list/dict/blank as missing)
    def _is_missing(v: Any) -> bool:
        if isinstance(v, list):
            return len(v) == 0
        if isinstance(v, dict):
            return len(v) == 0
        return str(v or "").strip() == ""

    missing = [k for k in required if _is_missing(fields.get(k))]

    # Render template
    env = _env()
    try:
        tpl = env.get_template(f"{intent}.j2")
    except TemplateNotFound:
        # Don’t crash the whole app if a template file is missing
        raise HTTPException(status_code=500, detail=f"Missing template: templates/{intent}.j2")

    try:
        body = tpl.render(**fields)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template render error for '{intent}': {e}")

    # Clean up body & add polite closing if absent
    body = _strip_subject_line(body)
    low = body.lower()
    if not any(k in low for k in ("thank you", "thanks", "appreciate")):
        body = body.rstrip() + "\n\nThank you.\n"

    # Subject: prefer schema label, else intent name
    subject = _label_for(intent)

    return GenerateResp(subject=subject, body=body, missing=missing)

