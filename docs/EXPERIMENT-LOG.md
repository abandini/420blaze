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

## EXP-017 — "How to Clean a Grinder" evergreen gear post

**Date:** 2026-06-09
**Change:** Published `/blog/how-to-clean-a-grinder`. Built via audit-driven workflow — the centerpiece (the alcohol question Bill raised: isopropyl residue vs vodka vs Everclear) was researched with a 5-lane multi-agent web workflow (`grinder-cleaning-alcohol-research`). Verdict: evaporated isopropyl leaves no residue of itself (higher % = LESS residue, it's a water problem); 91%+ rinsed + dried is safe & cheap; 190-proof Everclear is the food-safe pick (+ consumable reclaim); vodka (40%) too watery; denatured alcohol = methanol-poisoned, never. Post covers material-by-material methods (metal/acrylic/wood/electric), the freezer trick, deep-clean steps, kief/screen care, threads/magnet, frequency, flammability safety. Person + HowTo + FAQPage JSON-LD; visible FAQ matches schema (6/6). Custom "Which alcohol?" ranked hero infographic (Pillow).

**Inbound link plan:** homepage Continue Reading lead card; blog-index lead card; blog dropdown nav across 39 files; body link from `/blog/best-dry-herb-vaporizers` More Reading. Body links OUT to hash post, strain finder, vaporizer guide, culture-terpenes/concentrates.

**Affiliate:** new `/go/santa-cruz-shredder` slug (POTV, Refersion) in a gear callout — the care tips map onto exactly that grinder (anodized aluminum, kief screen, magnets, anti-cross-thread).

**Hypothesis:** Continues the evergreen-search pivot. "How to clean a weed grinder", "isopropyl vs everclear grinder", "can you use vodka to clean a grinder", "what alcohol to clean grinder" are steady, high-intent, no-decay queries; the residue/Everclear/food-safe angle is under-served (most guides just say "soak in iso"). Prediction: GSC impressions on grinder-cleaning + alcohol queries by T+30; the alcohol-comparison hook earns the page differentiation vs generic competitors.

**Metric:** GSC impressions + position at T+14/T+30 for grinder-cleaning + alcohol queries; any `/go/santa-cruz-shredder` clicks (D1). Status: Active. Deployed 2026-06-09.

## EXP-016 — Strain Finder (interactive terpene tool, evergreen)

**Date:** 2026-06-07
**Change:** Published `/strain-finder` — an interactive, data-driven tool that matches cannabis flower by terpene profile two ways: (1) **pick a feeling** (Sleep / Calm / Laugh & Social / Focus / Energy / Body Relief) → it explains the terpene "recipe" and ranks matching in-stock flower; (2) **match a strain you love** → cosine-similarity on the terpene vector finds the closest in-stock profiles. Plus a sortable terpene table (47 flowers, all 11 terpenes), a terpene "what it's associated with" legend, and a how-to-shop-by-COA section. Pure client-side JS, no backend.

**Data pipeline:** "claude cowork" keeps `/terrasana/terrasana_cleveland_flower_terpenes.xlsx` refreshed on a schedule → `scripts/build-strain-data.py` → `data/strain-terpenes.json` → page `fetch()`es it (with an embedded fallback). So the live tool stays current with zero code changes when the spreadsheet updates. Re-run: `python3 scripts/build-strain-data.py` (reads /terrasana by default).

**Guardrails:** medical-claims-clean ("associated with", "folk/preliminary", "not medical advice"); all data-derived strings HTML-escaped (`esc()`) before render (security-hook flagged innerHTML). Anti-slop: terpene-color-coded bars/chips/table, not a gray table.

**Inbound link plan:** homepage Continue Reading card; Culture dropdown nav across all HTML files; body links from `/culture-terpenes` and `/blog/the-nose-knows` (the on-thesis anchors); footer Quick Links.

**Hypothesis:** This is the strongest evergreen-search bet yet (continuing the EXP-015 pivot off the calendar cliff). "What strain for [sleep/anxiety/laughs]", "best terpene for X", "strain finder by terpene", and "Cleveland dispensary terpene" are steady-volume, high-intent, no-decay queries. The terpene-first + mood-based + Cleveland-local + real-lab-data angle is a niche Leafly/Weedmaps don't own. It's also sticky/shareable (interactive) and the literal embodiment of the site's "read the terpenes, not the label" thesis (The Nose Knows). Prediction: GSC impressions accrue on long-tail terpene/mood queries by T+30; PostHog `strainfinder_*` custom events (tab/mood/match) show real interaction; higher pages-per-session from finder → blog/affiliate.

**Metric:** GSC impressions + position at T+14/T+30 for terpene/mood/strain-finder queries (primary). Secondary: PostHog `strainfinder_mood` / `strainfinder_match` / `strainfinder_tab` event counts (engagement) filtered `$host LIKE '%420blazin%'`; pages-per-session.

**Status:** Active. Deployed 2026-06-07.

**Update 2026-06-08 — 2nd dispensary added (Dacut Monroe, MI):** Converter generalized to multi-dispensary (`scripts/build-strain-data.py` now merges every xlsx in `/terrasana`, maps columns by header name, tags each product with `dispensary`, emits `dispensaries[]` metadata). Data is now **148 flowers across 2 stores** (Terrasana Cleveland OH 47 + Dacut Monroe MI 101). Page adds a **store filter bar** (All / Terrasana / Dacut) that scopes the mood finder, strain matcher, and table; per-result store badges; a "Store" table column; and an **Ohio/Michigan CTA** ("In Ohio → Terrasana; near Monroe, MI → Dacut, *Thomas's shop*" — ties to The Nose Knows, the budtender who started the hash journey). New PostHog event `strainfinder_disp`. Adds geographic lift: the tool now serves two markets. Deployed + browser-verified (Dacut filter scopes correctly). Dacut menu is recreational (some products typed "N/A" — fine, the tool ranks on terpenes not labels).

## EXP-015 — "How to Smoke Hash" evergreen how-to post

**Date:** 2026-06-01
**Change:** Published `/blog/how-to-smoke-hash` — a beginner/senior how-to for consuming hash correctly, hung on a true personal hook (budtender Thomas at Dacut recommended Strawberry Cough hash; it calms the author and helps them sleep). Built via the **audit-driven workflow**: 6-lane parallel web research → synthesized cited fact sheet → Creator draft → fresh-context Auditor (re-fetched every citation) → Corrector. Covers hash types (kief/charas/bubble/rosin), star grades + full-melt, the combustion-vs-vaporization science (temperature ladder: terpene/cannabinoid boiling points vs. ~230°C combustion onset vs. ~900°C flame), 4 ranked consumption methods + 2 "skip these," senior start-low dosing, and the honest Strawberry-Cough-sedation explanation (myrcene-led per Leafly + biphasic THC + concentration + CBN — none of it contradicting the "daytime sativa" label). Article + Person + FAQPage JSON-LD; visible FAQ matches schema.

**Inbound link plan executed:**
- Homepage Continue Reading: new lead card.
- `/blog` index: featured card.
- `/culture-concentrates`: contextual body-text link (highest topical relevance — this is the concentrates hub).
- `/blog/best-dry-herb-vaporizers`: contextual link (vaporizer is method #2; highest-commercial-intent anchor).
- Blog dropdown nav across all HTML files.

**Hypothesis:** This is a deliberate pivot away from calendar-anchored content (see post-4/20 cliff: April 2,376 pv → May ~169 pv as the holiday peg passed). "How to smoke hash" / "how to smoke pressed hash" / "what is full melt hash" are evergreen, steady-volume, high-purchase-intent queries with no time decay. The senior/start-low angle + Cleveland/Ohio dispensary specificity is an under-served niche vs. Leafly/RQS/Reddit generalist results. Prediction: **negligible launch spike (<5 pv in 72h, no FB push planned), but positive GSC impression slope by T+30** — the page should start surfacing for long-tail hash queries within 2-4 weeks and compound, unlike the calendar posts that flatline to zero after their date passes.

**Metric:** GSC impressions + average position for the page's target queries at T+14 and T+30 (primary — this is a search bet, not a social bet). Secondary: PostHog `$pageview` (filtered `$host LIKE '%420blazin%'`) and `/go/` clicks on the new hash-gear affiliate slugs (`dynavap-b`, `dynacoil`, `lobo-concentrate-pads`) + existing `venty`/`xmax-v3-pro`.

**New affiliate redirects (POTV / Refersion 9035362.47d69b, 15%):** `/go/dynavap-b` (DynaVap The B, $59), `/go/dynacoil` (DynaCoil, $25), `/go/lobo-concentrate-pads` ($3.95) — added to AFFILIATE_LINKS KV, all verified 302→POTV in production. Surfaced in a "gear that makes hash easy" callout in Method 2.

**Built via audit-driven workflow:** 6-lane web research → synthesized fact sheet → Creator → 18-verifier adversarial citation audit (each re-fetched its source) → Corrector. Audit caught 14 issues incl. a fabricated author ("Lavender et al." → real **Arnold et al., 2024**), wrong study year, a multiplier/byproduct/temp/grade misattribution, and unsupported senior-dose figures. All fixed before deploy.

**T+0 status (2026-06-01):** Deployed (worker + Pages). KV title set, sitemap auto-regenerated + submitted, llms.txt updated, IndexNow pinged (IndexNow.org + Bing both HTTP 200). GSC URL Inspection: **NEUTRAL** ("URL is unknown to Google" — normal day-0; page has 4+ inbound links so expect indexing in 1-3 days). Production verified: KV title renders, tracking.js present, canonical clean, all 3 JSON-LD blocks parse, hero image 200, 3 new affiliate redirects 302→POTV with rfsn tag.

## EXP-014 — Memorial Day weekend strain post (Facebook-first design)

**Date:** 2026-05-23
**Change:** Published `/blog/memorial-day-weekend-cannabis-three-strain-plan` — three-strain weekend rotation post (Seed Junky Pineapple Fruz / Peninsula Gardens Runtz / Seed Junky Purple Push Pop) anchored on the user-supplied rolling-tray photo. Strain facts verified against Seedfinder and Leafly. Includes visible FAQ block (matching FAQPage schema), Article + Person JSON-LD, Memorial Day veteran-acknowledgement paragraph linking to VA cannabis page, Continue Reading section linking to Runtz tasting notes / brownies / Cleveland 420.

**Inbound link plan executed:**
- Homepage Continue Reading: card added as first slot (highest leverage).
- `/blog` index: featured as lead card with custom border color.
- `/blog/tasting-notes-001-runtz`: contextual body-text paragraph linking out (highest-weight inbound, contextually relevant).
- Blog dropdown nav: added across all 36 HTML files.

**Hypothesis:** Unlike prior audit-driven blog posts (best-vapes: 2 views/wk, dosage-drift: ~0 views/wk), this one is designed for the Facebook channel — the *only* channel actually moving traffic per last week's analytics (184 of 293 views were FB→/shop). Strong visual hero (three-color joints on calendar) + time-pegged + shareable hook. If Bill shares the FB post with the same network that drove the /shop spike, the prediction is **>50 pageviews in the first 72 hours** vs. <5 for audit-driven posts that relied on organic discovery.

**Metric:** PostHog `$pageview` count for `/blog/memorial-day-weekend-cannabis-three-strain-plan` at T+3 days (May 26 EOD). Secondary: referrer breakdown (facebook.com share vs. other) and pages-per-session for FB-referred visitors (last week's FB→/shop traffic bounced at 1.06 pps; if this post crosses 1.5 pps, that's the "engaged" threshold).

**Status:** Active. Deployed 2026-05-23. Sitemap + llms.txt updated, KV title set, IndexNow pinged (Bing/IndexNow both HTTP 200), GSC URL Inspection returns NEUTRAL (Discovered, not yet indexed — normal for day-0). **Bill needs to share the post on Facebook for the hypothesis to be testable.**

## EXP-013 — GSC Recipe schema cleanup (brownies post)

**Date:** 2026-05-19
**Change:** GSC flagged 4 non-critical Recipe structured data warnings on `/blog/cannabis-brownies-without-the-blackout`. Closed 2 of them: added `url` (with `#step-*` fragments) and `image` to each of the 6 `HowToStep` entries, plus added matching `id` anchors in the article body so URLs resolve to real headings. Left `aggregateRating` (no real review system; faking it violates Google policy) and step `video` (none exists) unfixed — both non-critical.
**Hypothesis:** GSC warning count drops 4→2 after re-crawl. Recipe rich result eligibility is preserved or slightly improved. No measurable traffic effect expected — Recipe carousel dominated by AllRecipes/NYT Cooking, but the article was already ranking on regular SERP for "cannabis brownies dosage" queries.
**Metric:** GSC Enhancements → Recipes panel after re-crawl. Resubmit URL via Inspection API to expedite.
**Status:** Active. Deployed 2026-05-19 (c8870ab).

## EXP-012 — Unified nav redesign: clickable logo + dropdowns + a11y

**Date:** 2026-05-18
**Change:** Rebuilt the `<header>` block across all 35 HTML files on 420blazin.com. Logo (leaf icon + "420Blazin.com" wordmark) is now wrapped in a single `<a href="/">` so the universal "click the logo to go home" convention works. Dropped the redundant "Home" item from primary nav. Unified Events/Culture/Blog/Shop dropdowns across every page (previously each section reinvented its own nav). Blog dropdown now surfaces the audit-driven posts (dosage-drift, brownies, vaporizers, nose-knows) instead of stale ordering. Added `aria-label="Primary"` on `<nav>` and `aria-expanded="false"` on the hamburger button. Blog post pages use `../` prefixes; top-level pages use bare paths.
**Hypothesis:** Pages-per-session climbs because users can now navigate from any deep page back to a section index in one click. Bounce rate on blog posts drops because the "way out" isn't the back button. Mobile nav usability improves with proper aria states for screen readers.
**Metric:** PostHog session pages-per-session (currently ~1.4) and `$pageview` events on `/`, `/culture`, `/blog` from blog-post referrers. Target: +20% pages-per-session at T+30.
**Status:** Active. Deployed via wrangler pages deploy on 2026-05-18. Verified on production: `https://420blazin.com/` and `https://420blazin.com/blog/cannabis-brownies-without-the-blackout` both render new header with clickable logo and correct relative paths.

## EXP-018 — "How to Store Cannabis Flower" terpene-first evergreen post

**Date:** 2026-07-20
**Change:** Shipped /blog/how-to-store-cannabis-flower — a procedural, question-shaped storage guide built to beat Weedmaps' generic "how to store cannabis flower" article (their 7/20 newsletter lead). Differentiator: frames storage as *effect drift* (light monoterpenes evaporate first → the high flattens), not just potency loss. Fact-checked (Ross & ElSohly 16%/26% stat sourced; CBN-sedation myth corrected) + editorially reviewed. Schema: Article + HowTo + FAQPage + BreadcrumbList + Person(Blazin Bill). Inbound links from homepage cr-card, blog.html card, and inline from the grinder post.
**Hypothesis:** Procedural evergreen in the proven brownies/grinder mold earns organic Google traffic within 14–30 days and AI citations for "how to store weed / cannabis humidity" queries; the terpene-effect-drift angle is a differentiator competitors don't run.
**Metric:** Pageviews on the new post; GSC impressions/position for "how to store cannabis flower" + "cannabis humidity"; AI citation rate for storage queries. Target: first organic pv by T+7, indexed by T+7–14.
**Status:** Active. Launched 2026-07-21. **T+0:** _pending GSC URL inspection._ Author schema shipped as "Blazin Bill" (Amazon book omitted from sameAs) pending the sitewide name decision. OG image still to be commissioned.

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
