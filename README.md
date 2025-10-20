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

