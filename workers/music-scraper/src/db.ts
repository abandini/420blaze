/**
 * D1 database helpers for music events.
 */

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

export async function getAllEvents(db: D1Database): Promise<any[]> {
  const result = await db.prepare(`
    SELECT * FROM music_events ORDER BY event_date ASC
  `).all();
  return result.results;
}

export async function getEventCount(db: D1Database): Promise<number> {
  const result = await db.prepare(`
    SELECT COUNT(*) as count FROM music_events WHERE status = 'confirmed'
  `).first<{ count: number }>();
  return result?.count ?? 0;
}
