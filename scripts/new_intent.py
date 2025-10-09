#!/usr/bin/env python3
"""
Scaffold a new intent end-to-end:
- Create templates/<intent>.j2 (polite, passes tone tests)
- Update configs/intents.json (required fields)
- Optionally update configs/rules.json (keyword hints)
- Optionally append a labeled example to data/emails.labeled.train.csv
- Run scripts/validate_repo.py

Usage examples:
  python scripts/new_intent.py --name return_merchandise_authorization \
      --fields customerName,rmaNumber,itemsSummary,senderName \
      --title "RMA Request" \
      --rules rma,return,authorization \
      --example "Please confirm RMA 123 for two widgets" \
      --yes

  # Interactive mode (no flags)
  python scripts/new_intent.py
"""
import argparse
import json
import os
import sys
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parents[1]
CONFIGS = ROOT / "configs"
TEMPLATES = ROOT / "templates"
DATA = ROOT / "data"

def abort(msg: str, code: int = 1):
    print(f"[new_intent] ERROR: {msg}", file=sys.stderr)
    sys.exit(code)

def confirm(prompt: str) -> bool:
    try:
        return input(f"{prompt} [y/N]: ").strip().lower() in ("y", "yes")
    except EOFError:
        return False

def load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8") or "{}")

def save_json(path: Path, data: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

DEFAULT_BODY = """Hi {{ customerName or 'there' }},

I hope you’re doing well. {{ lead_sentence }}

{{ main_request }}

Thank you for your help,
{{ senderName or 'Smart Mail User' }}
"""

TEMPLATE_SKELETON = """Subject: {{ subject_line }}

""" + DEFAULT_BODY

def guess_lead_sentence(intent_name: str) -> str:
    # Lightweight, readable default; can edit later in the .j2 file.
    if "return" in intent_name or "rma" in intent_name:
        return "I’m reaching out regarding a return authorization."
    if "quote" in intent_name or "pricing" in intent_name:
        return "I’m reaching out with a quick pricing and availability request."
    if "invoice" in intent_name or "payment" in intent_name:
        return "I wanted to share a quick payment update."
    if "shipment" in intent_name or "tracking" in intent_name:
        return "Good news—your order details are below."
    if "follow" in intent_name:
        return "I’m checking in on the item we discussed."
    if "delay" in intent_name or "schedule" in intent_name:
        return "I want to share a brief schedule update."
    return "I wanted to share a quick update."

def guess_main_request(fields: list[str]) -> str:
    # Build a natural sentence using known common fields.
    fset = {f.lower(): f for f in fields}
    bits = []
    if "rmanumber" in fset:
        bits.append(f"RMA {{ {fset['rmanumber']} }}")
    if "ponumber" in fset:
        bits.append(f"PO {{ {fset['ponumber']} }}")
    if "partnumber" in fset:
        bits.append(f"{{ {fset['partnumber']} }}")
    if "quantity" in fset or "qty" in fset:
        key = fset.get("quantity", fset.get("qty"))
        bits.append(f"(qty {{ {key} }})")
    joined = " ".join(bits).strip()
    if joined:
        return f"Could you please confirm details for {joined}?"
    # Fallback
    pf = fields[0] if fields else "details"
    return f"Could you please confirm {{ {pf} }}?"

def build_subject(title: str, fields: list[str]) -> str:
    primary = fields[0] if fields else None
    if primary:
        return f"{title} – {{{{ {primary} }}}}"
    return title

def append_example_row(intent: str, example: str):
    csv_path = DATA / "emails.labeled.train.csv"
    header = "text,intent\n"
    line = f"\"{example}\",{intent}\n"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    if not csv_path.exists():
        csv_path.write_text(header + line, encoding="utf-8")
        return
    # append if not duplicate
    existing = csv_path.read_text(encoding="utf-8")
    if line not in existing:
        with csv_path.open("a", encoding="utf-8") as fp:
            fp.write(line)

def run_validator():
    val = ROOT / "scripts" / "validate_repo.py"
    if val.exists():
        print("[new_intent] running validate_repo.py …")
        os.system(f"{sys.executable} {val}")

def main():
    p = argparse.ArgumentParser(description="Create a new intent + template + config wiring.")
    p.add_argument("--name", help="intent name (slug, e.g., return_merchandise_authorization)")
    p.add_argument("--fields", help="comma-separated required fields (e.g., customerName,rmaNumber,itemsSummary,senderName)")
    p.add_argument("--title", help="Subject line title (e.g., 'RMA Request')")
    p.add_argument("--rules", help="comma-separated keyword hints (optional)")
    p.add_argument("--example", help="optional labeled example text to append to data/emails.labeled.train.csv")
    p.add_argument("--yes", action="store_true", help="non-interactive; assume 'yes'")
    args = p.parse_args()

    # Interactive fallbacks
    name = args.name or input("New intent name (slug): ").strip()
    if not name:
        abort("intent name is required")
    fields = [f.strip() for f in (args.fields or input("Required fields (comma-separated): ").strip()).split(",") if f.strip()]
    if not fields:
        abort("at least one required field is needed")
    title = args.title or input("Subject title (e.g., 'RMA Request'): ").strip() or "New Request"
    rules = [r.strip() for r in (args.rules or input("Keyword hints (comma-separated, optional): ").strip()).split(",") if r.strip()] if args.rules is None else ([r.strip() for r in args.rules.split(",") if r.strip()])
    example = args.example or ""

    # Load configs
    intents_json = CONFIGS / "intents.json"
    rules_json = CONFIGS / "rules.json"
    intents = load_json(intents_json)
    rules_map = load_json(rules_json)

    if name in intents and not args.yes:
        if not confirm(f"Intent '{name}' already exists in intents.json. Update fields/template anyway?"):
            abort("aborted by user")

    # Update intents.json
    intents.setdefault(name, {})
    intents[name]["required"] = fields
    save_json(intents_json, intents)
    print(f"[new_intent] updated {intents_json}")

    # Update rules.json (optional)
    if rules:
        rules_map.setdefault(name, [])
        merged = list(dict.fromkeys([*rules_map[name], *rules]))  # de-dupe, preserve order
        rules_map[name] = merged
        save_json(rules_json, rules_map)
        print(f"[new_intent] updated {rules_json}")

    # Create template
    subject_line = build_subject(title, fields)
    lead = guess_lead_sentence(name)
    main_req = guess_main_request(fields)
    body = TEMPLATE_SKELETON.replace("{{ subject_line }}", subject_line)\
                            .replace("{{ lead_sentence }}", lead)\
                            .replace("{{ main_request }}", main_req)
    tpl_path = TEMPLATES / f"{name}.j2"
    if tpl_path.exists() and not args.yes:
        if not confirm(f"Template {tpl_path.name} exists. Overwrite?"):
            abort("aborted by user")
    tpl_path.parent.mkdir(parents=True, exist_ok=True)
    tpl_path.write_text(body, encoding="utf-8")
    print(f"[new_intent] wrote template {tpl_path}")

    # Optional: append labeled example
    if example:
        append_example_row(name, example)
        print(f"[new_intent] appended example row to {DATA/'emails.labeled.train.csv'}")

    # Validate
    run_validator()

    print("\nDone ✅  Next steps:")
    print(f"  • Edit {tpl_path.name} if you want to refine wording.")
    print("  • Run: pytest -q")
    print("  • (Optional) Retrain: python -m model.train")

if __name__ == "__main__":
    main()

