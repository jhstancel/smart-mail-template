#!/usr/bin/env python3
import subprocess, sys, argparse
from datetime import datetime, timezone, timedelta
from collections import defaultdict, Counter

# ===== Tunables (hours) =====
LOWER_THRESHOLD_H      = 1.0   # stricter
REALISTIC_THRESHOLD_H  = 2.0   # your baseline
UPPER_THRESHOLD_H      = 3.0   # looser

DATE_IN_FMT  = "%Y-%m-%d %H:%M:%S %z"
DATE_OUT_FMT = "%Y-%m-%d"

def get_git_config(key: str) -> str:
    try:
        return subprocess.check_output(["git", "config", key], text=True).strip()
    except subprocess.CalledProcessError:
        return ""

def get_commit_times(author_filter: str, since: str|None, until: str|None) -> list[datetime]:
    cmd = ["git", "log", "--all", "--pretty=format:%ad", "--date=iso"]
    if author_filter:
        cmd.insert(2, f"--author={author_filter}")  # after '--all'
    if since:
        cmd.append(f'--since={since}')
    if until:
        cmd.append(f'--until={until}')
    out = subprocess.check_output(cmd, text=True, stderr=subprocess.DEVNULL)
    times = [datetime.strptime(line.strip(), DATE_IN_FMT) for line in out.splitlines() if line.strip()]
    times.sort()
    return times

def commits_per_day(times: list[datetime]) -> Counter:
    return Counter(t.date() for t in times)

def sum_intervals_total_and_daily(times: list[datetime], threshold_hours: float):
    """
    Sum qualifying gaps between consecutive commits.
    Attribute each qualifying gap to the day of the *later* commit.
    Returns: total_hours (float), dict[date]->hours
    """
    per_day = defaultdict(float)
    total = 0.0
    for i in range(1, len(times)):
        diff_h = (times[i] - times[i-1]).total_seconds() / 3600.0
        if diff_h <= threshold_hours:
            total += diff_h
            per_day[times[i].date()] += diff_h
    return total, per_day

def format_hours(x: float) -> str:
    return f"{x:.2f}"

def daterange(d0: datetime.date, d1: datetime.date):
    cur = d0
    while cur <= d1:
        yield cur
        cur += timedelta(days=1)
def main():
    ap = argparse.ArgumentParser(description="Estimate focused coding time from git commits.")
    ap.add_argument("--since", help='e.g., "2025-09-01" or "2 weeks ago"', default=None)
    ap.add_argument("--until", help='e.g., "2025-10-15"', default=None)
    ap.add_argument("--author", help="Override author filter (email or name). Default = git config user.email/name", default=None)
    args = ap.parse_args()

    # Determine author filter
    author_filter = args.author or get_git_config("user.email") or get_git_config("user.name") or ""

    # Collect commits
    times = get_commit_times(author_filter, args.since, args.until)
    if len(times) < 2:
        print("Not enough commits to estimate time (need ≥2).")
        sys.exit(0)

    # Active days and calendar span
    active_days = sorted({t.date() for t in times})
    num_active_days = len(active_days)
    first_day, last_day = active_days[0], active_days[-1]
    total_calendar_days = (last_day - first_day).days + 1

    # Commits per day
    cpd = commits_per_day(times)

    # Compute estimates
    lower_total, lower_daily = sum_intervals_total_and_daily(times, LOWER_THRESHOLD_H)
    real_total, real_daily = sum_intervals_total_and_daily(times, REALISTIC_THRESHOLD_H)
    upper_total, upper_daily = sum_intervals_total_and_daily(times, UPPER_THRESHOLD_H)

    # Averages
    def safe_div(a, b): return (a / b) if b else 0.0
    lower_avg_active = safe_div(lower_total, num_active_days)
    real_avg_active = safe_div(real_total, num_active_days)
    upper_avg_active = safe_div(upper_total, num_active_days)

    lower_avg_calendar = safe_div(lower_total, total_calendar_days)
    real_avg_calendar = safe_div(real_total, total_calendar_days)
    upper_avg_calendar = safe_div(upper_total, total_calendar_days)

    # Summary header
    who = author_filter if author_filter else "ALL AUTHORS"
    print(f"Author: {who}")
    if args.since or args.until:
        print(f"Range: since={args.since or '---'}  until={args.until or '---'}")
    print(f"Commits analyzed: {len(times)}")
    print(f"Active days: {num_active_days}  |  Calendar span: {first_day} → {last_day} ({total_calendar_days} days)")
    print()
    print(f"Lower     (≤ {LOWER_THRESHOLD_H:.1f}h gaps): {format_hours(lower_total)} h  | "
          f"{format_hours(lower_avg_active)} h/active-day  | {format_hours(lower_avg_calendar)} h/calendar-day")
    print(f"Realistic (≤ {REALISTIC_THRESHOLD_H:.1f}h gaps): {format_hours(real_total)} h  | "
          f"{format_hours(real_avg_active)} h/active-day  | {format_hours(real_avg_calendar)} h/calendar-day")
    print(f"Upper     (≤ {UPPER_THRESHOLD_H:.1f}h gaps): {format_hours(upper_total)} h  | "
          f"{format_hours(upper_avg_active)} h/active-day  | {format_hours(upper_avg_calendar)} h/calendar-day")
    print()

    # Day-by-day table
    active_days = sorted(set(lower_daily.keys()) | set(real_daily.keys()) | set(upper_daily.keys()) | set(cpd.keys()))
    header = f"{'Date':<12} {'Commits':>7}  {'Lower(h)':>9}  {'Real(h)':>9}  {'Upper(h)':>9}"
    print(header)
    print("-" * len(header))
    for d in active_days:
        row = [
            d.strftime(DATE_OUT_FMT),
            f"{cpd.get(d, 0):>7}",
            f"{format_hours(lower_daily.get(d, 0.0)):>9}",
            f"{format_hours(real_daily.get(d, 0.0)):>9}",
            f"{format_hours(upper_daily.get(d, 0.0)):>9}",
        ]
        print(f"{row[0]:<12} {row[1]}  {row[2]}  {row[3]}  {row[4]}")

    # ---- Column summaries ----
    commits_vals = [cpd.get(d, 0) for d in active_days]
    lower_vals = [lower_daily.get(d, 0.0) for d in active_days]
    real_vals = [real_daily.get(d, 0.0) for d in active_days]
    upper_vals = [upper_daily.get(d, 0.0) for d in active_days]

    def fmt_commit(n): return f"{n:>7}"
    def fmt_hours_val(x): return f"{format_hours(x):>9}"

    print("-" * len(header))
    # Totals
    print(f"{'TOTAL':<12} {fmt_commit(sum(commits_vals))}  {fmt_hours_val(sum(lower_vals))}  "
          f"{fmt_hours_val(sum(real_vals))}  {fmt_hours_val(sum(upper_vals))}")
    # Averages per active day
    day_count = len(active_days) if active_days else 1
    avg_commits = round(sum(commits_vals) / day_count) if commits_vals else 0
    avg_lower = (sum(lower_vals) / day_count) if lower_vals else 0.0
    avg_real = (sum(real_vals) / day_count) if real_vals else 0.0
    avg_upper = (sum(upper_vals) / day_count) if upper_vals else 0.0
    print(f"{'AVG/day':<12} {fmt_commit(avg_commits)}  {fmt_hours_val(avg_lower)}  "
          f"{fmt_hours_val(avg_real)}  {fmt_hours_val(avg_upper)}")
    # Min / Max per day
    if commits_vals:
        print(f"{'MIN':<12} {fmt_commit(min(commits_vals))}  {fmt_hours_val(min(lower_vals))}  "
              f"{fmt_hours_val(min(real_vals))}  {fmt_hours_val(min(upper_vals))}")
        print(f"{'MAX':<12} {fmt_commit(max(commits_vals))}  {fmt_hours_val(max(lower_vals))}  "
              f"{fmt_hours_val(max(real_vals))}  {fmt_hours_val(max(upper_vals))}")

if __name__ == "__main__":
    main()

