-- Song request system tables migration
-- PostgreSQL/Supabase compatible schema

-- Create song_requests table to store guest song requests
CREATE TABLE IF NOT EXISTS song_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_code TEXT NOT NULL REFERENCES events(code) ON DELETE CASCADE,
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
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  played_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  CONSTRAINT unique_request_per_guest UNIQUE(event_code, guest_id, spotify_track_id, track_name, artist_name)
);

-- Create indexes for song_requests
CREATE INDEX IF NOT EXISTS idx_song_requests_event_code ON song_requests(event_code);
CREATE INDEX IF NOT EXISTS idx_song_requests_status ON song_requests(event_code, status);
CREATE INDEX IF NOT EXISTS idx_song_requests_votes ON song_requests(event_code, vote_count DESC, downvote_count ASC);
CREATE INDEX IF NOT EXISTS idx_song_requests_submitted ON song_requests(event_code, submitted_at DESC);

-- Create request_votes table to track upvotes/downvotes
CREATE TABLE IF NOT EXISTS request_votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  request_id TEXT NOT NULL REFERENCES song_requests(id) ON DELETE CASCADE,
  guest_id TEXT NOT NULL,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_vote_per_guest UNIQUE(request_id, guest_id)
);

-- Create indexes for request_votes
CREATE INDEX IF NOT EXISTS idx_request_votes_request_id ON request_votes(request_id);
CREATE INDEX IF NOT EXISTS idx_request_votes_guest_id ON request_votes(guest_id);

-- Create request_settings table for event-level request configuration
CREATE TABLE IF NOT EXISTS request_settings (
  event_code TEXT PRIMARY KEY REFERENCES events(code) ON DELETE CASCADE,
  requests_enabled BOOLEAN DEFAULT TRUE,
  voting_enabled BOOLEAN DEFAULT TRUE,
  paid_requests_enabled BOOLEAN DEFAULT FALSE,
  genre_restrictions TEXT[] DEFAULT '{}',
  artist_restrictions TEXT[] DEFAULT '{}',
  open_time TIMESTAMP WITH TIME ZONE,
  close_time TIMESTAMP WITH TIME ZONE,
  min_vote_threshold INTEGER DEFAULT 0,
  max_requests_per_guest INTEGER DEFAULT 10,
  auto_accept_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create request_analytics table for tracking metrics
CREATE TABLE IF NOT EXISTS request_analytics (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_code TEXT NOT NULL REFERENCES events(code) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for request_analytics
CREATE INDEX IF NOT EXISTS idx_request_analytics_event_code ON request_analytics(event_code);
CREATE INDEX IF NOT EXISTS idx_request_analytics_metric ON request_analytics(event_code, metric_name, timestamp DESC);




