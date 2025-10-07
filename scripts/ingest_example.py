# scripts/ingest_example.py
# Convert a simple JSONL export to emails.csv (adjust to your source)
import json, csv, sys

# usage: python scripts/ingest_example.py raw.jsonl data/emails.csv
src, dst = sys.argv[1], sys.argv[2]
with open(src, "r") as f, open(dst, "w", newline="") as out:
    w = csv.writer(out)
    w.writerow(["to","subject","body","intent"])
    for line in f:
        obj = json.loads(line)
        w.writerow([
            obj.get("to","").lower(),
            obj.get("subject",""),
            obj.get("body",""),
            obj.get("intent","")
        ])
print("wrote", dst)

