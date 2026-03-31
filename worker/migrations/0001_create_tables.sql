-- users
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  show_in_weekly INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- checkins
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  checkin_time TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_time ON checkins(user_id, checkin_time);
CREATE INDEX IF NOT EXISTS idx_checkins_time ON checkins(checkin_time);

