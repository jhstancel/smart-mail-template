#!/usr/bin/env python3
import argparse, re
from pathlib import Path

TEMPLATES_DIR = Path("templates")

IMPORT_BLOCK = (
    '{% import "_tone_macros.j2" as tonefx %}\n'
    "{# tone optional; defaults to 'neutral' #}\n"
)

# Greeter patterns: Hi/Hello/Dear <name>,
GREETING_PATTERNS = [
    re.compile(r"^\s*Hi\s+\{\{\s*(recipientName|customerName)\s*\}\}\s*,\s*$", re.I|re.M),
    re.compile(r"^\s*Hello\s+\{\{\s*(recipientName|customerName)\s*\}\}\s*,\s*$", re.I|re.M),
    re.compile(r"^\s*Dear\s+\{\{\s*(recipientName|customerName)\s*\}\}\s*,\s*$", re.I|re.M),
]

# Request intro phrases (maps pattern -> replacement)
REQUEST_REWRITES = [
    # “Could you please share … pricing and current lead time …”
    (re.compile(r"^\s*Could you please share\s+pricing and current lead time", re.I|re.M),
     "{{ tonefx.request_intro(tone) }} pricing and current lead time"),
    (re.compile(r"^\s*Please provide\s+pricing and current lead time", re.I|re.M),
     "{{ tonefx.request_intro(tone) }} pricing and current lead time"),
    (re.compile(r"^\s*Please share\s+pricing and current lead time", re.I|re.M),
     "{{ tonefx.request_intro(tone) }} pricing and current lead time"),
]

# Notice intro phrases
NOTICE_REWRITES = [
    (re.compile(r"^\s*We wanted to let you know\s+that the shipping schedule", re.I|re.M),
     "{{ tonefx.notice_intro(tone) }} that the shipping schedule"),
    (re.compile(r"^\s*Please be advised\s+that the shipping schedule", re.I|re.M),
     "{{ tonefx.notice_intro(tone) }} that the shipping schedule"),
    (re.compile(r"^\s*Just a heads up\s+that the shipping schedule", re.I|re.M),
     "{{ tonefx.notice_intro(tone) }} that the shipping schedule"),
]

# Closings: map common endings to macro
CLOSING_BLOCKS = [
    re.compile(r"^\s*(Kind regards|Sincerely|Best)\s*,\s*\n\s*\{\{\s*senderName\s*\}\}\s*\s*$", re.I|re.M),
    re.compile(r"^\s*(Kind regards|Sincerely|Best)\s*,\s*\n\s*Your Company Team\s*$", re.I|re.M),
]

def ensure_import_block(txt: str) -> str:
    if 'import "templates/_tone_macros.j2"' in txt:
        return txt
    return IMPORT_BLOCK + txt

def rewrite_greeting(txt: str) -> str:
    for pat in GREETING_PATTERNS:
        m = pat.search(txt)
        if m:
            name_var = m.group(1)
            repl = f"{{{{ tonefx.greeting(tone, {name_var}) }}}}"
            txt = pat.sub(repl, txt, count=1)
            break
    return txt

def rewrite_requests(txt: str) -> str:
    for pat, repl in REQUEST_REWRITES:
        txt = pat.sub(repl, txt)
    return txt

def rewrite_notices(txt: str) -> str:
    for pat, repl in NOTICE_REWRITES:
        txt = pat.sub(repl, txt)
    return txt

def rewrite_closing(txt: str) -> str:
    # Prefer senderName if present in file, else use "Your Company Team"
    sender_var_present = "{{ senderName }}" in txt
    for pat in CLOSING_BLOCKS:
        if pat.search(txt):
            close = "{{ tonefx.close(tone, senderName) }}" if sender_var_present else '{{ tonefx.close(tone, "Your Company Team") }}'
            txt = pat.sub(close, txt)
    return txt

def process_file(path: Path, dry_run=False, verbose=False) -> bool:
    original = path.read_text(encoding="utf-8")
    patched = original

    patched = ensure_import_block(patched)
    patched = rewrite_greeting(patched)
    patched = rewrite_requests(patched)
    patched = rewrite_notices(patched)
    patched = rewrite_closing(patched)

    if patched != original:
        if verbose:
            print(f"[patch] {path}")
        if not dry_run:
            bak = path.with_suffix(path.suffix + ".bak")
            bak.write_text(original, encoding="utf-8")
            path.write_text(patched, encoding="utf-8")
        return True
    else:
        if verbose:
            print(f"[skip]  {path} (no changes)")
        return False

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    changed = 0
    for ext in ("*.j2", "*.txt"):
        for f in sorted(TEMPLATES_DIR.glob(ext)):
            changed += process_file(f, dry_run=args.dry_run, verbose=args.verbose)
    print(f"[done] changed={changed}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())

