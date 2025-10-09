import json
import re
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).resolve().parents[1]
CONFIGS = ROOT / "configs"
TEMPLATES = ROOT / "templates"
README = ROOT / "README.md"


def fail(msg: str) -> None:
    raise SystemExit(f"[validate] ERROR: {msg}")


def load_intents():
    f = CONFIGS / "intents.json"
    if not f.exists():
        fail("configs/intents.json not found")
    with f.open() as fp:
        return json.load(fp)


def ensure_templates_exist(intents):
    missing = []
    for intent in intents.keys():
        f = TEMPLATES / f"{intent}.j2"
        if not f.exists():
            missing.append(intent)
    if missing:
        fail(f"Missing templates for intents: {', '.join(missing)}")


def ensure_subject_line(template_text: str, intent: str):
    # Require a Subject: line at top of template
    if "Subject:" not in template_text.splitlines()[0]:
        fail(f"Template {intent}.j2 must start with a 'Subject:' line")


def render_sample(env, intent: str, required_fields):
    # Provide generic placeholders by name
    fields = {}
    for f in required_fields:
        low = f.lower()
        if any(k in low for k in ("date", "ship", "due")):
            fields[f] = "2025-10-15"
        elif any(k in low for k in ("qty", "quantity", "amount", "number")):
            fields[f] = "5"
        elif "email" in low:
            fields[f] = "customer@example.com"
        elif "tracking" in low:
            fields[f] = "1Z999AA10123456784"
        elif "carrier" in low:
            fields[f] = "UPS"
        elif any(k in low for k in ("customer", "name", "contact")):
            fields[f] = "Customer Team"
        elif any(k in low for k in ("po", "invoice", "part", "rma")):
            fields[f] = low.upper() + "-TEST"
        else:
            fields[f] = "TEST"
    tpl = env.get_template(f"{intent}.j2")
    text = tpl.render(**fields)
    return text


def has_polite_greeting_and_thanks(text: str) -> bool:
    t = text.lower()
    greet = any(
        x in t
        for x in (
            "hello ",
            "hi ",
            "dear ",
            "good morning",
            "good afternoon",
            "good evening",
        )
    )
    thanks = any(x in t for x in ("thank you", "thanks", "appreciate"))
    return greet and thanks


def main():
    intents = load_intents()
    if not isinstance(intents, dict) or not intents:
        fail("configs/intents.json must be a non-empty object")

    ensure_templates_exist(intents)

    env = Environment(loader=FileSystemLoader(str(TEMPLATES)))
    for intent, meta in intents.items():
        path = TEMPLATES / f"{intent}.j2"
        text = path.read_text(encoding="utf-8")
        ensure_subject_line(text, intent)
        required = meta.get("required", []) if isinstance(meta, dict) else []
        rendered = render_sample(env, intent, required)
        if not has_polite_greeting_and_thanks(rendered):
            fail(
                f"Template {intent}.j2 should include a greeting and a thank-you phrase"
            )

    print("[validate] OK: configs ↔ templates appear consistent and polite.")


if __name__ == "__main__":
    main()
