# ============================================================
# Smart Mail Template — Developer Makefile (full rewrite)
# ============================================================

SHELL := /bin/bash

# --- Prefer the repo's virtualenv if it exists ---
VENV ?= .venv
ifeq ($(wildcard $(VENV)/bin/python),)
  PY  := python3
  PIP := pip
else
  PY  := $(VENV)/bin/python
  PIP := $(VENV)/bin/pip
endif

# --- App / server config ---
APP  ?= app.main:app
HOST ?= 127.0.0.1
PORT ?= 8000

# --- Git defaults ---
MSG  ?= chore(auto): format, lint, test, and push

.PHONY: help venv install run serve dev regen check-schema check-no-legacy fmt lint test train new-intent docs push clean kill-port build-schema

help:
	@echo ""
	@echo "🧠 Smart Mail Template — Dev Commands"
	@echo "-------------------------------------"
	@echo "  make venv            → Create .venv and install requirements"
	@echo "  make run             → Start FastAPI with auto-reload (PORT=$(PORT))"
	@echo "  make serve           → Alias for run"
	@echo "  make dev             → regen → check-schema → check-no-legacy → run"
	@echo "  make regen           → Regenerate YAML → generated artifacts"
	@echo "  make check-schema    → Verify generated files exist"
	@echo "  make check-no-legacy → Ensure old schema files are gone"
	@echo "  make fmt             → Black + isort"
	@echo "  make lint            → Ruff + mypy"
	@echo "  make test            → Pytest suite"
	@echo "  make train           → Train autodetect classifier"
	@echo "  make new-intent      → Launch interactive new intent wizard"
	@echo "  make docs            → Push docs via scripts/docpush.sh"
	@echo "  make push            → Format, lint, test, commit, push"
	@echo "  make clean           → Remove caches and build artifacts"
	@echo "  make kill-port       → Kill process bound to PORT ($(PORT))"
	@echo ""

# ============================================================
# Environment / Dependencies
# ============================================================

venv:
	@[ -d $(VENV) ] || (echo "📦 Creating venv in $(VENV)"; python3 -m venv $(VENV))
	@echo "📦 Installing requirements into $(VENV)"
	@$(PIP) install -r requirements.txt

install: venv

# ============================================================
# Runtime / Server
# ============================================================

run:
	@echo "🚀 Starting FastAPI on http://$(HOST):$(PORT)"
	@$(PY) -m uvicorn $(APP) --reload --host $(HOST) --port $(PORT)

serve: run

dev: regen check-schema check-no-legacy run

kill-port:
	@echo "🧨 Killing any process on port $(PORT)"
	@PID=$$(lsof -ti tcp:$(PORT)) ; \
	if [ -n "$$PID" ]; then kill -9 $$PID && echo "✓ Killed PID $$PID"; else echo "• No process on $(PORT)"; fi

# ============================================================
# Schema / Registry pipeline
# ============================================================

regen:
	@echo "🔁 Regenerating intent schemas..."
	@$(PY) scripts/regen_schemas.py

check-schema:
	@echo "✅ Validating generated schema files..."
	@[ -f app/schema_generated.py ] && echo "  ✓ app/schema_generated.py" || (echo "  ✗ missing app/schema_generated.py"; exit 1)
	@[ -f app/autodetect_rules_generated.py ] && echo "  ✓ app/autodetect_rules_generated.py" || (echo "  ✗ missing app/autodetect_rules_generated.py"; exit 1)
	@[ -f public/schema.generated.json ] && echo "  ✓ public/schema.generated.json" || (echo "  ✗ missing public/schema.generated.json"; exit 1)

check-no-legacy:
	@echo "🔒 Checking for legacy files..."
	@if [ -f app/schema.py ] || [ -f app/intents_registry.py ] || [ -f app/schema.py.bak ] || [ -f app/intents_registry.py.bak ]; then \
		echo "❌ Legacy schema files detected (remove app/schema.py* and app/intents_registry.py*)"; \
		exit 1; \
	else \
		echo "✅ No legacy schema files present"; \
	fi

build-schema: regen check-schema

# ============================================================
# Code Quality
# ============================================================

fmt:
	@echo "🎨 Formatting with black + isort..."
	@$(PY) -m black app scripts tests
	@$(PY) -m isort app scripts tests

lint:
	@echo "🔍 Ruff + mypy..."
	@ruff check app scripts
	@$(PY) -m mypy app scripts

test:
	@echo "🧪 Running pytest..."
	@$(PY) -m pytest -v --disable-warnings

# ============================================================
# Model Training
# ============================================================

train:
	@echo "📈 Training autodetect classifier..."
	@$(PY) model/train.py
	@echo "✅ Model training complete."

# ============================================================
# Tooling / Docs / Git
# ============================================================

new-intent:
	@echo "🧩 Launching New Intent Wizard..."
	@$(PY) scripts/new_intent.py

docs:
	@echo "📚 Pushing docs..."
	@bash scripts/docpush.sh

push:
	@echo "🧱 Running format + lint + test..."
	@$(MAKE) fmt
	@$(MAKE) lint
	@$(MAKE) test
	@echo "🚀 Committing and pushing..."
	@git add -A
	@git commit -m "$(MSG)" || echo "• Nothing to commit"
	@git push
	@echo "✅ Push complete."
time:
	python3 time_spent.py

# ============================================================
# Cleanup
# ============================================================

clean:
	@echo "🧹 Cleaning cache and artifacts..."
	@find . -type d -name "__pycache__" -exec rm -rf {} +
	@rm -rf .pytest_cache .mypy_cache build dist
	@echo "✅ Cleanup complete."
.PHONY: schema-update
schema-update:
	python3.9 -m pip install --quiet --disable-pip-version-check pyyaml
	python3.9 scripts/regen_schemas.py
	@if ! git diff --quiet -- app/schema_generated.py app/autodetect_rules_generated.py public/schema.generated.json; then \
		echo "Staging regenerated schema files..."; \
		git add app/schema_generated.py app/autodetect_rules_generated.py public/schema.generated.json; \
		echo "Committing…"; \
		git commit -m "chore(schema): regenerate schemas and rules after removing intent"; \
		echo "Pushing…"; \
		git push; \
	else \
		echo "No schema changes detected. Skipping commit/push."; \
	fi

