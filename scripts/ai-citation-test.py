#!/usr/bin/env python3
"""
AI Citation Test — measures whether the Cannabis Education Network
gets cited by AI search engines for our target queries.

This is the actual GEO success metric: the entire Phase 1 work was about
making Bill's sites citation-worthy by AI engines. This script measures it.

Currently tests Perplexity (live web-grounded responses).
Extensible to Gemini, Anthropic Claude API, OpenAI.

Usage:
    python3 ai-citation-test.py             # Run all queries
    python3 ai-citation-test.py --quiet     # Suppress per-query output

Auth:
    PERPLEXITY_API_KEY env var (Bill has this in shell config).
"""

import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# Domains we want cited
NETWORK_DOMAINS = [
    "420blazin.com",
    "365daysofweed.com",
    "weedaseniorsguide.com",
]

# Test queries — each one targets content we've published
TEST_QUERIES = [
    {"q": "When is Green Wednesday 2026 and what cannabis deals run that day?", "target_page": "/green-wednesday-2026"},
    {"q": "What is 7/10 Dab Day and what does the date mean?", "target_page": "/710-dab-day-2026"},
    {"q": "What are the best dry herb vaporizers in 2026?", "target_page": "/blog/best-dry-herb-vaporizers"},
    {"q": "Cleveland Ohio cannabis dispensaries 4/20 events 2026", "target_page": "/cleveland-420"},
    {"q": "Best stoner movies with cannabis strain pairings", "target_page": "/stoner-movies"},
    {"q": "Complete list of cannabis holidays in 2026 calendar", "target_page": "/cannabis-holidays-2026"},
    {"q": "Cannabis guide for adults over 60 starting CBD or THC", "target_page": "/ (seniorsguide root)"},
    {"q": "Wake and bake cannabis morning routine science-backed strains", "target_page": "/blog/wake-and-bake-protocol"},
    {"q": "Why does Sour Diesel pair well with comedy movies", "target_page": "/blog/half-baked-sour-diesel-pairing"},
    {"q": "420Blazin festival Cleveland 2027", "target_page": "/festival"},
    # Brownie-specific GEO targets
    {"q": "How do I calculate THC dosage in homemade cannabis brownies?", "target_page": "/blog/cannabis-brownies-without-the-blackout"},
    {"q": "What temperature for decarbing cannabis flower for brownies?", "target_page": "/blog/cannabis-brownies-without-the-blackout"},
    {"q": "How many brownies does a Pillsbury family size box make?", "target_page": "/blog/cannabis-brownies-without-the-blackout"},
    {"q": "Why do edibles hit harder than smoking cannabis?", "target_page": "/blog/cannabis-brownies-without-the-blackout"},
    {"q": "Senior cannabis brownie dosing safe edible amount older adult", "target_page": "/blog/cannabis-brownies-safe-dosing-seniors (seniorsguide)"},
    {"q": "Cannabutter substitute oil boxed brownie mix ratio", "target_page": "/blog/cannabis-brownies-without-the-blackout"},
    {"q": "What to do if you ate too much cannabis edible too strong", "target_page": "/blog/cannabis-brownies-without-the-blackout"},
]


def query_perplexity(question: str, api_key: str) -> dict:
    """Returns {answer: str, citations: list[str]}."""
    body = json.dumps({
        "model": "sonar",
        "messages": [{"role": "user", "content": question}],
        "return_citations": True,
    }).encode()
    req = urllib.request.Request(
        "https://api.perplexity.ai/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}: {e.read().decode()[:200]}", "answer": "", "citations": []}
    answer = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    citations = data.get("citations", [])
    return {"answer": answer, "citations": citations}


def detect_network_citations(answer: str, citations: list[str]) -> dict:
    """Find network domain mentions in answer text and citation URLs."""
    found = {d: {"in_answer": False, "in_citations": []} for d in NETWORK_DOMAINS}
    for d in NETWORK_DOMAINS:
        # In answer text (URL, link, or domain mention)
        if re.search(rf"\b{re.escape(d)}\b", answer, re.IGNORECASE):
            found[d]["in_answer"] = True
        # In citations list
        for c in citations:
            if d in c.lower():
                found[d]["in_citations"].append(c)
    return found


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()

    api_key = os.environ.get("PERPLEXITY_API_KEY")
    if not api_key:
        sys.exit("ERROR: PERPLEXITY_API_KEY env var not set. Add to shell profile.")

    today = dt.date.today().isoformat()
    out_dir = REPO_ROOT / "docs" / "measurements"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"ai-citations-{today}.md"

    results = []
    total_citations = 0
    queries_with_any_citation = 0

    for i, test in enumerate(TEST_QUERIES, 1):
        if not args.quiet:
            print(f"[{i}/{len(TEST_QUERIES)}] {test['q'][:60]}...")
        r = query_perplexity(test["q"], api_key)
        if "error" in r:
            results.append({**test, "result": r, "citations_found": {}})
            if not args.quiet:
                print(f"   ERROR: {r['error']}")
            continue
        found = detect_network_citations(r["answer"], r["citations"])
        any_cited = any(v["in_answer"] or v["in_citations"] for v in found.values())
        cite_count = sum(len(v["in_citations"]) + (1 if v["in_answer"] else 0) for v in found.values())
        total_citations += cite_count
        if any_cited:
            queries_with_any_citation += 1
        results.append({**test, "result": r, "citations_found": found})
        if not args.quiet:
            if any_cited:
                cited = [d for d, v in found.items() if v["in_answer"] or v["in_citations"]]
                print(f"   ✓ Cited: {', '.join(cited)}")
            else:
                print(f"   — No network citations")

    # Build report
    lines = [
        f"# AI Citation Test — {today}",
        "",
        f"**Generated:** {dt.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}",
        f"**Engine:** Perplexity (sonar model, live web search)",
        f"**Queries tested:** {len(TEST_QUERIES)}",
        f"**Queries with any network citation:** **{queries_with_any_citation} / {len(TEST_QUERIES)}**",
        f"**Total network citations across all responses:** **{total_citations}**",
        "",
        "## Summary",
        "",
        "| # | Query | Target page | Cited? |",
        "|---|---|---|---|",
    ]
    for i, r in enumerate(results, 1):
        cited = []
        if r.get("citations_found"):
            cited = [d for d, v in r["citations_found"].items() if v["in_answer"] or v["in_citations"]]
        lines.append(f"| {i} | {r['q'][:60]}... | {r['target_page']} | {', '.join(cited) if cited else '—'} |")

    lines.extend(["", "## Per-query detail", ""])
    for i, r in enumerate(results, 1):
        lines.append(f"### Query {i}: `{r['q']}`")
        lines.append("")
        lines.append(f"**Target page:** `{r['target_page']}`")
        lines.append("")
        if "error" in r["result"]:
            lines.append(f"**Error:** {r['result']['error']}")
            lines.append("")
            continue
        lines.append("**Answer (first 500 chars):**")
        lines.append("")
        lines.append("> " + r["result"]["answer"][:500].replace("\n", "\n> "))
        lines.append("")
        lines.append("**Citations returned:**")
        for c in r["result"]["citations"]:
            is_network = any(d in c.lower() for d in NETWORK_DOMAINS)
            mark = "**✓**" if is_network else ""
            lines.append(f"- {mark} {c}")
        lines.append("")
        lines.append("**Network domain detection:**")
        for d, v in r["citations_found"].items():
            details = []
            if v["in_answer"]:
                details.append("in answer text")
            if v["in_citations"]:
                details.append(f"in citations ({len(v['in_citations'])})")
            status = ", ".join(details) if details else "not cited"
            lines.append(f"- `{d}`: {status}")
        lines.append("")

    out.write_text("\n".join(lines) + "\n")

    print()
    print(f"Report: {out}")
    print(f"Score: {queries_with_any_citation}/{len(TEST_QUERIES)} queries earned network citations")
    print(f"Total citations: {total_citations}")


if __name__ == "__main__":
    main()
