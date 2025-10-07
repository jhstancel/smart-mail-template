import os, re, sys, json
import pandas as pd

# Paths
ROOT = os.path.dirname(os.path.dirname(__file__))
RULES_PATH = os.path.join(ROOT, "configs", "filter.json")
RAW = os.path.join(ROOT, "data", "emails.csv")
OUT = os.path.join(ROOT, "data", "emails.filtered.csv")

# ------------------------------------------------------------
# Helper functions
# ------------------------------------------------------------

def load_rules(path):
    if not os.path.exists(path):
        return {
            "block_domains": [],
            "block_subject_keywords": [],
            "block_body_keywords": [],
            "min_body_chars": 120,
            "min_unique_words": 25,
        }
    with open(path, "r") as f:
        return json.load(f)

def domain_of(addr: str):
    if not addr or "@" not in addr:
        return ""
    return addr.split("@", 1)[1].lower()

def any_keyword(text: str, keywords):
    t = (text or "").lower()
    return any(k in t for k in keywords)

def token_count(text: str):
    return len(set(re.findall(r"[a-z]{3,}", (text or "").lower())))

# ---------- Top-authored extraction (key fix) ----------
QUOTE_START = re.compile(
    r"(?im)^(?:"
    r">+|"
    r"on .+ wrote:|"
    r"from:\s|"
    r"sent:\s|"
    r"subject:\s|"
    r"to:\s|"
    r"cc:\s|"
    r"bcc:\s|"
    r"-{2,}\s*original message\s*-{2,}|"
    r"-{2,}\s*forwarded message\s*-{2,}|"
    r"forwarded message"
    r")"
)

def top_authored_segment(text: str) -> str:
    """
    Returns the message content authored at the top of the email
    (everything before quote headers/markers).
    """
    if not text:
        return ""
    lines = text.splitlines()
    out = []
    for ln in lines:
        if QUOTE_START.match(ln):
            break
        if re.match(r"^\s*>+", ln):  # quoted line
            break
        out.append(ln)
    # Trim trailing empty lines
    while out and not out[-1].strip():
        out.pop()
    return "\n".join(out).strip()

# ---------- Filters ----------
COURTESY_KWS = [
    "thank you", "thanks", "got it", "appreciate", "no problem",
    "you're welcome", "you are welcome", "sounds good", "perfect",
    "will do", "ok", "okay", "great, thanks", "thank you!"
]

SIG_KWS = [
    "best regards", "kind regards", "sent from my", "cheers,", "sincerely",
    "thanks,", "regards,", "respectfully"
]

def is_courtesy_top(subj: str, body: str, max_len_words: int = 20) -> bool:
    top = (top_authored_segment(body) or "").lower()
    text = f"{subj or ''} {top}".lower()
    if len(top.split()) <= max_len_words and any(k in text for k in COURTESY_KWS):
        return True
    return False

def is_signature_only_top(body: str, max_len_words: int = 12) -> bool:
    top = (top_authored_segment(body) or "").lower()
    words = len(re.findall(r"\w+", top))
    if words <= max_len_words and any(k in top for k in SIG_KWS):
        return True
    return False

def is_short_or_filler_subject(subj: str) -> bool:
    s = (subj or "").lower().strip()
    if len(s) < 6 or s in {"-", "//", "re:", "fwd:"}:
        return True
    return False

def is_auto_generated(text: str) -> bool:
    t = (text or "").lower()
    return any(k in t for k in [
        "unsubscribe", "notification", "do not reply", "no-reply", "noreply",
        "auto-generated", "automated message", "privacy policy",
        "update preferences", "email preferences", "marketing email",
        "follow us", "visit our website"
    ])

def is_forward_without_new_content(body: str, min_top_words: int = 20) -> bool:
    t = (body or "").lower()
    if "forwarded message" in t or QUOTE_START.search(t):
        top = top_authored_segment(body)
        if len(top.split()) < min_top_words:
            return True
    return False

# ------------------------------------------------------------
# Main filtering logic
# ------------------------------------------------------------

def main():
    rules = load_rules(RULES_PATH)
    if not os.path.exists(RAW):
        print(f"[error] missing data/emails.csv")
        sys.exit(1)

    df = pd.read_csv(RAW).fillna("")
    before = len(df)
    print(f"[filter] loaded {before} rows")

    keep = pd.Series(True, index=df.index)

    # Compute top-authored snippet once for efficiency
    df["top_authored"] = df["body"].apply(top_authored_segment)

    # Drop courtesy-only / signature-only top segments
    courtesy = df.apply(lambda r: is_courtesy_top(r["subject"], r["body"]), axis=1)
    signature_only = df["body"].apply(is_signature_only_top)

    # Drop messages where the top-authored text is too short (even if long quoted thread)
    top_too_short = df["top_authored"].str.split().apply(len) < 12

    # Other filters
    short_subject = df["subject"].apply(is_short_or_filler_subject)
    auto_generated = df["body"].apply(is_auto_generated)
    forwarded_no_new = df["body"].apply(is_forward_without_new_content)

    # Combine
    keep &= ~(courtesy | signature_only | top_too_short | short_subject | auto_generated | forwarded_no_new)

    # Rules-based thresholds
    if rules.get("block_subject_keywords"):
        badsub = df["subject"].apply(lambda s: any_keyword(s, rules["block_subject_keywords"]))
        keep &= ~badsub
    if rules.get("block_body_keywords"):
        badbody = df["body"].apply(lambda s: any_keyword(s, rules["block_body_keywords"]))
        keep &= ~badbody

    # Domain-level filtering
    if "block_domains" in rules:
        df["to_domain"] = df.get("to_domain", "")
        if "to_domain" not in df.columns or df["to_domain"].eq("").all():
            df["to_domain"] = df["to"].apply(domain_of)
        for dom in rules["block_domains"]:
            keep &= ~df["to_domain"].str.contains(dom, case=False, na=False)

    # Fallback basic content requirements (after top-text checks)
    # Keep rows that have at least some authored content
    keep &= df["top_authored"].str.split().apply(len) >= 6

    # Optional thresholds from rules on FULL body (still useful for junk)
    if "min_body_chars" in rules:
        keep &= df["body"].str.len() >= rules["min_body_chars"]
    if "min_unique_words" in rules:
        uniq = df["body"].apply(token_count)
        keep &= uniq >= rules["min_unique_words"]

    filtered = df[keep].drop(columns=["top_authored"], errors="ignore").copy()
    after = len(filtered)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    filtered.to_csv(OUT, index=False)

    print(f"[filter] kept {after}/{before} rows ({before - after} removed)")
    print(f"[filter] wrote -> {OUT}")

if __name__ == "__main__":
    main()

