# ops-mail-studio

Recipient-aware email template generator for operations/logistics teams.

## What it does
- Predicts a likely **intent** (e.g., quote request, order confirmation, delay notice) using:
  - a small **TF-IDF classifier** over past emails, and
  - **recipient history priors** (what you usually send to that contact).
- Generates complete emails from **Jinja templates** with a **required-field checklist**.

## Quickstart
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# (1) Add/prepare data
# Put your historical emails in data/emails.csv (columns: to, subject, body, intent)

# (2) Train model + build priors
python model/train.py

# (3) Run API
uvicorn app.main:app --reload
# Open Swagger at http://127.0.0.1:8000/docs

API

    POST /predict → top-3 intents with scores (recipient-aware)

    POST /generate → subject/body + list of missing required fields

Example: /predict

{
  "to": "buyer@vendor.com",
  "subject": "RE: PN-4812 lead time",
  "body_hint": "Following up on quote..."
}

Example: /generate

{
  "intent": "order_confirmation",
  "fields": {
    "customerName": "AeroTech LLC",
    "partNumber": "PN-4812",
    "quantity": 3,
    "vendor": "Textron",
    "poNumber": "PO-00917",
    "shipDate": "2025-06-21",
    "leadTime": "5–7 business days"
  }
}

Data & privacy

    Get written permission to use archives.

    Strip signatures/PII where not needed.

    Do not commit private datasets.

Extend

    Add templates in templates/ and map them in configs/intents.json.

    Add rules in configs/rules.json.

    Swap classifier for embeddings later if needed.
