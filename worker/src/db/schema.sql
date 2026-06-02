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
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'event_manager'
);

CREATE TABLE IF NOT EXISTS event_permissions (
  username TEXT NOT NULL,
  event_slug TEXT NOT NULL,
  PRIMARY KEY (username, event_slug),
  FOREIGN KEY (username) REFERENCES admin_users(username) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_signups_event_slug ON signups(event_slug);
CREATE INDEX IF NOT EXISTS idx_signups_created_at ON signups(created_at);
CREATE INDEX IF NOT EXISTS idx_event_permissions_username ON event_permissions(username);
