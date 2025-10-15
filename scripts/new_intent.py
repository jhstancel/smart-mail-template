#!/usr/bin/env python3
from __future__ import annotations

import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional

import questionary
import yaml
from rich.console import Console
from rich.panel import Panel
from rich.pretty import Pretty
from rich.prompt import Confirm
from rich.table import Table
from rich.text import Text
from typer import Typer

# Local validation model from Step 1
SCRIPT_DIR = Path(__file__).resolve().parent
ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))  # for intent_model import
from intent_model import IntentSpec  # type: ignore

console = Console()
app = Typer(help="Interactive wizard to create a new intent (YAML + Jinja template).")

REGISTRY_DIR = ROOT / "intents" / "registry"
TEMPLATES_DIR = ROOT / "templates"


def to_snake(s: str) -> str:
    s = re.sub(r"[^\w\s-]", "", s)
    s = s.replace("-", " ")
    s = re.sub(r"\s+", "_", s.strip().lower())
    s = re.sub(r"_+", "_", s)
    return s


def assert_unique_id(intent_id: str) -> None:
    existing = {p.stem for p in REGISTRY_DIR.glob("*.yml")}
    if intent_id in existing:
        raise ValueError(f"Intent id '{intent_id}' already exists in intents/registry")


def prompt_label() -> str:
    msg = (
        'Label / Title\n'
        'Examples:\n'
        '"Return Authorization"\n'
        '"Backorder Notice"\n'
        '"Warranty Claim"\n'
    )
    while True:
        label = questionary.text(msg).ask()
        if not label or len(label.strip()) < 3:
            console.print("[red]Label is required and should be >= 3 chars[/red]")
            continue
        return label.strip()


def prompt_id(default_id: str) -> str:
    msg = (
        f'Machine id (snake_case) [default: {default_id}]\n'
        'Examples:\n'
        '"return_authorization"\n'
        '"delay_notice"\n'
        '"shipment_update"\n'
    )
    while True:
        ans = questionary.text(msg).ask() or default_id
        ans = ans.strip()
        if not re.fullmatch(r"[a-z0-9_]+", ans):
            console.print("[red]Use only lowercase letters, numbers, and underscores[/red]")
            continue
        try:
            assert_unique_id(ans)
        except ValueError as e:
            console.print(f"[red]{e}[/red]")
            continue
        return ans


def prompt_description() -> str:
    msg = (
        "Short description\n"
        'Examples:\n'
        '"Provide or request an RMA for returning parts/items."\n'
        '"Inform a customer that a delivery date has changed."\n'
        '"Confirm payment for an invoice and share remittance details."\n'
    )
    while True:
        d = questionary.text(msg).ask()
        if not d or len(d.strip()) < 10:
            console.print("[red]Please enter a helpful sentence (>= 10 chars)[/red]")
            continue
        return d.strip()


FIELD_TYPES = ["string", "longtext", "date", "enum", "number", "email", "phone", "bool"]


def prompt_fields(kind: str) -> List[str]:
    assert kind in ("required", "optional")
    msg = (
        f"{kind.title()} fields (comma-separated)\n"
        'Examples:\n'
        '"rmaNumber, partNumber, quantity"\n'
        '"poNumber, trackingNumber"\n'
        '"recipientName, shipDate"\n'
    )
    while True:
        raw = questionary.text(msg).ask() or ""
        names = [n.strip() for n in raw.split(",") if n.strip()]
        # It’s valid to have zero optional fields
        if kind == "required" and not names:
            console.print("[red]At least one required field is needed[/red]")
            continue
        # Validate each
        bad = [n for n in names if not re.fullmatch(r"[A-Za-z0-9_]+", n)]
        if bad:
            console.print(f"[red]Invalid field names: {', '.join(bad)}[/red]")
            continue
        return names


def prompt_field_types(all_fields: List[str]) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for f in all_fields:
        msg = (
            f"Type for field '{f}' (choose)\n"
            'Examples:\n'
            '"string"\n'
            '"date"\n'
            '"enum"\n'
        )
        typ = questionary.select(
            msg,
            choices=FIELD_TYPES,
            default="string",
        ).ask()
        out[f] = typ
    return out


def prompt_enums(field_types: Dict[str, str]) -> Dict[str, List[str]]:
    enums: Dict[str, List[str]] = {}
    for name, typ in field_types.items():
        if typ != "enum":
            continue
        msg = (
            f"Options for enum '{name}' (comma-separated)\n"
            'Examples:\n'
            '"UPS, FedEx, DHL, USPS"\n'
            '"Open, Closed, Pending"\n'
            '"Bronze, Silver, Gold"\n'
        )
        while True:
            raw = questionary.text(msg).ask() or ""
            opts = [o.strip() for o in raw.split(",") if o.strip()]
            if len(opts) < 2:
                console.print("[red]Provide at least two enum options[/red]")
                continue
            enums[name] = opts
            break
    return enums


def prompt_hints(all_fields: List[str]) -> Dict[str, str]:
    hints: Dict[str, str] = {}
    for f in all_fields:
        msg = (
            f"Hint / placeholder text for '{f}' (optional)\n"
            'Examples:\n'
            '"e.g., RMA-2048"\n'
            '"e.g., PN-10423"\n'
            '"mm/dd/yyyy"\n'
        )
        ans = questionary.text(msg).ask() or ""
        if ans.strip():
            hints[f] = ans.strip()
    return hints


def prompt_subject(intent_label: str, first_field: Optional[str]) -> str:
    default = (
        f"{intent_label} – {{ {{ {first_field} }} }}" if first_field else intent_label
    )
    msg = (
        f"Subject template (Jinja allowed) [default: {default}]\n"
        'Examples:\n'
        '"RMA {{ rmaNumber }} – {{ partNumber }} (qty {{ quantity }})"\n'
        '"Order Confirmation – {{ orderNumber }}"\n'
        '"Invoice Payment – {{ invoiceNumber }}"\n'
    )
    subj = questionary.text(msg).ask() or default
    return subj.strip()


def prompt_autodetect() -> Dict[str, object]:
    kws_msg = (
        "Autodetect keywords (comma-separated; optional)\n"
        'Examples:\n'
        '"rma, return, authorization, send back"\n'
        '"quote, pricing, availability, rfq"\n'
        '"tracking, shipped, in transit"\n'
    )
    raw_kws = questionary.text(kws_msg).ask() or ""
    keywords = [k.strip() for k in raw_kws.split(",") if k.strip()]

    boosts_msg = (
        "Reply/PO boosts (optional; leave blank to skip)\n"
        'Examples:\n'
        '"reply=0.1, containsPO=0.05"\n'
        '"reply=0.06"\n'
        '"containsPO=0.02"\n'
    )
    raw_b = questionary.text(boosts_msg).ask() or ""
    boosts: Dict[str, float] = {}
    for part in [p.strip() for p in raw_b.split(",") if p.strip()]:
        if "=" in part:
            k, v = part.split("=", 1)
            try:
                boosts[k.strip()] = float(v.strip())
            except ValueError:
                console.print(f"[yellow]Ignoring invalid boost '{part}'[/yellow]")
    return {"keywords": keywords, "boosts": boosts}


def scaffold_body(intent_label: str, req_fields: List[str]) -> str:
    # simple, readable template scaffold using required fields
    lines = ["Hello,", "", f"{intent_label} details:", ""]
    for f in req_fields:
        lines.append(f"- {f}: {{ {{ {f} }} }}")
    lines += ["", "Thank you,"]
    return "\n".join(lines) + "\n"


def open_in_editor(path: Path) -> None:
    editor = os.environ.get("EDITOR") or os.environ.get("VISUAL")
    if not editor:
        return
    try:
        subprocess.run([editor, str(path)])
    except Exception:
        pass


@app.command()
def main():
    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)

    console.print(Panel.fit("🧩 New Intent Wizard", style="cyan"))

    label = prompt_label()
    default_id = to_snake(label)
    intent_id = prompt_id(default_id)
    description = prompt_description()

    required = prompt_fields("required")
    optional = prompt_fields("optional")
    all_fields = required + optional

    field_types = prompt_field_types(all_fields)
    enums = prompt_enums(field_types)
    hints = prompt_hints(all_fields)

    subject = prompt_subject(label, required[0] if required else None)
    body_path = f"templates/{intent_id}.j2"
    autodetect = prompt_autodetect()

    # Build intent spec dict
    spec = {
        "id": intent_id,
        "label": label,
        "description": description,
        "required": required,
        "optional": optional,
        "fieldTypes": field_types,
        "enums": enums,
        "hints": hints,
        "template": {"subject": subject, "bodyPath": body_path},
        "autodetect": autodetect,
        "tests": {"samples": []},
    }

    # Validate with Pydantic (hard fail if invalid)
    try:
        _ = IntentSpec(**spec)
    except Exception as e:
        console.print(Panel(str(e), title="Validation error", style="red"))
        sys.exit(1)

    # Preview
    console.rule("Preview")
    t = Table(show_header=True, header_style="bold magenta")
    t.add_column("Key")
    t.add_column("Value")
    t.add_row("id", intent_id)
    t.add_row("label", label)
    t.add_row("required", ", ".join(required) or "—")
    t.add_row("optional", ", ".join(optional) or "—")
    t.add_row("subject", subject)
    t.add_row("bodyPath", body_path)
    console.print(t)

    console.print(Panel.fit("YAML to write", style="blue"))
    console.print(Pretty(spec, expand_all=True))

    # Body scaffold
    body_text = scaffold_body(label, required)
    console.print(Panel.fit("Body template scaffold (.j2)", style="blue"))
    console.print(Text(body_text))

    if not Confirm.ask("Write files to disk?"):
        console.print("[yellow]Cancelled. No files written.[/yellow]")
        sys.exit(0)

    # Write YAML
    yml_path = REGISTRY_DIR / f"{intent_id}.yml"
    with yml_path.open("w", encoding="utf-8") as fp:
        yaml.safe_dump(spec, fp, sort_keys=False, allow_unicode=True)

    # Write template (only if not exists to avoid clobber)
    j2_path = TEMPLATES_DIR / f"{intent_id}.j2"
    if j2_path.exists():
        console.print(f"[yellow]Template exists: {j2_path}. Not overwriting.[/yellow]")
    else:
        j2_path.write_text(body_text, encoding="utf-8")
        # Optional: open in $EDITOR for quick touch-ups
        if Confirm.ask("Open template in your $EDITOR now?"):
            open_in_editor(j2_path)

    console.print("[green]Files written.[/green]")

    # Regenerate schemas
    console.print("[cyan]Running: make regen[/cyan]")
    try:
        subprocess.run(["make", "regen"], check=True)
    except Exception:
        console.print("[red]Failed to run make regen. Run it manually.[/red]")

    console.print("[bold green]Done![/bold green] New intent added. Launch with `make run`.")
    console.print(f"YAML: {yml_path}")
    console.print(f"Body: {j2_path}")


if __name__ == "__main__":
    app()

