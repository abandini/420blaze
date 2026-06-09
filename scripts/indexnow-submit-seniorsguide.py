#!/usr/bin/env python3
"""
IndexNow submission for weedaseniorsguide.com.

Companion to indexnow-submit.py (which handles 420blazin.com). Each domain
needs its own IndexNow key + key file.

Usage:
    python3 indexnow-submit-seniorsguide.py <url1> [<url2> ...]
    python3 indexnow-submit-seniorsguide.py --recent
"""

import argparse
import json
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
INDEXNOW_KEY = "9e36378160e06e3672fca9e3ecfc1199"
HOST = "weedaseniorsguide.com"
KEY_LOCATION = f"https://{HOST}/{INDEXNOW_KEY}.txt"

ENDPOINTS = [
    "https://api.indexnow.org/indexnow",
    "https://www.bing.com/indexnow",
]


def submit(urls: list) -> bool:
    if not urls:
        print("No URLs to submit.")
        return True
    body = json.dumps({
        "host": HOST,
        "key": INDEXNOW_KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls[:10000],
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
    parser.add_argument("urls", nargs="*")
    parser.add_argument("--recent", action="store_true")
    args = parser.parse_args()

    if args.recent:
        import re
        try:
            r = urllib.request.urlopen("https://weedaseniorsguide.com/sitemap.xml", timeout=15)
            urls = re.findall(r"<loc>([^<]+)</loc>", r.read().decode())
            print(f"Submitting {len(urls)} URLs from sitemap...")
        except Exception as e:
            print(f"Sitemap fetch failed: {e}")
            sys.exit(1)
    else:
        urls = args.urls
        if not urls:
            print("Usage: python3 indexnow-submit-seniorsguide.py <url> [...]")
            sys.exit(1)

    print(f"\nKey: {INDEXNOW_KEY}")
    print(f"Key location: {KEY_LOCATION}")
    print(f"\nSubmitting {len(urls)} URL(s):")
    for u in urls:
        print(f"  • {u}")
    print()
    success = submit(urls)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
