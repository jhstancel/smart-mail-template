import os, re, hashlib, joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

ROOT = os.path.dirname(os.path.dirname(__file__))
DATA = os.path.join(ROOT, "data", "emails.csv")
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
    # Expect columns: to, to_domain, subject, body, intent
    df = pd.read_csv(DATA).fillna("")
    # safety dedupe
    df["canon"] = df.apply(lambda r: hash_canon(r["subject"], r["body"]), axis=1)
    df = df.drop_duplicates("canon").drop(columns=["canon"])

    # training set requires labels
    train = df[df["intent"] != ""].copy()
    if len(train) < 25:
        print("Warning: very few labeled rows; classifier may be weak.")

    train["text"] = (train["subject"] + " || " + train["body"]).str.lower()
    vec = TfidfVectorizer(ngram_range=(1,2), min_df=2, max_df=0.95)
    X = vec.fit_transform(train["text"].tolist())
    y = train["intent"].tolist()

    clf = LogisticRegression(max_iter=300)
    clf.fit(X, y)

    joblib.dump(vec, os.path.join(OUT, "vectorizer.pkl"))
    joblib.dump(clf, os.path.join(OUT, "clf.pkl"))

    # Recipient priors (labeled rows only)
    prior_recipient = {}
    for to_addr, intent in zip(train["to"].str.lower(), y):
        if not to_addr or not intent:
            continue
        prior_recipient.setdefault(to_addr, {}).setdefault(intent, 0)
        prior_recipient[to_addr][intent] += 1

    # Domain priors (labeled rows only)
    # Prefer provided to_domain column; fallback to deriving from "to"
    dom_series = train["to_domain"] if "to_domain" in train.columns else train["to"].map(normalize_domain)
    prior_domain = {}
    for dom, intent in zip(dom_series.str.lower(), y):
        if not dom or not intent:
            continue
        prior_domain.setdefault(dom, {}).setdefault(intent, 0)
        prior_domain[dom][intent] += 1

    joblib.dump(prior_recipient, os.path.join(OUT, "recipient_prior.pkl"))
    joblib.dump(prior_domain, os.path.join(OUT, "domain_prior.pkl"))

    print(f"Saved artifacts to {OUT}")
    print(f"- classes: {sorted(set(y))}")
    print(f"- recipient priors: {len(prior_recipient)} recipients")
    print(f"- domain priors: {len(prior_domain)} domains")

if __name__ == "__main__":
    main()

