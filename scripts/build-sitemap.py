#!/usr/bin/env python3
"""build-sitemap.py — regenerate sitemap.xml from the actual .html pages.

Enumerates root + blog/ HTML files, maps them to clean URLs (drop .html,
index -> /), and applies a priority/changefreq policy. Re-run after adding
pages so the sitemap never drifts from reality again.

Usage:  python3 scripts/build-sitemap.py
"""
import glob, os
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
BASE = "https://420blazin.com"
OUT = REPO / "sitemap.xml"

# pages that should NOT be indexed
SKIP = {"404.html", "thank-you.html"}

# per-slug policy: slug -> (changefreq, priority). Anything unlisted gets a default.
POLICY = {
    "": ("weekly", "1.0"),                       # home
    # core tools
    "strain-finder": ("weekly", "0.9"),
    "edibles": ("weekly", "0.9"),
    "heart-smart": ("weekly", "0.8"),
    "playlists": ("weekly", "0.7"),
    # commerce + events hubs
    "merch": ("weekly", "0.9"),
    "events": ("weekly", "0.9"),
    "festival": ("weekly", "0.8"),
    "cleveland-420": ("weekly", "0.8"),
    "blog": ("weekly", "0.8"),
    "culture": ("weekly", "0.8"),
    # event/holiday pages
    "music-events": ("weekly", "0.7"),
    "cannabis-holidays-2026": ("weekly", "0.7"),
    "710-dab-day-2026": ("monthly", "0.7"),
    "green-wednesday-2026": ("monthly", "0.6"),
    "jack-herer-day": ("monthly", "0.6"),
    "culture-celebrations": ("monthly", "0.6"),
    # culture sub-pages
    "culture-terpenes": ("monthly", "0.7"),
    "culture-flower": ("monthly", "0.7"),
    "culture-edibles": ("monthly", "0.7"),
    "culture-concentrates": ("monthly", "0.6"),
    "culture-glass": ("monthly", "0.6"),
    "culture-plants": ("monthly", "0.6"),
    "culture-rolling": ("monthly", "0.6"),
    "stoner-movies": ("monthly", "0.6"),
    # info
    "about": ("monthly", "0.6"),
    "contact": ("monthly", "0.5"),
    # legal
    "privacy": ("yearly", "0.3"),
    "terms": ("yearly", "0.3"),
    "shipping": ("yearly", "0.4"),
    "returns": ("yearly", "0.4"),
}
BLOG_DEFAULT = ("monthly", "0.7")     # blog posts
DEFAULT = ("monthly", "0.5")

def slug_for(path: Path) -> str:
    rel = path.relative_to(REPO).as_posix()
    if rel == "index.html":
        return ""
    return rel[:-5]  # strip ".html"

def main():
    pages = []
    for p in sorted(REPO.glob("*.html")) + sorted((REPO / "blog").glob("*.html")):
        if p.name in SKIP:
            continue
        pages.append(slug_for(p))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for slug in pages:
        if slug in POLICY:
            cf, pr = POLICY[slug]
        elif slug.startswith("blog/"):
            cf, pr = BLOG_DEFAULT
        else:
            cf, pr = DEFAULT
        loc = f"{BASE}/" if slug == "" else f"{BASE}/{slug}"
        lines.append(f"  <url><loc>{loc}</loc><changefreq>{cf}</changefreq><priority>{pr}</priority></url>")
    lines.append("</urlset>\n")
    OUT.write_text("\n".join(lines))
    print(f"wrote {OUT} with {len(pages)} URLs")

if __name__ == "__main__":
    main()
