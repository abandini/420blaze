# Newsletter system (420blazin.com)

The list is **owned in Cloudflare D1** (`affiliate-analytics` → `subscribers`); **Resend**
(verified domain `420blazin.com`, from `news@420blazin.com`) is only the delivery pipe.

## Flow
1. Visitor submits the `.email-capture` form (14 pages) → `POST /subscribe` (Worker)
2. Worker stores the row (`confirmed=0`, random `token`) and sends a **confirmation email**
3. Reader clicks → `GET /confirm?t=` → `confirmed=1` + branded thank-you page
4. Every email carries `List-Unsubscribe` headers + a footer link → `GET/POST /unsubscribe?t=`
   (one-click RFC 8058 supported). Re-subscribing clears `unsubscribed_at` (fresh consent).

Only `confirmed = 1 AND unsubscribed_at IS NULL` ever get the newsletter.

## Send a newsletter
```bash
cd ~/CascadeProjects/420blaze
python3 scripts/send-newsletter.py --subject "Subject" --html body.html --dry-run   # list recipients
python3 scripts/send-newsletter.py --subject "Subject" --html body.html --test you@example.com
python3 scripts/send-newsletter.py --subject "Subject" --html body.html            # real send
```
- Body may use `{{UNSUB_URL}}`; otherwise an unsubscribe footer is appended automatically.
- Resend free tier: 100 emails/day (script warns past 90 recipients).

## Useful queries
```bash
npx wrangler d1 execute affiliate-analytics --remote --command \
  "SELECT COUNT(*) total, SUM(confirmed) confirmed, SUM(unsubscribed_at IS NOT NULL) unsubbed FROM subscribers;"
npx wrangler d1 execute affiliate-analytics --remote --command \
  "SELECT source, COUNT(*) n FROM subscribers GROUP BY source ORDER BY n DESC;"  -- which pages convert
```

## Code map
- Worker routes: `workers/seo-proxy/src/subscribe.ts` (`/subscribe`, `/confirm`, `/unsubscribe`)
- Secret: `RESEND_API_KEY` (Worker secret + `.dev.vars`)
- Form: `js/subscribe.js` + `.email-capture` CSS; PostHog event `newsletter_signup`
