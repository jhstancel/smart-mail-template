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
# Render template
    env = _env()

    def _normalize_body_path(p: str) -> str:
        """Strip leading 'templates/' so Jinja finds files under its root."""
        if p and p.startswith("templates/"):
            return p[len("templates/"):]
        return p

    # Pull path (+subject) from schema if available; fallback to <intent>.j2
    schema_entry = SCHEMA.get(intent, {})
    tpl_info = schema_entry.get("template") or {}
    body_path = tpl_info.get("bodyPath")
    template_name = _normalize_body_path(body_path) if body_path else f"{intent}.j2"

    try:
        tpl = env.get_template(template_name)
    except TemplateNotFound:
        raise HTTPException(
            status_code=500,
            detail=f"Missing template: templates/{template_name}",
        )

    # Render body
    try:
        body = tpl.render(**fields)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Template render error for '{intent}': {e}",
        )

    # Render subject:
    # 1) Prefer YAML template.subject (rendered as Jinja with fields)
    # 2) Else try to read first "Subject: ..." line from the Jinja source
    # 3) Else fallback to the intent label
    subject_value = None
    yaml_subject = tpl_info.get("subject")
    if yaml_subject:
        try:
            subject_value = env.from_string(yaml_subject).render(**fields)
        except Exception:
            subject_value = yaml_subject

    if not subject_value:
        try:
            src, _, _ = env.loader.get_source(env, template_name)
            for line in src.splitlines():
                s = line.strip()
                if s.startswith("Subject:"):
                    subject_raw = s.split("Subject:", 1)[1].strip()
                    subject_value = env.from_string(subject_raw).render(**fields)
                    break
        except Exception:
            pass

    if not subject_value:
        subject_value = schema_entry.get("label") or intent

    # Clean up body & add polite closing if absent
    body = _strip_subject_line(body)
    low = body.lower()
    if not any(k in low for k in ("thank you", "thanks", "appreciate")):
        body = body.rstrip() + "\n\nThank you.\n"

    # Subject: prefer schema label, else intent name
    subject = _label_for(intent)


    return GenerateResp(subject=subject, body=body, missing=missing)


# ===== Predict / Auto-detect endpoint (keyword scoring) =====
from typing import List as _List, Optional as _Optional
from pydantic import BaseModel as _BM

# Try to use generated rules if available; fall back to naive matching
try:
    # expected structure: RULES = {"intent_name": {"keywords": ["...","..."], "threshold": 0.0}}
    from app.autodetect_rules_generated import RULES as _GEN_RULES
except Exception:
    _GEN_RULES = {}

# Use schema to list valid intents
try:
    from app.schema_generated import SCHEMA as _GEN_SCHEMA
except Exception:
    _GEN_SCHEMA = {}

class _PredictIn(_BM):
    # UI may send either {text} OR {to,subject,body_hint}
    text: _Optional[str] = None
    to: _Optional[str] = None
    subject: _Optional[str] = None
    body_hint: _Optional[str] = None

class _TopKItem(_BM):
    label: str
    score: float

class _PredictOut(_BM):
    intent: str
    confidence: float
    top_k: _List[_TopKItem] = []
    message: str = ""

def _tok(s: str) -> _List[str]:
    import re as _re
    return _re.findall(r"[a-z0-9]+", (s or "").lower())

def _score_with_rules(text: str):
    """Return list[(intent, score)] from generated keyword rules (if present)."""
    if not _GEN_RULES:
        return []
    toks = set(_tok(text))
    scored = []
    for intent, rule in _GEN_RULES.items():
        kws = rule.get("keywords") or rule.get("kw") or []
        hits = sum(1 for k in kws if k.lower() in toks)
        scored.append((intent, float(hits)))
    total = sum(s for _, s in scored) or 1.0
    scored = [(i, s / total) for i, s in scored]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored

def _score_naive(text: str):
    """Fallback: score by presence of intent words in text."""
    toks = set(_tok(text))
    intents = list(_GEN_SCHEMA.keys()) or [
        "delay_notice","followup","invoice_payment","invoice_po_followup",
        "order_confirmation","order_request","packing_slip_docs","qb_order",
        "quote_request","shipment_update","tax_exemption","auto_detect"
    ]
    scored = []
    for intent in intents:
        parts = [p for p in intent.replace("/", "_").replace("-", "_").split("_") if p]
        hits = sum(1 for p in parts if p in toks)
        scored.append((intent, float(hits)))
    total = sum(s for _, s in scored) or 1.0
    scored = [(i, s / total) for i, s in scored]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored

@app.post("/predict", response_model=_PredictOut)
def predict(body: _PredictIn):
    # unify payload to a single text blob
    text = (body.text or "").strip()
    if not text:
        text = " ".join(filter(None, [body.subject, body.body_hint, body.to])).strip()

    if not text:
        return _PredictOut(intent="", confidence=0.0, top_k=[], message="Empty input")

    scored = _score_with_rules(text) or _score_naive(text)

    top_k = [_TopKItem(label=i, score=float(s)) for i, s in scored[:5]]
    best_intent, best_score = scored[0] if scored else ("", 0.0)

    # never return auto_detect as the prediction itself
    if best_intent == "auto_detect" and len(scored) > 1:
        best_intent, best_score = scored[1]

    return _PredictOut(
        intent=best_intent,
        confidence=float(best_score),
        top_k=top_k,
        message=""
    )
# ===== end /predict =====

    return GenerateResp(subject=subject, body=body, missing=missing)
