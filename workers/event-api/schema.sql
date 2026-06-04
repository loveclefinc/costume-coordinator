CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  event_date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  theme_json TEXT,
  expires_at INTEGER NOT NULL,
  admin_token TEXT NOT NULL,
  invite_token TEXT NOT NULL,
  retention_days INTEGER NOT NULL DEFAULT 14,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS participants (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_event_name
  ON participants(event_id, display_name);

CREATE TABLE IF NOT EXISTS costumes (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL,
  participant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  colors_json TEXT NOT NULL,
  tone TEXT NOT NULL,
  pattern TEXT NOT NULL,
  season_json TEXT NOT NULL DEFAULT '[]',
  type TEXT,
  preferences_json TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL,
  costume_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  content_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (costume_id) REFERENCES costumes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_costumes_event ON costumes(event_id);
CREATE INDEX IF NOT EXISTS idx_photos_costume ON photos(costume_id);
