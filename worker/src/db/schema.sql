CREATE TABLE IF NOT EXISTS signups (
  id TEXT PRIMARY KEY,
  event_slug TEXT NOT NULL,
  data TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  ip_address TEXT
);

CREATE TABLE IF NOT EXISTS admin_users (
  username TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signups_event_slug ON signups(event_slug);
CREATE INDEX IF NOT EXISTS idx_signups_created_at ON signups(created_at);
