# Edible Translator — Research & Data Spec (for claude-cowork)

**Goal:** answer the question *"which edible actually feels like my favorite flower?"* — and surface a
**heart-smart low/no-THC lane** — by reusing 420blazin's existing terpene-matching engine (the one
behind the 15-store, 1,342-flower Strain Finder).

This document is a **data-gathering brief.** Your job is to build an **edibles feed** parallel to the
flower terpene feed, from the same 15 dispensaries we already cover (OH + MI). The dev side (Claude)
will turn that feed into the Translator. Read `data/README.md` first — same git etiquette, same
`/terrasana` drop folder, same Notes-sheet pull-date convention as the flower feed.

---

## The one insight that drives everything you collect

**Most edibles physically cannot be matched to a flower, and that's the whole point of this research.**

- Mainstream gummies are made from **THC distillate, which is stripped of terpenes** — so the strain
  name on the package is marketing, not chemistry. ([Leafly](https://www.leafly.com/news/strains-products/can-edibles-really-be-strain-specific-or-is-that-just-hype))
- Only **cold-process, full-spectrum** edibles retain a flower-like terpene profile: **live rosin,
  live resin, RSO / FECO.** ([Leafly](https://www.leafly.com/news/strains-products/can-edibles-really-be-strain-specific-or-is-that-just-hype))

So the two highest-value things you capture per product are **(1) the extract type** and **(2) the
strain/cultivar name.** Everything else is supporting detail.

## How the data gets used (so the columns make sense)

An edible earns a terpene profile one of three ways, in priority order:

1. **Named cultivar → join to our flower DB.** If a live-resin gummy says "Blue Dream" and we already
   have Blue Dream's terpene profile in `data/strain-terpenes.json`, the edible *inherits* that
   profile for free. **This is the magic — it's why the strain name is gold.**
2. **Product publishes its own terpene COA** → use those numbers directly (rare, but capture when present).
3. **Distillate / no terpenes** → tag "terpene-dead." Still listed (for dosing + CBD), but excluded
   from flower-matching.

Plus a parallel pass: tag each product's **CBD:THC ratio** and **THC-free** status so the Translator
can offer the cardiac-cautious / sober-curious lane.

---

## The job

Scrape the **EDIBLES category** from each of these 15 dispensaries, **one xlsx per store**, dropped in
`/terrasana` named `<key>_<location>_edibles.xlsx` (mirror the flower file names; keys below).

| key | store | state |
|---|---|---|
| terrasana, rise, klutch, botanist_solon, landing, amplify, forest_lakewood, roam, ayr_woodmere, story | OH (10) | OH |
| dacut, urb, joyology, puff, pure | Monroe-area (5) | MI |

**Include:** gummies, chews, fruit bites, chocolates, capsules/tablets, **tinctures**, **RSO/FECO
syringes**, mints, and **beverages** (all ingestible).
**Exclude:** flower, pre-rolls, vapes/carts, dab concentrates, and **topicals** (not ingested).

## Columns (one row per product / SKU)

| Column | Notes |
|---|---|
| `Product` | Full name **verbatim** (don't clean it up — the strain often hides here) |
| `Brand` | e.g., Kiva, Wyld, Cresco, Klutch |
| `Product Line` | e.g., "Lost Farm", "Camino", "RSO" — blank if none |
| `Form` | gummy / chew / chocolate / tincture / capsule / RSO syringe / beverage / mint |
| `Extract Type` | **CRITICAL** — use the taxonomy below |
| `Strain` | **CRITICAL** — cultivar name **exactly as listed** (e.g., "Blue Dream", "GMO"); blank if none named |
| `THC mg` | per piece |
| `THC mg pkg` | per package |
| `CBD mg` | **REQUIRED when listed** — per piece. The cardiac lane depends on this; don't leave it 0 on ratio products. A "2:1 CBD:THC, 10mg THC" gummy is CBD ≈ 20mg. |
| `CBD mg pkg` | per package |
| `Other cannabinoids` | CBN/CBG **and any non-CBD ratio** here (e.g., "CBN 5mg", "1:1 THC:CBN") — keep it OUT of `Ratio` |
| `Ratio` | **CBD:THC ONLY**, CBD first (e.g., "2:1" = 2 CBD : 1 THC, CBD-heavy). Blank for THC-only or non-CBD (CBN) ratios. Do **not** put THC:CBN here. |
| `Fast-acting` | "yes" if labeled nano / fast-acting / sublingual; else blank |
| `Terps published` | "yes"/"no" — does the listing/COA give a terpene breakdown? |
| terpene columns | **only if** a COA is published — same headers as the flower sheet (Beta Myrcene, Limonene, Beta Caryophyllene, Linalool, Humulene, Alpha Pinene, Beta Pinene, Bisabolol). **Units MUST be percent (% w/w)**, same as the flower sheet — a single terpene is realistically <~3%, total <~5%. **Do NOT enter mg/g or mg** (we caught COAs with caryophyllene 961, linalool 204 — impossible as a %; if your COA lists mg/g, divide by 10 to get %). Leave blank otherwise. |
| `Price` | listed price |
| `Size` | count + mg, e.g., "20pc · 5mg ea (100mg)" |
| `Fidelity` | tier A/B/C — see below (your classification) |

Plus a **`Notes` sheet** with the menu **pull date** (`pulled 2026-06-25`), same as flower files.

## `Extract Type` taxonomy — classify EVERY row

| value | retains terpenes? | how to recognize it |
|---|---|---|
| `live_rosin` | ✅ yes | "live rosin", "solventless" in name/line |
| `live_resin` | ✅ yes | "live resin", "fresh frozen" |
| `rso` / `feco` | ✅ yes (full-spectrum) | "RSO", "FECO", "full extract" |
| `full_spectrum` | ✅ likely | "full spectrum" / "whole plant" stated, type unclear |
| `distillate` | ❌ no | "distillate", or **unstated** (default for a plain gummy) |
| `unknown` | ? | genuinely can't tell from the listing |

> **Rule of thumb:** if the listing doesn't say it's live rosin / live resin / RSO / full-spectrum,
> assume `distillate`. Brands that bother to use solventless extract almost always advertise it.

## `Fidelity` tier — your one-letter call per product

- **A** = retains terpenes **AND** names a strain → fully matchable (the stars of the Translator)
- **B** = retains terpenes but **no** strain named → matchable only if it publishes a terpene COA
- **C** = distillate / terpene-dead → dosing + CBD info only, not flower-matchable

## Cardiac-safe lane — flag these (a separate, valuable bucket)

Capture so the Translator can offer a low/no-THC option:
- **THC-free / terpene-only** products (CBD or terpene-forward, ~0mg THC)
- **High-CBD ratio** (≥ 1:1 CBD:THC)
- **Microdose** (≤ 2.5–5 mg THC per piece)

## What's OK to leave blank (don't fabricate)

- **Terpene columns will be blank for almost every edible — that is EXPECTED.** We fill them by
  strain-join, not by guessing. Never invent terpene numbers.
- `Strain` blank when none is named — fine.
- If you can't determine `Extract Type`, use `unknown` (don't guess `live_rosin`).

## Two things that are findings in themselves (note them in the Notes sheet)

1. **The A/B/C ratio per store** — e.g., "Story: 4 tier-A, 2 tier-B, 38 tier-C." How few terpene-true
   edibles exist *is* the story; it sizes the gap we'd be filling.
2. **Any store/brand doing terpene transparency or flower-to-edible matching already** — if you spot a
   competitor doing this, flag it (the closest known is **Lost Farm by Kiva**, live-resin chews, sold
   in both OH & MI — confirm if it's on any of our 15 menus).

---

## Deliverable summary

- 15 files: `<key>_<location>_edibles.xlsx` in `/terrasana`, each with a `Notes` pull date.
- Columns + `Extract Type` taxonomy + `Fidelity` tier exactly as above.
- A one-paragraph rollup (in the first store's Notes sheet or a `_SUMMARY.txt`): total edibles,
  tier-A/B/C counts per state, and any matching competitors spotted.

Once these land, dev side builds: the **strain-join** (edible cultivar → flower terpene profile),
the **Translator UI** (pick a flower → matching tier-A/B edibles + a "🫀 low/no-THC" column), and
folds it into the Strain Finder.

*(Optional secondary task if you have time: a quick keyword-demand check on "edible that feels like
[strain]", "live rosin gummies", "full spectrum edibles", "terpene edibles" — but the menu inventory
above is the priority.)*

---

## PILOT FINDINGS (Terrasana + URB, 409 edibles) → spec adjustment

cowork pulled 2 stores and surfaced the key reality. Verified dev-side with
`scripts/edible-match-report.py` (joins edible strains to the flower DB, with a
brand-collision guard):

| store | edibles | tier-A | published COA | **genuine cultivar joins** |
|---|---:|---:|---:|---:|
| Terrasana | 83 | 34 | 2 | **3** |
| URB | 326 | 99 | 0 | **1** |
| **total** | **409** | **133** | **2** | **4** |

**The headline: tier-A count massively overstates the matchable catalog.** Of 133 tier-A
products, only **6 are actually terpene-profileable** (2 with a published COA + 4 whose name is a
real cultivar that joins the flower DB). The rest of tier-A use **flavor names** ("Watermelon Smash,"
"Cherry Lime Sunshine") that can't inherit a profile. ~2/3 of every menu is **distillate** (57% / 69%).

**The KPI is the cultivar-match rate, not the A/B/C counts** (as cowork flagged). Raw tier-A is
vanity; `matched ÷ named` is the real matchable-catalog size.

### The ONE high-leverage data improvement (please add)
For **flavor-named, terp-true** products (the big tier-A bucket we currently can't profile), try to
capture the **`Source Cultivar`** — the actual strain the extract was made from — which brands often
publish on the **product detail page or COA** even when the menu tile shows only a flavor. Example:
a "Cherry Lime Sunshine" live-resin gummy whose COA says it's made from *Blue Dream* becomes fully
matchable. **Add a `Source Cultivar` column.** This is the single change that could grow the
profileable catalog from ~6 to many times that. If it's not published, leave it blank (don't guess).

### What the tool becomes (so the data stays right)
Given the thin matchable set, the Translator is being reframed into a 3-pillar **Edible Decoder**:
1. **Distillate-wall transparency** — "X of N edibles here are terpene-dead distillate; here are the
   real full-spectrum ones." (Uses `Extract Type` / `Fidelity` — fully data-backed today.)
2. **Terpene-class match** for the profileable few (COA + cultivar-join + any `Source Cultivar`).
3. **Dose + cardiac-safe lane** — mg, `Ratio`, `Cardiac Lane`, CBN/CBG. (Fully data-backed; serves
   the low/no-THC audience.) Per-piece THC mg is nice-to-have but **package mg is the reliable field**
   — keep capturing it; leave per-piece blank if the menu doesn't give a trustworthy count.

### Field fixes from the 10-store build (cardiac lane)
Two columns came back unusable when the Decoder was built — please correct going forward and on backfill:
1. **`CBD mg` was 0 on all 1,410 rows.** Capture CBD mg (piece + package) wherever listed — it's the
   core number for the heart-smart lane. A "2:1 CBD:THC, 10mg THC" product is CBD ≈ 20mg, not 0.
2. **`Ratio` mixed CBD:THC with THC:CBN** (both stored as bare "1:1"), so high-CBD and CBN products
   are indistinguishable. **`Ratio` = CBD:THC ONLY** (CBD first). Put THC:CBN and other non-CBD ratios
   in `Other cannabinoids` instead. Blank `Ratio` for THC-only products.

Continue: the remaining 5 stores (dacut, rise, story, joyology, puff) and the `Source Cultivar`
backfill on Terrasana / URB / Landing / Pure — with the `CBD mg` + `Ratio` conventions above.

### Field fix from the Heart-Smart page build (THC-free lane)
The standalone **Heart-Smart & Low-Dose** page (`/heart-smart`) needs to surface genuinely
**terpene-only / THC-free** products — but across all 14 stores, **zero** rows can be affirmatively
identified as such. The page deliberately **does not infer** "THC-free" from a blank `THC mg` cell
(absence of a number is not absence of THC — wrong call on a cardiac page), so that lane is currently
empty by design. To populate it honestly, capture **positive** evidence when a product is truly
THC-free:
- A **CBD-only / THC-free** product should carry a `Ratio` like **`20:0`** (CBD:THC, THC side = 0),
  **or** an explicit token in `Cardiac Lane` such as `thc-free` / `terpene-only`.
- Don't tag a 1:1 / 2:1 / 3:1 product as THC-free — those contain THC and belong in the High-CBD lane.
This is the one field that unlocks the THC-free lane; leave it blank if there's no positive label.
