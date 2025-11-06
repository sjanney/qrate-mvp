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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  host_id TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create index on event code for fast lookups
CREATE INDEX IF NOT EXISTS idx_events_code ON events(code);

-- Create guest_preferences table
CREATE TABLE IF NOT EXISTS guest_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_code TEXT NOT NULL REFERENCES events(code) ON DELETE CASCADE,
  guest_id TEXT NOT NULL,
  artists TEXT[] DEFAULT '{}',
  genres TEXT[] DEFAULT '{}',
  recent_tracks TEXT[] DEFAULT '{}',
  spotify_playlists TEXT[] DEFAULT '{}',
  spotify_analyzed BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'manual',
  tracks_data JSONB DEFAULT '[]'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_guest_event UNIQUE(event_code, guest_id)
);

-- Create index on event_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_guest_preferences_event_code ON guest_preferences(event_code);

-- Create event_songs table to store aggregated top songs
CREATE TABLE IF NOT EXISTS event_songs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_code TEXT NOT NULL REFERENCES events(code) ON DELETE CASCADE,
  spotify_track_id TEXT,
  track_name TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  popularity INTEGER DEFAULT 0,
  frequency INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_event_track UNIQUE(event_code, spotify_track_id, track_name, artist_name)
);

-- Create index on event_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_songs_event_code ON event_songs(event_code);
CREATE INDEX IF NOT EXISTS idx_event_songs_frequency ON event_songs(event_code, frequency DESC);

-- Function to increment song frequency
CREATE OR REPLACE FUNCTION increment_song_frequency(
  p_event_code TEXT,
  p_track_id TEXT,
  p_track_name TEXT,
  p_artist_name TEXT
) RETURNS void AS $$
BEGIN
  UPDATE event_songs
  SET frequency = frequency + 1
  WHERE event_code = p_event_code
    AND spotify_track_id = p_track_id
    AND track_name = p_track_name
    AND artist_name = p_artist_name;
END;
$$ LANGUAGE plpgsql;

