# Publishing Checklist — Cannabis Education Network

The checklist for shipping any new page on 420blazin.com (or 365daysofweed.com / weedaseniorsguide.com). Built from real mistakes — every item exists because skipping it broke something.

> **The single most important rule:** Every new page needs **3+ inbound links from existing high-traffic pages within 24 hours of publish.** Self-referential clusters (new pages linking only to other new pages) don't get indexed. Discovered the hard way May 4, 2026 — see EXP-007/008.

---

## Phase 1 — Plan (before writing a word)

- [ ] **Target keyword:** What query do I want this page to rank for? (e.g., "green wednesday 2026 deals")
- [ ] **Existing competitors:** `gsc-pull.py` shows what we already rank for in that space. Don't cannibalize a page already at position 5 with a new page at position 50.
- [ ] **Cluster fit:** Which hub page does this belong under? (Cannabis Holidays / Stoner Movies / Buyer's Guides / Cleveland local)
- [ ] **Inbound link plan:** List 3+ existing high-traffic pages that will link TO this new page. Right now the high-traffic anchors are:
  - `/cleveland-420` (32 pv/wk, 6.8% GSC CTR)
  - `/events` (24 pv/wk)
  - `/` homepage (8 pv/wk + 174 GSC impressions)
  - `/culture` and culture-* sub-pages (3-4 pv/wk each)
  - `/blog/best-dry-herb-vaporizers` (highest commercial intent)
- [ ] **Add EXPERIMENT-LOG entry NOW** — `docs/EXPERIMENT-LOG.md` — with hypothesis, target metric, and date. Don't ship without an experiment ID.

## Phase 2 — Write the page

### Required `<head>` elements

- [ ] `<title>` — 50-60 chars, benefit-led, includes year if time-sensitive, includes location for local intent. **Do NOT lead with the brand name** ("420Blazin.com — X" is worse than "X | 420Blazin.com").
- [ ] `<meta name="description">` — 145-155 chars, action-oriented, names specifics (products, cities, dates). Don't write "Explore [topic] at 420Blazin.com" — that's nothing.
- [ ] `<meta property="og:title">` and `og:description` — match `<title>` and meta description, but slightly more conversational for social shares.
- [ ] `<meta name="twitter:title">` + `twitter:description` — same as above.
- [ ] `<link rel="canonical" href="https://420blazin.com/PAGE-SLUG">` — **always points to the no-extension URL.** (Cloudflare Pages 308-redirects `.html` → no-ext, so canonical must match the served URL.)
- [ ] PostHog snippet — already in every standard `<head>` template, but verify the page has it.

### Required JSON-LD schema

- [ ] **Person schema** — `@id="https://420blazin.com/#blazinbill"` with `sameAs` linking to all 3 sites + Amazon book ASIN. Reuse this exact block on every page.
- [ ] **Article schema** — for editorial content. Include `headline`, `datePublished`, `dateModified`, `author: { @id: ".../#blazinbill" }`, `mainEntityOfPage`.
- [ ] **Event schema** — for date-anchored pages (4/20, 7/10, Green Wednesday).
- [ ] **FAQPage schema** — for any page with a Q&A section. Don't add FAQ schema unless the FAQ is actually visible on the page (Google penalizes invisible-FAQ schema).
- [ ] **ItemList schema** — for hub/list pages (Cannabis Holidays, Stoner Movies). Include `Movie`, `Event`, or `Product` items as appropriate.

### Required body elements

- [ ] **TL;DR / Quick Answer** at the very top — single paragraph, 50-100 words, gets the answer to the page's target query. AI engines and Google's AI Overviews quote this. Wrap in a styled callout box for visual distinction.
- [ ] **At least one H2** matching the target keyword.
- [ ] **At least one inbound link to an existing high-traffic page** in body text — Cleveland 420, the buyer's guide, or culture pages. This is the bridge BACK to your authority.
- [ ] **At least one inbound link to ANOTHER new page in the cluster** — content clusters reinforce each other.
- [ ] **Continue Reading section** at the bottom (`.continue-reading > .cr-grid > .cr-card`) — three cards, all linking to existing pages. This is the funnel toward affiliate clicks and the book.
- [ ] **Affiliate links use `/go/SLUG` redirects** — never link directly to Amazon or POTV. The redirects are tracked in D1 `affiliate_clicks`.
- [ ] **Amazon links use UTMs** — `?utm_source=420blazin&utm_medium=book-cta&utm_campaign=YYYY-MM-EXP-NNN&utm_content=PAGE-SLUG`. Without UTMs, Amazon attribution lumps everything together.
- [ ] **`<script src="js/tracking.js"></script>`** before `</body>`. Use `js/tracking.js` for top-level pages, `../js/tracking.js` for `/blog/` posts. **THIS IS WHAT BROKE 14 PAGES BEFORE — it's not on the standard template.**

## Phase 3 — Hook the page into the existing network

This is **mandatory before deploying.** A page with zero inbound links from existing pages is invisible to Googlebot.

- [ ] Add a Continue Reading card on the homepage (`index.html`) — biggest leverage, most impressions
- [ ] Add a card or contextual link from the relevant `/culture-*` sub-page
- [ ] Add a card from `/cleveland-420` if Cleveland-relevant
- [ ] Add a card from `/events` if event/calendar-relevant
- [ ] Add inline body-text links from at least 1 existing blog post — body links carry 5-10x more weight than footer/sidebar links
- [ ] Update navigation dropdowns if this is a major hub page (`Events` dropdown, `Culture` dropdown, `Blog` dropdown)
- [ ] **Verify by grep:** `grep -l "PAGE-SLUG" /Users/billburkey/CascadeProjects/420blaze/*.html /Users/billburkey/CascadeProjects/420blaze/blog/*.html` should return 3+ existing pages.

## Phase 4 — Update sitemap + KV titles

- [x] ~~Add the new URL to `workers/seo-proxy/src/index.ts` `SITEMAP` constant~~ — **auto-generated** as of 2026-05-24. The sitemap is rebuilt from the filesystem by `scripts/generate-sitemap.mjs`, which runs automatically on every `wrangler deploy` via the `[build]` hook in `workers/seo-proxy/wrangler.toml`. Preview locally without deploying: `npm run sitemap:gen` from repo root. To customize a new URL's priority/changefreq, edit the `RULES` array in `scripts/generate-sitemap.mjs`. To exclude a page (e.g. thank-you flows), add its filename to `EXCLUDE_FILES`.
- [ ] Add the new URL + description to the `LLMS` constant in the same file (AI engine sitemap)
- [ ] **If the page goes through the seo-proxy worker (most pages do)**, write a KV entry:
  ```bash
  cd workers/seo-proxy
  wrangler kv key put "mutation:420blazin:/PAGE-SLUG" --binding=BEAST_SEO --remote \
    --value='{"title":"...","description":"...","experimentId":"EXP-NNN-YYYY-MM-DD"}'
  ```
  **The HTML title is the fallback. KV is the source of truth in production.** Forgetting this means your beautiful new title doesn't actually ship.
- [ ] Deploy the worker: `cd workers/seo-proxy && wrangler deploy`
- [ ] Deploy Pages: `cd /Users/billburkey/CascadeProjects/420blaze && wrangler pages deploy . --project-name=420blaze --branch=main --commit-dirty=true`

## Phase 5 — Verify in production

- [ ] `curl -sL https://420blazin.com/PAGE-SLUG | grep "<title>"` — confirm new title rendered
- [ ] `curl -sL https://420blazin.com/PAGE-SLUG | grep -c "tracking.js"` — must return ≥1
- [ ] `curl -sL https://420blazin.com/PAGE-SLUG | grep "rel=\"canonical\""` — canonical present
- [ ] `curl -sL https://420blazin.com/PAGE-SLUG | python3 -c "import sys,re,json; [json.loads(b) and print('OK', json.loads(b)['@type']) for b in re.findall(r'application/ld\\+json\">(.*?)</script>', sys.stdin.read(), re.S)]"` — every JSON-LD block parses

## Phase 6 — Submit to Google + verify

- [ ] Run `python3 scripts/gsc-submit.py` to ping sitemap reindex and run URL inspection on the new page
- [ ] Capture initial verdict (PASS / NEUTRAL / FAIL) — log it in EXPERIMENT-LOG entry under "T+0 status"
- [ ] **Don't expect immediate indexing** — well-linked pages get indexed in 1-3 days, orphan pages can take weeks. If after 7 days the page is still "URL is unknown to Google," the inbound-link plan failed; add more.

## Phase 7 — Verify tracking is firing

- [ ] Click through the page yourself, click 1-2 outbound CTAs (`/go/*` and an Amazon link)
- [ ] Run `python3 scripts/posthog-pull.py --discover` and confirm the page appears in `$pageview` events with the right `$host` and `$pathname`
- [ ] If `/go/` clicks: check D1 within ~1 hour: `wrangler d1 execute affiliate-analytics --remote --command "SELECT * FROM affiliate_clicks ORDER BY clicked_at DESC LIMIT 5"`

## Phase 8 — Schedule the T+7 review

- [ ] Add a calendar reminder for 7 days out: "Review GSC + PostHog data for `/PAGE-SLUG`"
- [ ] At T+7, update the EXPERIMENT-LOG entry with actual numbers vs. hypothesis. Kill the experiment if metrics didn't move.

---

## What NOT to do (anti-patterns burned in)

1. **Don't update only `<title>` in HTML.** The seo-proxy worker rewrites titles from KV. Update KV too, or production keeps the old title.
2. **Don't ship a page without internal links.** Self-referential new-page-to-new-page clusters take 2-4x longer to index.
3. **Don't forget `tracking.js`.** PostHog autocapture happens via the snippet in `<head>`, but explicit `/go/`, Amazon, and Continue Reading capture happens in `tracking.js`. Without it those events are invisible — discovered we'd been blind to Amazon/`/go/` clicks for ~2 weeks.
4. **Don't put FAQ schema on a page without a visible FAQ section.** Google penalizes hidden-FAQ schema.
5. **Don't link directly to Amazon or POTV.** Always use `/go/*` redirects so D1 logs the click and can attribute by referrer page.
6. **Don't write `<title>420Blazin.com — Some Topic</title>`.** Brand-first titles convert worse. Lead with the benefit.
7. **Don't paste the same canonical URL on `.html` and no-extension versions.** The page resolves to the no-extension URL after 308 redirect — canonical must match exactly or Google sees a chain.
8. **Don't query PostHog without filtering `properties.$host LIKE '%420blazin%'`.** The PostHog project is shared with dyngus.day. Unfiltered queries return mostly dyngus data.
9. **Don't skip the EXPERIMENT-LOG entry.** Every meaningful change needs a hypothesis written down. Without it, T+7 review is just looking at numbers and guessing what they mean.

---

## Quick reference — file paths

| What | Where |
|---|---|
| Top-level pages | `/Users/billburkey/CascadeProjects/420blaze/PAGE.html` |
| Blog posts | `/Users/billburkey/CascadeProjects/420blaze/blog/POST.html` |
| Sitemap + LLMs | `/Users/billburkey/CascadeProjects/420blaze/workers/seo-proxy/src/index.ts` |
| Click tracking | `/Users/billburkey/CascadeProjects/420blaze/js/tracking.js` |
| Experiment log | `/Users/billburkey/CascadeProjects/420blaze/docs/EXPERIMENT-LOG.md` |
| Affiliate redirects | KV `AFFILIATE_LINKS` namespace, served by seo-proxy worker |
| GSC OAuth token | `~/.claude/tokens/gsc-worldcupfutbol.json` |
| Wrangler OAuth | `~/.wrangler/config/default.toml` (auto-refresh via `wrangler whoami`) |
| Project secrets | `/Users/billburkey/CascadeProjects/420blaze/.dev.vars` |
| Measurement scripts | `/Users/billburkey/CascadeProjects/420blaze/scripts/*.py` |
| Weekly automation | `~/Library/LaunchAgents/com.420blazin.*.plist` (5 jobs, fire Friday 9:17-9:25 AM) |

---

*Last updated: 2026-05-04. If you skipped any item on this list and the page underperformed, add a "What NOT to do" note above so future you doesn't repeat it.*
