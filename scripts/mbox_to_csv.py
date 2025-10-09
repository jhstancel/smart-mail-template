import os, sys, csv, email, re
from email import policy
from email.utils import getaddresses
from app.preprocess import clean_subject_body, canon_text

ADDR_RE = re.compile(r"[^@<\s]+@[^>\s]+")


def primary_to_and_domain(hdr: str):
    if not hdr:
        return "", ""
    addrs = [a[1] for a in getaddresses([hdr]) if a[1]]
    if not addrs:
        return "", ""
    primary = addrs[0].lower().strip()
    m = ADDR_RE.search(primary)
    if not m:
        return primary, ""
    addr = m.group(0)
    domain = addr.split("@", 1)[1]
    return addr, domain


def extract_text(msg):
    if msg.is_multipart():
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
    # Apple Mail: .mbox is a folder with Messages/*.emlx
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
        print(
            "usage: python scripts/mbox_to_csv.py <INBOX.mbox|mbox-folder> data/emails.csv"
        )
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(os.path.dirname(dst), exist_ok=True)

    seen = set()
    kept = 0

    with open(dst, "w", newline="") as out:
        w = csv.writer(out)
        # include to_domain for better priors
        w.writerow(["to", "to_domain", "subject", "body", "intent"])
        for msg in iter_messages(src):
            to_addr, to_domain = primary_to_and_domain(msg.get("to"))
            subj = (msg.get("subject") or "").strip()
            body_raw, is_html = extract_text(msg)
            subj_clean, body_clean = clean_subject_body(subj, body_raw, is_html)

            if not (subj_clean or body_clean):
                continue

            key = canon_text(subj_clean, body_clean)
            if key in seen:
                continue
            seen.add(key)

            w.writerow([to_addr, to_domain, subj_clean, body_clean, ""])
            kept += 1

    print(f"Wrote {kept} rows to {dst}")


if __name__ == "__main__":
    main()
