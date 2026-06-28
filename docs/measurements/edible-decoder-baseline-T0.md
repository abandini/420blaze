# Edible Decoder — Measurement Baseline (T0)

**Date:** 2026-06-28 · **Generated from:** live GSC pull (`scripts/gsc-pull.py`, `gsc-2026-06-28.md`).
This is the pre-indexing snapshot for the Edible Decoder initiative. Compare against it at T+30 (2026-07-28) and T+60 (2026-08-27) to judge whether the new pages earned search visibility.

## What launched (the things being measured)

| Page | URL | Live since |
|---|---|---|
| Edible Decoder | `/edibles` | ~2026-06-25 |
| Heart-Smart & Low-Dose | `/heart-smart` | 2026-06-27 |
| Blog: "Your Doctor Said Stop Smoking…" | `/blog/doctor-said-stop-smoking-keep-terpenes` | 2026-06-27 |
| Full sitemap (11 → 43 URLs) + `robots.txt` | `/sitemap.xml`, `/robots.txt` | 2026-06-27 |

## T0 state — the three new pages

**Impressions: 0 each.** As of the 2026-06-28 GSC pull, none of the three new pages appear in Search Console yet — expected, they're 1–3 days old and Google hasn't recrawled. Indexing was **requested** on 2026-06-28 via `scripts/gsc-submit.py` (sitemap resubmitted + URL-inspection indexing request for all three). Google controls actual crawl timing.

## Yardstick — the comparable existing tool

`/strain-finder` (the original terpene tool this initiative extends) in the 7-day window ending 2026-06-24:

| Metric | Value |
|---|---|
| Impressions | 64 |
| Clicks | 2 |
| CTR | 3.1% |

That's the realistic near-term ceiling a terpene tool reaches on this domain today. The edible pages clearing ~half of `/strain-finder`'s impressions by T+60 would be a healthy signal.

## Site context (420blazin.com, 7-day window ending ~2026-06-26)

| Metric | Value |
|---|---|
| Impressions | 1,455–1,577 |
| Clicks | 11–20 |
| CTR | 0.76–1.27% |
| Avg position | ~30 |

Search is the network's primary channel; the site skews toward events/local queries (Cleveland 420, cannabis events). The edibles pages target a **different, commercial-intent** query cluster (below) the site doesn't yet rank for.

## Target query clusters to watch

Drawn from the deep-research intent analysis. None currently register impressions — these are the hypotheses the initiative is testing:

- **Flower→edible matching:** "edible that feels like [strain]", "terpene edibles", "full spectrum edibles", "live rosin gummies / edible"
- **Heart / low-dose:** "thc free edibles", "high cbd edibles ohio / michigan", "microdose edibles", "heart healthy / heart smart edibles", "edibles after heart problem"
- **Transition intent:** "doctor said stop smoking weed", "alternatives to smoking weed", "edibles instead of smoking"
- **Distillate awareness:** "are edibles distillate", "do edibles have terpenes", "why don't edibles feel like flower"

## Success criteria

- **T+30:** at least one of the three pages indexed (≥1 impression) in GSC; ideally first impressions on a long-tail target query.
- **T+60:** `/edibles` or `/heart-smart` reaching ~30+ impressions (≈half of `/strain-finder` today); any clicks on a flower→edible or heart-smart query validate the niche.
- **Leading indicator (non-search):** Cloudflare Web Analytics pageviews on `/edibles` + `/heart-smart` from the in-site nav + blog cross-links, independent of Google indexing.

## Known ceiling (caveat on interpretation)

The terpene-match pillar is currently thin — only **28 of 2,600** edibles (~1%) are terpene-profileable. The distillate-wall (78%) and cardiac lanes carry more weight today. If search traffic underperforms, the likely cause is catalog depth (the open **Source Cultivar** cowork backfill), not the pages themselves. Re-baseline after that backfill lands.
