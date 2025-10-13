from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from jinja2 import Environment, FileSystemLoader, select_autoescape

# --------------------------------------------------------------------------------------
# Local modules
# --------------------------------------------------------------------------------------
# INTENTS_META: list[dict] with keys like: name, label, description, order, hidden
# SCHEMA: { intent_name: { "required": [...], "optional": [...] } }
from .intents_registry import INTENTS_META  # type: ignore
from .schema import SCHEMA  # type: ignore

# --------------------------------------------------------------------------------------
# App
# --------------------------------------------------------------------------------------
app = FastAPI(title="Smart Mail Template API")

# --------------------------------------------------------------------------------------
# Templates (auto-discovery)
# --------------------------------------------------------------------------------------
TEMPLATES_DIR = (Path(__file__).resolve().parent.parent / "templates").resolve()

env = Environment(
    loader=FileSystemLoader(str(TEMPLATES_DIR)),
    autoescape=select_autoescape(["j2", "html", "xml"]),
)

def list_available_templates() -> Set[str]:
    """
    Returns the set of template 'stems' available, e.g. {'order_confirmation', 'tax_exemption'}
    for files like templates/order_confirmation.j2, templates/tax_exemption.j2.
    """
    return {p.stem for p in TEMPLATES_DIR.glob("*.j2")}

# UI intent name -> canonical template name (without .j2)
ALIASES: Dict[str, str] = {
    # keep this in sync as you rename things
    "tax_exempt_certificate": "tax_exemption",
    # add more aliases here if needed
}

def canonicalize_intent(name: str) -> str:
    """Map a UI name to the actual template stem."""
    if not name:
        return name
    return ALIASES.get(name, name)

def split_subject_body(rendered: str) -> Tuple[str, str]:
    """
    If first line starts with 'Subject:', treat it as subject and the rest as body.
    Otherwise subject='', body=rendered.
    """
    first, _, rest = rendered.partition("\n")
    if first.lower().startswith("subject:"):
        subject = first[len("Subject:"):].strip()
        body = rest.lstrip()
        return subject, body
    return "", rendered

# --------------------------------------------------------------------------------------
# Pydantic models
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
# Intents (only show ones that have templates, plus auto_detect)
# --------------------------------------------------------------------------------------
@app.get("/intents")
def get_intents() -> List[Dict[str, Any]]:
    """
    Returns available intents for the UI:
      - includes only those that have a matching .j2 template (by name or alias)
      - always includes 'auto_detect' if present in INTENTS_META
      - merges required fields from SCHEMA
    """
    available = list_available_templates()
    out: List[Dict[str, Any]] = []

    for item in INTENTS_META:
        raw = item.get("name", "")
        if not raw:
            continue
        canonical = canonicalize_intent(raw)

        # Allow 'auto_detect' to pass through; filter others to known templates
        if raw != "auto_detect" and canonical not in available:
            # silently skip intents with no template on disk
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

# --------------------------------------------------------------------------------------
# Predict (minimal, non-breaking placeholder)
# --------------------------------------------------------------------------------------
@app.post("/predict", response_model=PredictResp)
def predict(_: PredictReq) -> PredictResp:
    """
    Minimal placeholder so the UI never breaks. Replace with your real model as needed.
    """
    return PredictResp()

# --------------------------------------------------------------------------------------
# Generate
# --------------------------------------------------------------------------------------
@app.post("/generate", response_model=GenerateResp)
def generate(req: GenerateReq) -> GenerateResp:
    """
    Render an intent template with provided fields.

    - Intent is canonicalized (aliases supported).
    - We verify the template exists.
    - 'Missing' is computed from SCHEMA[req.intent]['required'] (UI can ignore this text).
    """
    name = (req.intent or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Missing 'intent'")

    canonical = canonicalize_intent(name)
    available = list_available_templates()

    if canonical not in available:
        # Tell the caller the *requested* (raw) name, not the canonical
        raise HTTPException(status_code=400, detail=f"Unknown intent: {name}")

    # Required fields are keyed by the *raw* name used in SCHEMA
    schema_entry = SCHEMA.get(name, {}) if isinstance(SCHEMA, dict) else {}
    required_fields: List[str] = list(schema_entry.get("required", []))

    missing_fields = [
        k for k in required_fields
        if not str(req.fields.get(k, "")).strip()
    ]

    template = env.get_template(f"{canonical}.j2")
    rendered = template.render(**(req.fields or {}))
    subject, body = split_subject_body(rendered)

    return GenerateResp(subject=subject, body=body, missing=missing_fields)

