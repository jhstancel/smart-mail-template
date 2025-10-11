# scripts/eval_autodetect.py
from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import List, Tuple

import joblib
import numpy as np
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_recall_curve,
)

ART = Path("model_artifacts")


def read_labeled(path: Path) -> Tuple[List[str], List[str]]:
    X, y = [], []
    with path.open(newline="") as f:
        r = csv.DictReader(f)
        for row in r:
            text = f"{row.get('subject','')} {row.get('body','')}".strip()
            lab = row.get("intent")
            if text and lab:
                X.append(text)
                y.append(lab)
    return X, y


def softmax(z: np.ndarray) -> np.ndarray:
    z = z - np.max(z)
    ez = np.exp(z)
    return ez / (np.sum(ez) + 1e-9)


def load_artifacts():
    vec = joblib.load(ART / "vectorizer.pkl")
    clf = joblib.load(ART / "clf.pkl")
    classes = list(getattr(clf, "classes_", []))
    return vec, clf, classes


def predict_proba(vec, clf, texts: List[str]) -> np.ndarray:
    X = vec.transform(texts)
    if hasattr(clf, "predict_proba"):
        return clf.predict_proba(X)
    # Calibrate decision_function via softmax if predict_proba not available
    z = clf.decision_function(X)
    if z.ndim == 1:
        z = z[:, None]
    # LinearSVC binary case returns shape (n_samples,)
    if z.shape[1] == 1:
        z = np.concatenate([-z, z], axis=1)
    out = np.vstack([softmax(row) for row in z])
    return out


def suggest_threshold(
    y_true: List[str], proba: np.ndarray, classes: List[str]
) -> float:
    # One-vs-rest micro PR sweep to maximize F1
    class_to_idx = {c: i for i, c in enumerate(classes)}
    y_bin = np.zeros((len(y_true), len(classes)))
    for i, lab in enumerate(y_true):
        y_bin[i, class_to_idx[lab]] = 1.0

    # Concatenate all class PR points
    prs: List[Tuple[float, float, float]] = []  # (precision, recall, threshold)
    for j in range(len(classes)):
        p, r, t = precision_recall_curve(y_bin[:, j], proba[:, j])
        # precision_recall_curve returns len(t)+1 points; skip p[0], r[0] (no threshold)
        for pj, rj, tj in zip(p[1:], r[1:], t):
            prs.append((float(pj), float(rj), float(tj)))

    if not prs:
        return 0.62

    # Choose threshold that maximizes F1
    best_f1, best_thr = -1.0, 0.62
    for p, r, t in prs:
        denom = p + r
        f1 = 0.0 if denom == 0 else 2 * p * r / denom
        if f1 > best_f1:
            best_f1, best_thr = f1, t
    return float(best_thr)


def top_confusions(
    y_true: List[str], y_pred: List[str], classes: List[str], k: int = 8
):
    cm = confusion_matrix(y_true, y_pred, labels=classes)
    pairs: List[Tuple[str, str, int]] = []
    for i, true_c in enumerate(classes):
        for j, pred_c in enumerate(classes):
            if i == j:
                continue
            cnt = int(cm[i, j])
            if cnt > 0:
                pairs.append((true_c, pred_c, cnt))
    pairs.sort(key=lambda x: x[2], reverse=True)
    return pairs[:k]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--labeled", default="data/emails.labeled.csv")
    args = ap.parse_args()

    vec, clf, classes = load_artifacts()
    X, y = read_labeled(Path(args.labeled))

    if not X:
        print(f"[eval] No rows in {args.labeled}")
        return

    proba = predict_proba(vec, clf, X)
    y_pred_idx = np.argmax(proba, axis=1)
    y_pred = [classes[i] for i in y_pred_idx]

    print("=== Classification Report ===")
    print(classification_report(y, y_pred, digits=3, labels=classes))

    print("\n=== Top Confusions (true → predicted) ===")
    for t, p, n in top_confusions(y, y_pred, classes):
        print(f"{t:>20} → {p:<20}  {n}")

    thr = suggest_threshold(y, proba, classes)
    print(f"\nSuggested global threshold: {thr:.2f}")
    print("→ Set this in configs/rules.json under _autodetect.threshold")


if __name__ == "__main__":
    main()
