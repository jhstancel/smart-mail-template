from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from jinja2 import Environment, FileSystemLoader, select_autoescape
from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse

# --------------------------------------------------------------------------------------
# App instance (must be named "app" for `uvicorn app.main:app`)
# --------------------------------------------------------------------------------------
app = FastAPI(title="Smart Mail Template API")

# --------------------------------------------------------------------------------------
# Paths: templates/ and ui/
# --------------------------------------------------------------------------------------
# main.py is at repo/app/main.py  ->  project root is parent of app/
ROOT_DIR = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = (ROOT_DIR / "templates").resolve()
UI_DIR = (ROOT_DIR / "ui").resolve()

if not TEMPLATES_DIR.exists():
    print(f"[WARN] templates directory not found at: {TEMPLATES_DIR}")
if not UI_DIR.exists():
    print(f"[WARN] ui directory not found at: {UI_DIR}")

# --------------------------------------------------------------------------------------
# Static UI: serve /ui/ -> ui/index.html, and redirect / -> /ui/
# --------------------------------------------------------------------------------------
app.mount("/ui", StaticFiles(directory=str(UI_DIR), html=True), name="ui")


@app.get("/")
def root() -> RedirectResponse:
    return RedirectResponse(url="/ui/")


# --------------------------------------------------------------------------------------
# Safe imports for registry/schema
# --------------------------------------------------------------------------------------
# If these fail, we keep running with empty defaults (UI will show fewer intents, but server boots)
try:
    from .intents_registry import INTENTS_META  # type: ignore
except Exception as e:  # noqa: BLE001
    print(f"[WARN] Failed to import intents_registry: {e}")
    INTENTS_META: List[Dict[str, Any]] = []

try:
    from .schema import SCHEMA  # type: ignore
except Exception as e:  # noqa: BLE001
    print(f"[WARN] Failed to import schema: {e}")
    SCHEMA: Dict[str, Dict[str, Any]] = {}

# --------------------------------------------------------------------------------------
# Templates (auto-discovery; robust if folder missing)
# --------------------------------------------------------------------------------------
# main.py is at repo/app/main.py -> templates live at repo/templates
TEMPLATES_DIR = (Path(__file__).resolve().parent.parent / "templates").resolve()

if not TEMPLATES_DIR.exists():
    print(f"[WARN] templates directory not found at: {TEMPLATES_DIR}")

env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["j2", "html", "xml"]),
)


def list_available_templates() -> Set[str]:
    """Return stems of all available .j2 templates (robust if folder missing)."""
    if not TEMPLATES_DIR.exists():
        return set()
    return {p.stem for p in TEMPLATES_DIR.glob("*.j2")}


# UI intent name -> template stem (without .j2)
ALIASES: Dict[str, str] = {
    "tax_exempt_certificate": "tax_exemption",
    # Add more aliases here if UI names differ from file stems:
    # "invoice_followup": "invoice_po_followup",
}


def canonicalize_intent(name: str) -> str:
    return ALIASES.get(name, name).strip() if name else name


def split_subject_body(rendered: str) -> Tuple[str, str]:
    """
    If first line starts with 'Subject:', treat it as subject and the rest as body.
    Otherwise subject='', body=rendered unchanged.
    """
    first, _, rest = rendered.partition("\n")
    if first.lower().startswith("subject:"):
        subject = first.split(":", 1)[1].strip()
        body = rest.lstrip()
        return subject, body
    return "", rendered


# UI (static) directory
UI_DIR = (Path(__file__).resolve().parent.parent / "ui").resolve()
if not UI_DIR.exists():
    print(f"[WARN] ui directory not found at: {UI_DIR}")


# --------------------------------------------------------------------------------------
# Models
# --------------------------------------------------------------------------------------
class PredictReq(BaseModel):
    to: Optional[str] = None
    subject: Optional[str] = None
    body_hint: Optional[str] = Field(None, alias="body_hint")


class PredictResp(BaseModel):
    intent: Optional[str] = None
    confidence: float = 0.0
    top_k: List[Tuple[str, float]] = []
    auto_suggest: bool = False
    threshold: float = 0.55
    message: str = "Prediction disabled."


class GenerateReq(BaseModel):
    intent: str
    fields: Dict[str, Any] = Field(default_factory=dict)


class GenerateResp(BaseModel):
    subject: str
    body: str
    missing: List[str] = Field(default_factory=list)


# --------------------------------------------------------------------------------------
# Routes
# --------------------------------------------------------------------------------------
@app.get("/health")
def health() -> Dict[str, Any]:
    """
    Test-friendly health payload:
      - status: "ok"
      - intents_list: names from INTENTS_META filtered to those with templates (plus auto_detect)
    """
    available = list_available_templates()
    names: List[str] = []
    for item in INTENTS_META:
        raw = (item.get("name") or "").strip()
        if not raw:
            continue
        canonical = canonicalize_intent(raw)
        if raw == "auto_detect" or canonical in available:
            names.append(raw)
    return {"status": "ok", "intents_list": names}


@app.get("/schema")
def get_schema() -> Dict[str, Any]:
    """
    Return SCHEMA only for intents that can be rendered (exclude auto_detect):
      • include intents that have a matching template on disk (after aliasing)
      • exclude 'auto_detect' so tests don't try to /generate it
    """
    available = list_available_templates()
    filtered: Dict[str, Any] = {}
    for name, entry in (SCHEMA or {}).items():
        raw = (name or "").strip()
        if not raw or raw == "auto_detect":
            continue
        canonical = canonicalize_intent(raw)
        if canonical in available:
            filtered[raw] = entry
    return filtered


@app.get("/intents")
def get_intents() -> List[Dict[str, Any]]:
    """
    Return UI intents:
      • include only intents that have a matching template on disk (by name or alias)
      • always include 'auto_detect' if present in INTENTS_META
      • merge required fields from SCHEMA (by raw name)
    """
    available = list_available_templates()
    out: List[Dict[str, Any]] = []

    for item in INTENTS_META:
        raw = (item.get("name") or "").strip()
        if not raw:
            continue

        canonical = canonicalize_intent(raw)

        # allow auto_detect through; otherwise require a template file
        if raw != "auto_detect" and canonical not in available:
            # silently skip intents that don't have a template on disk
            continue

        schema_entry = SCHEMA.get(raw, {}) if isinstance(SCHEMA, dict) else {}
        required = list(schema_entry.get("required", []))

        out.append(
            {
                "name": raw,
                "label": item.get("label", raw),
                "description": item.get("description", ""),
                "required": required,
                "order": item.get("order"),
                "hidden": item.get("hidden", False),
            }
        )

    return out


@app.post("/predict", response_model=PredictResp)
def predict(_: PredictReq) -> PredictResp:
    """
    Minimal placeholder to keep the UI happy.
    Replace this with your real intent classifier when ready.
    """
    return PredictResp()


@app.post("/generate", response_model=GenerateResp)
def generate(req: GenerateReq) -> GenerateResp:
    """
    Render an intent template with provided fields.

    - Intent is canonicalized (aliases supported).
    - Verifies the template exists.
    - 'missing' is computed from SCHEMA[raw]['required'] (front-end can hide it from workers).
    """
    raw_name = (req.intent or "").strip()
    if not raw_name:
        raise HTTPException(status_code=400, detail="Missing 'intent'")

    canonical = canonicalize_intent(raw_name)
    available = list_available_templates()
    if canonical not in available:
        raise HTTPException(status_code=400, detail=f"Unknown intent: {raw_name}")

    # Compute missing from SCHEMA using the *raw* name
    schema_entry = SCHEMA.get(raw_name, {}) if isinstance(SCHEMA, dict) else {}
    required_fields: List[str] = list(schema_entry.get("required", []))
    missing: List[str] = [
        k for k in required_fields if not str(req.fields.get(k, "")).strip()
    ]

    template = env.get_template(f"{canonical}.j2")
    rendered = template.render(**(req.fields or {}))
    subject, body = split_subject_body(rendered)

    return GenerateResp(subject=subject, body=body, missing=missing)
