# app/main.py
from __future__ import annotations
import json

from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from starlette.responses import RedirectResponse
from pydantic import BaseModel
from jinja2 import Environment, FileSystemLoader, Undefined

# ---------- generated schema/rules (lazy: don't crash server if missing) ----------
try:
    from app.schema_generated import SCHEMA  # type: ignore
    _SCHEMA_ERR: Optional[str] = None
except Exception as e:
    SCHEMA: Dict[str, Any] = {}
    _SCHEMA_ERR = str(e)

try:
    from app.autodetect_rules_generated import RULES  # type: ignore
except Exception:
    RULES: Dict[str, Any] = {}

# ---------- FastAPI ----------
app = FastAPI(title="Smart Mail Template API")

# ---------- Path helpers ----------
def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent

def _templates_dir() -> Path:
    return (_repo_root() / "templates").resolve()

def _ui_dir() -> Path:
    return (_repo_root() / "ui").resolve()

def _public_dir() -> Path:
    return (_repo_root() / "public").resolve()

# ---------- Jinja environment ----------
def _env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(_templates_dir())),
        autoescape=False,
        undefined=Undefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )

# ---------- Static UI mounts ----------
app.mount("/ui", StaticFiles(directory=str(_ui_dir()), html=True), name="ui")
app.mount("/public", StaticFiles(directory=str(_public_dir())), name="public")

@app.get("/")
def root():
    return RedirectResponse(url="/ui/")

# ---------- DTOs ----------
class GenerateReq(BaseModel):
    intent: str
    fields: Dict[str, Any] = {}

class GenerateResp(BaseModel):
    subject: str
    body: str

class AutoDetectReq(BaseModel):
    text: str

class AutoDetectResp(BaseModel):
    intent: Optional[str]
    confidence: float = 0.0
    candidates: List[Dict[str, Any]] = []

# ---------- Helpers (only for render reliability) ----------
def _shorten_iso_dates_inplace(fields: Dict[str, Any]) -> None:
    """Convert 'YYYY-MM-DD' -> 'MM-DD' across string fields."""
    for k, v in list(fields.items()):
        if isinstance(v, str) and len(v) == 10 and v[4] == "-" and v[7] == "-":
            fields[k] = v[5:]

def _resolve_body_path(template_meta: Dict[str, Any], intent: str) -> str:
    """Prefer schema.template.bodyPath; fallback to '{intent}.j2'.
       Accepts 'templates/foo.j2' or 'foo.j2'."""
    body_path = (template_meta or {}).get("bodyPath") or f"{intent}.j2"
    if body_path.startswith("templates/"):
        body_path = body_path.split("/", 1)[1]
    return body_path

def _render_subject(env: Environment, intent_schema: Dict[str, Any], intent: str, fields: Dict[str, Any]) -> str:
    tpl_meta = intent_schema.get("template") or {}
    subject_tpl = tpl_meta.get("subject")
    if subject_tpl:
        return env.from_string(subject_tpl).render(**fields)
    return intent_schema.get("label") or intent.replace("_", " ").title()

# ---------- Routes ----------

@app.get("/schema")
def get_schema() -> Dict[str, Any]:
    # 1) Happy path: module import worked and SCHEMA is populated
    if not _SCHEMA_ERR and SCHEMA:
        return SCHEMA

    # 2) Fallback: load from public/schema.generated.json so the UI can render
    try:
        json_path = _public_dir() / "schema.generated.json"
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            # return a dict, not None
            if isinstance(data, dict) and data:
                return data
    except Exception:
        pass

    # 3) Final: tell client how to fix; keeps behavior explicit
    raise HTTPException(
        status_code=503,
        detail="Schema not loaded. Run: python3.9 -m pip install pyyaml && python3.9 scripts/regen_schemas.py",
    )
@app.post("/autodetect", response_model=AutoDetectResp)
def autodetect(req: AutoDetectReq) -> AutoDetectResp:
    text = (req.text or "").lower()
    if not text or not RULES:
        return AutoDetectResp(intent=None, confidence=0.0, candidates=[])
    best_intent, best_score = None, 0
    candidates: List[Dict[str, Any]] = []
    for intent, rule in RULES.items():
        kws = (rule or {}).get("keywords", [])
        score = sum(1 for k in kws if k and str(k).lower() in text)
        if score > 0:
            candidates.append({"intent": intent, "score": score})
            if score > best_score:
                best_intent, best_score = intent, score
    return AutoDetectResp(intent=best_intent, confidence=float(best_score), candidates=candidates)

@app.post("/generate", response_model=GenerateResp)
def generate(req: GenerateReq) -> GenerateResp:
    # Require schema at request time (so server still starts if missing)
    if _SCHEMA_ERR or not SCHEMA:
        raise HTTPException(
            status_code=503,
            detail="Schema not loaded. Run scripts/regen_schemas.py and restart.",
        )

    intent = (req.intent or "").strip()
    fields = dict(req.fields or {})

    # Validate intent & required fields
    if intent not in SCHEMA:
        raise HTTPException(status_code=400, detail=f"Unknown intent '{intent}'")
    intent_schema = SCHEMA[intent]
    required = intent_schema.get("required", []) or []
    missing = [k for k in required if not fields.get(k)]
    if missing:
        raise HTTPException(status_code=422, detail={"missing": missing})

    # Normalize ISO dates (no Jinja filter dependency)
    _shorten_iso_dates_inplace(fields)

    env = _env()

    # Subject (from schema if provided)
    subject = _render_subject(env, intent_schema, intent, fields)

    # Body path (bodyPath or {intent}.j2), with robust fallback & clear errors
    body_path = _resolve_body_path(intent_schema.get("template") or {}, intent)
    try:
        tpl = env.get_template(body_path)
    except Exception as e_first:
        try:
            tpl = env.get_template(f"{intent}.j2")
        except Exception as e_second:
            raise HTTPException(
                status_code=500,
                detail={
                    "error": "TemplateNotFound",
                    "tried": [body_path, f"{intent}.j2"],
                    "msg1": str(e_first),
                    "msg2": str(e_second),
                },
            )

    try:
        body = tpl.render(**fields)
    except Exception as e:
        raise HTTPException(status_code=500, detail={"error": "TemplateRenderError", "msg": str(e)})

    return GenerateResp(subject=subject, body=body)

