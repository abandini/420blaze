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
(currently **2** dispensaries: Terrasana + Dacut). Each entry maps a filename to
display metadata (label/location/state/color/url).

## THE CONTRACT — keep these stable

1. **Filenames (exact).** The converter looks these up by name. A rename = silently dropped.
   - `terrasana_cleveland_flower_terpenes.xlsx`
   - `dacut_monroe_flower_terpenes.xlsx`

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

## Notes

- **The `.xlsx` is the source of truth.** The `*.json` / `*.tsv` files also in this folder
  are NOT read by the site pipeline — no need to maintain them for the Strain Finder.
- **Drops do NOT auto-publish.** After you refresh an xlsx, someone must run the converter +
  deploy (above). Ping Bill when you've refreshed, or we can schedule it.
- **Heads-up before schema/format changes** (new sheet structure, renamed headers, new
  terpene columns) — saves a debugging round. Header-name mapping handles a lot, but not
  everything.
- **Adding a 3rd+ dispensary** is NOT zero-code: add an entry to `SOURCES` in
  `scripts/build-strain-data.py` with the filename + label/location/state/color/url. (We are
  intentionally only doing Terrasana + Dacut right now.)

## Quick verify after a refresh
```bash
python3 scripts/build-strain-data.py        # prints per-store counts + dates
python3 -c "import json;d=json.load(open('data/strain-terpenes.json'));print(d['count'],'flowers',[(x['label'],x['count'],x['updated']) for x in d['dispensaries']])"
```

*Maintained by Claude (Blazin Bill's dev). Live tool: /strain-finder. Converter: scripts/build-strain-data.py.*
