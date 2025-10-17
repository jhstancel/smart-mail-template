from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional, Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from jinja2 import Environment, FileSystemLoader, Undefined, TemplateNotFound

app = FastAPI(title="Smart Mail Template API")

# Try to mount static UI if present (safe no-op otherwise)
try:
    from fastapi.staticfiles import StaticFiles
    UI_DIR = Path(__file__).resolve().parent.parent / "ui"
    if UI_DIR.exists():
        app.mount("/ui", StaticFiles(directory=str(UI_DIR), html=True), name="ui")
except Exception:
    pass






# ===== Schema & rules loading (final) =====
from app.schema_generated import SCHEMA_GENERATED as SCHEMA
from app.autodetect_rules_generated import AUTODETECT_GENERATED as AUTODETECT_RULES
INTENTS_META: list = []
SUBJECTS: dict = {}
print("[info] Loaded generated schema and autodetect rules (legacy system removed)")
# ===== End of schema block =====







# ---------------- Models ----------------
class GenerateReq(BaseModel):
    intent: str
    fields: Dict[str, str] = {}

class GenerateResp(BaseModel):
    subject: str
    body: str
    missing: List[str] = []

# ---------------- Helpers ----------------
def _label_for(intent: str) -> str:
    for m in INTENTS_META:
        if m.get("name") == intent:
            return m.get("label") or intent
    return intent

def _env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(Path(__file__).resolve().parent.parent / "templates")),
        autoescape=False,
        undefined=Undefined,  # allow missing optional vars to render as empty strings
        trim_blocks=True,
        lstrip_blocks=True,
    )

# ---------------- Routes ----------------

from fastapi.responses import JSONResponse

@app.get("/schema")
def get_schema():
    # Return the generated schema dict to the UI
    return JSONResponse(SCHEMA)

@app.get("/intents")
def list_intents():
    # Return compact list for cards, including auto_detect
    items = [{"id": iid, "label": meta.get("label", iid)} for iid, meta in SCHEMA.items()]
    # Put Auto Detect first, then alpha by label
    def sort_key(x):
        return (0 if x["id"] == "auto_detect" else 1, x["label"].lower())
    items.sort(key=sort_key)
    return JSONResponse(items)

@app.get("/health")
def health():
    return {
        "ok": True,
        "intents_list": [m.get("name") for m in INTENTS_META] if INTENTS_META else list(SCHEMA.keys()),
        "templates_dir": str(Path(__file__).resolve().parent.parent / "templates"),
    }

@app.get("/schema")
def get_schema():
    return SCHEMA
@app.get("/intents")
def list_intents():
    return INTENTS_META

@app.post("/generate", response_model=GenerateResp)
def generate(req: GenerateReq) -> GenerateResp:
    intent = (req.intent or "").strip()
    fields: Dict[str, Any] = dict(req.fields or {})

    # 1) Validate intent
    if intent not in SCHEMA:
        raise HTTPException(status_code=400, detail=f"Unknown intent: {intent}")

    # 2) Normalize special fields (Order Request → parts)
    def _normalize_parts(v: Any) -> list[dict]:
        """
        Accepts:
          - list[dict] like [{"partNumber":"PN-10423","quantity":"2"}, ...]
          - JSON string for that list
          - plain text lines like 'PN-10423,2' or 'PN-10423 x2'
          - 2-column TSV/CSV pasted data
        Returns only complete rows with both keys.
        """
        import json, re
        rows: list[dict] = []

        if isinstance(v, list):
            rows = v
        elif isinstance(v, str):
            s = v.strip()
            if not s:
                rows = []
            else:
                # Try JSON first
                try:
                    parsed = json.loads(s)
                    if isinstance(parsed, list):
                        rows = parsed
                    else:
                        rows = []
                except Exception:
                    # Fallback: line parser
                    lines = [ln.strip() for ln in s.splitlines() if ln.strip()]
                    for ln in lines:
                        # Try CSV/TSV 2-col
                        if "\t" in ln:
                            a, *rest = ln.split("\t")
                            b = rest[0] if rest else ""
                            pn, qty = a.strip(), b.strip()
                        elif "," in ln:
                            a, *rest = ln.split(",")
                            b = rest[0] if rest else ""
                            pn, qty = a.strip(), b.strip()
                        else:
                            # Look for "PN xQTY" or "PN QTY"
                            m = re.search(r"^\s*(.+?)\s*(?:x|\s)\s*(\d+)\s*$", ln, re.I)
                            if m:
                                pn, qty = m.group(1).strip(), m.group(2).strip()
                            else:
                                pn, qty = ln, ""
                        if pn and qty:
                            rows.append({"partNumber": pn, "quantity": qty})
        else:
            rows = []

        # Clean/gate: keep only complete rows with both values
        good = []
        for r in rows:
            pn = str(r.get("partNumber", "")).strip()
            qty = str(r.get("quantity", "")).strip()
            if pn and qty:
                good.append({"partNumber": pn, "quantity": qty})
        return good

    if intent == "order_request":
        parts_in = fields.get("parts", "")
        fields["parts"] = _normalize_parts(parts_in)

    # 3) Required/missing fields via schema (treat lists/structured properly)
    meta = SCHEMA.get(intent, {}) if isinstance(SCHEMA.get(intent, {}), dict) else {}
    required = meta.get("required", []) if isinstance(meta, dict) else []

    missing: list[str] = []
    for k in required:
        val = fields.get(k, None)
        if k == "parts":
            if not isinstance(val, list) or len(val) == 0:
                missing.append(k)
        else:
            # strings/other scalars
            s = "" if val is None else str(val)
            if not s.strip():
                missing.append(k)

    if missing:
        raise HTTPException(status_code=400, detail="Missing required fields", )

    # 4) Render from Jinja2 template
    env = _env()
    try:
        tpl = env.get_template(f"{intent}.j2")
        body = tpl.render(**fields)
    except TemplateNotFound:
        if intent == "auto_detect":
            body = "Hello there,\n\nCould you please review the draft and suggest the best intent?\n\nThank you."
        else:
            raise HTTPException(status_code=500, detail=f"Missing template for intent '{intent}'")

    # 5) Subject: use mapping if present, otherwise a sane default
    subject: str = ""
    try:
        subject = SUBJECTS.get(intent, "")  # if your file defines SUBJECTS
    except NameError:
        subject = ""
    if not subject.strip():
        subject = "Order Request" if intent == "order_request" else (_label_for(intent) or "Request")

    return GenerateResp(subject=subject, body=body, missing=[])

