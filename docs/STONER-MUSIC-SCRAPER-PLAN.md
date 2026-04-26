# 420Blazin Stoner-Friendly Music Events Scraper

## Concept
Automated nightly scrape of Greater Cleveland music venue calendars, filtered for 420-adjacent music (jam, Dead, psych, funk, reggae), published to 420blazin.com.

**Rule: ZERO false positives.** Only events confirmed on the venue's own website.

---

## Venue Registry (Phase 1 — Greater Cleveland)

| Venue | Neighborhood | Calendar URL | Vibe Match | Notes |
|-------|-------------|-------------|------------|-------|
| Winchester Music Tavern | Lakewood | thewinchestermusictavern.com/calendar/ | HIGH — Dead tributes, jam | Sunshine Daydream home venue |
| Beachland Ballroom & Tavern | Waterloo | beachlandballroom.com/shows | HIGH — indie, psych, doom | DOOM GONG, stoner rock |
| Happy Dog | Detroit Ave | happydogcleveland.com | HIGH — eclectic, punk, jam | Neighborhood bar w/ live music |
| Grog Shop | Coventry | grogshop.gs | MEDIUM — indie, punk, some jam | Cleveland Heights institution |
| Mahall's | Lakewood | mahalls20lanes.com or bandsintown | MEDIUM — indie, eclectic | Bowling alley + music venue |
| Foundry Concert Club | Old Brooklyn | foundryconcertclub.com | MEDIUM — heavy, doom, stoner | Recently relocated |
| Agora Theatre | Midtown | agoracleveland.com | HIGH for bigger acts | P-Funk, Dead have played here |
| House of Blues | Downtown | houseofblues.com/cleveland | MEDIUM — mainstream + some jam | Twiztid Still Smokin was here |
| Buckeye Beer Engine | Lakewood | buckeyebeerengine.com | LOW — acoustic, duo acts | 420 HopFest annual |
| No Class | Lakewood | TBD | MEDIUM — punk, garage, stoner | Newer venue |
| Altered State Distillery | Erie, PA | TBD | LOW — acoustic, Dead tributes | Edge of range |

## 420-Adjacent Music Keywords (Filter)

### HIGH confidence (auto-include):
- grateful dead, dead tribute, jerry garcia
- phish, jam band, jamband
- funkadelic, parliament, p-funk, funk tribute
- bob marley, reggae, roots reggae
- 420, cannabis, stoner, psych, psychedelic
- allman brothers, widespread panic
- string cheese, moe., umphrey

### MEDIUM confidence (include with review):
- doom, stoner rock, stoner metal, sludge
- tie-dye, hippie, deadhead
- blues jam, open jam, jam night
- trippy, acid rock

### EXCLUDE (not 420-adjacent):
- country, pop, hip-hop (unless 420-themed)
- comedy (unless cannabis comedy)
- DJ-only events (unless psych/chill)
- karaoke, trivia, open mic (generic)

## Scraping Architecture

```
Scheduled Agent (nightly 2am ET)
  │
  ├─ For each venue:
  │   ├─ Browser automation → venue calendar page
  │   ├─ Extract: event name, date, time, doors, price, bands, genre tags
  │   └─ Filter against keyword list
  │
  ├─ Triangulation (secondary validation):
  │   ├─ BandsInTown API (free, band-centric)
  │   ├─ Songkick (venue-centric)
  │   └─ Only CONFIRM, never ADD from secondary sources alone
  │
  ├─ Dedup against existing events in D1
  │
  ├─ Store in D1: events table
  │   ├─ venue, band, date, time, doors, price, url
  │   ├─ source: "venue_website" (required)
  │   ├─ confirmed_by: "bandsintown" | "songkick" | null
  │   ├─ genre_tags: ["jam", "dead_tribute", "funk"]
  │   ├─ stoner_score: 1-5 (keyword match confidence)
  │   └─ status: "confirmed" | "cancelled" | "past"
  │
  └─ Generate static page: /music-events.html
      ├─ "This Weekend" section
      ├─ "Coming Up" section (next 30 days)
      └─ Grouped by date, sorted by stoner_score

## Checking Cadence

| Check | Frequency | Why |
|-------|-----------|-----|
| Venue calendar scrape | Nightly 2am ET | Catch next-day additions |
| Full 30-day sweep | Sunday midnight | Weekly comprehensive refresh |
| BandsInTown cross-check | 2x/week (Tue + Fri) | Secondary validation |
| Cancelled show cleanup | Daily with scrape | Remove shows no longer on venue site |
| Past event archival | Daily | Move past events to archive |

**Why nightly at 2am:** Venues typically update calendars during business hours. By 2am, all day's updates are reflected. Running earlier risks missing same-day additions.

**Why Tuesday + Friday cross-check:** Tuesday catches weekend announcements. Friday catches last-minute weekend additions.

## Zero False Positive Rules

1. **Primary source MUST be venue's own website** — if it's not on their calendar, it doesn't exist
2. **Aggregator data is CONFIRMATION only** — never add an event from BandsInTown/Songkick alone
3. **If venue calendar returns error/empty, skip that venue** — don't assume events were removed
4. **Human review gate** — new venues added to registry require manual URL verification first
5. **"Last seen" timestamp** — if an event was on the calendar yesterday but not today, mark as "possibly cancelled" (don't auto-remove for 48hrs in case of site glitch)
6. **No date inference** — if the venue page doesn't show a clear date, skip the event

## Output: /music-events.html

Weekly auto-generated page:
- "Stoner-Friendly Shows This Weekend in Cleveland"
- Venue, band, date/time, price, ticket link
- Genre tags (jam, dead tribute, psych, funk, etc.)
- Link back to venue's own page (primary source)
- "Last updated: [timestamp]"
- Affiliate tie-in: "Heading to a show? Don't forget the POTV Lobo — pocket-sized for venue sessions"
```

## Tech Stack

- **Scraper:** Cloudflare Worker cron OR Claude Code scheduled agent
- **Browser:** Playwright MCP for JavaScript-rendered venue sites
- **Storage:** D1 database (events table)
- **Output:** Static HTML generated and pushed to repo, or dynamic Worker route
- **Validation:** BandsInTown API (free tier)
