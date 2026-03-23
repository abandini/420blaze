CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  site TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  clicked_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_clicks_slug ON affiliate_clicks(slug);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON affiliate_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_clicks_site ON affiliate_clicks(site);
