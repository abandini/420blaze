#!/usr/bin/env python3
"""Send a newsletter to all CONFIRMED, non-unsubscribed subscribers.

Usage:
  python3 scripts/send-newsletter.py --subject "Subject line" --html path/to/body.html [--dry-run]
  python3 scripts/send-newsletter.py --subject "..." --html body.html --test you@example.com

The HTML body may contain {{UNSUB_URL}} — replaced per-recipient. If absent,
an unsubscribe footer is appended automatically. Reads RESEND_API_KEY from
workers/seo-proxy/.dev.vars. List lives in D1 (affiliate-analytics.subscribers).
Resend free tier: 100 emails/day — the script warns past 90 recipients.
"""
import argparse, json, pathlib, subprocess, sys, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
FROM = "Blazin Bill <news@420blazin.com>"
SITE = "https://420blazin.com"
BATCH = 100  # Resend batch-endpoint max

FOOTER = (
    '<p style="font-size:12px;color:#999;margin-top:28px;border-top:1px solid #eee;padding-top:14px;">'
    'You\'re getting this because you confirmed at 420Blazin.com. '
    '<a href="{{UNSUB_URL}}" style="color:#999;">Unsubscribe</a> &middot; Cleveland, OH</p>'
)


def resend_key() -> str:
    for line in (ROOT / "workers/seo-proxy/.dev.vars").read_text().splitlines():
        if line.startswith("RESEND_API_KEY="):
            return line.split("=", 1)[1].strip()
    sys.exit("RESEND_API_KEY not found in workers/seo-proxy/.dev.vars")


def recipients() -> list[dict]:
    out = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "affiliate-analytics", "--remote", "--json",
         "--command",
         "SELECT email, token FROM subscribers WHERE confirmed = 1 AND unsubscribed_at IS NULL AND token IS NOT NULL;"],
        cwd=ROOT, capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"D1 query failed:\n{out.stderr[-500:]}")
    return json.loads(out.stdout)[0]["results"]


def send_batch(key: str, emails: list[dict]) -> dict:
    req = urllib.request.Request(
        "https://api.resend.com/emails/batch",
        data=json.dumps(emails).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                 "User-Agent": "420blazin-newsletter/1.0"},  # urllib's default UA gets 403'd at the edge
        method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def build_email(to: str, token: str, subject: str, body: str) -> dict:
    unsub = f"{SITE}/unsubscribe?t={token}"
    html = body if "{{UNSUB_URL}}" in body else body + FOOTER
    html = html.replace("{{UNSUB_URL}}", unsub)
    return {
        "from": FROM, "to": [to], "subject": subject, "html": html,
        "headers": {"List-Unsubscribe": f"<{unsub}>",
                    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"},
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--subject", required=True)
    ap.add_argument("--html", required=True, help="path to HTML body file")
    ap.add_argument("--dry-run", action="store_true", help="show recipients, send nothing")
    ap.add_argument("--test", metavar="EMAIL", help="send ONLY to this address (uses a dummy token)")
    args = ap.parse_args()

    body = pathlib.Path(args.html).read_text()
    key = resend_key()

    if args.test:
        resp = send_batch(key, [build_email(args.test, "0" * 48, args.subject, body)])
        print(f"test sent to {args.test}: {resp}")
        return

    subs = recipients()
    print(f"{len(subs)} confirmed recipients")
    if not subs:
        sys.exit("nothing to send")
    if len(subs) > 90:
        print("⚠️  >90 recipients — check the Resend plan's daily limit (free tier = 100/day)")
    if args.dry_run:
        for s in subs:
            print("  ", s["email"])
        print("(dry run — nothing sent)")
        return

    sent = 0
    for i in range(0, len(subs), BATCH):
        chunk = subs[i:i + BATCH]
        resp = send_batch(key, [build_email(s["email"], s["token"], args.subject, body) for s in chunk])
        sent += len(resp.get("data", []))
        print(f"  batch {i // BATCH + 1}: {len(resp.get('data', []))} accepted")
        if i + BATCH < len(subs):
            time.sleep(1)
    print(f"done — {sent}/{len(subs)} accepted by Resend")


if __name__ == "__main__":
    main()
