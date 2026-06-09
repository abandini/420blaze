#!/usr/bin/env python3
"""
GSC (Google Search Console) Pull — pulls search analytics for the
Cannabis Education Network sites.

Reads OAuth refresh-token credentials from ~/.claude/tokens/gsc-worldcupfutbol.json
(same Google account owns all of Bill's properties — token works across all of them).

Pulls last 7 days of data for each site:
- Top 30 queries by impressions
- Top 20 pages by clicks
- Total impressions / clicks / CTR / avg position

Writes to docs/measurements/gsc-YYYY-MM-DD.md.

Usage:
    python3 gsc-pull.py
"""

import datetime as dt
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TOKEN_PATH = Path.home() / ".claude" / "tokens" / "gsc-worldcupfutbol.json"

SITES = [
    ("420blazin.com", "sc-domain:420blazin.com"),
    ("365daysofweed.com", "sc-domain:365daysofweed.com"),
    ("weedaseniorsguide.com", "sc-domain:weedaseniorsguide.com"),
]


def get_access_token() -> str:
    creds = json.loads(TOKEN_PATH.read_text())
    body = urllib.parse.urlencode({
        "client_id": creds["client_id"],
        "client_secret": creds["client_secret"],
        "refresh_token": creds["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    r = urllib.request.urlopen("https://oauth2.googleapis.com/token", data=body, timeout=15)
    return json.loads(r.read())["access_token"]


def query_search_analytics(site: str, token: str, start: str, end: str, dimensions: list[str], row_limit: int = 30) -> list[dict]:
    """Query GSC search analytics. dimensions: 'query', 'page', 'date'."""
    body = json.dumps({
        "startDate": start,
        "endDate": end,
        "dimensions": dimensions,
        "rowLimit": row_limit,
    }).encode()
    url = f"https://www.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(site, safe='')}/searchAnalytics/query"
    req = urllib.request.Request(url, data=body, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    })
    try:
        r = urllib.request.urlopen(req, timeout=20)
        data = json.loads(r.read())
        return data.get("rows", [])
    except urllib.error.HTTPError as e:
        print(f"WARN: {site} {dimensions} → {e.code}: {e.read().decode()[:200]}", file=sys.stderr)
        return []


def pct(n, total):
    return f"{(n/total*100):.1f}%" if total else "—"


def main():
    today = dt.date.today().isoformat()
    end = dt.date.today() - dt.timedelta(days=2)  # GSC has ~2-day delay
    start = end - dt.timedelta(days=7)
    end_iso, start_iso = end.isoformat(), start.isoformat()

    print(f"Pulling GSC for {start_iso} → {end_iso}...")
    token = get_access_token()

    out_dir = REPO_ROOT / "docs" / "measurements"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"gsc-{today}.md"

    lines = [
        f"# GSC Snapshot — {today}",
        "",
        f"**Window:** {start_iso} → {end_iso} (7 days, with GSC's 2-day data delay)",
        f"**Generated:** {dt.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}",
        "",
    ]

    network_impressions = 0
    network_clicks = 0

    for label, site in SITES:
        # Site-level totals
        totals_rows = query_search_analytics(site, token, start_iso, end_iso, [], row_limit=1)
        if totals_rows:
            t = totals_rows[0]
            impressions = int(t.get("impressions", 0))
            clicks = int(t.get("clicks", 0))
            ctr = t.get("ctr", 0) * 100
            position = t.get("position", 0)
        else:
            impressions = clicks = 0
            ctr = position = 0
        network_impressions += impressions
        network_clicks += clicks

        lines.extend([
            f"## {label}",
            "",
            f"- **Impressions:** {impressions}",
            f"- **Clicks:** {clicks}",
            f"- **CTR:** {ctr:.2f}%",
            f"- **Avg position:** {position:.1f}",
            "",
        ])

        # Top queries by impressions
        queries = query_search_analytics(site, token, start_iso, end_iso, ["query"], row_limit=20)
        if queries:
            lines.append("### Top queries by impressions")
            lines.append("")
            lines.append("| Query | Impressions | Clicks | CTR | Pos |")
            lines.append("|---|---:|---:|---:|---:|")
            for q in queries:
                imps = int(q.get("impressions", 0))
                clks = int(q.get("clicks", 0))
                ctr_q = q.get("ctr", 0) * 100
                pos_q = q.get("position", 0)
                term = q["keys"][0]
                lines.append(f"| {term} | {imps} | {clks} | {ctr_q:.1f}% | {pos_q:.1f} |")
            lines.append("")

        # Top pages by clicks
        pages = query_search_analytics(site, token, start_iso, end_iso, ["page"], row_limit=10)
        if pages:
            lines.append("### Top pages by impressions")
            lines.append("")
            lines.append("| Page | Impressions | Clicks | CTR |")
            lines.append("|---|---:|---:|---:|")
            for p in pages:
                imps = int(p.get("impressions", 0))
                clks = int(p.get("clicks", 0))
                ctr_p = p.get("ctr", 0) * 100
                page = p["keys"][0]
                lines.append(f"| {page} | {imps} | {clks} | {ctr_p:.1f}% |")
            lines.append("")

    lines.extend([
        "## Network totals",
        "",
        f"- **Network impressions:** {network_impressions}",
        f"- **Network clicks:** {network_clicks}",
        f"- **Network CTR:** {pct(network_clicks, network_impressions)}",
    ])

    out.write_text("\n".join(lines) + "\n")
    print(f"Snapshot: {out}")
    print(f"Network: {network_impressions} impressions, {network_clicks} clicks ({pct(network_clicks, network_impressions)} CTR)")


if __name__ == "__main__":
    main()
