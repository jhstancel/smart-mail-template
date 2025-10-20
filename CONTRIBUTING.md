# Contributing

This project is designed to be easy to extend.  
You can add your own email types, test them, and share them back.

## How to Add a New Intent

1. Go to `intents/registry/`  
2. Copy an existing file like `order_request.yml`  
3. Rename it and update its fields (use clear names and hints)  
4. Add a matching Jinja2 file under `templates/` with the same name  
5. Run:

```bash
   make regen
```

This rebuilds the schema so your new intent shows up in the app.

## Testing

To check if everything works:

```bash
make run
```

Then open:

```
http://127.0.0.1:8000/ui/
```

Your new intent should appear in the dropdown.

## Editing Without Git

If you just want to try new templates without touching the repo,
you can upload `.yml` and `.j2` files directly in the browser.
They’ll load locally and won’t affect other users.

## Style Notes

* Use lowercase keys in YAML
* Keep examples short and realistic
* Test your template before pushing
* Always regenerate schemas after changes

