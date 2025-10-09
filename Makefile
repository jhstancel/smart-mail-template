# --- Smart Mail Template Makefile ---

# Use python3 by default; override with: make <target> PYTHON=python
PYTHON ?= .venv/bin/python

# Tools (override if needed)
BLACK ?= black
FLAKE8 ?= flake8
UVICORN ?= uvicorn
PYTEST ?= pytest
PRECOMMIT ?= pre-commit

.PHONY: help install run test validate train fmt lint precommit \
        new-intent preview clean

# Default target
help:
	@echo "Smart Mail Template — common tasks"
	@echo ""
	@echo "make install           Install dependencies"
	@echo "make run               Start dev server (FastAPI on :8000)"
	@echo "make test              Run tests (pytest)"
	@echo "make validate          Validate configs <-> templates (repo validator)"
	@echo "make train             Retrain model artifacts"
	@echo "make fmt               Format code (black)"
	@echo "make lint              Lint code (flake8)"
	@echo "make precommit         Run all pre-commit hooks"
	@echo "make new-intent name=<slug> fields=\"a,b,c\" [title=...] [rules=\"k1,k2\"] [example=\"...\"]"
	@echo "make preview intent=<slug> [kv=\"key=val key2=val2\"]"
	@echo "make clean             Remove caches/__pycache__"

# --- Core dev tasks ---

install:
	$(PYTHON) -m pip install -r requirements.txt

run:
	$(UVICORN) app.main:app --reload

test:
	$(PYTHON) -m pytest -q

validate:
	$(PYTHON) scripts/validate_repo.py

train:
	$(PYTHON) -m model.train

fmt:
	$(BLACK) app model scripts tests

lint:
	$(FLAKE8) app model scripts tests

precommit:
	$(PRECOMMIT) run --all-files

# --- Scaffolding helpers ---

# Example:
# make new-intent name=return_merchandise_authorization fields="customerName,rmaNumber,itemsSummary,senderName" title="RMA Request" rules="rma,return,authorization" example="Please confirm RMA 123"
new-intent:
	@if [ -z "$(name)" ] || [ -z "$(fields)" ]; then \
	  echo "Usage: make new-intent name=<slug> fields=\"a,b,c\" [title=\"Subject Title\"] [rules=\"k1,k2\"] [example=\"Example text\"]"; \
	  exit 1; \
	fi
	@$(PYTHON) scripts/new_intent.py --name "$(name)" --fields "$(fields)" $(if $(title),--title "$(title)",) $(if $(rules),--rules "$(rules)",) $(if $(example),--example "$(example)",) --yes

# Example:
# make preview intent=quote_request
# make preview intent=quote_request kv='customerName="Jane Doe" quantity=10 partNumber=PN-123'
preview:
	@if [ -z "$(intent)" ]; then \
	  echo "Usage: make preview intent=<intent> [kv=\"key=val key2=val2\"]"; \
	  exit 1; \
	fi
	@$(PYTHON) scripts/render_preview.py --intent "$(intent)" $(foreach pair,$(kv),--kv $(pair))

# --- Utilities ---

clean:
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true

