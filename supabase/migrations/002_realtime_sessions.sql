-- Create event_sessions table to track active sessions
CREATE TABLE IF NOT EXISTS event_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code TEXT NOT NULL REFERENCES events(code) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('host', 'dj', 'guest')),
  user_id TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_event_session UNIQUE(event_code, user_id, session_type)
);

-- Create index on event_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_event_sessions_event_code ON event_sessions(event_code);
CREATE INDEX IF NOT EXISTS idx_event_sessions_active ON event_sessions(event_code, is_active) WHERE is_active = TRUE;

-- Enable Row Level Security (RLS) for event_sessions
ALTER TABLE event_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read sessions (for realtime subscriptions)
CREATE POLICY "Allow public read access to event_sessions"
  ON event_sessions FOR SELECT
  USING (true);

-- Create policy to allow inserts (for session creation)
CREATE POLICY "Allow public insert access to event_sessions"
  ON event_sessions FOR INSERT
  WITH CHECK (true);

-- Create policy to allow updates (for session activity)
CREATE POLICY "Allow public update access to event_sessions"
  ON event_sessions FOR UPDATE
  USING (true);

-- Enable Realtime for event_sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE event_sessions;

-- Enable Realtime for guest_preferences table (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE guest_preferences;

-- Enable Realtime for event_songs table (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE event_songs;

-- Enable Realtime for events table (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE events;

-- Function to update session last_activity timestamp
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update session activity on updates
CREATE TRIGGER update_event_sessions_activity
  BEFORE UPDATE ON event_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_session_activity();

-- Function to clean up inactive sessions older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_inactive_sessions()
RETURNS void AS $$
BEGIN
  UPDATE event_sessions
  SET is_active = FALSE
  WHERE last_activity < NOW() - INTERVAL '1 hour'
    AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

