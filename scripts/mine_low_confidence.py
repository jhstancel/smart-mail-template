# scripts/mine_low_confidence.py
from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import List

import joblib
import numpy as np

ART = Path("model_artifacts")


def read_unlabeled(path: Path) -> List[dict]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def softmax(values: np.ndarray) -> np.ndarray:
    values = values - np.max(values)
    exp_values = np.exp(values)
    return exp_values / (np.sum(exp_values) + 1e-9)


def load_artifacts():
    vec = joblib.load(ART / "vectorizer.pkl")
    clf = joblib.load(ART / "clf.pkl")
    classes = list(getattr(clf, "classes_", []))
    return vec, clf, classes


def predict_proba(vec, clf, texts: List[str]) -> np.ndarray:
    X = vec.transform(texts)
    if hasattr(clf, "predict_proba"):
        return clf.predict_proba(X)
    z = clf.decision_function(X)
    if z.ndim == 1:
        z = z[:, None]
    if z.shape[1] == 1:
        z = np.concatenate([-z, z], axis=1)
    out = np.vstack([softmax(row) for row in z])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--unlabeled", default="data/emails.filtered.csv")
    ap.add_argument("--out", default="data/emails.to_label.csv")
    ap.add_argument("--low", type=float, default=0.40)
    ap.add_argument("--high", type=float, default=0.65)
    ap.add_argument("--limit", type=int, default=500)
    args = ap.parse_args()

    vec, clf, classes = load_artifacts()
    rows = read_unlabeled(Path(args.unlabeled))
    if not rows:
        print(f"[mine] No rows in {args.unlabeled}")
        return

    texts = [f"{r.get('subject', '')} {r.get('body', '')}".strip() for r in rows]
    proba = predict_proba(vec, clf, texts)

    selected = []
    for row, probs in zip(rows, proba):
        idx = int(np.argmax(probs))
        pmax = float(probs[idx])
        if args.low <= pmax < args.high:
            order = np.argsort(-probs)[:3]
            top3 = "; ".join([f"{classes[i]}:{probs[i]:.2f}" for i in order])
            out_row = dict(row)
            out_row["p_max"] = f"{pmax:.2f}"
            out_row["suggested_top3"] = top3
            selected.append(out_row)

    selected.sort(key=lambda r: float(r["p_max"]))
    limited = selected[: args.limit]

    fieldnames = (
        list(limited[0].keys())
        if limited
        else ["subject", "body", "p_max", "suggested_top3"]
    )
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(limited)

    print(f"[mine] Wrote {len(limited)} rows → {args.out} (from {len(rows)} inputs)")


if __name__ == "__main__":
    main()
