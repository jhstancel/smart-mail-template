#!/usr/bin/env python3
from __future__ import annotations
import json
import sys
from pathlib import Path
from typing import Dict, List

import yaml  # PyYAML
from pydantic import ValidationError

# local
from intent_model import IntentSpec

ROOT = Path(__file__).resolve().parent.parent
REGISTRY_DIR = ROOT / "intents" / "registry"

# Generated outputs (safe: does not overwrite runtime files)
APP_DIR = ROOT / "app"
PUBLIC_DIR = ROOT / "public"
APP_SCHEMA_GEN = APP_DIR / "schema_generated.py"
APP_AUTODETECT_GEN = APP_DIR / "autodetect_rules_generated.py"
PUBLIC_SCHEMA_JSON = PUBLIC_DIR / "schema.generated.json"


def load_intents() -> List[IntentSpec]:
    if not REGISTRY_DIR.exists():
        return []
    intents: List[IntentSpec] = []
    for yml in sorted(REGISTRY_DIR.glob("*.yml")):
        try:
            data = yaml.safe_load(yml.read_text(encoding="utf-8")) or {}
            spec = IntentSpec(**data)
            intents.append(spec)
        except ValidationError as ve:
            print(f"[ERROR] {yml.name} failed validation:\n{ve}\n", file=sys.stderr)
            sys.exit(1)
    return intents


def build_backend_schema(intents: List[IntentSpec]) -> Dict[str, Dict]:
    """
    Produces the minimal schema the backend typically needs:
    { intent_id: { label, description, required, optional, fieldTypes, hints } }
    """
    out: Dict[str, Dict] = {}
    for spec in intents:
        out[spec.id] = {
            "label": spec.label,
            "description": spec.description or "",
            "required": spec.required,
            "optional": spec.optional,
            "fieldTypes": spec.fieldTypes,
            "hints": spec.hints,
        }
    return out


def build_frontend_schema(intents: List[IntentSpec]) -> Dict[str, Dict]:
    """
    Mirrors backend schema but is safe for UI; could add UI-only keys later.
    """
    return build_backend_schema(intents)


def build_autodetect_table(intents: List[IntentSpec]) -> Dict[str, Dict]:
    table: Dict[str, Dict] = {}
    for spec in intents:
        table[spec.id] = {
            "keywords": spec.autodetect.keywords,
            "boosts": spec.autodetect.boosts,
        }
    return table


def write_py_dict(path: Path, var_name: str, data: Dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    content = (
        "# AUTO-GENERATED FILE — DO NOT EDIT.\n"
        f"{var_name} = {json.dumps(data, indent=2, sort_keys=True)}\n"
    )
    path.write_text(content, encoding="utf-8")


def main() -> int:
    intents = load_intents()
    backend = build_backend_schema(intents)
    frontend = build_frontend_schema(intents)
    autodetect = build_autodetect_table(intents)

    # Write generated artifacts (safe: new files only)
    write_py_dict(APP_SCHEMA_GEN, "SCHEMA_GENERATED", backend)
    write_py_dict(APP_AUTODETECT_GEN, "AUTODETECT_GENERATED", autodetect)

    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    PUBLIC_SCHEMA_JSON.write_text(
        json.dumps(frontend, indent=2, sort_keys=True), encoding="utf-8"
    )

    print(
        f"[ok] intents={len(intents)} "
        f"→ {APP_SCHEMA_GEN.relative_to(ROOT)}, "
        f"{APP_AUTODETECT_GEN.relative_to(ROOT)}, "
        f"{PUBLIC_SCHEMA_JSON.relative_to(ROOT)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

