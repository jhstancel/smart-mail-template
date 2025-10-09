import os, re, hashlib, joblib, sys
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

ROOT = os.path.dirname(os.path.dirname(__file__))
DATA = os.path.join(ROOT, "data", "emails.labeled.train.csv")  # <-- labeled file
OUT = os.path.join(ROOT, "model_artifacts")
os.makedirs(OUT, exist_ok=True)


def hash_canon(subj, body):
    h = hashlib.sha1()
    h.update((f"{subj}\n{body}").lower().encode("utf-8", "ignore"))
    return h.hexdigest()


def normalize_domain(to_addr: str) -> str:
    to_addr = (to_addr or "").lower().strip()
    if "@" not in to_addr:
        return ""
    return to_addr.split("@", 1)[1]


def main():
    if not os.path.exists(DATA):
        print(f"[error] missing {DATA}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(DATA).fillna("")
    # expected columns: to, to_domain (optional), subject, body, intent
    if "intent" not in df.columns:
        print("[error] 'intent' column not found in CSV.", file=sys.stderr)
        sys.exit(2)

    # safety dedupe
    df["canon"] = df.apply(
        lambda r: hash_canon(r.get("subject", ""), r.get("body", "")), axis=1
    )
    df = df.drop_duplicates("canon").drop(columns=["canon"])

    # build text and drop empties
    df["text"] = (df.get("subject", "") + " || " + df.get("body", "")).str.lower()
    df["text"] = df["text"].str.replace(r"\s+", " ", regex=True).str.strip()
    df = df[df["text"].str.len() > 0]

    # labeled subset for training
    train = df[df["intent"].astype(str).str.strip() != ""].copy()
    n_labels = len(train)
    if n_labels < 25:
        print(
            "Warning: very few labeled rows; classifier may be weak.", file=sys.stderr
        )
    # ensure at least 2 classes
    classes = sorted(train["intent"].unique().tolist())
    if len(classes) < 2:
        print(
            f"[error] need at least 2 intent classes to train; found: {classes}",
            file=sys.stderr,
        )
        sys.exit(3)

    # Vectorize (min_df=1 avoids 'empty vocabulary')
    vec = TfidfVectorizer(
        ngram_range=(1, 2),
        min_df=1,
        max_df=0.99,
        token_pattern=r"(?u)\b\w\w+\b",
        strip_accents="unicode",
    )
    X = vec.fit_transform(train["text"].tolist())
    y = train["intent"].tolist()

    clf = LogisticRegression(max_iter=500, class_weight="balanced")
    clf.fit(X, y)

    joblib.dump(vec, os.path.join(OUT, "vectorizer.pkl"))
    joblib.dump(clf, os.path.join(OUT, "clf.pkl"))

    # Recipient priors (from labeled rows only)
    prior_recipient = {}
    for to_addr, intent in zip(train.get("to", "").str.lower(), y):
        if not to_addr or not intent:
            continue
        prior_recipient.setdefault(to_addr, {}).setdefault(intent, 0)
        prior_recipient[to_addr][intent] += 1
    joblib.dump(prior_recipient, os.path.join(OUT, "recipient_prior.pkl"))

    # Domain priors (use to_domain if present, else derive)
    dom_series = (
        train["to_domain"]
        if "to_domain" in train.columns
        else train["to"].map(normalize_domain)
    )
    prior_domain = {}
    for dom, intent in zip(dom_series.str.lower(), y):
        if not dom or not intent:
            continue
        prior_domain.setdefault(dom, {}).setdefault(intent, 0)
        prior_domain[dom][intent] += 1
    joblib.dump(prior_domain, os.path.join(OUT, "domain_prior.pkl"))

    print(f"[ok] trained on {n_labels} rows; classes={classes}")
    print(f"[ok] artifacts -> {OUT}")


if __name__ == "__main__":
    main()
