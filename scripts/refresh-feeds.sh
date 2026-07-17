#!/usr/bin/env bash
# refresh-feeds.sh — rebuild the flower + edible data feeds from the source
# dispensary spreadsheets and, ONLY if the built JSON actually changed, commit +
# push. Cloudflare Pages auto-deploys the push to production (420blazin.com).
#
# Idempotent by design: the two build scripts are byte-for-byte deterministic, so
# identical source spreadsheets -> identical JSON -> no diff -> no commit -> no deploy.
# It "checks for new files" implicitly: a refreshed terrasana/*.xlsx changes the
# built JSON; an unchanged source produces no commit.
#
# Scheduled 3x daily (00:00, 06:00, 12:00) via launchd:
#   ~/Library/LaunchAgents/com.420blazin.refresh-feeds.plist
# Manual run:   bash scripts/refresh-feeds.sh
# Disable auto-push (rebuild + commit locally only): set PUSH=0 in the environment.
set -euo pipefail

REPO="/Users/billburkey/CascadeProjects/420blaze"
cd "$REPO"

# launchd hands us a minimal environment — pin a usable PATH for python3/git.
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
PY="$(command -v python3)"
PUSH="${PUSH:-1}"

mkdir -p "$REPO/logs"
LOG="$REPO/logs/refresh-feeds.log"
log(){ echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] $*" | tee -a "$LOG"; }

log "=== refresh start (push=$PUSH) ==="

# Never operate off main — a stray branch push could deploy the wrong tree.
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$BRANCH" != "main" ]; then
  log "on branch '$BRANCH', not main — aborting (won't risk a surprise deploy)"
  exit 0
fi

# Explicit pause switch: `touch data/.refresh-hold` while editing sources/scripts,
# `rm` it when done. Prevents a scheduled run from building off half-synced input.
if [ -f data/.refresh-hold ]; then
  log "data/.refresh-hold present — paused (manual work in progress); skipping"
  exit 0
fi

# Rebuild. Flower FIRST: edibles inherit terpene profiles from the flower feed.
if ! "$PY" scripts/build-strain-data.py >>"$LOG" 2>&1; then log "flower build FAILED"; exit 1; fi
if ! "$PY" scripts/build-edible-data.py  >>"$LOG" 2>&1; then log "edibles build FAILED"; exit 1; fi

FILES=(data/strain-terpenes.json data/edible-products.json)

if git diff --quiet -- "${FILES[@]}"; then
  log "no data change — nothing to deploy"
  log "=== refresh done ==="
  exit 0
fi

# Validation gate: never ship an implausible feed (gutted count, big drop vs the
# deployed version, bad/blank date, corrupt JSON, empty names). On failure, restore
# the last-good committed feeds and bail — a bad build must not reach production.
if ! "$PY" scripts/validate-feeds.py >>"$LOG" 2>&1; then
  log "VALIDATION FAILED — refusing to commit/deploy; restoring last-good feeds"
  git checkout -- "${FILES[@]}" 2>>"$LOG" || true
  exit 1
fi

# Commit ONLY the two data files. Explicit pathspec on both add and commit so any
# other uncommitted work in the tree (e.g. staged HTML) can never ride along.
git add -- "${FILES[@]}"
SUMMARY="$("$PY" - <<'EOF'
import json
f=json.load(open('data/strain-terpenes.json')); e=json.load(open('data/edible-products.json'))
print(f"flower {f['count']} strains ({f['updated']}) · edibles {e['count']} ({e['updated']})")
EOF
)"
git commit -q -m "data: scheduled feed refresh — $SUMMARY" \
              -m "Automated by scripts/refresh-feeds.sh. Source: terrasana/*.xlsx." \
              -- "${FILES[@]}"
log "committed: $SUMMARY"

if [ "$PUSH" != "1" ]; then
  log "PUSH disabled — commit is local only"
  log "=== refresh done ==="
  exit 0
fi

if git push -q origin main >>"$LOG" 2>&1; then
  log "pushed to origin/main — Cloudflare Pages will auto-deploy"
else
  log "push FAILED (non-fast-forward or auth) — commit is local, will retry next run"
  exit 1
fi
log "=== refresh done ==="
