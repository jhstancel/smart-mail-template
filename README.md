# Smart Mail Template

**Smart Mail Template** is a modular email-automation engine built for logistics, procurement, and operations workflows — with a vision to scale across industries.  
It turns structured YAML “intents” into validated form schemas, Jinja2 templates, and real-time UI generation.

---

## 🧩 Core Concept

Every email type (an *intent*) — quote request, order confirmation, invoice follow-up, etc. — is defined once in YAML.  
These YAMLs are compiled into Python + JSON schema, rendered by FastAPI, and surfaced through a responsive frontend at `ui/index.html`.  

```

YAML intent → preprocess.py → schema_generated.py + schema.generated.json → FastAPI → Web UI

````

This closed loop keeps the system consistent across validation, automation, and rendering.

---

## ⚙️ AI-Assisted Development Workflow

This project is developed and maintained using **ChatGPT as an integrated co-pilot**, not as an author.  
All commits are human-directed, tested, and reviewed. ChatGPT is used to:

- Automate repetitive file generation (`schema_generated.py`, `autodetect_rules_generated.py`)
- Enforce consistent commit formats and docstrings
- Accelerate schema refactors and UI logic iteration
- Maintain synchronized documentation across layers

The workflow emphasizes **human architecture + AI precision**, creating a disciplined development rhythm similar to continuous pair programming.

---

## 🚀 End-to-End User Flow

1. **Launch the API**
   ```bash
   uvicorn app.main:app --reload
```

The backend exposes `/generate`, `/autodetect`, `/schema`, and `/intents`.

2. **Open the UI**

   ```
   http://localhost:8000
   ```

   A clean interface auto-loads available intents, renders dynamic fields, and generates formatted emails in real time.

3. **Compose or Auto-Detect**

   * Choose an intent (e.g., *Order Request*).
   * Fill structured fields or paste a body for auto-detection.
   * Instantly preview subject + body with live updates.

4. **Copy & Send**

   * Copy directly into your email client.
   * Or export templates for integration with ERP, CRM, or support systems.

---

## 🧠 Architecture Overview

| Layer                    | Location                  | Purpose                                              |
| ------------------------ | ------------------------- | ---------------------------------------------------- |
| **Backend API**          | `app/main.py`             | FastAPI endpoints for schema, generation, autodetect |
| **Schema Compiler**      | `app/preprocess.py`       | Compiles `.yml` intents into Python + JSON schema    |
| **Frontend**             | `ui/index.html`           | Live form rendering + real-time preview              |
| **Templates**            | `templates/*.j2`          | Jinja2 email bodies per intent                       |
| **Model Training**       | `scripts/intent_model.py` | Classifies inbound emails by intent                  |
| **Testing & Validation** | `tests/`                  | Unit tests and schema checks                         |
| **Data**                 | `data/*.csv`              | Labeled messages for ML training                     |

---

## 🧰 Developer Setup

```bash
git clone https://github.com/yourname/smart-mail-template.git
cd smart-mail-template
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

Rebuild schemas after editing any YAML intent:

```bash
make regen
```

Run API locally:

```bash
make run
```

Run tests:

```bash
make test
```

Validate repo integrity before commits:

```bash
make validate
```

---

## 👥 User Setup

1. Visit the hosted or local UI.
2. Select an intent or use auto-detect.
3. Fill in the requested fields.
4. Copy the generated message into your email client.

Optional: toggle **live preview**, **compose animation**, or **global defaults** (shipping address, FedEx account) in Settings.

---

## 🌐 Cross-Industry Vision

Smart Mail began as an aerospace logistics tool but is structured for broader use:

* Manufacturing → automated purchase confirmations
* Supply chain → shipment updates + vendor RFQs
* Finance → invoice/payment messaging
* Customer operations → follow-ups, notifications, service requests

Each intent can be customized or added via `scripts/new_intent.py` and compiled into the unified system.

---

## 📁 Repository Layout

```
app/                FastAPI runtime + schema generation
configs/            Rules & intent registry (legacy)
data/               Training datasets
intents/registry/   YAML intent definitions
model/              ML classifier and vectorizer
model_artifacts/    Serialized model assets
public/             Exposed JSON schema
scripts/            Automation, data prep, schema regen
templates/          Email templates (Jinja2)
tests/              Pytest suites
ui/                 Frontend interface
```

---

## 🧪 Example Intent

```yaml
id: order_request
label: Order Request
required: [recipientName, fedexAccount, shipAddress, parts]
optional: [notes]
```

**Generated Email (excerpt)**

```text
Hi UP Aviation Receiving,

Can you please process the following order for me?

• Part Number: PN-10423 | Quantity: 2
Please ship on FedEx account 228448800.
Shipping address: 123 Innovation Dr, Dallas TX 75001
```

---

## 🧭 Vision & Philosophy

**Smart Mail Template** is built to serve as a *universal communication layer* — translating structured operational data into clear, professional correspondence.
The architecture is intentionally transparent, schema-driven, and automation-ready, aiming to be embedded in logistics, ERP, or service systems across industries.

---

## 📄 License

Licensed under the MIT License.
See `LICENSE` for details.

---

## 🤝 Contributing

Pull requests are welcome.
Run `make validate` before committing to ensure schema and template consistency.
For new intents, use:

```bash
python3 scripts/new_intent.py
```

and follow interactive prompts to generate YAML, template, and schema updates automatically.

---

**Smart Mail Template** — *structured communication, human-verified automation.*

