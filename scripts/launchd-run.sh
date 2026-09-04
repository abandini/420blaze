#!/bin/bash
# launchd-run.sh — wait for the network, then run a command with retries.
#
# Why this exists: the Friday-9am measurement jobs (measure, gsc, posthog,
# ai-citations, refersion) are StartCalendarInterval launchd agents. When the
# Mac is asleep at 9:17, launchd fires them the instant it wakes — usually
# before Wi-Fi/DNS is back — and every HTTP call dies with
# "nodename nor servname provided, or not known". That silently blanked out
# every week of August 2026. This wrapper makes the jobs wait for DNS and
# retry, so a slow wake-up no longer costs a week of data.
#
# Usage (from a plist ProgramArguments):
#   /path/to/launchd-run.sh /path/to/python3 /path/to/script.py [args...]
#
# Tunables (env, optional):
#   LAUNCHD_RUN_WAIT_MAX     seconds to wait for network before giving up and
#                            running anyway (default 900 = 15 min)
#   LAUNCHD_RUN_RETRIES      attempts before failing (default 3)
#   LAUNCHD_RUN_RETRY_SLEEP  seconds between attempts (default 120)
#   LAUNCHD_RUN_PROBE_URL    URL that proves DNS+TLS work (default PostHog)
set -u

WAIT_MAX="${LAUNCHD_RUN_WAIT_MAX:-900}"
RETRIES="${LAUNCHD_RUN_RETRIES:-3}"
RETRY_SLEEP="${LAUNCHD_RUN_RETRY_SLEEP:-120}"
PROBE_URL="${LAUNCHD_RUN_PROBE_URL:-https://us.posthog.com/}"
TAG="launchd-run"

ts() { date '+%Y-%m-%d %H:%M:%S'; }
net_up() { /usr/bin/curl -sS -m 5 -o /dev/null "$PROBE_URL" 2>/dev/null; }

if [ "$#" -eq 0 ]; then
  echo "[$(ts)] $TAG: no command given" >&2
  exit 64
fi

# 1. Wait for the network (poll every 15s, up to WAIT_MAX).
waited=0
until net_up; do
  if [ "$waited" -ge "$WAIT_MAX" ]; then
    echo "[$(ts)] $TAG: network still down after ${WAIT_MAX}s — running anyway"
    break
  fi
  sleep 15
  waited=$((waited + 15))
done
if [ "$waited" -gt 0 ]; then
  echo "[$(ts)] $TAG: waited ${waited}s for network"
fi

# 2. Run with retries. Any non-zero exit is retried; a deterministic failure
#    (bad token, API change) will still fail — just RETRIES times, a couple
#    minutes apart, which is the trade-off for surviving transient DNS/Wi-Fi.
attempt=1
while :; do
  "$@"
  rc=$?
  if [ "$rc" -eq 0 ]; then
    exit 0
  fi
  if [ "$attempt" -ge "$RETRIES" ]; then
    echo "[$(ts)] $TAG: FAILED after ${attempt} attempts (rc=${rc}): $*"
    exit "$rc"
  fi
  echo "[$(ts)] $TAG: attempt ${attempt} failed (rc=${rc}); retrying in ${RETRY_SLEEP}s"
  attempt=$((attempt + 1))
  sleep "$RETRY_SLEEP"
done
