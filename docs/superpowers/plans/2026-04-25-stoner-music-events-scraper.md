# Stoner-Friendly Music Events Scraper — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automated nightly scraping of Greater Cleveland venue calendars, filtered for 420-adjacent music (jam, Dead, psych, funk, reggae), published to 420blazin.com/music-events.html with zero false positives.

**Architecture:** A Cloudflare Worker with a cron trigger scrapes venue calendar pages (static HTML via fetch, no browser needed — verified that Winchester, Beachland, Grog Shop are all server-rendered). Events are stored in D1, filtered by keyword matching, and served as a static page. Secondary validation via BandsInTown API. A scheduled Claude Code agent can also trigger manual refreshes.

**Tech Stack:** Cloudflare Workers (TypeScript), D1 database, Cron Triggers, HTML scraping via fetch + regex/cheerio-lite, BandsInTown API (free), existing SEO proxy for page serving.

**Spec:** `docs/STONER-MUSIC-SCRAPER-PLAN.md`

---

## File Structure

```
workers/music-scraper/
├── wrangler.toml           # Worker config with cron trigger
├── package.json            # Dependencies
├── tsconfig.json
├── src/
│   ├── index.ts            # Worker entry: cron handler + manual trigger route
│   ├── scraper.ts          # Core scraping logic per venue
│   ├── venues.ts           # Venue registry (URLs, selectors, config)
│   ├── filter.ts           # 420-adjacent keyword matching + stoner_score
│   ├── db.ts               # D1 helpers (insert, dedup, cleanup)
│   ├── page-builder.ts     # Generate music-events.html static content
│   └── bandsintown.ts      # Secondary validation via BandsInTown API
├── schema.sql              # D1 table definition
└── tests/
    └── filter.test.ts      # Keyword filter unit tests
music-events.html               # Output page (root of 420blaze project)
```

---

### Task 1: D1 Database Schema

**Files:**
- Create: `workers/music-scraper/schema.sql`

- [ ] **Step 1: Write the schema**

```sql
DROP TABLE IF EXISTS music_events;
CREATE TABLE music_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venue_slug TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  event_name TEXT NOT NULL,
  bands TEXT,
  event_date TEXT NOT NULL,
  doors_time TEXT,
  show_time TEXT,
  price TEXT,
  ticket_url TEXT,
  source_url TEXT NOT NULL,
  genre_tags TEXT,
  stoner_score INTEGER DEFAULT 0,
  confirmed_by TEXT,
  status TEXT DEFAULT 'confirmed',
  first_seen TEXT DEFAULT (datetime('now')),
  last_seen TEXT DEFAULT (datetime('now')),
  UNIQUE(venue_slug, event_name, event_date)
);

CREATE INDEX idx_events_date ON music_events(event_date);
CREATE INDEX idx_events_score ON music_events(stoner_score DESC);
```

- [ ] **Step 2: Create the D1 database**

```bash
wrangler d1 create music-events-db
```

Save the database_id for wrangler.toml.

- [ ] **Step 3: Apply schema**

```bash
wrangler d1 execute music-events-db --local --file=workers/music-scraper/schema.sql
wrangler d1 execute music-events-db --remote --file=workers/music-scraper/schema.sql
```

- [ ] **Step 4: Commit**

```bash
git add workers/music-scraper/schema.sql
git commit -m "feat: add D1 schema for music events scraper"
```

---

### Task 2: Venue Registry

**Files:**
- Create: `workers/music-scraper/src/venues.ts`

- [ ] **Step 1: Define venue interface and registry**

```typescript
export interface Venue {
  slug: string;
  name: string;
  neighborhood: string;
  calendarUrl: string;
  calendarType: 'html' | 'opendate' | 'bandsintown';
  eventSelector: string;  // CSS-like description for parsing
  address: string;
  vibeMatch: 'high' | 'medium' | 'low';
}

export const VENUES: Venue[] = [
  {
    slug: 'winchester',
    name: 'Winchester Music Tavern',
    neighborhood: 'Lakewood',
    calendarUrl: 'https://thewinchestermusictavern.com/calendar/',
    calendarType: 'html',
    eventSelector: 'tribe-events',  // WordPress The Events Calendar plugin
    address: '12112 Madison Ave, Lakewood, OH',
    vibeMatch: 'high',
  },
  {
    slug: 'beachland',
    name: 'Beachland Ballroom & Tavern',
    neighborhood: 'Waterloo',
    calendarUrl: 'https://www.beachlandballroom.com/shows',
    calendarType: 'html',
    eventSelector: 'show-listing',
    address: '15711 Waterloo Rd, Cleveland, OH',
    vibeMatch: 'high',
  },
  {
    slug: 'happy-dog',
    name: 'Happy Dog',
    neighborhood: 'Detroit Ave',
    calendarUrl: 'https://app.opendate.io/v/happy-dog-1767',
    calendarType: 'opendate',
    eventSelector: 'opendate-event',
    address: '5801 Detroit Ave, Cleveland, OH',
    vibeMatch: 'high',
  },
  {
    slug: 'grog-shop',
    name: 'Grog Shop',
    neighborhood: 'Coventry',
    calendarUrl: 'https://grogshop.gs/events/',
    calendarType: 'html',
    eventSelector: 'event-listing',
    address: '2785 Euclid Heights Blvd, Cleveland Heights, OH',
    vibeMatch: 'medium',
  },
  {
    slug: 'mahalls',
    name: "Mahall's",
    neighborhood: 'Lakewood',
    calendarUrl: 'https://www.mahalls20lanes.com/events',
    calendarType: 'html',
    eventSelector: 'event',
    address: '13200 Madison Ave, Lakewood, OH',
    vibeMatch: 'medium',
  },
  {
    slug: 'foundry',
    name: 'Foundry Concert Club',
    neighborhood: 'Old Brooklyn',
    calendarUrl: 'https://www.foundryconcertclub.com/events-2/',
    calendarType: 'html',
    eventSelector: 'event',
    address: '4256 Pearl Rd, Cleveland, OH',
    vibeMatch: 'medium',
  },
  {
    slug: 'agora',
    name: 'Agora Theatre',
    neighborhood: 'Midtown',
    calendarUrl: 'https://www.agoracleveland.com/events',
    calendarType: 'html',
    eventSelector: 'event',
    address: '5000 Euclid Ave, Cleveland, OH',
    vibeMatch: 'high',
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add workers/music-scraper/src/venues.ts
git commit -m "feat: add venue registry with 7 Cleveland venues"
```

---

### Task 3: Keyword Filter + Stoner Score

**Files:**
- Create: `workers/music-scraper/src/filter.ts`
- Create: `workers/music-scraper/tests/filter.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// tests/filter.test.ts
import { describe, it, expect } from 'vitest';
import { calculateStonerScore, is420Adjacent } from '../src/filter';

describe('calculateStonerScore', () => {
  it('scores 5 for grateful dead tribute', () => {
    expect(calculateStonerScore('Sunshine Daydream - Grateful Dead Tribute', '')).toBe(5);
  });
  it('scores 4 for jam band', () => {
    expect(calculateStonerScore('Phish Tribute - Lawn Boy', 'jam band')).toBeGreaterThanOrEqual(4);
  });
  it('scores 3 for funk band', () => {
    expect(calculateStonerScore('Parliament Funkadelic Night', '')).toBeGreaterThanOrEqual(3);
  });
  it('scores 0 for generic pop', () => {
    expect(calculateStonerScore('Taylor Swift Tribute', 'pop')).toBe(0);
  });
  it('scores 0 for karaoke', () => {
    expect(calculateStonerScore('Thursday Karaoke Night', '')).toBe(0);
  });
  it('scores for reggae', () => {
    expect(calculateStonerScore('Bob Marley Birthday Bash', 'reggae')).toBeGreaterThanOrEqual(3);
  });
  it('scores for stoner/doom metal', () => {
    expect(calculateStonerScore('DOOM GONG + Moon Goons', 'stoner doom')).toBeGreaterThanOrEqual(3);
  });
});

describe('is420Adjacent', () => {
  it('includes events with score >= 2', () => {
    expect(is420Adjacent('Grateful Dead Night', '')).toBe(true);
  });
  it('excludes generic events', () => {
    expect(is420Adjacent('Open Mic Night', '')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd workers/music-scraper && npx vitest run tests/filter.test.ts
```

- [ ] **Step 3: Implement the filter**

```typescript
// src/filter.ts
const HIGH_KEYWORDS = [
  'grateful dead', 'dead tribute', 'jerry garcia', 'sunshine daydream',
  'phish', 'jam band', 'jamband',
  'funkadelic', 'parliament', 'p-funk', 'funk tribute',
  'bob marley', 'reggae', 'roots reggae', 'dub',
  '420', 'cannabis', 'stoner',
  'allman brothers', 'widespread panic', 'string cheese',
  'umphrey', 'moe.', 'ween', 'primus',
  'psychedelic', 'psych rock', 'acid rock',
  'maggot brain',
];

const MEDIUM_KEYWORDS = [
  'doom', 'stoner rock', 'stoner metal', 'sludge',
  'jam night', 'open jam', 'blues jam',
  'deadhead', 'hippie', 'tie-dye',
  'trippy', 'space rock', 'krautrock',
  'funk', 'soul', 'afrobeat',
  'bluegrass', 'newgrass', 'folk jam',
];

const EXCLUDE_KEYWORDS = [
  'karaoke', 'trivia', 'open mic', 'comedy',
  'dj night', 'dance party',
  'brunch', 'yoga',
];

export function calculateStonerScore(eventName: string, genreTags: string): number {
  const text = `${eventName} ${genreTags}`.toLowerCase();

  // Check exclusions first
  for (const kw of EXCLUDE_KEYWORDS) {
    if (text.includes(kw)) return 0;
  }

  let score = 0;

  for (const kw of HIGH_KEYWORDS) {
    if (text.includes(kw)) {
      score = Math.max(score, 5);
      break;
    }
  }

  if (score === 0) {
    for (const kw of MEDIUM_KEYWORDS) {
      if (text.includes(kw)) {
        score = Math.max(score, 3);
        break;
      }
    }
  }

  return score;
}

export function is420Adjacent(eventName: string, genreTags: string): boolean {
  return calculateStonerScore(eventName, genreTags) >= 2;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd workers/music-scraper && npx vitest run tests/filter.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add workers/music-scraper/src/filter.ts workers/music-scraper/tests/filter.test.ts
git commit -m "feat: add 420-adjacent keyword filter with stoner score"
```

---

### Task 4: Venue Scraper Core

**Files:**
- Create: `workers/music-scraper/src/scraper.ts`
- Create: `workers/music-scraper/src/db.ts`

- [ ] **Step 1: Write the DB helpers**

```typescript
// src/db.ts
export interface EventRow {
  venue_slug: string;
  venue_name: string;
  event_name: string;
  bands: string | null;
  event_date: string;
  doors_time: string | null;
  show_time: string | null;
  price: string | null;
  ticket_url: string | null;
  source_url: string;
  genre_tags: string | null;
  stoner_score: number;
}

export async function upsertEvent(db: D1Database, event: EventRow): Promise<void> {
  await db.prepare(`
    INSERT INTO music_events (venue_slug, venue_name, event_name, bands, event_date, doors_time, show_time, price, ticket_url, source_url, genre_tags, stoner_score, last_seen)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(venue_slug, event_name, event_date) DO UPDATE SET
      last_seen = datetime('now'),
      price = excluded.price,
      ticket_url = excluded.ticket_url,
      stoner_score = excluded.stoner_score,
      status = 'confirmed'
  `).bind(
    event.venue_slug, event.venue_name, event.event_name, event.bands,
    event.event_date, event.doors_time, event.show_time, event.price,
    event.ticket_url, event.source_url, event.genre_tags, event.stoner_score
  ).run();
}

export async function markPastEvents(db: D1Database): Promise<void> {
  await db.prepare(`
    UPDATE music_events SET status = 'past'
    WHERE event_date < date('now') AND status = 'confirmed'
  `).run();
}

export async function getUpcomingEvents(db: D1Database, days: number = 30): Promise<any[]> {
  const result = await db.prepare(`
    SELECT * FROM music_events
    WHERE status = 'confirmed'
      AND event_date >= date('now')
      AND event_date <= date('now', '+' || ? || ' days')
      AND stoner_score >= 2
    ORDER BY event_date ASC, stoner_score DESC
  `).bind(days).all();
  return result.results;
}
```

- [ ] **Step 2: Write the scraper** (one parser per venue type)

```typescript
// src/scraper.ts
import { Venue, VENUES } from './venues';
import { calculateStonerScore } from './filter';
import { EventRow, upsertEvent } from './db';

interface ScrapedEvent {
  name: string;
  date: string;
  doors?: string;
  showTime?: string;
  price?: string;
  ticketUrl?: string;
  bands?: string;
}

async function fetchPage(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': '420Blazin-EventBot/1.0 (+https://420blazin.com)' },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.text();
}

function parseWinchester(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  // Winchester uses The Events Calendar (WordPress plugin)
  // Events are in <article> tags with tribe-events classes
  const eventBlocks = html.match(/<article[^>]*class="[^"]*tribe[^"]*"[^>]*>[\s\S]*?<\/article>/gi) || [];
  
  for (const block of eventBlocks) {
    const nameMatch = block.match(/<h3[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
    const dateMatch = block.match(/datetime="(\d{4}-\d{2}-\d{2})/i);
    const timeMatch = block.match(/(\d{1,2}:\d{2}\s*[APap][Mm])/);
    const urlMatch = block.match(/<a\s+href="([^"]+)"/i);
    
    if (nameMatch && dateMatch) {
      events.push({
        name: nameMatch[1].trim(),
        date: dateMatch[1],
        showTime: timeMatch ? timeMatch[1] : undefined,
        ticketUrl: urlMatch ? urlMatch[1] : undefined,
      });
    }
  }
  return events;
}

function parseBeachland(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  // Beachland uses custom show listing divs
  const blocks = html.match(/<div[^>]*class="[^"]*show[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/gi) || [];
  
  for (const block of blocks) {
    const nameMatch = block.match(/<h[2-4][^>]*>([^<]+)<\/h/i);
    const dateMatch = block.match(/(\w+day,?\s+\w+\s+\d{1,2}(?:,?\s*\d{4})?)/i);
    const doorsMatch = block.match(/[Dd]oors?\s*:?\s*(\d{1,2}:\d{2}\s*[APap][Mm])/i);
    const showMatch = block.match(/[Ss]how\s*:?\s*(\d{1,2}:\d{2}\s*[APap][Mm])/i);
    const priceMatch = block.match(/\$[\d.]+|No Cover|Free/i);
    
    if (nameMatch && dateMatch) {
      events.push({
        name: nameMatch[1].trim(),
        date: parseFuzzyDate(dateMatch[1]),
        doors: doorsMatch ? doorsMatch[1] : undefined,
        showTime: showMatch ? showMatch[1] : undefined,
        price: priceMatch ? priceMatch[0] : undefined,
      });
    }
  }
  return events;
}

function parseGenericHTML(html: string): ScrapedEvent[] {
  // Generic parser: look for event-like patterns
  const events: ScrapedEvent[] = [];
  // Match common event listing patterns across venue sites
  const datePattern = /(\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s*\d{0,4})/gi;
  const matches = html.match(datePattern) || [];
  // This is intentionally conservative — unknown venues get fewer parsed events
  return events;
}

function parseFuzzyDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return '';
}

export async function scrapeVenue(venue: Venue): Promise<ScrapedEvent[]> {
  try {
    const html = await fetchPage(venue.calendarUrl);
    
    switch (venue.slug) {
      case 'winchester': return parseWinchester(html);
      case 'beachland': return parseBeachland(html);
      default: return parseGenericHTML(html);
    }
  } catch (err) {
    console.error(`[SCRAPER] Error scraping ${venue.name}:`, err);
    return []; // Fail safe: skip venue, don't crash
  }
}

export async function scrapeAllVenues(db: D1Database): Promise<{ scraped: number; filtered: number; errors: string[] }> {
  let scraped = 0;
  let filtered = 0;
  const errors: string[] = [];

  for (const venue of VENUES) {
    try {
      const events = await scrapeVenue(venue);
      
      for (const event of events) {
        scraped++;
        const score = calculateStonerScore(event.name, event.bands || '');
        
        if (score >= 2) {
          filtered++;
          await upsertEvent(db, {
            venue_slug: venue.slug,
            venue_name: venue.name,
            event_name: event.name,
            bands: event.bands || null,
            event_date: event.date,
            doors_time: event.doors || null,
            show_time: event.showTime || null,
            price: event.price || null,
            ticket_url: event.ticketUrl || null,
            source_url: venue.calendarUrl,
            genre_tags: null,
            stoner_score: score,
          });
        }
      }
    } catch (err: any) {
      errors.push(`${venue.name}: ${err.message}`);
    }
  }

  return { scraped, filtered, errors };
}
```

- [ ] **Step 3: Commit**

```bash
git add workers/music-scraper/src/scraper.ts workers/music-scraper/src/db.ts
git commit -m "feat: add venue scraper core with per-venue parsers"
```

---

### Task 5: Static Page Generator

**Files:**
- Create: `workers/music-scraper/src/page-builder.ts`

- [ ] **Step 1: Write the page builder**

This generates HTML that matches the 420blazin site design. The Worker will serve this at `/music-events` via the SEO proxy, or it can be stored in KV.

```typescript
// src/page-builder.ts
export function buildMusicEventsPage(events: any[]): string {
  const today = new Date().toISOString().split('T')[0];
  const endOfWeekend = getEndOfWeekend();
  
  const thisWeekend = events.filter(e => e.event_date <= endOfWeekend);
  const comingUp = events.filter(e => e.event_date > endOfWeekend);

  return `<!-- Generated ${new Date().toISOString()} by 420Blazin Music Scraper -->
<section class="page-banner"><h2>Stoner-Friendly Shows in Cleveland</h2><p>Jam bands, Dead tributes, psych, funk, reggae &mdash; updated nightly</p></section>

<div class="container" style="padding: 2rem 20px; max-width: 900px; margin: 0 auto;">

  <p style="color: #666; font-size: 0.9rem; margin-bottom: 2rem;">Last updated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. Events sourced directly from venue websites. <a href="/blog/best-dry-herb-vaporizers.html">Heading to a show? Don't forget your vaporizer.</a></p>

  ${thisWeekend.length > 0 ? `
  <h2 style="font-family: 'Righteous', cursive; color: var(--deep-green);">This Weekend</h2>
  ${thisWeekend.map(eventCard).join('\n')}
  ` : ''}

  ${comingUp.length > 0 ? `
  <h2 style="font-family: 'Righteous', cursive; color: var(--deep-green); margin-top: 2rem;">Coming Up</h2>
  ${comingUp.map(eventCard).join('\n')}
  ` : ''}

  ${events.length === 0 ? '<p>No 420-friendly shows found in the next 30 days. Check back — we update nightly.</p>' : ''}

</div>`;
}

function eventCard(event: any): string {
  const date = new Date(event.event_date + 'T12:00:00');
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();
  const scoreDots = '🌿'.repeat(Math.min(event.stoner_score, 5));

  return `
  <div class="event-card" style="margin-bottom: 1rem;">
    <div class="event-date">
      <span class="month">${month}</span>
      <span class="day">${day}</span>
    </div>
    <div class="event-details">
      <h3>${event.event_name}</h3>
      <p class="location"><i class="fas fa-map-marker-alt"></i> ${event.venue_name}, ${event.venue_slug === 'winchester' || event.venue_slug === 'mahalls' ? 'Lakewood' : 'Cleveland'}</p>
      ${event.show_time ? `<p class="time"><i class="far fa-clock"></i> ${event.doors_time ? 'Doors ' + event.doors_time + ' &bull; ' : ''}Show ${event.show_time}</p>` : ''}
      ${event.price ? `<p style="color: var(--secondary-color); font-weight: 600;">${event.price}</p>` : ''}
      <p style="font-size: 0.85rem; color: #999;">Vibe: ${scoreDots}</p>
      ${event.ticket_url ? `<a href="${event.ticket_url}" class="btn-small" target="_blank" rel="noopener noreferrer">Tickets / Details</a>` : ''}
    </div>
  </div>`;
}

function getEndOfWeekend(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + daysUntilSunday);
  return sunday.toISOString().split('T')[0];
}
```

- [ ] **Step 2: Commit**

```bash
git add workers/music-scraper/src/page-builder.ts
git commit -m "feat: add static HTML page builder for music events"
```

---

### Task 6: Worker Entry Point + Cron

**Files:**
- Create: `workers/music-scraper/src/index.ts`
- Create: `workers/music-scraper/wrangler.toml`
- Create: `workers/music-scraper/package.json`
- Create: `workers/music-scraper/tsconfig.json`

- [ ] **Step 1: Create wrangler.toml**

```toml
name = "420blazin-music-scraper"
main = "src/index.ts"
compatibility_date = "2024-12-01"

[triggers]
crons = ["0 6 * * *"]  # Daily at 6 AM UTC (2 AM ET)

[[d1_databases]]
binding = "DB"
database_name = "music-events-db"
database_id = "REPLACE_WITH_ACTUAL_ID"

[[kv_namespaces]]
binding = "PAGES"
id = "36c1eaef07ad4d049b0001a6a353fabc"  # Reuse BEAST_SEO KV for page storage
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "420blazin-music-scraper",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "test": "vitest run"
  },
  "devDependencies": {
    "wrangler": "^3.0.0",
    "@cloudflare/workers-types": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 3: Write the Worker entry**

```typescript
// src/index.ts
import { scrapeAllVenues } from './scraper';
import { markPastEvents, getUpcomingEvents } from './db';
import { buildMusicEventsPage } from './page-builder';

interface Env {
  DB: D1Database;
  PAGES: KVNamespace;
}

export default {
  // Cron trigger: nightly scrape
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[CRON] Music events scrape starting:', new Date().toISOString());

    // Mark past events
    await markPastEvents(env.DB);

    // Scrape all venues
    const result = await scrapeAllVenues(env.DB);
    console.log(`[CRON] Scraped: ${result.scraped} events, Filtered: ${result.filtered} 420-adjacent`);
    if (result.errors.length > 0) {
      console.error('[CRON] Errors:', result.errors);
    }

    // Generate and store the page
    const events = await getUpcomingEvents(env.DB, 30);
    const pageHtml = buildMusicEventsPage(events);
    await env.PAGES.put('music-events-page', pageHtml);
    console.log(`[CRON] Page updated with ${events.length} events`);
  },

  // Manual trigger via HTTP
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/trigger') {
      await markPastEvents(env.DB);
      const result = await scrapeAllVenues(env.DB);
      const events = await getUpcomingEvents(env.DB, 30);
      const pageHtml = buildMusicEventsPage(events);
      await env.PAGES.put('music-events-page', pageHtml);

      return new Response(JSON.stringify({
        ok: true,
        scraped: result.scraped,
        filtered: result.filtered,
        published: events.length,
        errors: result.errors,
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/events') {
      const events = await getUpcomingEvents(env.DB, 30);
      return new Response(JSON.stringify(events), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('420Blazin Music Scraper', { status: 200 });
  },
};
```

- [ ] **Step 4: Install deps and verify build**

```bash
cd workers/music-scraper && npm install && npx wrangler deploy --dry-run
```

- [ ] **Step 5: Commit**

```bash
git add workers/music-scraper/
git commit -m "feat: add music events scraper Worker with nightly cron"
```

---

### Task 7: Music Events HTML Page

**Files:**
- Create: `music-events.html`
- Modify: `workers/seo-proxy/src/index.ts` — add route to serve music events page from KV

- [ ] **Step 1: Create placeholder music-events.html**

Create a full HTML page at `music-events.html` with the standard 420blazin layout (header, nav, footer, PostHog, Cloudflare analytics). The main content section will be populated dynamically from KV by the SEO proxy.

- [ ] **Step 2: Add route to SEO proxy**

In `workers/seo-proxy/src/index.ts`, add a handler:

```typescript
if (url.pathname === '/music-events' || url.pathname === '/music-events.html') {
  // Serve the music events page from KV
  const pageContent = await env.BEAST_SEO.get('music-events-page');
  if (pageContent) {
    // Wrap in full HTML template
    return new Response(wrapInLayout(pageContent, 'Stoner-Friendly Shows in Cleveland'), {
      headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=3600' },
    });
  }
}
```

- [ ] **Step 3: Add to sitemap in SEO proxy**

Add `<url><loc>https://420blazin.com/music-events</loc><changefreq>daily</changefreq><priority>0.8</priority></url>` to the sitemap constant.

- [ ] **Step 4: Add "Live Music" to site navigation**

Add link to nav across all pages: `<li><a href="music-events.html">Live Music</a></li>`

- [ ] **Step 5: Deploy SEO proxy + scraper**

```bash
cd workers/seo-proxy && npx wrangler deploy
cd workers/music-scraper && npx wrangler deploy
```

- [ ] **Step 6: Trigger initial scrape**

```bash
curl https://420blazin-music-scraper.YOUR_SUBDOMAIN.workers.dev/trigger
```

- [ ] **Step 7: Commit**

```bash
git add music-events.html workers/seo-proxy/ workers/music-scraper/
git commit -m "feat: wire music events page into site with dynamic KV content"
```

---

### Task 8: GSC + IndexNow Submission

**Files:** None (CLI commands only)

- [ ] **Step 1: Resubmit sitemap to GSC** (now includes /music-events)

```bash
# Use the GSC sync skill
```

- [ ] **Step 2: Submit to IndexNow**

```bash
curl -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "420blazin.com",
    "key": "420blazin-indexnow-2026",
    "urlList": ["https://420blazin.com/music-events"]
  }'
```

- [ ] **Step 3: Commit plan doc**

```bash
git add docs/
git commit -m "docs: add music events scraper implementation plan"
```

---

## Post-Launch Checklist

- [ ] Verify cron fires at 2 AM ET (check Worker logs)
- [ ] Verify `/music-events` page renders with real events
- [ ] Verify zero false positives (manually check each listed event against venue website)
- [ ] Monitor for 1 week before announcing the page
- [ ] Add venue-specific parsers iteratively as needed (start with Winchester + Beachland which are verified static HTML)
