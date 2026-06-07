# STATUS — 420Blazin Cannabis Network

- **Author:** Claude (Opus 4.8, working as Blazin Bill's dev/assistant)
- **Project:** 420blazin.com (+ weedaseniorsguide.com / 365daysofweed.com network)
- **Repo:** `/Users/billburkey/CascadeProjects/420blaze` (branch `main`, deploys via Cloudflare Pages + seo-proxy Worker)
- **Date / time:** 2026-06-07, 11:08 AM EDT (Sunday)
- **Last commit:** `6734a21` (EXP-016 Strain Finder) — repo synced with production

---

## TL;DR of this session
Started with "I bought hash and don't know how to smoke it" → ended with two shipped evergreen assets and a live data tool:
1. **EXP-015** — `/blog/how-to-smoke-hash` (audit-driven hash how-to)
2. **EXP-016** — `/strain-finder` (interactive terpene tool, mood + strain-match)
3. A **terpene data pipeline** (`/terrasana` xlsx → JSON → live page)
4. A printable **strain tracking doc** for Bill's 3 pickups
Everything deployed, committed, indexing in progress.

---

## ✅ Done & LIVE

### EXP-016 — Strain Finder (the headline)
- **URL:** https://420blazin.com/strain-finder
- **What it does:** two entry points — (a) **pick a feeling** (Sleep / Calm / Laugh & Social / Focus / Energy / Body Relief) → ranks in-stock flower by a terpene-weight model; (b) **match a strain you love** → cosine similarity on the terpene vector finds closest in-stock profiles (incl. a Trop Cherry reference seed). Plus a **sortable 47-flower terpene table** and a terpene-effect legend.
- **Tech:** self-contained `strain-finder.html`, pure client-side JS. Reads `data/strain-terpenes.json` via `fetch()` with an embedded fallback. WebApplication + Person + FAQPage JSON-LD; **visible FAQ matches schema** (no hidden-FAQ penalty). All data strings HTML-escaped (`esc()`). Terpene-color bars/chips (anti-slop). PostHog custom events: `strainfinder_tab` / `strainfinder_mood` / `strainfinder_match`.
- **Verified in prod:** KV title, canonical, tracking.js, JSON-LD, OG image, `/data/strain-terpenes.json` (HTTP 200, 47 products), colored bars render. GSC = NEUTRAL/Discovered (day-0). IndexNow 200.

### Data pipeline (important — this is how the tool stays current)
```
claude-cowork keeps  /terrasana/terrasana_cleveland_flower_terpenes.xlsx  fresh (scheduled)
        │
        ▼   scripts/build-strain-data.py   (reads /terrasana by default; TERRASANA_XLSX env to override)
        ▼
   data/strain-terpenes.json   (committed; {source, updated, count, products[]})
        │
        ▼   strain-finder.html  fetch()s it  →  live tool updates with NO code change
```
- **To refresh manually:** `python3 scripts/build-strain-data.py` then `wrangler pages deploy . --project-name=420blaze --branch=main --commit-dirty=true`
- `/terrasana/` is **untracked in git** (coworker's working folder). The generated JSON IS committed, so the site is self-contained. Open question below.

### EXP-015 — How to Smoke Hash
- **URL:** https://420blazin.com/blog/how-to-smoke-hash
- Audit-driven workflow (6-lane research → Creator → 18-verifier citation audit → Corrector). Custom temperature-ladder hero. 3 new POTV affiliate slugs live: `/go/dynavap-b`, `/go/dynacoil`, `/go/lobo-concentrate-pads`. GSC NEUTRAL day-0 (submitted 2026-06-01).

### Strain tracking doc (physical)
- `~/Downloads/terrasana-strain-tracker-2026-06-07.docx` — 1 page each for **Red Rock Rtz** (laugh), **Purple Chem** (sleep), **Cereal Milk** (happy/day), with terpene breakdown + blank effects log.
- Companion DB also on Desktop: `terrasana-cleveland-flower-terpenes.csv` / `.md` (my earlier scrape; the coworker's xlsx in `/terrasana` is the fuller authority — 47 flowers, all 11 terpenes).

---

## 🧠 Key findings (terpene decoding — the through-line)
- **Bill's preference profiles:**
  - **Calm/sleep** = caryophyllene and/or **myrcene** lead + linalool, **low pinene** (Trop Cherry + Strawberry Cough hash). Best in-stock: **Purple Chem**; deeper sleep: **Carmella** (myrcene 1.36); most Trop-Cherry-like: **Root Beer Cream Cake**.
  - **Laugh/social** = **limonene** lead + caryophyllene/linalool cushion, low pinene. Ranked: **White 4516** (lim 1.23 + caryo 0.88 + highest total terps 3.23 — most balanced) > **Brownie Scout** (lim 1.41, highest, but thin cushion + half-oz) > **Red Rock Rtz** (smoothest, cheapest eighth).
- **Recurring lesson:** the indica/sativa label barely predicts effect (PLOS ONE 90k-sample study). Read the terpenes. This IS the site thesis ("The Nose Knows") and the reason the Strain Finder exists.
- **Trop Cherry** (Bill's benchmark fave) is currently **out of stock** at Terrasana.

---

## 📋 OPEN TODOs / pick up here

### Decisions for Bill
- [ ] **Version `/terrasana` xlsx?** Decide whether the source spreadsheet should be committed (reproducible converter for anyone cloning) or stay the coworker's untracked working folder (current). Generated JSON is already committed either way.
- [ ] **Auto-publish on refresh?** Right now a spreadsheet refresh needs a manual `build-strain-data.py` + `pages deploy`. Consider a Wrangler `[build]` hook or a small cron so the coworker's updates go live automatically. (Worth doing if the schedule is frequent.)
- [ ] Confirm the coworker's refresh **cadence** (daily? weekly?) — informs the above.

### Measurement (the experiments are bets — review them)
- [ ] **EXP-016 T+14 / T+30:** GSC impressions + position for terpene/mood/strain-finder queries; PostHog `strainfinder_*` event counts (filter `$host LIKE '%420blazin%'`); pages-per-session.
- [ ] **EXP-015 T+7 (≈2026-06-08) / T+14:** GSC impressions for hash queries; any `/go/dynavap-b|dynacoil|lobo-concentrate-pads` clicks (D1 `affiliate_clicks`).
- [ ] Both pages were **NEUTRAL/Discovered day-0** — confirm they actually index within 1–3 days; if still unknown at T+7, add more inbound links.

### Content / product ideas surfaced
- [ ] Strain Finder v2 ideas: more reference strains for the matcher; a "match my COA photo" flow; multi-dispensary data (the real authority play — "Cleveland terpene finder" across stores); shareable result cards.
- [ ] Add **White 4516 / Brownie Scout** to the tracking doc if Bill buys them for laughs (he was leaning toward both).
- [ ] **7/10 Dab Day** (~5 weeks out, next calendar peak) — `docs/710-dab-day-2026` exists; refresh + promote closer to the date. This is the next traffic peg after the post-4/20 cliff.
- [ ] Keep leaning **evergreen-search** over calendar-anchored content (the EXP-015/016 pivot — see `project_post_420_cliff` memory).

---

## 🔧 Operational reference
| Thing | Where |
|---|---|
| Publishing process | `docs/PUBLISHING-CHECKLIST.md` (read FIRST for any new page) |
| Experiment log | `docs/EXPERIMENT-LOG.md` (EXP-016 newest) |
| Strain data converter | `scripts/build-strain-data.py` → `data/strain-terpenes.json` |
| Coworker source folder | `terrasana/` (xlsx + their terp_data.json) — untracked |
| Secrets (never commit) | `.dev.vars` — PostHog/Refersion/Cloudflare tokens |
| Affiliate `/go/` slugs | KV `AFFILIATE_LINKS` (`ac17af39...`), Refersion id `9035362.47d69b` |
| KV title overrides | KV `BEAST_SEO` (`36c1eaef...`), key `mutation:420blazin:/<slug>` |
| Sitemap + llms.txt | `workers/seo-proxy/src/index.ts` (sitemap auto-gen on deploy) |
| GSC submit | `python3 scripts/gsc-submit.py` (token `~/.claude/tokens/gsc-worldcupfutbol.json`) |
| IndexNow | `python3 scripts/indexnow-submit.py <url>` (key `4a98...`) |
| Memory | `~/.claude/projects/-Users-billburkey-CascadeProjects-420blaze/memory/` (MEMORY.md index) |

### Deploy commands
```bash
cd /Users/billburkey/CascadeProjects/420blaze
python3 scripts/build-strain-data.py                 # refresh strain data from /terrasana
cd workers/seo-proxy && npx wrangler deploy           # worker (regenerates sitemap)
cd .. && npx wrangler pages deploy . --project-name=420blaze --branch=main --commit-dirty=true
```

### Gotchas burned in this session
- Terrasana menu is a **cross-origin Surfside/Dutchie embed**: screenshots read it, but clicks/filters DON'T register and there's no clean API. Product pages load via `?dtche[product]=<slug>` deep-links (slug-guessing is lossy — hits stale OOS dupes). The coworker's xlsx is the reliable source, not scraping.
- `magick` on this machine has **no freetype** — use **Pillow** for text-on-image (OG/hero cards).
- Security hook blocks `innerHTML` with interpolated data — use an `esc()` HTML-escaper on all dynamic strings.
- Affiliate **self-referral is against program terms** — Bill should not buy through his own `/go/` links (told him; he's clear).

---
*Resume by reading this file + `docs/EXPERIMENT-LOG.md` (EXP-015/016) + `docs/PUBLISHING-CHECKLIST.md`. Live URLs: /strain-finder, /blog/how-to-smoke-hash.*
