from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Any, List, Tuple

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import BaseModel, Field

from app.preprocess import clean_subject_body





# --- resilient imports so uvicorn/WatchFiles find modules both in package and script modes ---
try:
    # Prefer package-relative when app is a proper package
    from .schema import SCHEMA  # type: ignore
except Exception:
    # Fallback to absolute if running in a context where relative fails
    from app.schema import SCHEMA  # type: ignore

try:
    from .intents_registry import INTENTS_META  # type: ignore
except Exception:
    from app.intents_registry import INTENTS_META  # type: ignore
# --- end resilient imports ---



# --------------------------------------------------------------------------------------
# Utility helpers
# --------------------------------------------------------------------------------------
def softmax(values: np.ndarray) -> np.ndarray:
    values = values - np.max(values)
    exp_values = np.exp(values)
    return exp_values / (np.sum(exp_values) + 1e-9)


def normalize_probs(probabilities: Dict[str, float]) -> Dict[str, float]:
    total = sum(probabilities.values())
    if total <= 0:
        return {}
    return {key: value / total for key, value in probabilities.items()}


def split_subject_body(rendered: str) -> Tuple[str, str]:
    """Split the first 'Subject:' line from a rendered Jinja2 template."""
    lines = [line.rstrip() for line in rendered.splitlines()]
    if lines and lines[0].lower().startswith("subject:"):
        subject = lines[0].split(":", 1)[1].strip()
        body = "\n".join(lines[1:]).lstrip()
        return subject, body
    return "", rendered.strip()


# --------------------------------------------------------------------------------------
# App setup
# --------------------------------------------------------------------------------------
from .schema import SCHEMA  # ensure SCHEMA has required fields per intent
from .intents_registry import INTENTS_META

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten as needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount UI directory if it exists
ui_directory = Path(__file__).resolve().parent.parent / "ui"
if ui_directory.exists():
    app.mount("/ui", StaticFiles(directory=str(ui_directory), html=True), name="ui")


@app.get("/intents")
def list_intents():
    out = []
    for item in INTENTS_META:
        name = item.get("name")
        schema_required = []
        try:
            schema_required = (SCHEMA.get(name, {}) or {}).get("required", [])
        except Exception:
            schema_required = []

        out.append({
            "name": name,
            "label": item.get("label") or name,
            "description": item.get("description") or "",
            "required": schema_required,
            # pass-through (optional)
            "order": item.get("order", 1_000_000),  # large default so unspecified appear after numbered
            "hidden": bool(item.get("hidden", False)),
        })
    return out




# --------------------------------------------------------------------------------------
# Paths and configuration
# --------------------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = ROOT / "model_artifacts"
CONFIGS = ROOT / "configs"
TEMPLATES = ROOT / "templates"

# Default thresholds (can be overwritten by config)
CONFIDENCE_THRESHOLD = 0.65
LOW_CONFIDENCE_THRESHOLD = 0.45
FALLBACK_ENABLED = True

# --------------------------------------------------------------------------------------
# Jinja / Config loading
# --------------------------------------------------------------------------------------
jinja_env = Environment(
    loader=FileSystemLoader(str(TEMPLATES)),
    autoescape=select_autoescape(enabled_extensions=("j2",)),
)

with open(CONFIGS / "intents.json", "r") as file:
    INTENTS: Dict[str, Dict[str, Any]] = json.load(file)

with open(CONFIGS / "rules.json", "r") as file:
    RULES: Dict[str, List[str] | Dict[str, Any]] = json.load(file)

autodetect_settings = RULES.get("_autodetect", {})
CONFIDENCE_THRESHOLD = float(autodetect_settings.get("threshold", CONFIDENCE_THRESHOLD))
LOW_CONFIDENCE_THRESHOLD = float(
    autodetect_settings.get("low_threshold", LOW_CONFIDENCE_THRESHOLD)
)
FALLBACK_ENABLED = bool(autodetect_settings.get("fallback", FALLBACK_ENABLED))


# --------------------------------------------------------------------------------------
# Load artifacts
# --------------------------------------------------------------------------------------
def optional_path(path: Path) -> Path | None:
    return path if path.exists() else None


VEC_PATH = optional_path(ARTIFACTS / "vectorizer.pkl")
CLF_PATH = optional_path(ARTIFACTS / "clf.pkl")
PRIOR_RECIPIENT_PATH = optional_path(ARTIFACTS / "recipient_prior.pkl")
PRIOR_DOMAIN_PATH = optional_path(ARTIFACTS / "domain_prior.pkl")

print("[DEBUG] Loading artifacts from:", ARTIFACTS.resolve())
vectorizer = joblib.load(VEC_PATH) if VEC_PATH else None
classifier = joblib.load(CLF_PATH) if CLF_PATH else None
prior_recipient: Dict[str, Dict[str, float]] = (
    joblib.load(PRIOR_RECIPIENT_PATH) if PRIOR_RECIPIENT_PATH else {}
)
prior_domain: Dict[str, Dict[str, float]] = (
    joblib.load(PRIOR_DOMAIN_PATH) if PRIOR_DOMAIN_PATH else {}
)

if classifier is not None:
    try:
        _ = classifier.classes_
    except Exception:
        raise RuntimeError("Classifier missing classes_ attribute")


# --------------------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------------------
class PredictReq(BaseModel):
    to: str = Field(..., description="Recipient email, e.g. buyer@vendor.com")
    subject: str = ""
    body_hint: str = ""


class PredictResp(BaseModel):
    intent: str
    confidence: float
    top_k: List[Tuple[str, float]]
    auto_suggest: bool
    threshold: float
    message: str


class GenerateReq(BaseModel):
    intent: str
    fields: Dict[str, Any] = {}


class GenerateResp(BaseModel):
    subject: str
    body: str
    missing: List[str]


# --------------------------------------------------------------------------------------
# Health / schema
# --------------------------------------------------------------------------------------
@app.get("/health")
def health():
    model_loaded = bool(classifier is not None and vectorizer is not None)
    model_classes = list(getattr(classifier, "classes_", [])) if model_loaded else []
    return {
        "ok": True,
        "model_loaded": model_loaded,
        "model_classes": model_classes,
        "artifacts_path": str(ARTIFACTS.resolve()),
        "confidence_threshold": CONFIDENCE_THRESHOLD,
    }


@app.get("/schema")
def schema():
    """Expose intents.json so a UI can render required fields per intent."""
    return INTENTS


# --------------------------------------------------------------------------------------
# Predict (Auto-detect intent)
# --------------------------------------------------------------------------------------
@app.post("/predict", response_model=PredictResp)
def predict(req: PredictReq):
    subject_clean, body_clean = clean_subject_body(
        req.subject or "", req.body_hint or ""
    )
    text = f"{subject_clean} {body_clean}".strip()

    # Model probabilities
    model_probs: Dict[str, float] = {}
    if vectorizer is not None and classifier is not None and text:
        features = vectorizer.transform([text])
        if hasattr(classifier, "predict_proba"):
            probabilities = classifier.predict_proba(features).ravel()
        else:
            decision_values = classifier.decision_function(features).ravel()
            probabilities = softmax(decision_values)
        labels = classifier.classes_
        model_probs = {
            label_name: float(prob) for label_name, prob in zip(labels, probabilities)
        }

    # Recipient/domain priors
    recipient = (req.to or "").lower()
    recipient_probs = normalize_probs(prior_recipient.get(recipient, {}))
    domain_probs: Dict[str, float] = {}
    if not recipient_probs and "@" in recipient:
        domain = recipient.split("@", 1)[1]
        domain_probs = normalize_probs(prior_domain.get(domain, {}))

    # Weighting
    alpha = 0.7 if model_probs else 0.0
    beta = 0.2 if (not recipient_probs and domain_probs) else 0.0
    gamma = max(0.0, 1.0 - alpha - beta)

    all_intents = (
        set(INTENTS.keys())
        | set(model_probs.keys())
        | set(recipient_probs.keys())
        | set(domain_probs.keys())
    )

    combined_scores: List[Tuple[str, float]] = []
    for intent_name in all_intents:
        p_model = model_probs.get(intent_name, 0.0)
        p_rec = recipient_probs.get(intent_name, 0.0)
        p_dom = domain_probs.get(intent_name, 0.0)
        total_score = alpha * p_model + gamma * p_rec + beta * p_dom
        combined_scores.append((intent_name, float(total_score)))

    combined_scores.sort(key=lambda item: item[1], reverse=True)
    top_intent, top_score = ("", 0.0)
    if combined_scores:
        top_intent, top_score = combined_scores[0]

    # Keyword fallback
    if (not top_intent or top_score < CONFIDENCE_THRESHOLD) and FALLBACK_ENABLED:
        text_lower = text.lower()
        for intent_name, keywords in RULES.items():
            if isinstance(keywords, list) and not intent_name.startswith("_"):
                if any(keyword.lower() in text_lower for keyword in keywords):
                    top_intent = intent_name
                    top_score = max(top_score, CONFIDENCE_THRESHOLD)
                    break

    auto_suggest = bool(top_score >= CONFIDENCE_THRESHOLD)
    if top_score < LOW_CONFIDENCE_THRESHOLD:
        message = "Low confidence — choose from top_k or provide more context."
    elif not auto_suggest:
        message = "Not confident enough to auto-suggest — confirm intent from top_k."
    else:
        message = "High confidence — using predicted intent."

    return {
        "intent": top_intent,
        "confidence": float(top_score),
        "top_k": [
            (intent_name, float(score)) for intent_name, score in combined_scores[:5]
        ],
        "auto_suggest": auto_suggest,
        "threshold": CONFIDENCE_THRESHOLD,
        "message": message,
    }


@app.get("/intents")
def list_intents() -> List[Dict[str, Any]]:
    """
    Returns the available intents with a name, label, description,
    and any `required` fields found in SCHEMA (if present).
    """
    enriched = []
    for item in INTENTS_META:
        name = item.get("name")
        schema_entry = SCHEMA.get(name, {}) if isinstance(SCHEMA, dict) else {}
        required = schema_entry.get("required", [])
        enriched.append(
            {
                "name": name,
                "label": item.get("label", name),
                "description": item.get("description", ""),
                "required": required,
            }
        )
    return enriched


# --------------------------------------------------------------------------------------
# Generate
# --------------------------------------------------------------------------------------
@app.post("/generate", response_model=GenerateResp)
def generate(req: GenerateReq):
    if req.intent not in INTENTS:
        raise HTTPException(status_code=400, detail=f"Unknown intent: {req.intent}")

    metadata = INTENTS[req.intent]
    template_name = metadata["template"]
    required_fields = metadata.get("required", [])
    missing_fields = [
        field for field in required_fields if not str(req.fields.get(field, "")).strip()
    ]
    template = jinja_env.get_template(template_name)
    rendered = template.render(**req.fields)
    subject, body = split_subject_body(rendered)

    return {"subject": subject, "body": body, "missing": missing_fields}
