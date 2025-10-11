# scripts/eval_autodetect.py
from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Dict, List, Tuple

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
        reader = csv.DictReader(f)
        for row in reader:
            text = f"{row.get('subject', '')} {row.get('body', '')}".strip()
            label = row.get("intent")
            if text and label:
                X.append(text)
                y.append(label)
    return X, y


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


def suggest_threshold(
    y_true: List[str], proba: np.ndarray, classes: List[str]
) -> float:
    class_to_idx = {c: i for i, c in enumerate(classes)}
    y_bin = np.zeros((len(y_true), len(classes)))
    for i, lab in enumerate(y_true):
        y_bin[i, class_to_idx[lab]] = 1.0

    prs: List[Tuple[float, float, float]] = []
    for j in range(len(classes)):
        p, r, t = precision_recall_curve(y_bin[:, j], proba[:, j])
        for pj, rj, tj in zip(p[1:], r[1:], t):
            prs.append((float(pj), float(rj), float(tj)))

    if not prs:
        return 0.62

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
            count = int(cm[i, j])
            if count > 0:
                pairs.append((true_c, pred_c, count))
    pairs.sort(key=lambda x: x[2], reverse=True)
    return pairs[:k]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--labeled", default="data/emails.labeled.csv")
    args = parser.parse_args()

    vec, clf, classes = load_artifacts()
    X_raw, y_raw = read_labeled(Path(args.labeled))

    # Filter out labels not in the trained model
    class_set = set(classes)
    X, y = [], []
    dropped_counts: Dict[str, int] = {}
    for text, label in zip(X_raw, y_raw):
        if label in class_set:
            X.append(text)
            y.append(label)
        else:
            dropped_counts[label] = dropped_counts.get(label, 0) + 1

    if dropped_counts:
        print("=== Info: Dropped labels not in model classes ===")
        for lab, cnt in sorted(dropped_counts.items(), key=lambda x: -x[1]):
            print(f"  {lab}: {cnt} rows (not in {classes})")
        print("→ Retrain with these labels or map them to an existing intent.\n")

    if not X:
        print(
            f"[eval] No usable rows after filtering. Check labels vs model classes: {classes}"
        )
        return

    proba = predict_proba(vec, clf, X)
    y_pred_idx = np.argmax(proba, axis=1)
    y_pred = [classes[i] for i in y_pred_idx]

    print("=== Classification Report (filtered to model classes) ===")
    print(classification_report(y, y_pred, digits=3, labels=classes))

    print("\n=== Top Confusions (true → predicted) ===")
    for true_label, pred_label, count in top_confusions(y, y_pred, classes):
        print(f"{true_label:>20} → {pred_label:<20}  {count}")

    thr = suggest_threshold(y, proba, classes)
    print(f"\nSuggested global threshold: {thr:.2f}")
    print("→ Set this in configs/rules.json under _autodetect.threshold")


if __name__ == "__main__":
    main()
