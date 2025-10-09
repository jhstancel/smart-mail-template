#!/usr/bin/env bash
# Document-only push (no checks).
# Usage:
#   ./scripts/docpush.sh "docs: update README"

set -euo pipefail

MSG="${1:-}"

if [[ -z "$MSG" ]]; then
  echo "Usage: ./scripts/docpush.sh \"docs: update README\""
  exit 1
fi

echo "▶ Git commit & push (docs-only)…"
git add -A
if git commit -m "$MSG"; then
  echo "✓ Commit created"
else
  echo "i No changes to commit (already up to date)"
fi
git push
echo "✅ Done!"

