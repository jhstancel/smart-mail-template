#!/usr/bin/env bash
set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  osascript -e 'display dialog "Python 3 is not installed.\n\nInstall it from python.org, then reopen this app." buttons {"OK"} default button "OK"'
  exit 1
fi

VENV_DIR=".venv_app"

if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR"
  source "$VENV_DIR/bin/activate"
  pip install --upgrade pip
  pip install -r requirements.txt
else
  source "$VENV_DIR/bin/activate"
fi

PORT="${UVICORN_PORT:-8000}"
open "http://127.0.0.1:${PORT}/ui/"

python -m uvicorn app.main:app --host 127.0.0.1 --port "${PORT}"
