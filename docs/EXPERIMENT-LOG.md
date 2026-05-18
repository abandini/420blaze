# Experiment Log

> Every meaningful site change, with a hypothesis and the metric we expect to move. The point isn't statistical significance — at 100 visits/week we don't have it. The point is: when something works (or fails), we know **what we did** and **what we expected**.

## How to use this

When making any meaningful change:
1. Add an entry below with a unique ID (`EXP-NNN`)
2. Note the hypothesis ("expected outcome")
3. Note the metric you'll watch
4. Note the launch date
5. After T+7 / T+14 / T+30, add the actual outcome

This is a *changelog*, not a randomized controlled trial. When traffic 10x's, swap to PostHog feature flags for real A/B testing.

---

## EXP-001 — GEO Phase 1 Foundation

**Date:** 2026-04-30
**Change:** Deployed AI-friendly robots.txt + llms.txt + Person/Article/Review JSON-LD schema across 420blazin, 365weed, weedaseniorsguide.
**Hypothesis:** AI search engines (Perplexity, ChatGPT, Claude.ai) will start citing the network within 14-30 days.
**Metric:** AI citation rate (queries cited / total queries tested) — baseline 0/10 prior to deployment.
**Status:** Active. **Outcome (T+1, May 2):** 2/10 — Perplexity cited 420blazin.com/cleveland-420 for Cleveland 4/20 query. Modest immediate effect.

## EXP-002 — Phase 2 Cannabis Calendar Hub

**Date:** 2026-05-01
**Change:** Shipped /cannabis-holidays-2026 (hub) + /710-dab-day-2026 (Phase 2 deep) + /green-wednesday-2026 (deep).
**Hypothesis:** Each new page will get organic search traffic within 14-30 days. Cluster will outrank thin individual-date pages competitors run.
**Metric:** Pageviews on each new page; GSC impressions; AI citations for "cannabis holidays 2026" / "7/10 dab day" queries.
**Status:** Active. **Outcome (T+1):** /710-dab-day-2026 had 2 pv day 1; /green-wednesday-2026 had 1 pv. Direct-share traffic (not yet indexed by Google).

## EXP-003 — Phase 3 Stoner Movies Cluster

**Date:** 2026-05-01
**Change:** Shipped /stoner-movies (22-film hub) + /blog/half-baked-sour-diesel-pairing.html (deep pairing post).
**Hypothesis:** Pairing format will earn natural backlinks from movie/cannabis blogs. Stoner movie keyword has high search volume + low difficulty.
**Metric:** Backlinks to /stoner-movies (Ahrefs/Moz check at T+30); GSC impressions for "best stoner movies".
**Status:** Active. **Outcome (T+1):** 1 pv on Half Baked post; 0 on hub yet.

## EXP-004 — Cross-site Network Footers

**Date:** 2026-05-01
**Change:** Added "Cannabis Education Network" footer cards to 365weed (React app) and confirmed existing on weedaseniorsguide. 420blazin homepage already had book promo and 365weed callout.
**Hypothesis:** 420blazin's 100+ weekly pageviews will feed sister sites currently at 3-6/week. Expected lift: seniorsguide → 10+/week, 365weed → 8+/week within 14 days.
**Metric:** Weekly pageviews per host (Cloudflare Analytics).
**Status:** Active. **Outcome (T+1):** seniorsguide 4 → 6 pv (+50% but tiny absolute). 365weed flat at 3.

## EXP-005 — Book CTA on top-traffic pages

**Date:** 2026-05-01
**Change:** Added "By Bill Burkey" + book cover + Amazon CTA to /cleveland-420, /events, /music-events. Previously book CTA was only on homepage (8 pv/week). Now on pages totaling 66 pv/week.
**Hypothesis:** Book Amazon clicks (and downstream KDP sales) will increase ~6-9x given exposure increase.
**Metric:** Amazon book CTA clicks (need PostHog event or UTM tracking — see EXP-006); KDP royalty report monthly.
**Status:** Active. **Outcome:** No tracking yet — see EXP-006. Self-correcting note: shipping a CTA without tracking is exactly the gap I called out. UTM tags ship next.

## EXP-007 — Title + meta rewrite for zero-click pages (KV mutations)

**Date:** 2026-05-04
**Change:** Updated `mutation:420blazin:/`, `mutation:420blazin:/events` and added KV entries for `mutation:420blazin:/blog` and `mutation:420blazin:/culture` in BEAST_SEO KV with new titles + meta descriptions. Replaces stale March-15 experiment (EXP-001 baseline) on the high-impression-zero-click pages.
**Hypothesis:** GSC reports `/events` (113 imp/0 clk), `/` (174 imp/0 clk), `/blog` (25 imp/0 clk), `/culture` (31 imp/0 clk). New titles emphasize benefit-over-brand and add specifics (years, product names, cities). Expected CTR lift: 0% → 2-4% over 14 days as Google re-ranks with fresh metadata.
**Metric:** Per-page CTR in GSC (current = 0%); per-page click count in GSC.
**Status:** Active. Watch GSC at T+7 (May 11) and T+14 (May 18). Compare to EXP-001 baseline.

## EXP-008 — PostHog explicit-capture rollout

**Date:** 2026-05-04
**Change:** Extended `js/tracking.js` to capture `potv_outbound_click` (with slug + UTM), `continue_reading_click` (with card title), `amazon_buy_click`, and cross-site clicks. Used `transport: 'sendBeacon'` for navigation-safe capture. Installed tracking.js on 14 previously-missing pages (5 new pages + 6 blog posts + music-events + festival + merch).
**Hypothesis:** PostHog funnel for the cannabis network goes from showing 0 outbound/Amazon/Continue Reading clicks (broken) to showing real conversion data. Expected: at least 20+ /go/ click events captured per week within 7 days.
**Metric:** PostHog event count for `potv_outbound_click`, `amazon_buy_click`, `continue_reading_click`. Compare against D1 affiliate_clicks count for the same period — reconciliation should be ~70%+ (D1 catches direct-to-/go/ traffic that bypasses on-site clicks).
**Status:** Active.

## EXP-006 — UTM tagging on outbound CTAs

**Date:** 2026-05-02
**Change:** Add `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` to (a) Amazon book CTAs by source page, (b) POTV /go/* redirects already log per-page referrer in D1.
**Hypothesis:** Amazon UTM tags will let us see in KDP / Amazon Associates which 420blazin page actually drove the sale (vs. raw "amazon-redirect" attribution).
**Metric:** Amazon click attribution becomes per-source-page instead of all-direct.
**Status:** Active.

## EXP-009 — Audit-driven blog post: commercial gummy dosage drift

**Date:** 2026-05-14
**Change:** Published `/blog/dosage-effect-drift-commercial-gummies` using a Creator-Auditor-Corrector audit-driven workflow — a 35-item pass/fail rubric with an isolated auditor agent that web-fetched every cited source to confirm the claim. First blog post produced this way. Hit 35/35 on the first audit pass; the process also caught a swapped-number error in the rubric itself. Followed PUBLISHING-CHECKLIST: 4 inbound links (index, blog, culture-edibles, cannabis-brownies), no-extension canonical, FAQ schema removed (no visible FAQ section), sitemap + llms.txt updated, worker + Pages deployed, submitted to GSC + IndexNow.
**Hypothesis:** A citation-heavy educational post grounded in 6 peer-reviewed/lab sources will (a) get indexed within 3-7 days given the 4 inbound links from existing pages, and (b) earn AI-engine citations faster than experiential posts because every factual claim is independently sourced. Expect first GSC impressions by T+7 (May 21).
**Metric:** GSC indexing verdict + impressions for the URL; AI citation rate for "why isn't my 10mg gummy 10mg"-type queries. Compare indexing speed against cannabis-brownies (published May 6, still "unknown to Google" at T+8 — the counter-case of a late-linked post).
**Status:** Active. Watch GSC at T+7 (May 21) and T+14 (May 28). **T+4 update (May 18):** GSC verdict moved from NEUTRAL ("unknown to Google") to **PASS ("Submitted and indexed")**. Indexing turnaround was ~4 days from publish — fastest of any 420blazin page tracked. Attribution: the audit-driven content quality plus the 4 inbound links established at publish-time per the PUBLISHING-CHECKLIST.

## EXP-010 — Awe pillar page on senior site: "Your Grandmother Probably Did This"

**Date:** 2026-05-18
**Change:** Published `/your-grandmother-probably-did/` on weedaseniorsguide.com (weedbook repo) — a signature pillar page reframing cannabis for adults 55+ from "edgy new thing for retirees" to a homecoming. Anchors: US Pharmacopoeia 1850-1941, AMA's 1937 opposition to prohibition (Dr. William C. Woodward), endocannabinoid system discovery 1988-1992 (Devane, Mechoulam). Audit-driven workflow (20-item rubric, isolated auditor web-fetching every cited source) — passed 20/20 first pass. Hero callout band on the homepage drives the funnel. Inspired by Heath SUCCESs + Keltner awe framing: lead with vastness and frame-update, let utility follow.
**Hypothesis:** First explicit application of awe-framing on the senior site. Expect (a) longer dwell time vs other content pages, (b) higher share rate (the headline is built to be quoted), (c) GSC indexing within a few days given homepage-hero inbound link and sitemap submission, (d) improved AI-engine citation rate on queries like "history of cannabis in pharmacy" and "endocannabinoid system explained for seniors." Counter-hypothesis: senior audience may find the framing too cerebral and bounce.
**Metric:** PostHog $pageview count + average session duration for the page (vs site average); GSC impressions/clicks for "your grandmother probably did this" branded queries and the unbranded historical queries; AI citation test results. T+7 (May 25), T+14 (June 1), T+30 (June 17) checkpoints.
**Status:** Active. Submitted to GSC + IndexNow at publish. Initial GSC verdict NEUTRAL ("Discovered - currently not indexed") — fastest possible state for a page minutes old.

## EXP-011 — Restore affiliate revenue path: 5 dead /go/ slugs fixed

**Date:** 2026-05-18
**Change:** Discovered during PostHog tracking debug that **5 of 10 /go/ slugs in the AFFILIATE_LINKS KV namespace pointed to 404 pages** because POTV / Storz-Bickel restructured product URLs and the slugs were never refreshed. Last 7 days: **96 of 153 (63%) `/go/` clicks went to dead pages**, earning $0 commission instead of an affiliate payout. Fixed:
- `arizer-solo-3` (34 clicks/wk) — appended `-vaporizer` suffix per POTV's new naming pattern
- `xmax-v3-pro` (25 clicks/wk) — same `-vaporizer` suffix
- `venty` (21 clicks/wk) — POTV slug changed from `storz-and-bickel-venty` to `venty-vaporizer`
- `potv-lobo` (14 clicks/wk) — `-vaporizer` suffix
- `volcano-hybrid` (2 clicks/wk) — **network change** from `awin-sb` (Storz-Bickel direct via AWIN, URL 404'd) to `potv-refersion` (POTV). KV entry flagged with a `note` field for visibility. Bill should decide whether to chase a new SB direct URL or leave on POTV.

All 10 /go/ slugs now return 200. Refersion affiliate ID (9035362) preserved on all URLs.

**Hypothesis:** Restoring the 5 broken slugs converts ~96 weekly clicks from $0 to live affiliate pages. Conservative model: 3% conversion × $20 avg commission = ~$58/week ($230/month) restored. Real upside likely higher — arizer-solo-3 and xmax-v3-pro alone (59 weekly clicks) are the highest-converting buyer-intent slugs.
**Metric:** Refersion dashboard conversions + commission paid (weekly). Compare May 26 (T+8) and June 9 (T+22) commission totals against the prior-month baseline.
**Status:** Active. **Need to add to the publishing checklist: "verify /go/ destinations 200 quarterly"** — this drift happened silently for an unknown duration and was only caught by the PostHog tracking debug.

## EXP-012 — Unified nav redesign: clickable logo + dropdowns + a11y

**Date:** 2026-05-18
**Change:** Rebuilt the `<header>` block across all 35 HTML files on 420blazin.com. Logo (leaf icon + "420Blazin.com" wordmark) is now wrapped in a single `<a href="/">` so the universal "click the logo to go home" convention works. Dropped the redundant "Home" item from primary nav. Unified Events/Culture/Blog/Shop dropdowns across every page (previously each section reinvented its own nav). Blog dropdown now surfaces the audit-driven posts (dosage-drift, brownies, vaporizers, nose-knows) instead of stale ordering. Added `aria-label="Primary"` on `<nav>` and `aria-expanded="false"` on the hamburger button. Blog post pages use `../` prefixes; top-level pages use bare paths.
**Hypothesis:** Pages-per-session climbs because users can now navigate from any deep page back to a section index in one click. Bounce rate on blog posts drops because the "way out" isn't the back button. Mobile nav usability improves with proper aria states for screen readers.
**Metric:** PostHog session pages-per-session (currently ~1.4) and `$pageview` events on `/`, `/culture`, `/blog` from blog-post referrers. Target: +20% pages-per-session at T+30.
**Status:** Active. Deployed via wrangler pages deploy on 2026-05-18. Verified on production: `https://420blazin.com/` and `https://420blazin.com/blog/cannabis-brownies-without-the-blackout` both render new header with clickable logo and correct relative paths.

---

## UTM scheme

For all outbound CTAs, use:

```
utm_source=420blazin (or 365weed, seniorsguide)
utm_medium=book-cta (or vape-cta, dispensary-cta, content)
utm_campaign=YYYY-MM-experiment-id (e.g. 2026-05-EXP005)
utm_content=<source-page-slug> (e.g. cleveland-420, events, music-events)
```

Example outbound Amazon link:
```
https://www.amazon.com/dp/B0GPG71T22?tag=blazinbill-20&utm_source=420blazin&utm_medium=book-cta&utm_campaign=2026-05-EXP005&utm_content=cleveland-420
```

This propagates to Amazon Associates referral tracking, so we can see which source page drives book sales.

---

## Cadence

- New entry **before** any meaningful site change goes live
- Outcome update at **T+7**, **T+14**, and **T+30** for each entry
- Review monthly — kill experiments that aren't moving metrics
