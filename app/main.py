from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Tuple
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os, json, joblib
import numpy as np
from pathlib import Path

# cleaning utilities
from app.preprocess import clean_subject_body

# ---- Paths & environment ----
ROOT = os.path.dirname(os.path.dirname(__file__))
ART = Path(__file__).resolve().parent.parent / "model_artifacts"
print("[DEBUG] Loading artifacts from:", (Path(ART)).resolve())
CONFIGS = os.path.join(ROOT, "configs")
TEMPLATES = os.path.join(ROOT, "templates")

env = Environment(
    loader=FileSystemLoader(TEMPLATES),
    autoescape=select_autoescape(enabled_extensions=("j2",)),
)

def _maybe(path: str):
    return path if os.path.exists(path) else None

VEC_PATH = _maybe(os.path.join(ART, "vectorizer.pkl"))
CLF_PATH = _maybe(os.path.join(ART, "clf.pkl"))
PRIOR_RECIP_PATH = _maybe(os.path.join(ART, "recipient_prior.pkl"))
PRIOR_DOMAIN_PATH = _maybe(os.path.join(ART, "domain_prior.pkl"))

vec = joblib.load(VEC_PATH) if VEC_PATH else None
clf = joblib.load(CLF_PATH) if CLF_PATH else None
prior_recipient = joblib.load(PRIOR_RECIP_PATH) if PRIOR_RECIP_PATH else {}
prior_domain = joblib.load(PRIOR_DOMAIN_PATH) if PRIOR_DOMAIN_PATH else {}

with open(os.path.join(CONFIGS, "intents.json"), "r") as f:
    INTENTS = json.load(f)

# ---- Schemas ----
class PredictReq(BaseModel):
    to: str = Field(..., description="recipient email, e.g. buyer@vendor.com")
    subject: str = ""
    body_hint: str = ""  # optional free text; notes/context you might type

class PredictResp(BaseModel):
    intents: List[Tuple[str, float]]  # [(intent, score)]

class GenerateReq(BaseModel):
    intent: str
    fields: Dict[str, Any]

class GenerateResp(BaseModel):
    subject: str
    body: str
    missing: List[str]

# ---- App ----
app = FastAPI(title="ops-mail-studio", version="0.3.0")

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

@app.get("/health")
def health():
    return {
        "vectorizer_loaded": bool(vec),
        "classifier_loaded": bool(clf),
        "recipient_prior_loaded": bool(prior_recipient),
        "domain_prior_loaded": bool(prior_domain),
        "intents": list(INTENTS.keys())
    }

@app.post("/predict", response_model=PredictResp)
def predict(req: PredictReq):
    # Clean subject/body_hint the same way training data is cleaned
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
            proba = clf.predict_proba(X).ravel()
            labels = clf.classes_
            model_probs = {lbl: float(p) for lbl, p in zip(labels, proba)}

    # Recipient prior
    recip = (req.to or "").lower()
    rec_probs = prior_recipient.get(recip, {})
    rec_probs = normalize_probs(rec_probs)

    # Domain prior fallback (if recipient prior is empty)
    dom_probs = {}
    if not rec_probs and "@" in recip:
        dom = recip.split("@", 1)[1]
        dom_probs = normalize_probs(prior_domain.get(dom, {}))

    # Weighting:
    # - alpha: model probability weight (use more when there is signal text)
    # - beta: small domain prior weight only if no recipient prior
    alpha = 0.7 if model_probs else 0.0
    beta = 0.2 if (not rec_probs and dom_probs) else 0.0
    # recipient prior weight is whatever remains
    gamma = max(0.0, 1.0 - alpha - beta)

    intents = set(INTENTS.keys()) | set(model_probs) | set(rec_probs) | set(dom_probs)
    combined: List[Tuple[str, float]] = []
    for i in intents:
        p_model = model_probs.get(i, 0.0)
        p_rec = rec_probs.get(i, 0.0)
        p_dom = dom_probs.get(i, 0.0)
        score = alpha * p_model + gamma * p_rec + beta * p_dom
        combined.append((i, float(score)))
    combined.sort(key=lambda x: x[1], reverse=True)

    return {"intents": combined[:3]}

@app.post("/generate", response_model=GenerateResp)
def generate(req: GenerateReq):
    if req.intent not in INTENTS:
        raise HTTPException(status_code=400, detail=f"Unknown intent: {req.intent}")

    meta = INTENTS[req.intent]
    tmpl_name = meta["template"]
    required = meta.get("required", [])

    missing = [k for k in required if not req.fields.get(k)]
    template = env.get_template(tmpl_name)
    rendered = template.render(**req.fields)
    subject, body = split_subject_body(rendered)
    return {"subject": subject, "body": body, "missing": missing}

