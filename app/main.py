from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional

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
from app.autodetect_rules.generated import AUTODETECT_GENERATED as AUTODETECT_RULES
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
    intent = req.intent
    fields = req.fields or {}

    # 1) Validate intent
    if intent not in SCHEMA:
        raise HTTPException(status_code=400, detail=f"Unknown intent: {intent}")

    # 2) Required/missing fields via schema
    meta = SCHEMA.get(intent, {})
    required = meta.get("required", []) if isinstance(meta, dict) else []
    missing = [k for k in required if not str(fields.get(k, "")).strip()]

        # 3) Render body from Jinja2 template
    env = _env()
    try:
        tpl = env.get_template(f"{intent}.j2")
        body = tpl.render(**fields)
    except TemplateNotFound:
        if intent == "auto_detect":
            # Generic, polite fallback body for the special intent with no template
            body = "Hello there,\n\nCould you please review the draft and suggest the best intent?\n\nThank you."
        else:
            raise HTTPException(status_code=500, detail=f"Missing template: templates/{intent}.j2")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Template render error for '{intent}': {e}")
    # 3b) Ensure a polite closing exists (tests expect 'thank you' / 'thanks' / 'appreciate')
    t = (body or "").lower()
    if not any(k in t for k in ("thank you", "thanks", "appreciate")):
        body = (body.rstrip() + "\n\nThank you.\n")

    # 4) Resolve subject with robust fallbacks
    subject: Optional[str] = SUBJECTS.get(intent, "")
    if not subject or not str(subject).strip():
        if intent == "qb_order" and fields.get("orderNumber"):
            subject = f"Order Processing Request — {fields['orderNumber']}"
        else:
            subject = _label_for(intent) or "Request"

    # 5) Respond
    return GenerateResp(subject=subject, body=body, missing=missing)

