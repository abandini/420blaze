#!/usr/bin/env python3
"""
IndexNow submission — pings Bing (which feeds ChatGPT's web search) and Yandex
with new/updated URLs for instant indexing.

Bing supports IndexNow natively. Google does not (still uses GSC API), but
ChatGPT's web browsing relies on Bing's index, so faster Bing indexing
translates to faster AI engine awareness.

Usage:
    python3 indexnow-submit.py <url1> [<url2> ...]
    python3 indexnow-submit.py --recent  # submit all URLs added/updated in last 7 days

Key file: must be served at https://420blazin.com/<KEY>.txt with the key as
the only content. Generated and placed automatically; see /4a98d72df91ea828531f8d83c9292398.txt
"""

import argparse
import json
import sys
import urllib.request
from datetime import date, timedelta
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
INDEXNOW_KEY = "4a98d72df91ea828531f8d83c9292398"
HOST = "420blazin.com"
KEY_LOCATION = f"https://{HOST}/{INDEXNOW_KEY}.txt"

# IndexNow endpoints — submitting to one notifies all participating engines
ENDPOINTS = [
    "https://api.indexnow.org/indexnow",  # multi-engine relay
    "https://www.bing.com/indexnow",       # Bing direct
]


def submit(urls: list[str]) -> bool:
    if not urls:
        print("No URLs to submit.")
        return True
    if len(urls) > 10000:
        print(f"WARN: IndexNow limits to 10,000 URLs per request. Truncating.")
        urls = urls[:10000]

    body = json.dumps({
        "host": HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }).encode()

    success = False
    for url in ENDPOINTS:
        try:
            req = urllib.request.Request(
                url,
                data=body,
                headers={"Content-Type": "application/json; charset=utf-8"},
            )
            r = urllib.request.urlopen(req, timeout=20)
            print(f"  ✓ {url} → HTTP {r.status}")
            if r.status in (200, 202):
                success = True
        except urllib.error.HTTPError as e:
            print(f"  ✗ {url} → HTTP {e.code}: {e.read().decode()[:200]}")
        except Exception as e:
            print(f"  ✗ {url} → {type(e).__name__}: {e}")

    return success


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("urls", nargs="*", help="URLs to submit")
    parser.add_argument("--recent", action="store_true",
                        help="Submit all sitemap URLs (use sparingly — once per major content drop)")
    args = parser.parse_args()

    if args.recent:
        # Pull from sitemap
        import re
        try:
            r = urllib.request.urlopen("https://420blazin.com/sitemap.xml", timeout=15)
            sitemap = r.read().decode()
            urls = re.findall(r"<loc>([^<]+)</loc>", sitemap)
            print(f"Submitting {len(urls)} URLs from sitemap...")
        except Exception as e:
            print(f"Failed to fetch sitemap: {e}")
            sys.exit(1)
    else:
        urls = args.urls
        if not urls:
            print("Usage: python3 indexnow-submit.py <url1> [<url2> ...]")
            print("       python3 indexnow-submit.py --recent")
            sys.exit(1)

    print(f"\nKey: {INDEXNOW_KEY}")
    print(f"Key location: {KEY_LOCATION}")
    print(f"\nSubmitting {len(urls)} URL(s):")
    for u in urls:
        print(f"  • {u}")
    print()

    success = submit(urls)
    if success:
        print("\n✓ Submission accepted by at least one engine.")
        print("Bing typically indexes within minutes to hours.")
        print("ChatGPT web browsing reflects Bing index changes within 24-48 hours.")
    else:
        print("\n✗ All submissions failed. Check key file at the URL above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
