from __future__ import annotations

from pathlib import Path
from typing import Dict, List, Optional, Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
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
    fields: Dict[str, Any] = Field(default_factory=dict)

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


@app.post("/generate", response_model=GenerateResp)
def generate(req: GenerateReq) -> GenerateResp:
    # --- inputs ---
    intent = (req.intent or "").strip()
    fields = dict(req.fields or {})

    # --- validate intent exists ---
    if intent not in SCHEMA:
        raise HTTPException(status_code=400, detail=f"Unknown intent '{intent}'")

    intent_schema = SCHEMA[intent]
    required = intent_schema.get("required", [])

    # --- validate required fields present & truthy ---
    missing = [k for k in required if not fields.get(k)]
    if missing:
        raise HTTPException(status_code=422, detail={"missing": missing})

    # --- normalize dates globally: YYYY-MM-DD -> MM-DD ---
    for k, v in list(fields.items()):
        if isinstance(v, str) and len(v) == 10 and v[4] == "-" and v[7] == "-":
            fields[k] = v[5:]

    # --- jinja environment ---
    env = _env()  # must be the same Environment used everywhere

    # --- subject template (from schema if provided) ---
    template_meta = intent_schema.get("template") or {}
    subject_tpl_str = template_meta.get("subject")
    if subject_tpl_str:
        subject = env.from_string(subject_tpl_str).render(**fields)
    else:
        # sensible fallback if subject not defined in schema
        subject = intent_schema.get("label") or intent.replace("_", " ").title()

    # --- body template path: prefer schema bodyPath, else {intent}.j2 ---
    body_path = template_meta.get("bodyPath") or f"{intent}.j2"
    # If schema used "templates/..." keep only the filename since loader roots at /templates
    if body_path.startswith("templates/"):
        body_path = body_path.split("/", 1)[1]

    try:
        tpl_body = env.get_template(body_path)
    except Exception as e:
        # final fallback to {intent}.j2
        tpl_body = env.get_template(f"{intent}.j2")

    body = tpl_body.render(**fields)

    return GenerateResp(subject=subject, body=body)








