/**
 * Venue calendar scraper.
 * Parsers calibrated against actual venue HTML snapshots (2026-04-27).
 *
 * Venue status:
 *   Beachland   — STATIC HTML (Webflow): .title + .start-date divs ✓
 *   Foundry     — STATIC HTML (WordPress + TicketWeb): tw-event-name + date text ✓
 *   Grog Shop   — JS-RENDERED (TicketWeb calendar): BandsInTown fallback
 *   Winchester  — JS-RENDERED ("Calendar Loading..."): BandsInTown fallback
 *   Happy Dog   — JS-RENDERED (OpenDate): BandsInTown fallback
 *   Mahalls     — EMPTY RESPONSE: BandsInTown fallback
 *   Agora       — MINIMAL HTML: BandsInTown fallback
 */

import { Venue, VENUES } from './venues';
import { calculateStonerScore } from './filter';
import { EventRow, upsertEvent } from './db';
import { fetchBandsInTownEvents } from './bandsintown';

export interface ScrapedEvent {
  name: string;
  date: string;       // YYYY-MM-DD
  doors?: string;
  showTime?: string;
  price?: string;
  ticketUrl?: string;
  bands?: string;
}

const USER_AGENT = '420Blazin-EventBot/1.0 (+https://420blazin.com)';

async function fetchPage(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
  return resp.text();
}

/**
 * Parse Beachland Ballroom (Webflow site).
 * Structure: <div class="title"><div>NAME</div></div>
 *            <div class="start-date"><div>DATE</div></div>
 *            <a href="/shows/SLUG" class="webflow-link">
 * 114 events found in snapshot.
 */
function parseBeachland(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  const today = todayISO();

  // Extract title + start-date pairs from the Webflow dynamic list
  const titlePattern = /class="title"><div>([^<]+)<\/div>/g;
  const datePattern = /class="start-date"><div>([^<]+)<\/div>/g;
  const urlPattern = /href="(\/shows\/[^"]+)"/g;

  const titles: string[] = [];
  const dates: string[] = [];
  const urls: string[] = [];

  let m;
  while ((m = titlePattern.exec(html)) !== null) titles.push(m[1].trim());
  while ((m = datePattern.exec(html)) !== null) dates.push(m[1].trim());
  while ((m = urlPattern.exec(html)) !== null) urls.push(m[1]);

  const count = Math.min(titles.length, dates.length);
  for (let i = 0; i < count; i++) {
    const date = parseFuzzyDate(dates[i]);
    if (date && date >= today) {
      events.push({
        name: decodeEntities(titles[i]),
        date,
        ticketUrl: urls[i] ? `https://www.beachlandballroom.com${urls[i]}` : undefined,
      });
    }
  }

  console.log(`[PARSER] Beachland: ${titles.length} titles, ${dates.length} dates, ${events.length} future events`);
  return events;
}

/**
 * Parse Foundry Concert Club (WordPress + TicketWeb).
 * Structure: tw-event-name with <a>NAME</a> near date text "April 27, 2026"
 * 77 date instances found in snapshot.
 */
function parseFoundry(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  const today = todayISO();

  // Pattern: date text followed by event name in tw-name link
  const pattern = /(\w+ \d{1,2}, \d{4})[\s\S]*?class="tw-name[^"]*"[^>]*>\s*(?:<a[^>]*>)?([^<]+)/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const date = parseFuzzyDate(match[1]);
    const name = decodeEntities(match[2].trim());

    if (date && date >= today && name.length > 2) {
      // Look for price and time nearby
      const vicinity = html.substring(match.index, match.index + 1000);
      const priceMatch = vicinity.match(/\$[\d.]+/);
      const timeMatch = vicinity.match(/(\d{1,2}:\d{2}\s*[APap][Mm])/);

      events.push({
        name,
        date,
        showTime: timeMatch ? timeMatch[1] : undefined,
        price: priceMatch ? priceMatch[0] : undefined,
      });
    }
  }

  console.log(`[PARSER] Foundry: ${events.length} events parsed`);
  return events;
}

/**
 * Parse JSON-LD structured data (works for many venues).
 */
function parseJsonLd(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  const today = todayISO();
  const jsonLdBlocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];

  for (const block of jsonLdBlocks) {
    try {
      const content = block.replace(/<\/?script[^>]*>/gi, '');
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : (data['@graph'] || [data]);

      for (const item of items) {
        if ((item['@type'] === 'Event' || item['@type'] === 'MusicEvent') && item.name && item.startDate) {
          const date = item.startDate.substring(0, 10);
          if (date >= today) {
            events.push({
              name: item.name,
              date,
              showTime: item.startDate.includes('T') ? formatTime(item.startDate) : undefined,
              ticketUrl: item.url || undefined,
              doors: item.doorTime ? formatTime(item.doorTime) : undefined,
              price: item.offers?.price ? `$${item.offers.price}` : undefined,
            });
          }
        }
      }
    } catch { /* skip malformed JSON-LD */ }
  }
  return events;
}

// ---- Helpers ----

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function parseFuzzyDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    let str = dateStr.trim();
    if (!/\d{4}/.test(str)) {
      str += ` ${new Date().getFullYear()}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch { /* skip unparseable dates */ }
  return '';
}

function formatTime(isoOrTime: string): string {
  try {
    const d = new Date(isoOrTime);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  } catch { /* return as-is */ }
  return isoOrTime;
}

function decodeEntities(str: string): string {
  return str
    .replace(/&#039;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// ---- Main Scrape Functions ----

export async function scrapeVenue(venue: Venue): Promise<ScrapedEvent[]> {
  let events: ScrapedEvent[] = [];

  try {
    const html = await fetchPage(venue.calendarUrl);

    switch (venue.slug) {
      case 'beachland':
        // Webflow static HTML — reliable parser
        events = parseBeachland(html);
        break;

      case 'foundry':
        // WordPress + TicketWeb — static HTML with tw-name + date pairs
        events = parseFoundry(html);
        break;

      default:
        // Try JSON-LD first (some sites have it)
        events = parseJsonLd(html);
        break;
    }
  } catch (err: any) {
    console.log(`[SCRAPER] ${venue.name}: fetch/parse error: ${err.message}`);
  }

  // Fallback to BandsInTown for JS-rendered venues or empty results
  if (events.length === 0) {
    console.log(`[SCRAPER] ${venue.name}: no HTML events, trying BandsInTown`);
    try {
      events = await fetchBandsInTownEvents(venue.slug);
    } catch {
      console.log(`[SCRAPER] ${venue.name}: BandsInTown also failed`);
    }
  }

  console.log(`[SCRAPER] ${venue.name}: ${events.length} total events`);
  return events;
}

export async function scrapeAllVenues(db: D1Database): Promise<{
  scraped: number;
  filtered: number;
  stored: number;
  errors: string[];
}> {
  let scraped = 0;
  let filtered = 0;
  let stored = 0;
  const errors: string[] = [];

  for (const venue of VENUES) {
    try {
      const events = await scrapeVenue(venue);

      for (const event of events) {
        scraped++;
        const score = calculateStonerScore(event.name, event.bands || '');

        if (score >= 2) {
          filtered++;
          try {
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
            stored++;
          } catch (dbErr: any) {
            console.error(`[SCRAPER] DB error for ${event.name}: ${dbErr.message}`);
          }
        }
      }
    } catch (err: any) {
      errors.push(`${venue.name}: ${err.message}`);
    }
  }

  return { scraped, filtered, stored, errors };
}
