from __future__ import annotations
import argparse, csv, random
from pathlib import Path
from collections import defaultdict


def read_rows(path: Path):
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def stratified_split(rows, label_key="intent", val_frac=0.2, seed=42):
    random.seed(seed)
    by_label = defaultdict(list)
    for r in rows:
        lab = (r.get(label_key) or "").strip()
        if lab:
            by_label[lab].append(r)
    train, val = [], []
    for lab, items in by_label.items():
        random.shuffle(items)
        k = max(1, int(len(items) * val_frac))
        val.extend(items[:k])
        train.extend(items[k:])
    return train, val


def write_csv(path: Path, rows):
    if not rows:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", default="data/emails.labeled.csv")
    ap.add_argument("--train", default="data/emails.labeled.train.csv")
    ap.add_argument("--val", default="data/emails.labeled.val.csv")
    ap.add_argument("--val_frac", type=float, default=0.2)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    rows = read_rows(Path(args.inp))
    train, val = stratified_split(rows, val_frac=args.val_frac, seed=args.seed)
    write_csv(Path(args.train), train)
    write_csv(Path(args.val), val)
    print(f"[split] train={len(train)}  val={len(val)}  (val_frac={args.val_frac})")


if __name__ == "__main__":
    main()
