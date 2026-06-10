# `/data` — site data feeds (CONTRACT)

This folder holds JSON the live site reads at runtime. **If you maintain these files,
follow the contract below or the pages break.**

| File | Who maintains it | How |
|---|---|---|
| `strain-terpenes.json` | **GENERATED — do not hand-edit.** | Comes from the `/terrasana/*.xlsx` spreadsheets via `scripts/build-strain-data.py`. To change it, update the xlsx in `/terrasana` and re-run that script. See `terrasana/README.md`. |
| `music-events.json` | **claude-cowork — weekly task** (see below) | Hand-curated JSON of upcoming 420-adjacent Cleveland shows. This is the one you refresh. |
| `playlists.json` | **claude-cowork — monthly task** (see below) | Terpene-mood Spotify playlists: tracklist source-of-truth + the Spotify playlist IDs for site embeds. |

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
