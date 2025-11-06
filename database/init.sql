-- SQLite-compatible schema for Synergy app
-- Converted from PostgreSQL migrations

-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  theme TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  location TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  host_id TEXT,
  is_active INTEGER DEFAULT 1
);

-- Create index on event code for fast lookups
CREATE INDEX IF NOT EXISTS idx_events_code ON events(code);

-- Create guest_preferences table
CREATE TABLE IF NOT EXISTS guest_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_code TEXT NOT NULL,
  guest_id TEXT NOT NULL,
  artists TEXT DEFAULT '[]',  -- JSON array as TEXT
  genres TEXT DEFAULT '[]',    -- JSON array as TEXT
  recent_tracks TEXT DEFAULT '[]',  -- JSON array as TEXT
  spotify_playlists TEXT DEFAULT '[]',  -- JSON array as TEXT
  spotify_analyzed INTEGER DEFAULT 0,
  source TEXT DEFAULT 'manual',
  tracks_data TEXT DEFAULT '[]',  -- JSON array as TEXT
  stats TEXT DEFAULT '{}',  -- JSON object as TEXT
  submitted_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (event_code) REFERENCES events(code) ON DELETE CASCADE,
  UNIQUE(event_code, guest_id)
);

-- Create index on event_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_guest_preferences_event_code ON guest_preferences(event_code);

-- Create event_songs table to store aggregated top songs
CREATE TABLE IF NOT EXISTS event_songs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_code TEXT NOT NULL,
  spotify_track_id TEXT,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  popularity INTEGER DEFAULT 0,
  frequency INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (event_code) REFERENCES events(code) ON DELETE CASCADE,
  UNIQUE(event_code, spotify_track_id, track_name, artist_name)
);

-- Create index on event_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_songs_event_code ON event_songs(event_code);
CREATE INDEX IF NOT EXISTS idx_event_songs_frequency ON event_songs(event_code, frequency DESC);

-- Create event_sessions table to track active sessions
CREATE TABLE IF NOT EXISTS event_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_code TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('host', 'dj', 'guest')),
  user_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  last_activity TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (event_code) REFERENCES events(code) ON DELETE CASCADE,
  UNIQUE(event_code, user_id, session_type)
);

-- Create index on event_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_sessions_event_code ON event_sessions(event_code);
CREATE INDEX IF NOT EXISTS idx_event_sessions_active ON event_sessions(event_code, is_active) WHERE is_active = 1;

-- Trigger to update session timestamps (SQLite doesn't support triggers like PostgreSQL, but we'll handle this in application code)
-- Note: SQLite triggers are limited, so we'll update updated_at in application code

-- Create song_requests table to store guest song requests
CREATE TABLE IF NOT EXISTS song_requests (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_code TEXT NOT NULL,
  guest_id TEXT NOT NULL,
  spotify_track_id TEXT,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  preview_url TEXT,
  duration_ms INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'played', 'queued')),
  vote_count INTEGER DEFAULT 0,
  downvote_count INTEGER DEFAULT 0,
  tip_amount REAL DEFAULT 0,
  requester_name TEXT,
  submitted_at TEXT DEFAULT (datetime('now')),
  played_at TEXT,
  metadata TEXT DEFAULT '{}',  -- JSON object for BPM, key, energy, etc.
  FOREIGN KEY (event_code) REFERENCES events(code) ON DELETE CASCADE
);

-- Create indexes for song_requests
CREATE INDEX IF NOT EXISTS idx_song_requests_event_code ON song_requests(event_code);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON song_requests(event_code, status);
CREATE INDEX IF NOT EXISTS idx_song_requests_votes ON song_requests(event_code, vote_count DESC, downvote_count ASC);
CREATE INDEX IF NOT EXISTS idx_song_requests_submitted ON song_requests(event_code, submitted_at DESC);

-- Create request_votes table to track upvotes/downvotes
CREATE TABLE IF NOT EXISTS request_votes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  request_id TEXT NOT NULL,
  guest_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (request_id) REFERENCES song_requests(id) ON DELETE CASCADE,
  UNIQUE(request_id, guest_id)
);

-- Create indexes for request_votes
CREATE INDEX IF NOT EXISTS idx_request_votes_request_id ON request_votes(request_id);
CREATE INDEX IF NOT EXISTS idx_request_votes_guest_id ON request_votes(guest_id);

-- Create request_settings table for event-level request configuration
CREATE TABLE IF NOT EXISTS request_settings (
  event_code TEXT PRIMARY KEY,
  requests_enabled INTEGER DEFAULT 1,
  voting_enabled INTEGER DEFAULT 1,
  paid_requests_enabled INTEGER DEFAULT 0,
  genre_restrictions TEXT DEFAULT '[]',  -- JSON array of allowed genres
  artist_restrictions TEXT DEFAULT '[]',  -- JSON array of allowed artists
  open_time TEXT,  -- ISO datetime string
  close_time TEXT,  -- ISO datetime string
  min_vote_threshold INTEGER DEFAULT 0,
  max_requests_per_guest INTEGER DEFAULT 10,
  auto_accept_threshold INTEGER DEFAULT 5,  -- Auto-accept requests with this many votes
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (event_code) REFERENCES events(code) ON DELETE CASCADE
);

-- Create request_analytics table for tracking metrics
CREATE TABLE IF NOT EXISTS request_analytics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event_code TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  timestamp TEXT DEFAULT (datetime('now')),
  metadata TEXT DEFAULT '{}',  -- JSON object for additional context
  FOREIGN KEY (event_code) REFERENCES events(code) ON DELETE CASCADE
);

-- Create indexes for request_analytics
CREATE INDEX IF NOT EXISTS idx_request_analytics_event_code ON request_analytics(event_code);
CREATE INDEX IF NOT EXISTS idx_request_analytics_metric ON request_analytics(event_code, metric_name, timestamp DESC);

