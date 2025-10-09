import re
from typing import Dict, Any, List

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# --------------------------
# Helper assertions
# --------------------------
def _assert_polite(body: str) -> None:
    """
    Heuristic 'polite tone' check that doesn't overfit exact wording.
    Requirements:
      - Has a greeting (hello/hi/dear/good morning/afternoon/evening)
      - Has a gratitude/closing (thank you/thanks/appreciate)
    """
    t = (body or "").lower()

    has_greeting = any(
        g in t
        for g in (
            "hello ",
            "hi ",
            "dear ",
            "good morning",
            "good afternoon",
            "good evening",
        )
    )
    has_thanks = any(k in t for k in ("thank you", "thanks", "appreciate"))

    assert has_greeting, "Expected a polite greeting in the email body."
    assert has_thanks, "Expected a polite closing/thanks in the email body."


def _safe_first_text(d: Dict[str, Any], key: str, default: str = "") -> str:
    v = d.get(key, default)
    return v if isinstance(v, str) else default


# --------------------------
# Basic service checks
# --------------------------
def test_health_endpoint_present():
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    # Be flexible about payload keys
    assert isinstance(data, dict)
    # Accept either key depending on your implementation
    assert any(k in data for k in ("intents_list", "model_classes"))
    # Confidence threshold is optional but nice to have
    if "confidence_threshold" in data:
        assert 0 <= data["confidence_threshold"] <= 1


def test_schema_endpoint_present():
    r = client.get("/schema")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, dict), "Expected a mapping of intent -> schema."
    assert len(data) > 0, "Expected at least one intent in /schema."


# --------------------------
# Politeness across all intents
# --------------------------
def test_generate_polite_for_all_intents():
    """
    Pull required fields from /schema for each intent,
    generate an email, and assert the body is politely worded.
    """
    schema_resp = client.get("/schema")
    assert schema_resp.status_code == 200
    schema = schema_resp.json()

    assert isinstance(schema, dict) and schema, "Schema must be a non-empty dict."

    for intent, meta in schema.items():
        # Required fields can be a list or absent
        required: List[str] = meta.get("required", []) if isinstance(meta, dict) else []
        fields = {}

        # Provide generic but safe placeholder values for each required field
        for f in required:
            # Try to make placeholders look reasonable without overfitting types
            norm = f.lower()
            if any(k in norm for k in ("date", "ship", "due")):
                fields[f] = "2025-10-15"
            elif any(k in norm for k in ("qty", "quantity", "amount", "number")):
                fields[f] = "5"
            elif any(k in norm for k in ("price", "pricing")):
                fields[f] = "$100.00"
            elif "email" in norm:
                fields[f] = "customer@example.com"
            elif "tracking" in norm:
                fields[f] = "1Z999AA10123456784"
            elif "carrier" in norm:
                fields[f] = "UPS"
            elif any(k in norm for k in ("customer", "name", "contact")):
                fields[f] = "Customer Team"
            elif any(k in norm for k in ("po", "invoice", "part")):
                fields[f] = norm.upper() + "-TEST"
            else:
                fields[f] = "TEST"

        # Call /generate
        gen = client.post("/generate", json={"intent": intent, "fields": fields})
        assert gen.status_code == 200, f"/generate failed for intent '{intent}'"
        payload = gen.json()

        subject = _safe_first_text(payload, "subject")
        body = _safe_first_text(payload, "body")

        assert subject.strip(), f"Missing or empty subject for intent '{intent}'"
        assert body.strip(), f"Missing or empty body for intent '{intent}'"

        # Check tone (greeting + thanks) for all intents.
        _assert_polite(body)
