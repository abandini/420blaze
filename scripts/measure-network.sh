#!/usr/bin/env bash
# Cannabis Education Network — Weekly Measurement Snapshot
#
# Usage: bash scripts/measure-network.sh
#
# Pulls live data from:
#   - Cloudflare Web Analytics (GraphQL) — pageviews per site, top URLs
#   - Cloudflare D1 affiliate_clicks — POTV affiliate clicks
#
# Writes a snapshot to docs/measurements/T+N-YYYY-MM-DD.md
#
# Auth: Uses the Wrangler OAuth token from ~/.wrangler/config/default.toml.
# If the token is expired, run `wrangler whoami` first to refresh.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACCOUNT_ID="ec81afc4dc58b34ce34e7ad19fd6fbdd"
GRAPHQL="https://api.cloudflare.com/client/v4/graphql"

# Date range: last 7 days
TODAY=$(date -u +%Y-%m-%d)
SINCE=$(date -u -v-7d +%Y-%m-%d 2>/dev/null || date -u -d '7 days ago' +%Y-%m-%d)

# Read OAuth token from wrangler config
TOKEN=$(grep '^oauth_token' ~/.wrangler/config/default.toml | cut -d'"' -f2)
if [ -z "$TOKEN" ]; then
  echo "ERROR: No OAuth token found. Run 'wrangler whoami' to authenticate." >&2
  exit 1
fi

# Output file
mkdir -p "$REPO_ROOT/docs/measurements"
OUT="$REPO_ROOT/docs/measurements/snapshot-$TODAY.md"

echo "Pulling baseline for $SINCE → $TODAY..."

# 1. Network pageviews per site
NETWORK_PV=$(curl -s -X POST "$GRAPHQL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query($acc: string!, $since: Time!, $until: Time!) { viewer { accounts(filter: {accountTag: $acc}) { rumPageloadEventsAdaptiveGroups(limit: 50, filter: {date_geq: $since, date_leq: $until, requestHost_in: [\"420blazin.com\", \"www.420blazin.com\", \"365daysofweed.com\", \"www.365daysofweed.com\", \"weedaseniorsguide.com\", \"www.weedaseniorsguide.com\"]}, orderBy: [count_DESC]) { count, dimensions { requestHost } } } } }",
    "variables": {"acc": "'$ACCOUNT_ID'", "since": "'$SINCE'", "until": "'$TODAY'"}
  }')

# 2. Top 420blazin URLs
TOP_PATHS=$(curl -s -X POST "$GRAPHQL" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query($acc: string!, $since: Time!, $until: Time!) { viewer { accounts(filter: {accountTag: $acc}) { rumPageloadEventsAdaptiveGroups(limit: 25, filter: {date_geq: $since, date_leq: $until, requestHost_in: [\"420blazin.com\", \"www.420blazin.com\"]}, orderBy: [count_DESC]) { count, dimensions { requestPath } } } } }",
    "variables": {"acc": "'$ACCOUNT_ID'", "since": "'$SINCE'", "until": "'$TODAY'"}
  }')

# 3. Affiliate click totals
TOTAL_CLICKS=$(wrangler d1 execute affiliate-analytics --remote \
  --command "SELECT COUNT(*) as n FROM affiliate_clicks" 2>&1 | \
  grep -oE '"n":[ 0-9]+' | head -1 | grep -oE '[0-9]+')

LAST_7D_CLICKS=$(wrangler d1 execute affiliate-analytics --remote \
  --command "SELECT COUNT(*) as n FROM affiliate_clicks WHERE clicked_at >= datetime('now', '-7 days')" 2>&1 | \
  grep -oE '"n":[ 0-9]+' | head -1 | grep -oE '[0-9]+')

# 4. Top affiliate slugs
TOP_SLUGS=$(wrangler d1 execute affiliate-analytics --remote \
  --command "SELECT slug, COUNT(*) as clicks FROM affiliate_clicks WHERE clicked_at >= datetime('now', '-7 days') GROUP BY slug ORDER BY clicks DESC LIMIT 10" 2>&1)

# Generate the report
cat > "$OUT" <<EOF
# Network Measurement Snapshot — $TODAY

**Window:** $SINCE → $TODAY (7 days)
**Generated:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Network pageviews

\`\`\`json
$(echo "$NETWORK_PV" | python3 -m json.tool 2>/dev/null || echo "$NETWORK_PV")
\`\`\`

## 420blazin top paths

\`\`\`json
$(echo "$TOP_PATHS" | python3 -m json.tool 2>/dev/null || echo "$TOP_PATHS")
\`\`\`

## Affiliate clicks

- All-time: **$TOTAL_CLICKS** clicks
- Last 7 days: **$LAST_7D_CLICKS** clicks

## Top slugs (last 7 days)

\`\`\`
$(echo "$TOP_SLUGS" | grep -E '"slug"|"clicks"' | paste - - | head -10)
\`\`\`

---

Compare against [T+0 baseline](../MEASUREMENT-BASELINE-T0.md).
EOF

echo "Snapshot written to: $OUT"
echo ""
echo "--- Network pageviews ---"
echo "$NETWORK_PV" | python3 -c "
import json, sys
data = json.load(sys.stdin)
groups = data['data']['viewer']['accounts'][0]['rumPageloadEventsAdaptiveGroups']
for g in groups:
    print(f\"  {g['dimensions']['requestHost']:35} {g['count']:>5}\")
" 2>/dev/null || echo "(parse error)"

echo ""
echo "--- Affiliate clicks ---"
echo "  All-time:    $TOTAL_CLICKS"
echo "  Last 7 days: $LAST_7D_CLICKS"
