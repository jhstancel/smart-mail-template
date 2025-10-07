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
 
