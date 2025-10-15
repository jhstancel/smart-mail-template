from pathlib import Path
import yaml
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from intent_model import IntentSpec  # type: ignore


def test_all_registry_files_validate():
    reg_dir = ROOT / "intents" / "registry"
    assert reg_dir.exists(), "intents/registry directory missing"
    bad = []
    for yml in sorted(reg_dir.glob("*.yml")):
        data = yaml.safe_load(yml.read_text(encoding="utf-8")) or {}
        try:
            IntentSpec(**data)
        except Exception as e:
            bad.append((yml.name, str(e)))
    assert not bad, "Invalid intent specs:\n" + "\n".join(f"{n}: {err}" for n, err in bad)

