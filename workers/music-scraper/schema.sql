-- 420Blazin Music Events Scraper — D1 Schema
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
CREATE INDEX idx_events_status ON music_events(status);
