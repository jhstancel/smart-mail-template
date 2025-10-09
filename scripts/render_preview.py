#!/usr/bin/env python3
"""
Render a template with smart placeholders so you can preview tone/structure.

Usage:
  python scripts/render_preview.py --intent quote_request
  python scripts/render_preview.py --intent quote_request --kv customerName="Jane" quantity=10 partNumber=PN-123
"""
import argparse
import json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).resolve().parents[1]
TEMPLATES = ROOT / "templates"
CONFIGS = ROOT / "configs"


def smart_placeholder(key: str) -> str:
    k = key.lower()
    if any(x in k for x in ("date", "ship", "due")):
        return "2025-10-15"
    if any(x in k for x in ("qty", "quantity", "amount", "number")):
        return "5"
    if "email" in k:
        return "customer@example.com"
    if "tracking" in k:
        return "1Z999AA10123456784"
    if "carrier" in k:
        return "UPS"
    if any(x in k for x in ("customer", "name", "contact")):
        return "Customer Team"
    if any(x in k for x in ("po", "invoice", "part", "rma")):
        return k.upper() + "-TEST"
    if k == "sendername":
        return "Smart Mail User"
    return "TEST"


def parse_kv(pairs):
    data = {}
    for p in pairs:
        if "=" not in p:
            continue
        k, v = p.split("=", 1)
        if v.startswith('"') and v.endswith('"'):
            v = v[1:-1]
        data[k] = v
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--intent", required=True, help="intent name (e.g., quote_request)")
    ap.add_argument(
        "--kv",
        nargs="*",
        default=[],
        help='override placeholders, e.g., customerName="Jane" quantity=10',
    )
    args = ap.parse_args()

    env = Environment(loader=FileSystemLoader(str(TEMPLATES)))
    tpl_name = f"{args.intent}.j2"
    tpl_path = TEMPLATES / tpl_name
    if not tpl_path.exists():
        raise SystemExit(f"Template not found: {tpl_path}")

    schema = json.loads((CONFIGS / "intents.json").read_text(encoding="utf-8"))
    required = schema.get(args.intent, {}).get("required", [])

    context = {k: smart_placeholder(k) for k in required}
    context.update(parse_kv(args.kv))

    template = env.get_template(tpl_name)
    rendered = template.render(**context)
    print(rendered)


if __name__ == "__main__":
    main()
