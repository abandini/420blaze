#!/usr/bin/env python3
"""
GSC Submit — pings Google Search Console to (a) reindex the sitemap for each
of the 3 cannabis network properties and (b) request URL inspection /
indexing for the 5 new pages shipped May 1, 2026.

This is a one-shot accelerator; Google still controls when it actually
crawls. But submitting tells Google "this exists, please look."

Reuses the same OAuth token as gsc-pull.py.
"""

import datetime as dt
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TOKEN_PATH = Path.home() / ".claude" / "tokens" / "gsc-worldcupfutbol.json"

SITEMAPS = [
    ("sc-domain:420blazin.com", "https://420blazin.com/sitemap.xml"),
    ("sc-domain:365daysofweed.com", "https://365daysofweed.com/sitemap.xml"),
    ("sc-domain:weedaseniorsguide.com", "https://weedaseniorsguide.com/sitemap.xml"),
]

NEW_PAGES = [
    ("sc-domain:420blazin.com", "https://420blazin.com/green-wednesday-2026"),
    ("sc-domain:420blazin.com", "https://420blazin.com/cannabis-holidays-2026"),
    ("sc-domain:420blazin.com", "https://420blazin.com/710-dab-day-2026"),
    ("sc-domain:420blazin.com", "https://420blazin.com/stoner-movies"),
    ("sc-domain:420blazin.com", "https://420blazin.com/blog/half-baked-sour-diesel-pairing.html"),
    ("sc-domain:420blazin.com", "https://420blazin.com/blog/cannabis-brownies-without-the-blackout.html"),
    ("sc-domain:weedaseniorsguide.com", "https://weedaseniorsguide.com/blog/cannabis-brownies-safe-dosing-seniors/"),
    ("sc-domain:weedaseniorsguide.com", "https://weedaseniorsguide.com/your-grandmother-probably-did/"),
    ("sc-domain:weedaseniorsguide.com", "https://weedaseniorsguide.com/blog/senior-dog-frozen-treats-cbd-terpenes/"),
    ("sc-domain:420blazin.com", "https://420blazin.com/blog/dosage-effect-drift-commercial-gummies"),
    ("sc-domain:420blazin.com", "https://420blazin.com/blog/memorial-day-weekend-cannabis-three-strain-plan"),
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


def submit_sitemap(site: str, sitemap_url: str, token: str) -> tuple[bool, str]:
    """PUT to https://www.googleapis.com/webmasters/v3/sites/{site}/sitemaps/{feedpath}"""
    url = (
        f"https://www.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(site, safe='')}"
        f"/sitemaps/{urllib.parse.quote(sitemap_url, safe='')}"
    )
    req = urllib.request.Request(url, method="PUT", headers={"Authorization": f"Bearer {token}"})
    try:
        urllib.request.urlopen(req, timeout=20).read()
        return True, "submitted"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode()[:200]}"


def inspect_url(site: str, page_url: str, token: str) -> tuple[bool, str]:
    """POST to URL Inspection API — gets indexing state and asks Google to look."""
    url = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
    body = json.dumps({"inspectionUrl": page_url, "siteUrl": site}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        r = urllib.request.urlopen(req, timeout=30)
        data = json.loads(r.read())
        result = data.get("inspectionResult", {})
        idx = result.get("indexStatusResult", {})
        verdict = idx.get("verdict", "UNKNOWN")
        coverage = idx.get("coverageState", "unknown")
        return True, f"{verdict} — {coverage}"
    except urllib.error.HTTPError as e:
        return False, f"HTTP {e.code}: {e.read().decode()[:200]}"


def main():
    today = dt.date.today().isoformat()
    out_dir = REPO_ROOT / "docs" / "measurements"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"gsc-submit-{today}.md"

    print("Fetching access token...")
    token = get_access_token()

    lines = [
        f"# GSC Submit Report — {today}",
        "",
        f"**Generated:** {dt.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}",
        "",
        "## Sitemap submissions",
        "",
        "| Property | Sitemap | Status |",
        "|---|---|---|",
    ]

    for site, sitemap in SITEMAPS:
        print(f"Submitting sitemap for {site}...")
        ok, msg = submit_sitemap(site, sitemap, token)
        mark = "✓" if ok else "✗"
        lines.append(f"| {site} | {sitemap} | {mark} {msg} |")

    lines.extend([
        "",
        "## URL inspection (5 new pages, May 1)",
        "",
        "| URL | Verdict | Coverage |",
        "|---|---|---|",
    ])

    for site, page in NEW_PAGES:
        print(f"Inspecting {page}...")
        ok, msg = inspect_url(site, page, token)
        if ok and " — " in msg:
            verdict, coverage = msg.split(" — ", 1)
        else:
            verdict, coverage = "ERROR", msg
        lines.append(f"| {page} | {verdict} | {coverage} |")

    lines.extend([
        "",
        "## Notes",
        "",
        "- Sitemap submission tells Google to refresh its sitemap parse — does NOT guarantee immediate crawl.",
        "- URL inspection returns the *current* indexing state. To explicitly request indexing, use Google's Search Console UI (the 'Request Indexing' button is not exposed via API).",
        "- Verdict: `PASS` = indexed, `NEUTRAL` = discovered not indexed, `FAIL` = blocked or error.",
    ])

    out.write_text("\n".join(lines) + "\n")
    print(f"Report: {out}")


if __name__ == "__main__":
    main()
