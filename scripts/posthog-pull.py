#!/usr/bin/env python3
"""
PostHog Pull — discovery + funnel measurement against the cannabis network's
existing PostHog tracking (project key already embedded in every page).

Two modes:
    --discover  : Lists all event names + counts for last 7 days. Run this
                  ONCE first to see what events actually fire on the sites.
    (default)   : Pulls the predefined funnel: pageview → continue_reading_click
                  → outbound_click. Once we know what events actually exist
                  from --discover, this report becomes meaningful.

CREDENTIALS REQUIRED (Bill must add to .dev.vars):
    POSTHOG_PERSONAL_API_KEY=<personal API key from PostHog Settings>

To get this key:
    1. Log into PostHog (us.posthog.com)
    2. Settings (gear icon) → Personal API Keys
    3. Create token with "Query Read" scope
    4. Paste into 420blaze/.dev.vars

Until that key is added, this script writes a "credentials needed" report.

Usage:
    python3 posthog-pull.py --discover    # Run once first
    python3 posthog-pull.py               # Then weekly
"""

import argparse
import datetime as dt
import json
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEV_VARS = REPO_ROOT / ".dev.vars"
POSTHOG_HOST = "https://us.posthog.com"
POSTHOG_PROJECT_KEY = "phc_yMcK3cIJ6O3gtN18IpBVi5UQKIE1CQyPmdav8t9dgPS"  # public, in HTML


def read_dev_vars() -> dict:
    if not DEV_VARS.exists():
        return {}
    out = {}
    for line in DEV_VARS.read_text().splitlines():
        if "=" not in line or line.strip().startswith("#"):
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def hogql_query(api_key: str, query: str) -> dict:
    """Execute HogQL query via PostHog API."""
    body = json.dumps({"query": {"kind": "HogQLQuery", "query": query}}).encode()
    req = urllib.request.Request(
        f"{POSTHOG_HOST}/api/projects/@current/query/",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    r = urllib.request.urlopen(req, timeout=30)
    return json.loads(r.read())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--discover", action="store_true", help="List event names and counts")
    args = parser.parse_args()

    today = dt.date.today().isoformat()
    out_dir = REPO_ROOT / "docs" / "measurements"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"posthog-{today}.md"

    creds = read_dev_vars()
    api_key = creds.get("POSTHOG_PERSONAL_API_KEY")

    if not api_key:
        out.write_text(
            f"# PostHog Snapshot — {today}\n\n"
            "**Status:** Personal API key not configured.\n\n"
            "**To enable funnel measurement against existing PostHog tracking:**\n"
            "1. Log into PostHog (us.posthog.com)\n"
            "2. Settings → Personal API Keys → Create token\n"
            "3. Scope: 'Query Read'\n"
            "4. Add to /Users/billburkey/CascadeProjects/420blaze/.dev.vars:\n"
            "   ```\n"
            "   POSTHOG_PERSONAL_API_KEY=<the key>\n"
            "   ```\n"
            "5. Run `python3 scripts/posthog-pull.py --discover` first to see "
            "which events actually fire on the network. Then run weekly "
            "without --discover for the funnel report.\n\n"
            f"**Note:** PostHog project key (`{POSTHOG_PROJECT_KEY[:20]}...`) is already "
            "embedded in every page on all 3 sites — events ARE being captured. "
            "The personal API key is only needed to *query* the captured data.\n"
        )
        print(f"Stub written (credentials missing): {out}")
        sys.exit(0)

    if args.discover:
        # List all event names from the last 7 days
        q = """
            SELECT event, count() AS n
            FROM events
            WHERE timestamp >= now() - INTERVAL 7 DAY
            GROUP BY event
            ORDER BY n DESC
            LIMIT 100
        """
        try:
            data = hogql_query(api_key, q)
            results = data.get("results", [])
        except urllib.error.HTTPError as e:
            print(f"API error: {e.code}: {e.read().decode()[:200]}", file=sys.stderr)
            sys.exit(1)

        lines = [
            f"# PostHog Discovery — {today}",
            "",
            f"All event names captured in the last 7 days, sorted by frequency.",
            "",
            "| Event | Count |",
            "|---|---:|",
        ]
        for row in results:
            event, count = row[0], row[1]
            lines.append(f"| `{event}` | {count} |")
        out.write_text("\n".join(lines) + "\n")
        print(f"Discovery: {out}")
        print(f"Events found: {len(results)}")
        return

    # Standard funnel report — uses CUSTOM event names from js/tracking.js
    funnel_query = """
        SELECT
            countIf(event = '$pageview') AS pageviews,
            countIf(event = 'continue_reading_click') AS continue_reading_clicks,
            countIf(event = 'potv_outbound_click') AS potv_outbound_clicks,
            countIf(event = 'amazon_buy_click') AS amazon_book_clicks,
            countIf(event = 'cross_site_click_seniorsguide') AS cross_site_seniorsguide,
            countIf(event = 'cross_site_click_365weed') AS cross_site_365weed,
            countIf(event = 'merch_shop_click') AS merch_clicks,
            countIf(event = 'festival_nav_cta_click') AS festival_cta_clicks
        FROM events
        WHERE timestamp >= now() - INTERVAL 7 DAY
    """
    try:
        data = hogql_query(api_key, funnel_query)
        results = data.get("results", [[0, 0, 0, 0, 0, 0, 0, 0]])[0]
    except urllib.error.HTTPError as e:
        print(f"API error: {e.code}: {e.read().decode()[:200]}", file=sys.stderr)
        sys.exit(1)

    pv, cr, potv, amzn, x_sr, x_365, merch, fest = results
    def rate(n): return f"{(n/pv*100):.2f}%" if pv else "0.00%"

    # Top POTV slugs (by property)
    slug_query = """
        SELECT properties.slug AS slug, count() AS clicks
        FROM events
        WHERE event = 'potv_outbound_click'
            AND timestamp >= now() - INTERVAL 7 DAY
            AND properties.slug IS NOT NULL
        GROUP BY slug
        ORDER BY clicks DESC
        LIMIT 10
    """
    slug_rows = []
    try:
        slug_data = hogql_query(api_key, slug_query)
        slug_rows = slug_data.get("results", [])
    except Exception:
        pass

    # Top source pages for POTV clicks
    page_query = """
        SELECT properties.page AS page, count() AS clicks
        FROM events
        WHERE event = 'potv_outbound_click'
            AND timestamp >= now() - INTERVAL 7 DAY
            AND properties.page IS NOT NULL
        GROUP BY page
        ORDER BY clicks DESC
        LIMIT 10
    """
    page_rows = []
    try:
        page_data = hogql_query(api_key, page_query)
        page_rows = page_data.get("results", [])
    except Exception:
        pass

    lines = [
        f"# PostHog Funnel — {today}",
        "",
        f"**Window:** Last 7 days",
        "",
        f"## Funnel",
        "",
        f"| Stage | Count | Rate |",
        f"|---|---:|---:|",
        f"| Pageviews | {pv} | 100% |",
        f"| Continue Reading clicks | {cr} | {rate(cr)} |",
        f"| POTV /go/ clicks | {potv} | {rate(potv)} |",
        f"| Amazon book clicks | {amzn} | {rate(amzn)} |",
        f"| Cross-site → Senior's Guide | {x_sr} | {rate(x_sr)} |",
        f"| Cross-site → 365 Days of Weed | {x_365} | {rate(x_365)} |",
        f"| Merch shop clicks | {merch} | {rate(merch)} |",
        f"| Festival CTA clicks | {fest} | {rate(fest)} |",
    ]
    if slug_rows:
        lines += ["", "## Top POTV slugs (last 7d)", "", "| Slug | Clicks |", "|---|---:|"]
        for r in slug_rows:
            lines.append(f"| `{r[0]}` | {r[1]} |")
    if page_rows:
        lines += ["", "## Top source pages for POTV clicks", "", "| Page | Clicks |", "|---|---:|"]
        for r in page_rows:
            lines.append(f"| `{r[0]}` | {r[1]} |")
    out.write_text("\n".join(lines) + "\n")
    print(f"Funnel: {out}")


if __name__ == "__main__":
    main()
