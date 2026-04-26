/**
 * BandsInTown venue scraper as secondary source.
 * Used for venues with JS-rendered calendars that can't be fetched via plain HTTP.
 * BandsInTown data is CONFIRMATION only per zero-false-positive rules,
 * except for JS-rendered venues where it becomes the primary source.
 */

import { ScrapedEvent } from './scraper';

const USER_AGENT = '420Blazin-EventBot/1.0 (+https://420blazin.com)';

interface BITVenueMap {
  slug: string;
  bitVenueId: string;
}

// BandsInTown venue IDs for our venues
export const BIT_VENUES: BITVenueMap[] = [
  { slug: 'winchester', bitVenueId: '10012569' },
  { slug: 'beachland', bitVenueId: '10000698' },
  { slug: 'happy-dog', bitVenueId: '10006468' },
  { slug: 'grog-shop', bitVenueId: '10001915' },
  { slug: 'mahalls', bitVenueId: '10000818' },
];

/**
 * Fetch events for a venue from BandsInTown's public venue page.
 * No API key needed — scrapes the public venue page.
 */
export async function fetchBandsInTownEvents(venueSlug: string): Promise<ScrapedEvent[]> {
  const mapping = BIT_VENUES.find(v => v.slug === venueSlug);
  if (!mapping) return [];

  const url = `https://www.bandsintown.com/v/${mapping.bitVenueId}`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!resp.ok) return [];

    const html = await resp.text();
    return parseBandsInTownPage(html);
  } catch {
    return [];
  }
}

function parseBandsInTownPage(html: string): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  const today = new Date().toISOString().split('T')[0];

  // BandsInTown uses JSON-LD for events
  const jsonLdBlocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi) || [];

  for (const block of jsonLdBlocks) {
    try {
      const content = block.replace(/<\/?script[^>]*>/gi, '');
      const data = JSON.parse(content);
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item['@type'] === 'MusicEvent' || item['@type'] === 'Event') {
          const date = (item.startDate || '').substring(0, 10);
          if (date >= today && item.name) {
            events.push({
              name: item.name,
              date,
              showTime: item.startDate?.includes('T')
                ? new Date(item.startDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                : undefined,
              ticketUrl: item.url || undefined,
              price: item.offers?.price ? `$${item.offers.price}` : undefined,
            });
          }
        }
      }
    } catch { /* skip malformed */ }
  }

  return events;
}
