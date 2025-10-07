# app/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Tuple
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os, json, joblib
import numpy as np

ROOT = os.path.dirname(os.path.dirname(__file__))
ART = os.path.join(ROOT, "model_artifacts")
CONFIGS = os.path.join(ROOT, "configs")
TEMPLATES = os.path.join(ROOT, "templates")

env = Environment(
    loader=FileSystemLoader(TEMPLATES),
    autoescape=select_autoescape(enabled_extensions=("j2",)),
)

# lazy load artifacts
def _maybe(path): 
    return path if os.path.exists(path) else None

VEC_PATH = _maybe(os.path.join(ART, "vectorizer.pkl"))
CLF_PATH = _maybe(os.path.join(ART, "clf.pkl"))
PRIOR_PATH = _maybe(os.path.join(ART, "recipient_prior.pkl"))

vec = joblib.load(VEC_PATH) if VEC_PATH else None
clf = joblib.load(CLF_PATH) if CLF_PATH else None
prior = joblib.load(PRIOR_PATH) if PRIOR_PATH else {}

with open(os.path.join(CONFIGS, "intents.json"), "r") as f:
    INTENTS = json.load(f)

class PredictReq(BaseModel):
    to: str = Field(..., description="recipient email")
    subject: str = ""
    body_hint: str = ""

class PredictResp(BaseModel):
    intents: List[Tuple[str, float]]

class GenerateReq(BaseModel):
    intent: str
    fields: Dict[str, Any]

class GenerateResp(BaseModel):
    subject: str
    body: str
    missing: List[str]

app = FastAPI(title="ops-mail-studio", version="0.1.0")

def softmax(z: np.ndarray) -> np.ndarray:
    z = z - np.max(z)
    e = np.exp(z)
    return e / e.sum()

@app.get("/health")
def health():
    return {
        "vectorizer": bool(vec),
        "classifier": bool(clf),
        "recipient_prior": bool(prior),
        "intents": list(INTENTS.keys())
    }

@app.post("/predict", response_model=PredictResp)
def predict(req: PredictReq):
    # model score (if available)
    model_probs = {}
    text = (req.subject + " || " + req.body_hint).lower().strip()
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

    # recipient prior
    recip = (req.to or "").lower()
    recip_probs = prior.get(recip, {})
    s = sum(recip_probs.values()) or 0
    recip_probs = {k: v / s for k, v in recip_probs.items()} if s else {}

    # combine
    intents = set(model_probs.keys()) | set(recip_probs.keys()) | set(INTENTS.keys())
    alpha = 0.7 if model_probs else 0.0  # no model? rely on prior only
    combined = []
    for i in intents:
        p_model = model_probs.get(i, 0.0)
        p_prior = recip_probs.get(i, 0.0)
        score = alpha * p_model + (1 - alpha) * p_prior
        combined.append((i, float(score)))
    combined.sort(key=lambda x: x[1], reverse=True)
    return {"intents": combined[:3]}

def split_subject_body(rendered: str):
    lines = rendered.strip().splitlines()
    if lines and lines[0].lower().startswith("subject:"):
        subject = lines[0].split(":", 1)[1].strip()
        body = "\n".join(lines[1:]).lstrip()
        return subject, body
    return "", rendered.strip()

@app.post("/generate", response_model=GenerateResp)
def generate(req: GenerateReq):
    if req.intent not in INTENTS:
        raise HTTPException(400, f"Unknown intent: {req.intent}")
    meta = INTENTS[req.intent]
    tmpl_name = meta["template"]
    required = meta["required"]

    missing = [k for k in required if not req.fields.get(k)]
    template = env.get_template(tmpl_name)
    rendered = template.render(**req.fields)
    subject, body = split_subject_body(rendered)
    return {"subject": subject, "body": body, "missing": missing}

