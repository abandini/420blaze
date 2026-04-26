/**
 * Venue calendar scraper.
 * Fetches venue pages via HTTP, parses events from HTML.
 * Each venue gets a dedicated parser for reliability.
 */

import { Venue, VENUES } from './venues';
import { calculateStonerScore } from './filter';
import { EventRow, upsertEvent } from './db';

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
 * Parse Winchester Music Tavern calendar.
 * Uses WordPress The Events Calendar plugin with tribe-events markup.
 */
function parseWinchester(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  const today = todayISO();

  // Match event blocks via datetime + title pattern
  const eventPattern = /datetime="(\d{4}-\d{2}-\d{2})[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>/gi;
  let match;

  while ((match = eventPattern.exec(html)) !== null) {
    const date = match[1];
    const url = match[2];
    const name = match[3].trim();

    if (name && date && date >= today) {
      const timeMatch = html.substring(match.index, match.index + 500)
        .match(/(\d{1,2}:\d{2}\s*[APap][Mm])/);

      events.push({
        name,
        date,
        showTime: timeMatch ? timeMatch[1] : undefined,
        ticketUrl: url.startsWith('http') ? url : `https://thewinchestermusictavern.com${url}`,
      });
    }
  }

  // Fallback: JSON-LD structured data
  if (events.length === 0) {
    return parseJsonLd(html);
  }

  return events;
}

/**
 * Parse Beachland Ballroom shows page.
 */
function parseBeachland(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  const today = todayISO();

  // Look for show blocks with date + artist info
  const showBlocks = html.match(/<div[^>]*class="[^"]*show[^"]*"[\s\S]*?(?=<div[^>]*class="[^"]*show|$)/gi) || [];

  for (const block of showBlocks) {
    const nameMatch = block.match(/<h[2-4][^>]*>\s*(?:<a[^>]*>)?([^<]+)(?:<\/a>)?\s*<\/h/i);
    const dateMatch = block.match(/datetime="(\d{4}-\d{2}-\d{2})/i)
      || block.match(/(\w+day,?\s+\w+\s+\d{1,2}(?:,?\s*\d{4})?)/i);
    const doorsMatch = block.match(/[Dd]oors?\s*[:@]?\s*(\d{1,2}:\d{2}\s*[APap][Mm])/i);
    const showMatch = block.match(/[Ss]how\s*[:@]?\s*(\d{1,2}:\d{2}\s*[APap][Mm])/i);
    const priceMatch = block.match(/(\$[\d.]+|No Cover|Free)/i);

    if (nameMatch) {
      const rawDate = dateMatch ? (dateMatch[1]) : '';
      const date = rawDate.match(/\d{4}-\d{2}-\d{2}/) ? rawDate : parseFuzzyDate(rawDate);

      if (date && date >= today) {
        events.push({
          name: nameMatch[1].trim(),
          date,
          doors: doorsMatch ? doorsMatch[1] : undefined,
          showTime: showMatch ? showMatch[1] : undefined,
          price: priceMatch ? priceMatch[1] : undefined,
        });
      }
    }
  }

  return events.length > 0 ? events : parseJsonLd(html);
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
        if (item['@type'] === 'Event' && item.name && item.startDate) {
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

/**
 * Generic HTML event parser — conservative approach.
 * Relies on JSON-LD first, then common HTML patterns.
 */
function parseGenericHTML(html: string): ScrapedEvent[] {
  const jsonLdEvents = parseJsonLd(html);
  if (jsonLdEvents.length > 0) return jsonLdEvents;

  const events: ScrapedEvent[] = [];
  const today = todayISO();
  const eventPattern = /class="[^"]*event[^"]*"[\s\S]*?<(?:h[2-4]|a|strong)[^>]*>([^<]{3,80})<\/(?:h[2-4]|a|strong)>[\s\S]*?datetime="(\d{4}-\d{2}-\d{2})/gi;
  let match;

  while ((match = eventPattern.exec(html)) !== null) {
    const name = match[1].trim();
    const date = match[2];
    if (name && date >= today) {
      events.push({ name, date });
    }
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

// ---- Main Scrape Functions ----

export async function scrapeVenue(venue: Venue): Promise<ScrapedEvent[]> {
  try {
    const html = await fetchPage(venue.calendarUrl);

    switch (venue.slug) {
      case 'winchester':
        return parseWinchester(html);
      case 'beachland':
        return parseBeachland(html);
      default:
        return parseGenericHTML(html);
    }
  } catch (err: any) {
    console.error(`[SCRAPER] Error scraping ${venue.name}: ${err.message}`);
    return []; // Fail safe: skip venue, never crash
  }
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
      console.log(`[SCRAPER] ${venue.name}: found ${events.length} events`);

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
