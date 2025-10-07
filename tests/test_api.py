# tests/test_api.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert "intents" in r.json()

def test_generate_missing_fields():
    r = client.post("/generate", json={
        "intent": "order_confirmation",
        "fields": {"customerName": "Test Co"}
    })
    assert r.status_code == 200
    data = r.json()
    assert "missing" in data
    assert "subject" in data and "body" in data

