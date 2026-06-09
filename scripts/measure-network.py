#!/usr/bin/env python3
"""
Cannabis Education Network — Weekly Measurement Snapshot

Pulls live data from Cloudflare Web Analytics (GraphQL) and Cloudflare D1
(affiliate_clicks table), produces a markdown snapshot, and auto-diffs against
the T+0 baseline.

Usage:
    python3 measure-network.py                # Full snapshot + diff
    python3 measure-network.py --diff-only    # Skip data fetch, just compare existing
    python3 measure-network.py --quiet        # Suppress stdout summary

Auth: reads OAuth token from ~/.wrangler/config/default.toml.
If expired, run `wrangler whoami` first to refresh.

Sanity guard: exits with code 2 if all network pageviews come back zero —
this catches silent auth/API failures.
"""

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ACCOUNT_ID = "ec81afc4dc58b34ce34e7ad19fd6fbdd"
GRAPHQL = "https://api.cloudflare.com/client/v4/graphql"
WRANGLER_CONFIG = Path.home() / ".wrangler" / "config" / "default.toml"
HOSTS = [
    "420blazin.com", "www.420blazin.com",
    "365daysofweed.com", "www.365daysofweed.com",
    "weedaseniorsguide.com", "www.weedaseniorsguide.com",
]

# Alerting channels
NTFY_TOPIC = "420blazin-alerts-86119da72a15"
NTFY_URL = f"https://ntfy.sh/{NTFY_TOPIC}"


def _read_slack_webhook() -> str | None:
    dv = REPO_ROOT / ".dev.vars"
    if not dv.exists():
        return None
    for line in dv.read_text().splitlines():
        if line.startswith("SLACK_WEBHOOK_URL="):
            return line.split("=", 1)[1].strip().strip('"')
    return None


def send_alert(title: str, body: str, priority: str = "default") -> None:
    """Push to Slack (primary) and ntfy.sh (backup, mobile push)."""
    # Slack
    webhook = _read_slack_webhook()
    if webhook:
        try:
            req = urllib.request.Request(
                webhook,
                data=json.dumps({"text": f"*{title}*\n{body}"}).encode(),
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req, timeout=8).read()
        except Exception as e:
            print(f"WARN: Slack alert failed: {e}", file=sys.stderr)
    # ntfy.sh — title must be ASCII (latin-1 header), strip unicode chars like em-dashes
    try:
        ascii_title = title.encode("ascii", "replace").decode("ascii")
        req = urllib.request.Request(
            NTFY_URL,
            data=body.encode("utf-8"),
            headers={"Title": ascii_title, "Priority": priority, "Tags": "warning"},
        )
        urllib.request.urlopen(req, timeout=8).read()
    except Exception as e:
        print(f"WARN: ntfy alert failed: {e}", file=sys.stderr)


def detect_anomalies(pageviews: list, affiliates: dict, baseline_pv: dict, baseline_total: int = 153, baseline_7d: int = 104) -> list:
    """Two simple rules. Numbers that fire are real disasters, not noise.

    1. Network pageviews dropped >50% — likely deindex / DNS / hosting issue
    2. Affiliate clicks last-7d dropped >50% — broken funnel, lost revenue
    3. All-time affiliate counter did not advance — /go/ redirects broken
    """
    alerts = []
    network_now = sum(r["count"] for r in pageviews)
    network_baseline = sum(baseline_pv.values()) if baseline_pv else 108

    if network_baseline > 20 and network_now < network_baseline * 0.5:
        alerts.append(
            f"Network pageviews dropped >50%: {network_baseline} → {network_now}. "
            f"Possible deindex, DNS, or hosting issue."
        )
    if baseline_7d > 20 and affiliates["last7"] < baseline_7d * 0.5:
        alerts.append(
            f"Affiliate clicks/7d dropped >50%: {baseline_7d} → {affiliates['last7']}. "
            f"Check /go/ redirects + buyer's guide CTA visibility."
        )
    if affiliates["total"] <= baseline_total:
        alerts.append(
            f"All-time affiliate clicks did not advance: {baseline_total} → {affiliates['total']}. "
            f"/go/ redirect Worker may be broken — test https://420blazin.com/go/mighty-plus"
        )
    return alerts


def get_oauth_token() -> str:
    text = WRANGLER_CONFIG.read_text()
    m = re.search(r'^oauth_token\s*=\s*"([^"]+)"', text, re.MULTILINE)
    if not m:
        sys.exit("ERROR: No OAuth token in ~/.wrangler/config/default.toml. Run `wrangler whoami`.")
    return m.group(1)


def gql(token: str, query: str, variables: dict) -> dict:
    body = json.dumps({"query": query, "variables": variables}).encode()
    req = urllib.request.Request(
        GRAPHQL,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read())


def fetch_pageviews(token: str, since: str, until: str) -> list[dict]:
    """Returns [{host: str, count: int}] for the network."""
    query = """
    query($acc: string!, $since: Time!, $until: Time!, $hosts: [string!]) {
      viewer {
        accounts(filter: {accountTag: $acc}) {
          rumPageloadEventsAdaptiveGroups(
            limit: 50,
            filter: {date_geq: $since, date_leq: $until, requestHost_in: $hosts},
            orderBy: [count_DESC]
          ) { count, dimensions { requestHost } }
        }
      }
    }
    """
    data = gql(token, query, {"acc": ACCOUNT_ID, "since": since, "until": until, "hosts": HOSTS})
    rows = data["data"]["viewer"]["accounts"][0]["rumPageloadEventsAdaptiveGroups"]
    return [{"host": r["dimensions"]["requestHost"], "count": r["count"]} for r in rows]


def fetch_top_paths(token: str, since: str, until: str) -> list[dict]:
    """Returns [{path: str, count: int}] for 420blazin.com."""
    query = """
    query($acc: string!, $since: Time!, $until: Time!) {
      viewer {
        accounts(filter: {accountTag: $acc}) {
          rumPageloadEventsAdaptiveGroups(
            limit: 30,
            filter: {date_geq: $since, date_leq: $until, requestHost_in: ["420blazin.com", "www.420blazin.com"]},
            orderBy: [count_DESC]
          ) { count, dimensions { requestPath } }
        }
      }
    }
    """
    data = gql(token, query, {"acc": ACCOUNT_ID, "since": since, "until": until})
    rows = data["data"]["viewer"]["accounts"][0]["rumPageloadEventsAdaptiveGroups"]
    return [{"path": r["dimensions"]["requestPath"], "count": r["count"]} for r in rows]


def d1_query(sql: str) -> list[dict]:
    """Run a SQL query against affiliate-analytics D1, return rows."""
    proc = subprocess.run(
        ["wrangler", "d1", "execute", "affiliate-analytics", "--remote", "--command", sql],
        capture_output=True,
        text=True,
        timeout=30,
    )
    output = proc.stdout
    # Wrangler prints JSON-ish output mixed with progress text. Extract the results array.
    # Look for "results": [ ... ]
    m = re.search(r'"results":\s*(\[.*?\])\s*,\s*"success"', output, re.DOTALL)
    if not m:
        return []
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError:
        return []


def fetch_affiliate_metrics() -> dict:
    total = d1_query("SELECT COUNT(*) AS n FROM affiliate_clicks")
    last7 = d1_query("SELECT COUNT(*) AS n FROM affiliate_clicks WHERE clicked_at >= datetime('now', '-7 days')")
    by_slug = d1_query(
        "SELECT slug, COUNT(*) AS clicks FROM affiliate_clicks "
        "WHERE clicked_at >= datetime('now', '-7 days') "
        "GROUP BY slug ORDER BY clicks DESC LIMIT 15"
    )
    by_referrer = d1_query(
        "SELECT referrer, slug, COUNT(*) AS clicks FROM affiliate_clicks "
        "WHERE clicked_at >= datetime('now', '-7 days') "
        "GROUP BY referrer, slug ORDER BY clicks DESC LIMIT 25"
    )
    return {
        "total": total[0]["n"] if total else 0,
        "last7": last7[0]["n"] if last7 else 0,
        "by_slug": by_slug,
        "by_referrer": by_referrer,
    }


def write_snapshot(today: str, since: str, pageviews: list[dict], top_paths: list[dict], affiliates: dict) -> Path:
    out_dir = REPO_ROOT / "docs" / "measurements"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"snapshot-{today}.md"

    lines = [
        f"# Network Measurement Snapshot — {today}",
        "",
        f"**Window:** {since} → {today} (7 days)",
        f"**Generated:** {dt.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}",
        "",
        "## Network pageviews",
        "",
        "| Host | Pageviews |",
        "|---|---|",
    ]
    network_total = 0
    for row in pageviews:
        lines.append(f"| {row['host']} | {row['count']} |")
        network_total += row["count"]
    lines.append(f"| **Network total** | **{network_total}** |")
    lines.extend(["", "## 420blazin top paths", "", "| Path | Pageviews |", "|---|---|"])
    for row in top_paths:
        lines.append(f"| `{row['path']}` | {row['count']} |")
    lines.extend([
        "",
        "## Affiliate clicks",
        "",
        f"- All-time: **{affiliates['total']}**",
        f"- Last 7 days: **{affiliates['last7']}**",
        "",
        "### Top slugs (last 7 days)",
        "",
        "| Slug | Clicks |",
        "|---|---|",
    ])
    for row in affiliates["by_slug"]:
        lines.append(f"| {row['slug']} | {row['clicks']} |")
    lines.extend([
        "",
        "### By referrer + slug (last 7 days)",
        "",
        "| Referrer | Slug | Clicks |",
        "|---|---|---|",
    ])
    for row in affiliates["by_referrer"]:
        ref = (row.get("referrer") or "(direct)").replace("|", "\\|")
        lines.append(f"| {ref} | {row['slug']} | {row['clicks']} |")
    out.write_text("\n".join(lines) + "\n")
    return out


def parse_baseline_pageviews() -> dict:
    """Read T+0 baseline pageviews from MEASUREMENT-BASELINE-T0.md."""
    baseline = REPO_ROOT / "docs" / "MEASUREMENT-BASELINE-T0.md"
    if not baseline.exists():
        return {}
    text = baseline.read_text()
    out = {}
    for host in HOSTS:
        m = re.search(rf"\|\s*{re.escape(host)}\s*\|\s*([0-9]+)", text)
        if m:
            out[host] = int(m.group(1))
    # Special: 365daysofweed shown as combined "3" in baseline — handle apex separately
    return out


def write_diff(today: str, pageviews: list[dict], affiliates: dict, baseline_pv: dict, baseline_total: int = 153, baseline_7d: int = 104) -> Path:
    out_dir = REPO_ROOT / "docs" / "measurements"
    out_dir.mkdir(parents=True, exist_ok=True)
    diff = out_dir / f"diff-{today}.md"

    pv_now = {row["host"]: row["count"] for row in pageviews}
    network_now = sum(pv_now.values())
    network_baseline = sum(baseline_pv.values()) if baseline_pv else 108

    lines = [
        f"# T+N Diff Report — {today}",
        "",
        f"Compared against [T+0 baseline](../MEASUREMENT-BASELINE-T0.md) (May 1, 2026).",
        "",
        "## Network pageviews — change",
        "",
        "| Host | Baseline (T+0) | Now | Δ | Δ% |",
        "|---|---:|---:|---:|---:|",
    ]
    all_hosts = sorted(set(list(pv_now.keys()) + list(baseline_pv.keys())))
    for host in all_hosts:
        old = baseline_pv.get(host, 0)
        new = pv_now.get(host, 0)
        delta = new - old
        pct = f"{(delta/old*100):+.1f}%" if old else "—"
        sign = "+" if delta >= 0 else ""
        lines.append(f"| {host} | {old} | {new} | {sign}{delta} | {pct} |")

    net_delta = network_now - network_baseline
    net_pct = f"{(net_delta/network_baseline*100):+.1f}%" if network_baseline else "—"
    lines.append(f"| **Network total** | **{network_baseline}** | **{network_now}** | **{'+' if net_delta>=0 else ''}{net_delta}** | **{net_pct}** |")

    # Affiliate diff
    a_delta_total = affiliates["total"] - baseline_total
    a_delta_7d = affiliates["last7"] - baseline_7d
    lines.extend([
        "",
        "## Affiliate clicks — change",
        "",
        f"- All-time: {baseline_total} → **{affiliates['total']}** (Δ {'+' if a_delta_total>=0 else ''}{a_delta_total})",
        f"- Last 7 days: {baseline_7d} → **{affiliates['last7']}** (Δ {'+' if a_delta_7d>=0 else ''}{a_delta_7d})",
        "",
        "## New pages — first traffic check",
        "",
        "Pages built May 1, 2026 (zero baseline):",
    ])
    new_pages = [
        "/green-wednesday-2026",
        "/cannabis-holidays-2026",
        "/710-dab-day-2026",
        "/stoner-movies",
        "/blog/half-baked-sour-diesel-pairing.html",
    ]
    # We need top_paths to check this — they come back inline
    # (parse from the snapshot file just written)
    snap = (REPO_ROOT / "docs" / "measurements" / f"snapshot-{today}.md").read_text()
    new_page_traffic = {}
    for p in new_pages:
        # match path stripping .html
        canon = p.rstrip(".html") if p.endswith(".html") else p
        m = re.search(rf"\|\s*`{re.escape(canon)}`\s*\|\s*([0-9]+)", snap)
        if not m:
            m = re.search(rf"\|\s*`{re.escape(p)}`\s*\|\s*([0-9]+)", snap)
        new_page_traffic[p] = int(m.group(1)) if m else 0

    for p, count in new_page_traffic.items():
        flag = "✓" if count > 0 else "—"
        lines.append(f"- {flag} `{p}` — **{count}** pv")

    lines.extend([
        "",
        "## Interpretation hints",
        "",
    ])
    if network_now > network_baseline * 1.10:
        lines.append(f"- ✓ Network pageviews up {net_pct} — content is gaining traffic")
    elif network_now < network_baseline * 0.90:
        lines.append(f"- ⚠ Network pageviews DOWN {net_pct} — investigate (cron failure? deindex?)")
    else:
        lines.append(f"- ≈ Network pageviews flat ({net_pct}) — too early or content not yet indexed")

    if a_delta_7d > 0:
        lines.append(f"- ✓ Affiliate clicks accelerating (+{a_delta_7d}/7d) — POTV funnel still warm")
    elif a_delta_7d < -10:
        lines.append(f"- ⚠ Affiliate clicks dropping ({a_delta_7d}/7d) — check buyer's guide CTA visibility")

    pages_with_traffic = sum(1 for v in new_page_traffic.values() if v > 0)
    if pages_with_traffic > 0:
        lines.append(f"- ✓ {pages_with_traffic}/5 new pages getting traffic — content cluster activating")
    else:
        lines.append(f"- ≈ 0/5 new pages getting traffic yet — typical for week 1, watch T+14")

    diff.write_text("\n".join(lines) + "\n")
    return diff


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--diff-only", action="store_true")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    today = dt.date.today().isoformat()
    since = (dt.date.today() - dt.timedelta(days=7)).isoformat()

    if not args.diff_only:
        token = get_oauth_token()
        if not args.quiet:
            print(f"Pulling data for {since} → {today}...")
        pageviews = fetch_pageviews(token, since, today)
        top_paths = fetch_top_paths(token, since, today)
        affiliates = fetch_affiliate_metrics()

        # SANITY GUARD (Gap 1): fail loud on all-zero data
        network_total = sum(r["count"] for r in pageviews)
        if network_total == 0 and affiliates["total"] == 0:
            send_alert("420blazin: ALL metrics zero", "Auth or API failure. Run `wrangler whoami`. Snapshot did not write.", priority="urgent")
            sys.exit("FATAL: All metrics returned zero — likely auth or API failure.")
        if network_total == 0:
            send_alert("420blazin: Cloudflare Analytics zero", "Pageviews zero, affiliate data still flowing. Check CF token scope.", priority="high")
            print("WARN: Cloudflare Analytics returned zero pageviews — check token scope.", file=sys.stderr)

        snap_path = write_snapshot(today, since, pageviews, top_paths, affiliates)
        if not args.quiet:
            print(f"Snapshot: {snap_path}")

        # Anomaly detection (alerts via Slack + ntfy.sh)
        baseline_pv = parse_baseline_pageviews()
        anomalies = detect_anomalies(pageviews, affiliates, baseline_pv)
        if anomalies:
            body = "\n• ".join([""] + anomalies)
            send_alert(f"420blazin anomalies — {today}", body.strip(), priority="high")
            if not args.quiet:
                print(f"⚠ {len(anomalies)} anomaly alert(s) sent")
    else:
        # Reload from existing snapshot
        snap = (REPO_ROOT / "docs" / "measurements" / f"snapshot-{today}.md")
        if not snap.exists():
            sys.exit(f"No snapshot at {snap}; run without --diff-only first.")
        # Crude reload — parse pageviews/affiliates from snapshot
        text = snap.read_text()
        pageviews = []
        for m in re.finditer(r"\|\s*([\w\.\-]+\.[a-z]+)\s*\|\s*(\d+)\s*\|", text):
            pageviews.append({"host": m.group(1), "count": int(m.group(2))})
        # Affiliate totals
        m_total = re.search(r"All-time:\s*\*\*(\d+)", text)
        m_7d = re.search(r"Last 7 days:\s*\*\*(\d+)", text)
        affiliates = {
            "total": int(m_total.group(1)) if m_total else 0,
            "last7": int(m_7d.group(1)) if m_7d else 0,
            "by_slug": [], "by_referrer": [],
        }

    baseline_pv = parse_baseline_pageviews()
    diff_path = write_diff(today, pageviews, affiliates, baseline_pv)

    if not args.quiet:
        print(f"Diff:     {diff_path}")
        print()
        # Print summary
        print("--- Pageviews ---")
        for row in pageviews:
            old = baseline_pv.get(row["host"], 0)
            d = row["count"] - old
            print(f"  {row['host']:35} {row['count']:>5}  (Δ {'+' if d>=0 else ''}{d})")
        print()
        print(f"--- Affiliate clicks ---")
        print(f"  All-time:    {affiliates['total']}")
        print(f"  Last 7 days: {affiliates['last7']}")


if __name__ == "__main__":
    main()
