# Smart Mail Template

Smart Mail Template helps you write clear, professional emails using saved templates.  
You can load built-in ones or make your own right in the app.  
It’s made to save time for people who send similar messages all the time (like in logistics, sales, or customer support).

## What It Does

Every email type is called an *intent*.  
Each intent has its own fields (like name, date, PO number) and template.  
You can select one, fill it out, and instantly get a formatted email ready to copy.

You can also:
- Edit the fields live and see changes immediately 
- Make your own intents inside the app
- Make the generation of the email from the fields have a typing animation
- Find easter eggs in the website
- Select the intents you like, remove the ones you don't
- Use the Auto Detect feature! 

## Vision

The goal is to make structured communication simple and reusable.  
Anyone should be able to take this project, add their own templates, and use it for their company without any coding.  
All data stays local, and you can customize the workflow however you want.

## Getting Started

### Run locally
```bash
git clone https://github.com/yourname/smart-mail-template.git
cd smart-mail-template
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
````

Then open this in your browser:

```
http://127.0.0.1:8000/ui/
```

### Using the App

1. Choose an intent from the dropdown, or make your own using client.
2. Fill out the fields (the preview updates as you type).

Everything runs in your browser. Nothing gets uploaded.


#### Auto Detect
*to be written*


## Project Layout

```
app/           Backend and schema generation
intents/       YAML intent files
templates/     Email templates (Jinja2)
ui/            Web interface
scripts/       Tools for rebuilding schemas and training models
```

## Local Templates

You can also add local templates using the UI (open settings > My Templates > New).

## License

MIT (free to use and modify)

## Tree
├── CONTRIBUTING.md
├── LICENSE
├── Makefile
├── README.md
├── app
│   ├── __init__.py
│   ├── __pycache__
│   │   ├── __init__.cpython-313.pyc
│   │   ├── __init__.cpython-39.pyc
│   │   ├── autodetect_rules_generated.cpython-313.pyc
│   │   ├── autodetect_rules_generated.cpython-39.pyc
│   │   ├── intents_registry.cpython-313.pyc
│   │   ├── intents_registry.cpython-39.pyc
│   │   ├── main.cpython-313.pyc
│   │   ├── main.cpython-39.pyc
│   │   ├── preprocess.cpython-313.pyc
│   │   ├── preprocess.cpython-39.pyc
│   │   ├── schema.cpython-313.pyc
│   │   ├── schema.cpython-39.pyc
│   │   ├── schema_generated.cpython-313.pyc
│   │   └── schema_generated.cpython-39.pyc
│   ├── autodetect_rules_generated.py
│   ├── main.py
│   ├── preprocess.py
│   └── schema_generated.py
├── configs
│   ├── intents.json
│   └── rules.json
├── data
│   ├── emails.csv
│   ├── emails.filtered.csv
│   ├── emails.labeled.csv
│   ├── emails.labeled.train.csv
│   └── emails.labeled.val.csv
├── intents
│   └── registry
│       ├── auto_detect.yml
│       ├── delay_notice.yml
│       ├── followup.yml
│       ├── invoice_payment.yml
│       ├── invoice_po_followup.yml
│       ├── order_confirmation.yml
│       ├── order_request.yml
│       ├── packing_slip_docs.yml
│       ├── qb_order.yml
│       ├── quote_request.yml
│       ├── shipment_update.yml
│       └── tax_exemption.yml
├── intents_registry.py
├── model
│   ├── __init__.py
│   ├── __pycache__
│   │   ├── __init__.cpython-313.pyc
│   │   └── train.cpython-313.pyc
│   └── train.py
├── model_artifacts
│   ├── clf.pkl
│   ├── domain_prior.pkl
│   ├── recipient_prior.pkl
│   └── vectorizer.pkl
├── public
│   └── schema.generated.json
├── requirements.txt
├── scripts
│   ├── __pycache__
│   │   ├── eval_autodetect.cpython-313.pyc
│   │   ├── filter_csv.cpython-313.pyc
│   │   ├── intent_model.cpython-313.pyc
│   │   ├── intent_model.cpython-39.pyc
│   │   ├── mbox_to_csv.cpython-313.pyc
│   │   ├── mine_low_confidence.cpython-313.pyc
│   │   └── split_train_val.cpython-313.pyc
│   ├── docpush.sh
│   ├── eval_autodetect.py
│   ├── filter_csv.py
│   ├── gitpush.sh
│   ├── ingest_example.py
│   ├── intent_model.py
│   ├── mbox_to_csv.py
│   ├── mine_low_confidence.py
│   ├── new_intent.py
│   ├── regen_schemas.py
│   ├── render_preview.py
│   ├── split_train_val.py
│   └── validate_repo.py
├── snapshot-2025-10-18-1943.zip
├── templates
│   ├── delay_notice.j2
│   ├── followup.j2
│   ├── invoice_payment.j2
│   ├── invoice_po_followup.j2
│   ├── order_confirmation.j2
│   ├── order_request.j2
│   ├── packing_slip_docs.j2
│   ├── qb_order.j2
│   ├── quote_request.j2
│   ├── shipment_update.j2
│   └── tax_exemption.j2
├── tests
│   ├── __pycache__
│   │   ├── test_api.cpython-313-pytest-8.4.2.pyc
│   │   └── test_api.cpython-39-pytest-8.4.2.pyc
│   ├── test_api.py
│   └── test_registry_valid.py
├── time_spent.py
└── ui
    ├── img
    │   ├── evil-larry.png
    │   └── favicon.png
    └── index.html
