# `/terrasana` — dispensary terpene data (DATA CONTRACT)

This folder is the **source feed** for the live **Strain Finder** tool
(https://420blazin.com/strain-finder). The spreadsheets here are converted to JSON
and read by the page. **If you maintain these files, keep the contract below stable
or the live tool breaks.**

## Pipeline

```
you refresh an *.xlsx here
        │
        ▼   python3 scripts/build-strain-data.py      (run from repo root)
        ▼
   data/strain-terpenes.json   (committed; this is what the site reads)
        │
        ▼   npx wrangler pages deploy . --project-name=420blaze --branch=main --commit-dirty=true
        ▼
   https://420blazin.com/strain-finder updates
```

The converter is `scripts/build-strain-data.py`. It has an explicit `SOURCES` list
(currently **18** store-menus — the 14 pulled by the `terrasana-cleveland-terpene-grid` task,
Story Med and Story Rec, which have their own task, and the 2 SW Florida stores pulled by the
`swfl-terpene-grid` task — see `_swfl_task_prompt.md`). Each entry maps a filename to
display metadata (label/location/state/color/url).

## THE CONTRACT — keep these stable

1. **Filenames (exact).** The converter looks these up by name. A rename = silently dropped.
   - `terrasana_cleveland_flower_terpenes.xlsx`
   - `dacut_monroe_flower_terpenes.xlsx`
   - `rise_cleveland_pearl_flower_terpenes.xlsx`
   - `story_cleveland_med_flower_terpenes.xlsx`
   - `story_cleveland_rec_flower_terpenes.xlsx`
   - `urb_cannabis_monroe_flower_terpenes.xlsx`
   - `joyology_monroe_flower_terpenes.xlsx`
   - `puff_monroe_flower_terpenes.xlsx`
   - `pure_monroe_flower_terpenes.xlsx`
   - `klutch_cleveland_flower_terpenes.xlsx`
   - `botanist_solon_flower_terpenes.xlsx`
   - `landing_cleveland_flower_terpenes.xlsx`
   - `amplify_cleveland_hts_flower_terpenes.xlsx`
   - `forest_lakewood_flower_terpenes.xlsx`
   - `roam_seven_hills_flower_terpenes.xlsx`
   - `ayr_woodmere_flower_terpenes.xlsx`
   - `rise_bonita_springs_flower_terpenes.xlsx`   (SW Florida — added 2026-09-27)
   - `ayr_bonita_springs_flower_terpenes.xlsx`    (SW Florida — added 2026-09-27)
   - `jungle_boys_bonita_springs_flower_terpenes.xlsx`   (SW Florida phase 2 — added 2026-09-27)
   - `planet13_bonita_springs_flower_terpenes.xlsx`   (SW Florida phase 2 — added 2026-09-27)
   - `planet13_cape_coral_flower_terpenes.xlsx`   (SW Florida phase 2 — added 2026-09-27)
   - `cookies_fort_myers_flower_terpenes.xlsx`   (SW Florida phase 2 — added 2026-09-27)
   - `ayr_fort_myers_flower_terpenes.xlsx`   (SW Florida phase 2 — added 2026-09-27)
   - `ayr_cape_coral_flower_terpenes.xlsx`   (SW Florida phase 2 — added 2026-09-27)

2. **Grid is the FIRST sheet.** Sheet name doesn't matter (converter uses sheet index 0),
   but the flower terpene grid must be first.

3. **Column HEADER labels (exact text).** Columns are mapped **by header name**, so column
   *order* and *extra* columns are fine — but a **renamed** header drops that field. Required:
   ```
   Product | [Size] | Brand | Type | THC % | Total Terps % |
   Beta Myrcene | Limonene | Beta Caryophyllene | Linalool | Humulene |
   Alpha Pinene | Beta Pinene | Bisabolol | Caryophyllene Oxide | Eucalyptol | Nerolidol
   ```
   - `Size` is **optional** (Terrasana has it, Dacut doesn't — both work).
   - Missing terpene values may be blank or `—` (treated as 0).

4. **Pull date in the `Notes` sheet.** Keep an ISO date (`YYYY-MM-DD`) on a row/line that
   contains the word "pull" (e.g. `Pull date | 2026-06-08` or `...pulled 2026-06-08`).
   The converter reads it for the "updated" stamp on the page. (This is the one that broke
   once when the Notes layout changed — the parser is now tolerant, but it still needs a
   date somewhere in Notes.)

## Transport rule — the pull NEVER downloads (changed 2026-09-15)

The browser-side pulls used to hand data off via a Chrome Blob download. Chrome parks those
in `~/Downloads` as `.com.google.Chrome.XXXXXX` / `_fx_<key>.txt` / `_ex_<key>.txt`, and that
mount does not permit deletion — so every daily run left litter Bill had to clear by hand.
**That transport is removed. Do not reintroduce `URL.createObjectURL` / `a.download`.**

Rows now leave the page through the console:

| job | dump | read | decode |
|---|---|---|---|
| flower | `window.RELALL(key)` (RISE: `RRELALL()`) | `read_console_messages({pattern:"^R~<key>~"})` | `python3 _f_relay2rows.py <file>` → `_<key>_rows.json` |
| edibles | `window.DUMPALL(key)` (RISE: `RDUMP()`) | `read_console_messages({pattern:"^EROWS_<KEY>_"})` | `perl -pe 's/\@\@T\@\@/\t/g'` → `_e_<key>.txt` |

`read_console_messages` only surfaces messages logged *after* its previous call, so dump and
read in the same step. Re-dumping is safe — the flower decoder de-duplicates per
`(key, slice)`, last copy wins.

The flower wire format is **caret, 6 fields**:
`name^brand^strainType^thc^totalTerps^v0,v1,...,v10` where `v0..v10` are the 11 canonical
terpene values **in grid order** and an empty value means *not reported* (distinct from a
reported `0.0`). Adding a terpene column means updating `CANON` in `_f_helpers.js`,
`RCANON` in `_f_rise.js`, `CANON` in `_f_relay2rows.py` and `TERPS` in all three builders
**together** — the wire format is positional.

Verified 2026-09-15: relay output rebuilds a byte-identical xlsx grid vs. the old download
path. The old drainer scripts (`_f_grab.sh`, `_grab.sh`, `_grab2.sh`, `_grab3.sh`,
`_grab_ed.sh`) are deprecated stubs that `exit 64`.

## Notes

- **The `.xlsx` is the source of truth.** The `*.json` / `*.tsv` files also in this folder
  are NOT read by the site pipeline — no need to maintain them for the Strain Finder.
- **Drops do NOT auto-publish.** After you refresh an xlsx, someone must run the converter +
  deploy (above). Ping Bill when you've refreshed, or we can schedule it.
- **Heads-up before schema/format changes** (new sheet structure, renamed headers, new
  terpene columns) — saves a debugging round. Header-name mapping handles a lot, but not
  everything.
- **Adding another dispensary** is NOT zero-code: add an entry to `SOURCES` in
  `scripts/build-strain-data.py` with the filename + label/location/state/color/url.
- **Story OH Cleveland (added 2026-06-22, med + rec).** Story runs on the MoodiDay/Terpli
  platform (retailer_id `9bd46ef6-4494-4986-b54b-42c191f26db2`). Earlier it was excluded for
  only publishing total-terps + top-3 "dominant" terpenes, but its product detail pages now
  expose the FULL 11-terpene profile under "View Product Testing Data". The terpene table is
  rendered client-side (not in server HTML and the MoodiDay API is token-gated), so the pull
  scrapes each product detail page's rendered DOM (load product URL in a same-origin iframe,
  read the terpene grid). Two store-menus = two files/SOURCES entries (`story_med`, `story_rec`).
  Names keep their bracketed/`| size` suffix, so no Size column.

## Quick verify after a refresh
```bash
python3 scripts/build-strain-data.py        # prints per-store counts + dates
python3 -c "import json;d=json.load(open('data/strain-terpenes.json'));print(d['count'],'flowers',[(x['label'],x['count'],x['updated']) for x in d['dispensaries']])"
```

*Maintained by Claude (Blazin Bill's dev). Live tool: /strain-finder. Converter: scripts/build-strain-data.py.*

## SW Florida ("Naples area") — added 2026-09-27

- **There are no dispensaries in Naples.** The City of Naples prohibits them and Collier County
  banned them in unincorporated areas (ordinance passed unanimously Feb 14, 2023); the only Collier store is MÜV Marco Island.
  The market Naples patients actually use is the **Bonita Springs cluster** (Lee County, US-41).
  Label it "Naples area (Bonita Springs)", never "Naples".
- Florida is **medical-only**. `SOURCES` entries carry `"medical": True`, which the converter
  emits as `medical` on each dispensary and the finder renders as an MMJ badge + disclaimer note.
  Both pulls use the MEDICAL menu (RISE `medical-menu`, Dutchie `pricingType` medical).
- **RISE Bonita Springs** — iHeartJane store **773**, same code path as RISE Cleveland: set
  `window.RBASE="/dispensaries/florida/bonita-springs/773/medical-menu/"` and
  `window.RKEY="rise_bonita"` *before* pasting `_f_rise.js` into a tab on
  `https://risecannabis.com/robots.txt`. Relay lines are `R~rise_bonita~…`.
- **AYR Bonita Springs** — Dutchie api-3, `dutchieSlug` `ayr-fl-bonita-springs`
  (24611 S Tamiami Trail). Same helpers as AYR Woodmere; dispensaryId is recorded in
  `_swfl_task_prompt.md`.
- **Phase 2 (2026-09-27), six more Dutchie api-3 stores, all MEDICAL pricing, full panels verified
  live:** Jungle Boys Bonita Springs `64d3ef5b6d1beb00099c7f8a` · Planet 13 Bonita Springs
  `667b3948cbf457a368d3b2a1` · Planet 13 Cape Coral `667b39b0a92b42ca87fce184` · Cookies Fort
  Myers `67366da98578fbbad2f0eb80` · AYR Fort Myers (Cleveland Ave) `6074e5f6c2e3a100accf3239` ·
  AYR Cape Coral `6074e56d9bf22d00ae8f55e4`. Keys/filenames are in `_build_swfl.py` STORES and the
  `SOURCES` registry. The market label becomes "Naples–Fort Myers" once they ship.
- Builder: `python3 _build_swfl.py` (skips a store whose `_<key>_rows.json` is absent).
- Chains checked and NOT added (menus publish only a total and/or top-3/4 terpenes; full panel is a
  COA PDF): MÜV, Curaleaf, Fluent, Green Dragon, Goldflower (all Sweed), Trulieve (own storefront),
  GrowHealthy and Mint (Dutchie, total terps only), Sunburn (empty terpene arrays). Unverified:
  Sunnyside, The Flowery, Surterra.
