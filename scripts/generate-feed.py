#!/usr/bin/env python3
"""Generate /feed.xml (RSS 2.0) from the blog posts. Re-run after adding a post."""
import glob, re, html
from datetime import datetime, timezone

SITE = "https://420blazin.com"
BLOG = sorted(glob.glob("blog/*.html"))
items = []

for fp in BLOG:
    h = open(fp, encoding="utf-8").read()
    slug = fp[len("blog/"):-len(".html")]
    url = f"{SITE}/blog/{slug}"
    t = re.search(r"<title>(.*?)</title>", h, re.S)
    title = (t.group(1).split("|")[0].split(" - ")[0].strip() if t else slug)
    d = re.search(r'name="description" content="([^"]*)"', h)
    desc = d.group(1) if d else ""
    # published date: JSON-LD datePublished, else article:published_time
    pub = re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})"', h) \
        or re.search(r'article:published_time" content="(\d{4}-\d{2}-\d{2})', h)
    date = pub.group(1) if pub else "2026-01-01"
    items.append((date, title, desc, url))

items.sort(reverse=True)  # newest first
build = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S +0000")

def rfc822(d):
    return datetime.strptime(d, "%Y-%m-%d").replace(tzinfo=timezone.utc).strftime("%a, %d %b %Y 09:00:00 +0000")

parts = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>420Blazin Blog</title>',
    f'    <link>{SITE}/blog</link>',
    '    <description>Cannabis culture, terpene-based strain guides, honest gear reviews, and Cleveland cannabis from Blazin Bill.</description>',
    '    <language>en-us</language>',
    f'    <lastBuildDate>{build}</lastBuildDate>',
    f'    <atom:link href="{SITE}/feed.xml" rel="self" type="application/rss+xml" />',
]
for date, title, desc, url in items:
    parts += [
        '    <item>',
        f'      <title>{html.escape(title)}</title>',
        f'      <link>{url}</link>',
        f'      <guid isPermaLink="true">{url}</guid>',
        f'      <pubDate>{rfc822(date)}</pubDate>',
        f'      <description>{html.escape(desc)}</description>',
        '    </item>',
    ]
parts += ['  </channel>', '</rss>', '']
open("feed.xml", "w", encoding="utf-8").write("\n".join(parts))
print(f"feed.xml written: {len(items)} posts, newest {items[0][0]} ({items[0][1]})")
