# model/train.py
import pandas as pd, joblib, re, os, json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

ROOT = os.path.dirname(os.path.dirname(__file__))
DATA = os.path.join(ROOT, "data", "emails.csv")
OUT_DIR = os.path.join(ROOT, "model_artifacts")
os.makedirs(OUT_DIR, exist_ok=True)

def clean(txt: str) -> str:
    txt = (txt or "").lower()
    txt = re.sub(r"\s+", " ", txt)
    return txt.strip()

def main():
    df = pd.read_csv(DATA)
    df["to"] = df["to"].str.lower()
    df["text"] = (df["subject"].fillna("") + " || " + df["body"].fillna("")).map(clean)
    df = df[df["intent"].notna()].copy()

    vec = TfidfVectorizer(ngram_range=(1,2), min_df=2, max_df=0.95)
    X = vec.fit_transform(df["text"].tolist())
    y = df["intent"].tolist()

    clf = LogisticRegression(max_iter=300)
    clf.fit(X, y)

    joblib.dump(vec, os.path.join(OUT_DIR, "vectorizer.pkl"))
    joblib.dump(clf, os.path.join(OUT_DIR, "clf.pkl"))

    # recipient prior: counts per recipient
    prior = {}
    for r, intent in zip(df["to"], y):
        prior.setdefault(r, {}).setdefault(intent, 0)
        prior[r][intent] += 1
    joblib.dump(prior, os.path.join(OUT_DIR, "recipient_prior.pkl"))

    print(f"Saved model to {OUT_DIR}")

if __name__ == "__main__":
    main()

