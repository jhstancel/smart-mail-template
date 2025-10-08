from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200

    data = r.json()

    # Accept either legacy or current key name
    key = "intents" if "intents" in data else "intents_list"
    assert key in data, f"Expected 'intents' or 'intents_list' in /health, got keys: {list(data.keys())}"
    assert isinstance(data[key], list), f"Expected {key} to be a list, got {type(data[key]).__name__}"

    # Optional sanity checks (adjust if your payload differs)
    assert "classifier_loaded" in data
    assert isinstance(data["classifier_loaded"], bool)
    assert "artifacts_path" in data
    assert isinstance(data["artifacts_path"], str)

