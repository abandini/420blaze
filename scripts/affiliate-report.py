#!/usr/bin/env python3
"""Clean affiliate-click report from D1 — separates real human clicks from bot noise.

A click counts as a REAL human click only if ALL signals agree:
  - is_bot = 0   (user-agent is a real browser, set at insert by the Worker)
  - referrer came from a 420blazin CONTENT page (blog post, strain-finder, etc.)
  - referrer is NOT another /go/ URL — a /go/ link is a 302 with no page to click
    from, so a /go/->/go/ referrer is a crawler following links, never a human.

Usage:
  python3 scripts/affiliate-report.py                # this month (UTC)
  python3 scripts/affiliate-report.py --since 2026-06-01
  python3 scripts/affiliate-report.py --all          # all time
"""
import argparse, json, subprocess, sys, pathlib
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
DB = "affiliate-analytics"

def d1(sql):
    out = subprocess.run(
        ["npx", "wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql],
        cwd=ROOT, capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"D1 query failed:\n{out.stderr[-600:]}")
    return json.loads(out.stdout)[0]["results"]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    if args.all:
        since, label = "1970-01-01", "all time"
    else:
        since = args.since or datetime.now(timezone.utc).strftime("%Y-%m-01")
        label = f"since {since} (UTC)"

    where = f"clicked_at >= '{since}'"
    # genuine human click: real browser + came from one of our CONTENT pages (not a /go/ chain)
    REAL = "is_bot = 0 AND referrer LIKE '%420blazin%' AND referrer NOT LIKE '%/go/%'"

    totals = d1(f"""SELECT
        COUNT(*) total,
        SUM(CASE WHEN {REAL} THEN 1 ELSE 0 END) real,
        SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) bots,
        SUM(CASE WHEN is_bot = 0 AND referrer LIKE '%/go/%' THEN 1 ELSE 0 END) chain,
        SUM(CASE WHEN is_bot = 0 AND (referrer IS NULL OR referrer NOT LIKE '%420blazin%') THEN 1 ELSE 0 END) direct
      FROM affiliate_clicks WHERE {where}""")[0]

    print(f"\n=== Affiliate clicks — {label} ===")
    print(f"  Total logged:        {totals['total']}")
    print(f"  ✅ REAL human clicks: {totals['real']}   (browser UA + referred from a 420blazin content page)")
    print(f"  🤖 Bots / tools:      {totals['bots']}   (crawlers, AI, HTTP libraries)")
    print(f"  ⛓️  /go/->/go/ chains: {totals['chain']}   (browser UA but referred from another /go/ — crawler following links)")
    print(f"  ⚠️  Direct / no-ref:   {totals['direct']}   (browser UA, no on-site referrer — likely bots faking a UA)")

    real_total = totals["real"] or 0
    print(f"\n  Real human clicks by product:")
    if real_total == 0:
        print("    (none yet — expected until organic traffic builds)")
    else:
        for r in d1(f"SELECT slug, COUNT(*) n FROM affiliate_clicks WHERE {where} AND {REAL} GROUP BY slug ORDER BY n DESC"):
            print(f"    {r['n']:>4}  {r['slug']}")

    # top referring pages for the real clicks — tells you which content converts
    refs = d1(f"""SELECT referrer, COUNT(*) n FROM affiliate_clicks
        WHERE {where} AND {REAL} GROUP BY referrer ORDER BY n DESC LIMIT 8""")
    if refs:
        print(f"\n  Real clicks by source page:")
        for r in refs:
            ref = (r["referrer"] or "").replace("https://420blazin.com", "").split("?")[0] or "/"
            print(f"    {r['n']:>4}  {ref}")
    print()

if __name__ == "__main__":
    main()
