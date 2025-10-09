#!/usr/bin/env bash
# One-command local CI + git push
# Usage:
#   ./scripts/gitpush.sh "feat(ui): did a cool thing"

set -euo pipefail

MSG="${1:-}"

if [[ -z "$MSG" ]]; then
  echo "Usage: ./scripts/gitpush.sh \"feat(scope): message\""
  exit 1
fi

# Use project venv python if present
if [[ -x ".venv/bin/python" ]]; then
  PY=".venv/bin/python"
else
  PY="$(command -v python3 || command -v python)"
fi

echo "▶ Formatting (black)…"
$PY -m black app model scripts tests

echo "▶ Validating repo (configs ↔ templates ↔ tone)…"
$PY scripts/validate_repo.py

echo "▶ Running tests (pytest)…"
$PY -m pytest -q

echo "▶ Linting (flake8)…"
flake8 app model scripts tests

echo "▶ Git commit & push…"
git add -A
if git commit -m "$MSG"; then
  echo "✓ Commit created"
else
  echo "i No changes to commit (already up to date)"
fi
git push
echo "✅ Done!"

