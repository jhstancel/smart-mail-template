# Smart Mail Template

Smart Mail Template is a lightweight email automation tool that generates polished, context-aware messages for business workflows.  
Each **intent** (e.g., *quote request*, *shipment update*) has its own polite, professional email template powered by **FastAPI**, **Jinja2**, and a simple interactive UI.

---

##  Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
````

### 2. Run the FastAPI server

```bash
uvicorn app.main:app --reload
```

The API will start at [http://localhost:8000](http://localhost:8000)

### 3. Open the UI

Simply open:

```
ui/index.html
```

in your browser.
You’ll get a theme-aware, animated interface with typing effects, theme selection, and a few hidden easter eggs.

---

##  Project Structure

```
.
├── app/                     # FastAPI backend
│   ├── main.py              # API routes (/health, /schema, /generate)
│   └── preprocess.py        # Input cleaning and preprocessing
│
├── configs/                 # Intent definitions and routing rules
│   ├── intents.json         # Defines required fields per intent
│   └── rules.json           # Optional keyword-based routing rules
│
├── templates/               # Jinja2 templates for each email intent
│   ├── quote_request.j2
│   ├── shipment_update.j2
│   ├── order_confirmation.j2
│   ├── invoice_payment.j2
│   ├── packing_slip_docs.j2
│   ├── followup.j2
│   └── delay_notice.j2
│
├── ui/                      # Frontend (HTML/CSS/JS)
│   └── index.html
│
├── model/                   # Training and model persistence
│   ├── train.py
│   └── __init__.py
│
├── data/                    # Training and labeled email datasets
│
├── tests/                   # Automated tone and endpoint tests
│   └── test_api.py
│
├── requirements.txt
└── README.md
```

---

##  API Overview

| Endpoint    | Method | Description                                            |
| ----------- | ------ | ------------------------------------------------------ |
| `/health`   | GET    | Returns model and system status                        |
| `/schema`   | GET    | Lists all available intents and required fields        |
| `/generate` | POST   | Generates a polite email for a given intent and inputs |

**Example Request**

```json
{
  "intent": "quote_request",
  "fields": {
    "customerName": "John Doe",
    "partNumber": "PN-4812",
    "quantity": "5",
    "needByDate": "2025-10-15"
  }
}
```

**Example Response**

```json
{
  "subject": "Pricing & Lead Time Request – PN-4812 (Qty 5)",
  "body": "Hi John Doe,\n\nCould you please provide pricing and lead time..."
}
```

---

##  Running Tests

All tests use [pytest](https://docs.pytest.org/).

```bash
pytest -q
```

Tests include:

* `/health` and `/schema` validation
* `/generate` endpoint coverage for all intents
* Automated **tone testing** — ensures every template includes a greeting and a thank-you.

---

##  Adding a New Intent / Template

You can add new email templates in under a minute.

### 1. Create a Template

Add a file to `/templates/`, named after your new intent:

```
templates/return_merchandise_authorization.j2
```

Write a polite, structured Jinja2 template:

```jinja2
Subject: RMA Request – {{ rmaNumber }}

Hi {{ customerName }},

I hope you're doing well. Could you please confirm receipt of RMA {{ rmaNumber }} 
for {{ itemsSummary }}?

Thank you for your help,
{{ senderName }}
```

---

### 2. Define Required Fields

Open `configs/intents.json` and add:

```json
{
  "return_merchandise_authorization": {
    "required": ["customerName", "rmaNumber", "itemsSummary", "senderName"]
  }
}
```

This tells the UI and `/schema` which inputs to display.

---

### 3. (Optional) Add Rules for Auto-Detection

If you use rule-based hints, update `configs/rules.json`:

```json
{
  "return_merchandise_authorization": ["rma", "return", "authorization"]
}
```

---

### 4. Done!

* The new template appears automatically in the UI.
* `/generate` can now render it directly.
* (Optional) Add labeled training examples in `data/emails.labeled.train.csv` if you want the ML model to detect it automatically.

---

##  Template Consistency Guidelines

* Always begin with a **friendly greeting** (`Hi`, `Hello`, `Dear`).
* End with **thanks or appreciation** (tests depend on it).
* Keep your tone concise, polite, and confident.
* Use bullet points for structured data (POs, dates, tracking, etc.).
* Every template should include:

  * `Subject:` line at the top.
  * Greeting with a name or fallback.
  * Signature like `{{ senderName }}` or “The [Company] Team.”

---

##  Configuration Overview

* **`configs/intents.json`**
  Defines which fields the user must fill in for each intent.
* **`configs/rules.json`**
  Maps intent keywords for rule-based routing (optional).
* **`model/train.py`**
  Retrains the classifier if you want new intents to be auto-detected.
* **`data/emails.labeled.train.csv`**
  Holds training samples used during model retraining.

---

##  Retraining the Classifier (optional)

If you add new intents that should be detected automatically:

1. Append labeled examples to:

   ```
   data/emails.labeled.train.csv
   ```
2. Run:

   ```bash
   python -m model.train
   ```
3. Updated artifacts (`clf.pkl`, `vectorizer.pkl`, etc.) will appear under:

   ```
   model_artifacts/
   ```

Manual selection in the UI works without retraining.

---

##  Testing Notes

* The new `tests/test_api.py` automatically checks every intent listed in `/schema`.
* It ensures:

  * A valid subject/body pair are returned.
  * The body includes a greeting and a thank-you.
* To run:

  ```bash
  pytest -q
  ```
* Add new templates confidently — no test file edits are needed.

---

##  UI Overview

The frontend (`ui/index.html`) includes:

*  **Settings Menu:** theme selection + animation toggles
*  **Easter Eggs:**

  * Type **“follow the white rabbit”** → Rabbit animation
  * Hover the gear for Minecraft-style splash messages
  * Press **Ctrl/⌘ + Alt + C** → Corruption sequence with “reboot” animation
*  **Themes:**

  * Light Minimal (default)
  * Dark Minimal
  * Cosmic
  * Dusk Gradient
  * Forest Mist

---

##  Development Notes

* The UI fetches available intents dynamically from `/schema`.
* Templates are rendered at runtime with **Jinja2**.
* The confidence threshold for auto-detection appears in `/health`.

To retrain the model manually:

```bash
python -m model.train
```

---

##  Code Style

* Template variables use **camelCase** (`customerName`, `shipDate`).
* Keep phrasing short, direct, and polite.
* Avoid hard-coding names, dates, or product numbers — always use variables.
* The tone should remain neutral and professional, not overly casual.

---

##  Final Setup Checklist

| Task                     | Command / Action                   |
| ------------------------ | ---------------------------------- |
| Install dependencies     | `pip install -r requirements.txt`  |
| Run API server           | `uvicorn app.main:app --reload`    |
| Open the UI              | `ui/index.html`                    |
| Run tests                | `pytest -q`                        |
| Retrain model (optional) | `python -m model.train`            |
| Add new intent/template  | Follow “Adding a New Intent” above |

---

##  License

This project is open-source under the [MIT License](LICENSE).

---

##  Maintainers

Created and maintained by **John Stancel** and contributors.
Feel free to fork, extend, or improve — pull requests are always welcome.

```

---

### Commit message
```

docs(readme): add complete Smart Mail Template README with setup, API usage, testing, and template creation guide

* Full project overview, quick start, and directory layout
* Added clean walkthrough for adding new intents/templates
* Included retraining, UI easter eggs, tone guidelines, and testing instructions
