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

# --------------------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "model_artifacts"              # project-level artifacts
CONFIGS = ROOT / "configs"
TEMPLATES = ROOT / "templates"
UI_DIR = ROOT / "ui"

# --------------------------------------------------------------------------------------
# Guardrail thresholds
# --------------------------------------------------------------------------------------
# If top prediction < this, we won't auto-suggest; we'll ask the user to confirm.
CONFIDENCE_THRESHOLD = 0.65
# If < this, we’ll explicitly warn that the model is guessing.
LOW_CONFIDENCE_THRESHOLD = 0.45

# --------------------------------------------------------------------------------------
# Jinja / Config
# --------------------------------------------------------------------------------------
env = Environment(
    loader=FileSystemLoader(str(TEMPLATES)),
    autoescape=select_autoescape(enabled_extensions=("j2",)),
)

with open(CONFIGS / "intents.json", "r") as f:
    INTENTS: Dict[str, Dict[str, Any]] = json.load(f)

# Resolve artifact files (optional = None)
def _maybe(p: Path) -> Path | None:
    return p if p.exists() else None

VEC_PATH = _maybe(ART / "vectorizer.pkl")
CLF_PATH = _maybe(ART / "clf.pkl")
PRIOR_RECIP_PATH = _maybe(ART / "recipient_prior.pkl")
PRIOR_DOMAIN_PATH = _maybe(ART / "domain_prior.pkl")

# Load artifacts
print("[DEBUG] Loading artifacts from:", ART.resolve())
vec = joblib.load(VEC_PATH) if VEC_PATH else None
clf = joblib.load(CLF_PATH) if CLF_PATH else None
prior_recipient: Dict[str, Dict[str, float]] = joblib.load(PRIOR_RECIP_PATH) if PRIOR_RECIP_PATH else {}
prior_domain: Dict[str, Dict[str, float]] = joblib.load(PRIOR_DOMAIN_PATH) if PRIOR_DOMAIN_PATH else {}

if clf is not None:
    try:
        print("[DEBUG] Model classes:", list(getattr(clf, "classes_", [])))
    except Exception as e:
        print("[DEBUG] Could not read model classes:", e)

# --------------------------------------------------------------------------------------
# Schemas
# --------------------------------------------------------------------------------------
class PredictReq(BaseModel):
    to: str = Field(..., description="Recipient email, e.g. buyer@vendor.com")
    subject: str = ""
    body_hint: str = ""  # optional context you might type

class PredictResp(BaseModel):
    intent: str
    confidence: float
    top_k: List[Tuple[str, float]]
    auto_suggest: bool
    threshold: float
    message: str

class GenerateReq(BaseModel):
    intent: str
    fields: Dict[str, Any]

class GenerateResp(BaseModel):
    subject: str
    body: str
    missing: List[str]

# --------------------------------------------------------------------------------------
# App
# --------------------------------------------------------------------------------------
app = FastAPI(title="ops-mail-studio", version="0.6.0")

# CORS (loose for local dev; tighten for deployment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static UI if present at /ui
if UI_DIR.is_dir():
    app.mount("/ui", StaticFiles(directory=str(UI_DIR), html=True), name="ui")

# --------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------
def softmax(z: np.ndarray) -> np.ndarray:
    z = z - np.max(z)
    e = np.exp(z)
    return e / e.sum()

def split_subject_body(rendered: str) -> Tuple[str, str]:
    lines = (rendered or "").strip().splitlines()
    if lines and lines[0].lower().startswith("subject:"):
        subject = lines[0].split(":", 1)[1].strip()
        body = "\n".join(lines[1:]).lstrip()
        return subject, body
    return "", (rendered or "").strip()

def normalize_probs(d: Dict[str, float]) -> Dict[str, float]:
    s = float(sum(d.values())) or 0.0
    return {k: v / s for k, v in d.items()} if s else {}

# --------------------------------------------------------------------------------------
# Endpoints
# --------------------------------------------------------------------------------------
@app.get("/health")
def health():
    model_classes = []
    try:
        model_classes = list(getattr(clf, "classes_", [])) if clf else []
    except Exception:
        model_classes = []
    return {
        "vectorizer_loaded": bool(vec),
        "classifier_loaded": bool(clf),
        "recipient_prior_loaded": bool(prior_recipient),
        "domain_prior_loaded": bool(prior_domain),
        "config_intents": list(INTENTS.keys()),  # what /generate supports
        "model_classes": model_classes,          # what /predict can output
        "artifacts_path": str(ART.resolve()),
        "confidence_threshold": CONFIDENCE_THRESHOLD,
    }

@app.get("/schema")
def schema():
    """Expose intents.json so a UI can render required fields per intent."""
    return INTENTS

@app.post("/predict", response_model=PredictResp)
def predict(req: PredictReq):
    # Clean subject/body_hint same as training
    subj_clean, body_clean = clean_subject_body(req.subject, req.body_hint, is_html=False)
    text = (subj_clean + " || " + body_clean).lower().strip()

    # Model probability (if artifacts exist and there is text)
    model_probs: Dict[str, float] = {}
    if vec and clf and text:
        X = vec.transform([text])
        if hasattr(clf, "decision_function"):
            z = clf.decision_function(X).ravel()
            labels = clf.classes_
            P = softmax(z)
            model_probs = {lbl: float(p) for lbl, p in zip(labels, P)}
        else:
            proba = getattr(clf, "predict_proba")(X).ravel()
            labels = clf.classes_
            model_probs = {lbl: float(p) for lbl, p in zip(labels, proba)}

    # Recipient/domain priors
    recip = (req.to or "").lower()
    rec_probs = normalize_probs(prior_recipient.get(recip, {}))
    dom_probs = {}
    if not rec_probs and "@" in recip:
        dom = recip.split("@", 1)[1]
        dom_probs = normalize_probs(prior_domain.get(dom, {}))

    # Weights: favor model when present, otherwise lean on priors
    alpha = 0.7 if model_probs else 0.0  # model
    beta = 0.2 if (not rec_probs and dom_probs) else 0.0  # domain prior
    gamma = max(0.0, 1.0 - alpha - beta)  # recipient prior

    intents = set(INTENTS.keys()) | set(model_probs) | set(rec_probs) | set(dom_probs)
    combined: List[Tuple[str, float]] = []
    for i in intents:
        p_model = model_probs.get(i, 0.0)
        p_rec = rec_probs.get(i, 0.0)
        p_dom = dom_probs.get(i, 0.0)
        score = alpha * p_model + gamma * p_rec + beta * p_dom
        combined.append((i, float(score)))

    combined.sort(key=lambda x: x[1], reverse=True)
    top_intent, top_score = ("", 0.0)
    if combined:
        top_intent, top_score = combined[0]

    # -------------------
    # Guardrail decision
    # -------------------
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
        "top_k": [(i, float(s)) for i, s in combined[:5]],
        "auto_suggest": auto_suggest,
        "threshold": CONFIDENCE_THRESHOLD,
        "message": message,
    }

@app.post("/generate", response_model=GenerateResp)
def generate(req: GenerateReq):
    if req.intent not in INTENTS:
        raise HTTPException(status_code=400, detail=f"Unknown intent: {req.intent}")
    meta = INTENTS[req.intent]
    tmpl_name = meta["template"]
    required = meta.get("required", [])
    missing = [k for k in required if not str(req.fields.get(k, "")).strip()]
    template = env.get_template(tmpl_name)
    rendered = template.render(**req.fields)
    subject, body = split_subject_body(rendered)
    return {"subject": subject, "body": body, "missing": missing}

