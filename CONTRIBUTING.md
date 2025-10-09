# Contributing

## Workflow
1. Create a branch: `feat/<slug>` or `fix/<slug>`
2. Make your changes
3. Run locally:
   - `make validate`
   - `pytest -q`
4. Open a PR using the template checklist

## Adding a New Intent
1. Add `templates/<intent>.j2` (start with a `Subject:` line, include greeting + thanks)
2. Update `configs/intents.json` with required fields
3. (Optional) Add `configs/rules.json` hints
4. (Optional) Add training examples and `make train` to refresh model artifacts
5. Update README if the change is user-visible

## Pre-commit
Install hooks:
```bash
pip install pre-commit
pre-commit install

