#!/usr/bin/env python3
"""PostHog analytics for 420blazin — direct HogQL API, no MCP dependency.

Why this exists: the PostHog MCP server (remote SSE) flaps in and out. This pulls
the same data straight from PostHog's Query API with the personal key in .dev.vars,
so analytics never depends on the MCP being connected.

CRITICAL: the PostHog project (270453) is SHARED with dyngus.day, worldcupfutbol.com,
theleveling.org, and others. EVERY query here filters `properties.$host LIKE '%420blazin%'`
so we only ever see 420blazin.com production traffic. Never remove that filter.

Usage:
    python3 scripts/posthog-pull.py            # month-to-date (default)
    python3 scripts/posthog-pull.py --days 7   # rolling N-day window
    python3 scripts/posthog-pull.py --discover # list every event firing (host-filtered)
"""
import argparse, datetime as dt, json, sys, urllib.request, urllib.error
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
HOST_FILTER = "properties.$host LIKE '%420blazin%'"   # production only; isolates from shared project


def api_key() -> str:
    for line in (REPO / ".dev.vars").read_text().splitlines():
        if line.startswith("POSTHOG_PERSONAL_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("POSTHOG_PERSONAL_API_KEY not in .dev.vars")


def hq(key: str, sql: str):
    body = json.dumps({"query": {"kind": "HogQLQuery", "query": sql}}).encode()
    req = urllib.request.Request(
        "https://us.posthog.com/api/projects/@current/query/", data=body,
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "User-Agent": "420blazin-analytics/1.0"})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=30).read()).get("results", [])
    except urllib.error.HTTPError as e:
        sys.exit(f"PostHog API {e.code}: {e.read().decode()[:300]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, help="rolling N-day window instead of month-to-date")
    ap.add_argument("--discover", action="store_true", help="list all events (host-filtered)")
    args = ap.parse_args()
    key = api_key()

    if args.days:
        since = (dt.date.today() - dt.timedelta(days=args.days)).isoformat()
        label = f"last {args.days} days"
    else:
        since = dt.date.today().replace(day=1).isoformat()
        label = f"month-to-date (since {since})"
    W = f"{HOST_FILTER} AND timestamp >= toDateTime('{since} 00:00:00')"

    if args.discover:
        rows = hq(key, f"SELECT event, count() n, uniq(distinct_id) ppl FROM events WHERE {W} GROUP BY event ORDER BY n DESC LIMIT 100")
        print(f"\n420blazin events — {label}:")
        for ev, n, ppl in rows:
            print(f"  {n:>5} ({ppl} ppl)  {ev}")
        return

    pv = hq(key, f"SELECT count() pv, uniq(distinct_id) uv FROM events WHERE event='$pageview' AND {W}")[0]
    pages = hq(key, f"SELECT properties.$pathname p, count() pv, uniq(distinct_id) uv FROM events WHERE event='$pageview' AND {W} GROUP BY p ORDER BY pv DESC LIMIT 12")
    evs = hq(key, f"SELECT event, count() n, uniq(distinct_id) ppl FROM events WHERE {W} AND event NOT IN ('$pageview','$pageleave','$web_vitals','$autocapture') GROUP BY event ORDER BY n DESC LIMIT 20")

    print(f"\n=== 420blazin.com — {label} ===")
    print(f"  Pageviews: {pv[0]}   Unique visitors: {pv[1]}")
    print(f"\n  Top pages:")
    for p, v, u in pages:
        print(f"    {v:>4} pv / {u:>3} uv   {p}")
    print(f"\n  Events (engagement / conversions):")
    if evs:
        for ev, n, ppl in evs:
            print(f"    {n:>4} ({ppl} ppl)  {ev}")
    else:
        print("    (none)")

    out = REPO / "docs" / "measurements" / f"posthog-{dt.date.today().isoformat()}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    L = [f"# PostHog Snapshot — {dt.date.today().isoformat()}", "",
         f"**420blazin.com only** ({label}). Project is shared; filtered to `$host LIKE '%420blazin%'`.", "",
         f"- **Pageviews:** {pv[0]}", f"- **Unique visitors:** {pv[1]}", "",
         "## Top pages", "", "| Page | PV | UV |", "|---|---:|---:|"]
    L += [f"| {p} | {v} | {u} |" for p, v, u in pages]
    L += ["", "## Events", "", "| Event | Count | People |", "|---|---:|---:|"]
    L += [f"| {ev} | {n} | {ppl} |" for ev, n, ppl in evs]
    out.write_text("\n".join(L) + "\n")
    print(f"\n  snapshot -> {out}")


if __name__ == "__main__":
    main()
