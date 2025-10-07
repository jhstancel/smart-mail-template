import os, sys, csv, email
from email import policy
from app.preprocess import clean_subject_body, canon_text

def extract_text(msg):
    if msg.is_multipart():
        # prefer text/plain; fall back to text/html
        txt, html = "", ""
        for part in msg.walk():
            ct = (part.get_content_type() or "").lower()
            if ct == "text/plain":
                txt += (part.get_payload(decode=True) or b"").decode(errors="ignore")
            elif ct == "text/html":
                html += (part.get_payload(decode=True) or b"").decode(errors="ignore")
        if txt:
            return txt, False
        if html:
            return html, True
        return "", False
    else:
        ct = (msg.get_content_type() or "").lower()
        payload = (msg.get_payload(decode=True) or b"").decode(errors="ignore")
        return payload, (ct == "text/html")

def iter_messages(path):
    # Apple Mail: .mbox as a *folder* with Messages/*.emlx
    if os.path.isdir(path) and path.endswith(".mbox"):
        messages_dir = os.path.join(path, "Messages")
        for root, _, files in os.walk(messages_dir):
            for f in files:
                if f.endswith(".emlx"):
                    with open(os.path.join(root, f), "rb") as fh:
                        msg = email.message_from_binary_file(fh, policy=policy.default)
                        yield msg
        return
    # Standard mbox file
    import mailbox
    m = mailbox.mbox(path)
    for msg in m:
        yield msg

def main():
    if len(sys.argv) != 3:
        print("usage: python scripts/mbox_to_csv.py <INBOX.mbox|mbox-folder> data/emails.csv")
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.dirname(dst), exist_ok=True)

    seen = set()  # for dedup
    kept = 0
    with open(dst, "w", newline="") as out:
        w = csv.writer(out)
        w.writerow(["to","subject","body","intent"])
        for msg in iter_messages(src):
            to = (msg["to"] or "").strip()
            subj = (msg["subject"] or "").strip()
            body_raw, is_html = extract_text(msg)
            subj_clean, body_clean = clean_subject_body(subj, body_raw, is_html)

            # drop empties
            if not (subj_clean or body_clean): 
                continue

            # de-dup by canonical text
            key = canon_text(subj_clean, body_clean)
            if key in seen:
                continue
            seen.add(key)

            w.writerow([to, subj_clean, body_clean, ""])
            kept += 1
    print(f"Wrote {kept} rows to {dst}")

if __name__ == "__main__":
    main()
# Example:
# python scripts/mbox_to_csv.py "/Users/you/Desktop/INBOX.mbox" data/emails.csv

