# Smart Mail Template

Smart Mail Template is a project for generating clean, structured emails from pre-defined templates.  
It started as a tool for logistics and aerospace work, but it can be used anywhere — manufacturing, shipping, finance, or support — basically anywhere people send the same kinds of emails over and over.

---

## What It Does

Each type of email (called an *intent*) is written once in a small YAML file.  
That YAML defines what fields are needed and what the email should look like.  
The backend reads those, builds a schema, and renders Jinja2 templates through a FastAPI server.  
The frontend (in `ui/index.html`) shows the fields live, lets you generate text, and copy it right into an email.

Simple idea:
```

YAML intent → preprocess.py → schema + templates → FastAPI → UI → Email

````

---

## Vision

The goal is to make this work for any company or industry without code changes.  
You could build a new set of templates for quotes, orders, invoices, or customer follow-ups, and it would just work after running one command.  
It’s meant to feel simple — fill out boxes, hit generate, copy, send.

---

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

Then open:

```
http://localhost:8000
```

### Edit or add templates

All templates live under `intents/registry/` and `templates/`.
You can make a new one with:

```bash
python3 scripts/new_intent.py
```

It’ll walk you through everything and rebuild the schema.

---

## Project Layout

```
app/           FastAPI backend + schema generation
intents/       YAML intent files (source of truth)
templates/     Email templates (Jinja2)
ui/            Frontend interface (index.html)
scripts/       Tools for schema regen, training, etc.
model/         Intent detection model
tests/         Basic tests
```

---

## Workflow

* Write or edit a `.yml` intent file
* Run `make regen` to rebuild schema files
* Start the app → `/generate`, `/schema`, `/autodetect` endpoints
* Open the UI → fill fields → preview → copy → send

The frontend also supports auto-detect — you can type a quick draft and it will guess the right intent.

---

## AI-Assisted Development

I use ChatGPT to help write updates, format commits, and fix logic quickly.
Every change still goes through human review and testing.
It’s basically a co-pilot that speeds things up and keeps the repo clean.

---

## License

MIT — free to use, fork, and build on.

