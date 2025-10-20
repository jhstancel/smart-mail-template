# Smart Mail Template

Smart Mail Template helps you write clear, professional emails using saved templates.  
You can load built-in ones, make your own, or drop in new templates right from the browser.  
It’s made to save time for people who send similar messages all the time (like in logistics, sales, or customer support).

## What It Does

Every email type is called an *intent*.  
Each intent has its own fields (like name, date, PO number) and template.  
You can select one, fill it out, and instantly get a formatted email ready to copy.

You can also:
- Load templates directly from your computer in the UI  
- Edit the fields live and see changes immediately  
- Save drafts locally in your browser

```

YAML intent → schema → template → live email preview

````

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

1. Choose an intent from the dropdown, or upload your own `.yml` template file.
2. Fill out the fields (the preview updates as you type).
3. Copy the final email into your email client.
4. Optional: Save a template locally to reuse later.

Everything runs in your browser. Nothing gets uploaded.

## Project Layout

```
app/           Backend and schema generation
intents/       YAML intent files
templates/     Email templates (Jinja2)
ui/            Web interface
scripts/       Tools for rebuilding schemas and training models
```

## Local Templates

If you have a custom `.yml` intent or `.j2` template:

1. Click “Upload Local Template” in the UI.
2. It’ll load instantly and appear in your intent list.
3. You can test it, edit it, and download it again.

This lets you experiment without touching the main repo files.

## License

MIT (free to use and modify)
