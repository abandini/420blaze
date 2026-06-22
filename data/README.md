# `/data` — site data feeds (CONTRACT)

This folder holds JSON the live site reads at runtime. **If you maintain these files,
follow the contract below or the pages break.**

**Git etiquette (this repo is shared with the dev Claude, who may be committing at the
same time):** `git pull --rebase` before you commit. If git errors with "index.lock
exists" or "cannot lock ref", another process is mid-commit — **wait 60 seconds and
retry**; don't delete lock files yourself. If it still fails after a few minutes,
stop and tell Bill instead of forcing it.

| File | Who maintains it | How |
|---|---|---|
| `strain-terpenes.json` | **GENERATED — do not hand-edit.** | Comes from the `/terrasana/*.xlsx` spreadsheets via `scripts/build-strain-data.py`. To change it, update the xlsx in `/terrasana` and re-run that script. See the dispensary-feed contract below + `terrasana/README.md`. |
| `music-events.json` | **claude-cowork — weekly task** (see below) | Hand-curated JSON of upcoming 420-adjacent Cleveland shows. This is the one you refresh. |
| `playlists.json` | **claude-cowork — monthly task** (see below) | Terpene-mood Spotify playlists: tracklist source-of-truth + the Spotify playlist IDs for site embeds. |

---

## DISPENSARY FLOWER FEED: `/terrasana/*.xlsx` → `strain-terpenes.json`

Powers https://420blazin.com/strain-finder (15 stores and growing). Each dispensary is
one xlsx of its **flower menu's lab data**; `scripts/build-strain-data.py` merges them.
The page's mood ranking, terpene match, and **THC "intensity" sort** all trust this data,
so the rules below protect those features. **The build script enforces some of this as a
backstop, but fix it at the source — a clean scrape beats a regex catching it later.**

### 1. FLOWER ONLY — exclude non-flower and adulterated-THC products
A dispensary's "Flower" menu often mixes in infused sub-types. Drop a row if it is **not
plain whole/ground bud with its own lab panel**:
- **Infused flower / moonrocks / infused prepacks** — bud coated in concentrate + kief.
  Their THC (40–62%) is real but no normal flower can hit it, so it would top every
  "Strongest" sort and wreck the comparison. Exclude anything whose **name or sub-category**
  says `infused`, `moonrock` / `moon rock(s)`, or an infused `prepack`.
- **Other product forms** that slip into a flower list: concentrates (rosin, live resin,
  badder/budder, shatter, wax, diamonds, sauce), **vapes/carts/disposables**, **pre-rolls**,
  edibles/gummies, RSO, tinctures.
- **Best single instruction:** pull only the menu's plain **`Flower`** sub-category; skip
  `Infused Flower`, `Pre-Roll`, `Concentrate`, `Vaporizer`, etc. Dutchie-based menus tag
  these explicitly, so it's a one-filter fix.

> ⚠️ **Do NOT substring-match a word inside a STRAIN NAME.** *Hash Burger*, *Hash Queen*,
> and *Diamond Bar* are real flower strains. Filter by the **product type/sub-category**,
> not by "name contains 'hash'/'diamond'/'rosin'". The build backstop only excludes the
> precise tokens `infused` / `moonrock` for this reason.

### 2. Blank cells — don't let them read as zero
- **Total Terps % blank** but the individual terpene columns are filled (e.g. Firelands at
  The Landing): leave it — the build **backfills the total from the parts**. Just make sure
  the individual terpene columns came through.
- **THC % blank** (e.g. The Forest left 8 rows empty): this is a **scrape gap, not a 0%
  flower**. The page now shows `THC n/a` and keeps those rows out of the intensity sort —
  but THC is a headline number, so **re-check the THC column parsing and re-pull** rather
  than shipping blanks. If a menu genuinely doesn't publish THC, note it so we expect it.
- A row with **no terpene data at all** (all individual terps blank) shouldn't be in a
  *terpene* feed — drop it.

### 3. Columns (mapped BY HEADER NAME, so order/extra columns are fine)
`Product`, `Size` (optional), `Brand`, `Type`, `THC %`, `Total Terps %`, `Beta Myrcene`,
`Limonene`, `Beta Caryophyllene`, `Linalool`, `Humulene`, `Alpha Pinene`, `Beta Pinene`,
`Bisabolol`, `Caryophyllene Oxide`, `Eucalyptol`, `Nerolidol`. Put the menu **pull date**
in a `Notes` sheet (a line like `pulled 2026-06-22`) so each store stamps its freshness.

### 4. Adding a new store / rebuild + deploy
1. Drop the xlsx in `/terrasana` (name it `<key>_<location>_flower_terpenes.xlsx`).
2. Add a `SOURCES` entry in `scripts/build-strain-data.py` (key, label, **state** — drives
   the OH/MI bar grouping — location, color, url, file). Two menus of one store (e.g. Story
   Med + Rec) share a `merge_key` so they collapse into one deduped chip.
3. Rebuild + sanity-check, then deploy:
```bash
cd /Users/billburkey/CascadeProjects/420blaze
python3 scripts/build-strain-data.py          # prints per-store counts + rows excluded
# quick gate: no impossible flower, no blank-zero leaks
python3 -c "import json; d=json.load(open('data/strain-terpenes.json')); \
p=d['products']; hi=[x for x in p if (x.get('thc',0) or 0)>35]; \
zt=[x for x in p if (x.get('terps',0) or 0)==0]; \
print(d['count'],'products /',len(d['dispensaries']),'stores'); \
print('THC>35% (should be 0):',[(x['thc'],x['name']) for x in hi]); \
print('terps==0 (should be 0):',len(zt))"
npx wrangler pages deploy . --project-name=420blaze --branch=main --commit-dirty=true
git add scripts/build-strain-data.py data/strain-terpenes.json && \
  git commit -m "data: refresh/add dispensary flower terpenes" && git push
```
The `/terrasana/*.xlsx` files are untracked source-of-truth (gitignored); commit the
generated `data/strain-terpenes.json`, not the spreadsheets.

---

## WEEKLY TASK: refresh `music-events.json`

Powers https://420blazin.com/music-events. **Cadence: once a week** (e.g., every Monday).
The page auto-hides past dates and links to live venue calendars, so it never shows
*stale* dates on its own — but the curated list goes empty if it isn't refreshed.

### The job
1. **Check the calendars** for the next ~8 weeks at these Cleveland-area venues:
   - Beachland Ballroom — https://www.beachlandballroom.com/shows
   - Grog Shop — https://grogshop.gs/calendar/
   - Mahall's (Lakewood) — https://www.mahalls20lanes.com/events
   - Agora Theatre — https://agoracleveland.com/events/
   - Winchester Music Tavern, Happy Dog, Foundry Concert Club (when they have fits)
   - Aggregators to sweep: Songkick Cleveland (https://www.songkick.com/metro-areas/14700-us-cleveland), Bandsintown Cleveland
2. **Filter to 420-adjacent vibes ONLY:** jam, Dead/jam tributes, psych/psychedelic, funk, soul, reggae/ska/dub, doom, stoner rock/metal, conscious hip-hop. **Skip** generic pop, mainstream country, hardcore, EDM, tribute-cover-bands that aren't jam.
3. **Only list shows you VERIFIED** on a venue or ticketing page. **Never invent a date, artist, or venue.** When unsure, leave it out.
4. **Write `data/music-events.json`** (schema below), set `updated` to today.
5. **Validate + deploy** (commands below).

Aim for ~5–15 upcoming shows. Drop anything cancelled. You do NOT need to prune
already-past shows — the page hides them automatically.

### Schema (keep exact field names)
```json
{
  "updated": "2026-06-09",
  "note": "free-text; optional",
  "events": [
    {
      "date": "2026-06-11",                 // ISO YYYY-MM-DD — REQUIRED (drives auto-hide + sort)
      "artist": "Satsang",                  // REQUIRED
      "venue": "Beachland Ballroom, Cleveland",
      "time": "Doors 7:00 PM · Show 8:00 PM",  // free text; "" or "Evening" is fine
      "price": "",                          // e.g. "~$25"; "" hides the price line
      "genre": "Reggae / Folk-Rock",        // short genre tag shown on the card
      "vibe": 5,                            // 1–5, editorial 420-fit (renders as 🌿s)
      "recurs": "weekly"                    // OPTIONAL — for residencies/open jams. The page
                                            //   auto-rolls "date" forward to the next matching
                                            //   weekday, shows a "↻ weekly" badge, and it never
                                            //   expires. Set "date" to any past/future date on
                                            //   the right weekday (e.g. a Wednesday for a Wed jam).
    }
  ],
  "venues": [                               // optional — the "live calendars" block
    { "name": "Beachland Ballroom", "url": "https://www.beachlandballroom.com/shows" }
  ]
}
```

### Validate + deploy after refreshing
```bash
cd /Users/billburkey/CascadeProjects/420blaze
python3 -c "import json,datetime as d; j=json.load(open('data/music-events.json')); \
print(len(j['events']),'events, updated',j['updated']); \
[print(' ',e['date'],e['artist']) for e in sorted(j['events'],key=lambda x:x['date'])]"
# then publish:
npx wrangler pages deploy . --project-name=420blaze --branch=main --commit-dirty=true
git add data/music-events.json && git commit -m "data: weekly music-events refresh" && git push
```

### Notes
- The page has an **embedded fallback** copy of a few shows inside `music-events.html`. It's only used if the JSON fetch fails — you don't need to touch the HTML; just keep the JSON current.
- Past dates **auto-hide**; an empty list shows a "check the live calendars" message, so a missed week degrades gracefully rather than showing stale shows.
- Ping Bill if a venue changes its calendar URL or a new 420-friendly venue opens.

*Maintained by Claude (Blazin Bill's dev). Live page: /music-events. Render logic: inline script in music-events.html.*

---

## MONTHLY TASK: terpene-mood Spotify playlists (`playlists.json`)

Four playlists that mirror the Strain Finder's moods — the brand thesis ("match the
vibe by terpene") applied to music. **Cadence: monthly refresh** (first Monday).

### The four playlists
| Playlist | Terpene / mood | Sound |
|---|---|---|
| 🛋️ **Couch-Lock** (Myrcene) | sleep/heavy | doom, dub, slowcore, Khruangbin-zone, heavy psych |
| 😂 **Laughing Grass** (Limonene) | social/giggly | funk, ska, feel-good soul, upbeat reggae |
| 😌 **Mellow Gold** (Linalool) | calm | mellow folk, ambient, slow soul, dream pop |
| 🌲 **Evergreen Focus** (Pinene) | alert/creative | instrumental psych, krautrock, post-rock, jazz-funk |

### Curation rules
1. **25–35 tracks each.** Refresh = swap ~5 tracks/month so followers see movement; don't gut a working list.
2. **Cleveland-locals rule:** each playlist carries 2+ artists from the bands in
   `music-events.json` or the venues we cover (Higher Nation, Carlos Jones & the
   P.L.U.S. Band, etc.) when they have Spotify presence — local bands share playlists
   they're on, and that's the distribution flywheel.
3. Only tracks actually on Spotify (verify, don't guess). Mainstream-adjacent is fine;
   pure top-40 is not. No tracks glorifying harder drugs.
4. The vibe ladder matters more than genre purity — sequence each list like a set.

### Workflow
1. Curate/refresh the tracklists.
2. Update the actual Spotify playlists directly via computer use — Bill keeps his
   Spotify session open for you. First run: create the 4 playlists (public, named as
   above, add a one-line description), then copy each playlist ID from Share → Copy
   link (the bit after `/playlist/`). Monthly runs: swap ~5 tracks per list in place.
3. Report back by writing `data/playlists.json` (schema below — full tracklists +
   the spotify_id for each). That file is the source of truth and what the site
   reads for embeds.
4. Commit + deploy (same commands as the music-events task).
5. First run only: tell Bill it's done so Claude (dev) can wire the site embeds.

### Schema
```json
{
  "updated": "2026-06-10",
  "playlists": [
    {
      "key": "couch-lock",
      "title": "Couch-Lock (Myrcene)",
      "mood": "sleep",
      "spotify_id": "PASTE_PLAYLIST_ID_ONCE_CREATED",
      "description": "one-liner shown on the site",
      "tracks": [ { "artist": "…", "title": "…" } ]
    }
  ]
}
```
`spotify_id` is the bit after `playlist/` in the Spotify share URL. Once IDs exist,
the site embeds the players on /music-events — ping Claude (dev) to wire the embeds
the first time.
