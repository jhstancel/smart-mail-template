# ============================================================
# Smart Mail Template — Developer Makefile
# ============================================================

SHELL := /bin/bash
PY := python3
VENV := .venv
UVICORN := uvicorn
APP := app.main:app
HOST ?= 127.0.0.1
PORT ?= 8000

# ============================================================
# Core Developer Commands
# ============================================================

.PHONY: help run serve fmt lint test train regen check-schema check-no-legacy dev push docs clean

help:
	@echo ""
	@echo "🧠 Smart Mail Template — Dev Commands"
	@echo "-----------------------------------"
	@echo "  make run              → Start FastAPI API with auto-reload"
	@echo "  make dev              → Regenerate schema + validate + run"
	@echo "  make fmt              → Auto-format all Python code"
	@echo "  make lint             → Run ruff and mypy lint checks"
	@echo "  make test             → Run pytest test suite"
	@echo "  make train            → Retrain ML models (autodetect classifier)"
	@echo "  make regen            → Regenerate YAML → generated artifacts"
	@echo "  make check-schema     → Validate generated files exist"
	@echo "  make check-no-legacy  → Verify old schema system fully removed"
	@echo "  make push             → Auto-format, commit, and push to GitHub"
	@echo "  make docs             → Rebuild and publish documentation"
	@echo "  make clean            → Remove cache, artifacts, and build files"
	@echo ""

# ============================================================
# Runtime / Server
# ============================================================

run:
	@echo "🚀 Starting FastAPI on http://${HOST}:${PORT}"
	@$(UVICORN) $(APP) --reload --host $(HOST) --port $(PORT)

serve: run

dev: regen check-schema check-no-legacy run

# ============================================================
# Code Quality
# ============================================================

fmt:
	@echo "🎨 Formatting code with black..."
	@$(PY) -m black app scripts tests
	@echo "🧹 Sorting imports..."
	@$(PY) -m isort app scripts tests

lint:
	@echo "🔍 Running lint checks..."
	@ruff check app scripts
	@$(PY) -m mypy app scripts

test:
	@echo "🧪 Running tests..."
	@pytest -v --disable-warnings

# ============================================================
# Model Training
# ============================================================

train:
	@echo "📈 Training autodetect classifier..."
	@$(PY) model/train.py
	@echo "✅ Model training complete."

# ============================================================
# Schema / Registry System
# ============================================================

regen:
	@echo "🔁 Regenerating intent schemas..."
	@$(PY) scripts/regen_schemas.py

check-schema:
	@echo "✅ Validating generated schema files..."
	@[ -f app/schema_generated.py ] && echo "✓ schema_generated.py exists" || (echo "✗ missing schema_generated.py"; exit 1)
	@[ -f app/autodetect_rules_generated.py ] && echo "✓ autodetect_rules_generated.py exists" || (echo "✗ missing autodetect_rules_generated.py"; exit 1)
	@[ -f public/schema.generated.json ] && echo "✓ schema.generated.json exists" || (echo "✗ missing schema.generated.json"; exit 1)

check-no-legacy:
	@echo "🔒 Checking for legacy files..."
	@if [ -f app/schema.py ] || [ -f app/intents_registry.py ] || [ -f app/schema.py.bak ] || [ -f app/intents_registry.py.bak ]; then \
		echo "❌ Legacy schema files detected (remove app/schema.py* and app/intents_registry.py*)"; \
		exit 1; \
	else \
		echo "✅ No legacy schema files present"; \
	fi

# ============================================================
# Git / Docs / Maintenance
# ============================================================

push:
	@echo "🧱 Running format + lint + test before push..."
	@make fmt
	@make lint
	@make test
	@echo "🚀 Committing and pushing..."
	@git add -A
	@git commit -m "chore(auto): auto-format, lint, test, and push"
	@git push
	@echo "✅ Push complete."

docs:
	@echo "📚 Building documentation..."
	@$(PY) scripts/docpush.sh
	@echo "✅ Documentation pushed."

clean:
	@echo "🧹 Cleaning cache and artifacts..."
	@find . -type d -name "__pycache__" -exec rm -rf {} +
	@find . -type d -name "*.egg-info" -exec rm -rf {} +
	@rm -rf .pytest_cache .mypy_cache build dist
	@echo "✅ Cleanup complete."
.PHONY: new-intent
new-intent:
	@echo "🧩 Launching New Intent Wizard..."
	@python3 scripts/new_intent.py
