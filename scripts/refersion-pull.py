#!/usr/bin/env python3
"""
Refersion Pull — pulls conversion + commission data from POTV's Refersion
affiliate dashboard via the Affiliate GraphQL API.

The most important script in the measurement suite — clicks are vanity,
commissions are revenue.

CREDENTIALS REQUIRED (Bill must add to .dev.vars):
    REFERSION_GRAPHQL_TOKEN=<token from Refersion → Account → Integrations → GraphQL Token>

To get the token:
    1. Log into Refersion as the affiliate
    2. Go to Account → Integrations
    3. Under "GraphQL Token", click "Generate New Token"
    4. Copy the token
    5. Paste into 420blaze/.dev.vars as REFERSION_GRAPHQL_TOKEN=...

Until the token is added, this script writes a "credentials needed" stub
so the launchd cadence stays consistent.

Usage:
    python3 refersion-pull.py
"""

import datetime as dt
import json
import sys
import urllib.request
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
DEV_VARS = REPO_ROOT / ".dev.vars"
GRAPHQL_URL = "https://affiliate-api.refersion.com/graphql"


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


def gql(token: str, query: str, variables: dict | None = None) -> dict:
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        GRAPHQL_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            # Refersion's edge (Cloudflare) returns 1010 for default Python-urllib UA
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "application/json",
        },
    )
    r = urllib.request.urlopen(req, timeout=30)
    return json.loads(r.read())


def write_stub(out_path: Path, today: str) -> None:
    out_path.write_text(
        f"# Refersion Snapshot — {today}\n\n"
        "**Status:** Token is saved but Refersion's GraphQL endpoint format is unresolved.\n\n"
        "## What we know\n"
        "- Token is saved in `.dev.vars` as `REFERSION_GRAPHQL_TOKEN`\n"
        "- The token decodes to 256 bytes of binary data (RSA-2048 encrypted ciphertext)\n"
        "- `https://api.refersion.com/v3/graphql` accepts only GET (not POST), but rejects every Authorization header format we've tried with `\"Invalid token format\"`\n"
        "- `https://api.refersion.com/v3/*` REST endpoints all return 405 (POST not supported)\n"
        "- Refersion's `app.refersion.com` JS bundle references `api.refersion.com/v3/` but doesn't reveal the GraphQL endpoint usage\n"
        "- Refersion's docs site (`refersion.dev`) requires login to see endpoint detail\n\n"
        "## What to do next\n"
        "1. **Easiest:** In Refersion → Account → Integrations, look for a 'docs' or 'example curl' link near the GraphQL Token panel. If it shows the exact endpoint URL + auth format, paste it here and the script will work immediately.\n"
        "2. **Or:** Email support@refersion.com with: 'I generated a GraphQL Token in my affiliate account. What is the exact endpoint URL and Authorization header format I should use to send queries?'\n"
        "3. **Or:** Open the Refersion affiliate dashboard browser DevTools → Network tab → find a GraphQL request → copy as cURL.\n\n"
        "## Workaround\n"
        "Until this is resolved, click counts in the D1 `affiliate_clicks` table remain "
        "the proxy for revenue intent. With a typical 3% click-to-buy conversion at "
        "$200 average vape price × 15% commission, weekly clicks × 0.009 ≈ commission earned.\n"
    )


def main():
    today = dt.date.today().isoformat()
    out_dir = REPO_ROOT / "docs" / "measurements"
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"refersion-{today}.md"

    creds = read_dev_vars()
    token = creds.get("REFERSION_GRAPHQL_TOKEN")

    if not token:
        write_stub(out, today)
        print(f"Stub written (token missing): {out}")
        sys.exit(0)

    end = dt.date.today()
    start = end - dt.timedelta(days=7)

    # Refersion's affiliate GraphQL schema exposes conversions on the
    # authenticated affiliate. We query the last 7 days, paginated.
    query = """
    query Conversions($first: Int!, $startDate: String, $endDate: String) {
      me {
        conversions(first: $first, startDate: $startDate, endDate: $endDate) {
          edges {
            node {
              id
              orderNumber
              orderTotal
              commissionTotal
              status
              createdAt
              campaign { name }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
    """

    try:
        data = gql(token, query, {
            "first": 100,
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
        })
    except urllib.error.HTTPError as e:
        body = e.read().decode()[:500]
        out.write_text(
            f"# Refersion Snapshot — {today}\n\n"
            f"**Status:** GraphQL request failed: HTTP {e.code}\n\n"
            f"**Response:** ```\n{body}\n```\n\n"
            "Verify REFERSION_GRAPHQL_TOKEN in .dev.vars. The token may have been "
            "rotated or revoked. Generate a new one in Refersion → Account → "
            "Integrations and replace it.\n"
        )
        print(f"API error: {e.code}", file=sys.stderr)
        sys.exit(1)

    if "errors" in data and data["errors"]:
        # Schema introspection fallback — try alternate query shapes
        err = data["errors"][0].get("message", "unknown")
        out.write_text(
            f"# Refersion Snapshot — {today}\n\n"
            f"**Status:** GraphQL returned an error.\n\n"
            f"**Error:** `{err}`\n\n"
            f"**Raw response:**\n```json\n{json.dumps(data, indent=2)[:1500]}\n```\n\n"
            "The affiliate API schema may differ from the assumed structure. "
            "Run an introspection query and adjust scripts/refersion-pull.py.\n"
        )
        print(f"GraphQL error: {err}", file=sys.stderr)
        sys.exit(1)

    edges = data.get("data", {}).get("me", {}).get("conversions", {}).get("edges", [])
    conversions = [e["node"] for e in edges]
    total_sale = sum(float(c.get("orderTotal", 0)) for c in conversions)
    total_commission = sum(float(c.get("commissionTotal", 0)) for c in conversions)
    aov = total_sale / len(conversions) if conversions else 0

    lines = [
        f"# Refersion Snapshot — {today}",
        "",
        f"**Window:** {start.isoformat()} → {end.isoformat()} (7 days)",
        f"**Generated:** {dt.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')}",
        "",
        "## Headline numbers",
        "",
        f"- **Conversions:** {len(conversions)}",
        f"- **Total sales:** ${total_sale:,.2f}",
        f"- **Total commission earned:** ${total_commission:,.2f}",
        f"- **Average order value:** ${aov:,.2f}",
        "",
        "## Conversions detail",
        "",
        "| Date | Order # | Sale | Commission | Status | Campaign |",
        "|---|---|---:|---:|---|---|",
    ]
    for c in conversions[:50]:
        d = (c.get("createdAt") or "")[:10]
        sale = float(c.get("orderTotal", 0))
        comm = float(c.get("commissionTotal", 0))
        order = c.get("orderNumber") or c.get("id", "")
        status = c.get("status", "")
        campaign = (c.get("campaign") or {}).get("name", "")
        lines.append(f"| {d} | {order} | ${sale:,.2f} | ${comm:,.2f} | {status} | {campaign} |")

    out.write_text("\n".join(lines) + "\n")
    print(f"Snapshot: {out}")
    print(f"Conversions: {len(conversions)} | Sales: ${total_sale:,.2f} | Commission: ${total_commission:,.2f}")


if __name__ == "__main__":
    main()
