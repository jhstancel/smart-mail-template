# model/train.py
import os, re, pandas as pd, joblib, hashlib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

ROOT = os.path.dirname(os.path.dirname(__file__))
DATA = os.path.join(ROOT, "data", "emails.csv")
OUT = os.path.join(ROOT, "model_artifacts")
os.makedirs(OUT, exist_ok=True)

def hash_canon(subj, body):
    h = hashlib.sha1()
    h.update((subj + "\n" + body).lower().encode("utf-8", "ignore"))
    return h.hexdigest()

def main():
    df = pd.read_csv(DATA).fillna("")
    # Safety dedupe (mbox_to_csv already dedupes)
    df["canon"] = df.apply(lambda r: hash_canon(r["subject"], r["body"]), axis=1)
    df = df.drop_duplicates("canon").drop(columns=["canon"])

    # Keep rows with labels for training; unlabelled rows can be used later
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

    # recipient priors from ALL rows (including unlabeled is fine if you add intents later)
    prior = {}
    for to, intent in zip(df["to"].str.lower(), df["intent"]):
        if not intent:
            continue
        prior.setdefault(to, {}).setdefault(intent, 0)
        prior[to][intent] += 1
    joblib.dump(prior, os.path.join(OUT, "recipient_prior.pkl"))

    print(f"Saved artifacts to {OUT}")

if __name__ == "__main__":
    main()

