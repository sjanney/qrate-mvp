#!/usr/bin/env node
// Local Node.js server for development
// Uses SQLite database instead of Supabase

// Load environment variables from .env file if it exists
require('dotenv').config();

const express = require('express');
const https = require('https');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;

// Database setup
const DB_DIR = path.join(__dirname, '..', 'database');
const DB_PATH = path.join(DB_DIR, 'synergy.db');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database
let db;
try {
  db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  console.log('Connected to SQLite database:', DB_PATH);
} catch (error) {
  console.error('Failed to connect to database:', error);
  process.exit(1);
}

// Initialize database schema
function initializeDatabase() {
  const initSqlPath = path.join(__dirname, '..', 'database', 'init.sql');
  
  try {
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    // Split by semicolons and execute each statement
    const statements = initSql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      try {
        db.exec(statement.trim());
      } catch (error) {
        // Ignore "table already exists" errors
        if (!error.message.includes('already exists')) {
          console.log(`Schema init warning: ${error.message}`);
        }
      }
    }
    
    console.log('✅ Database schema initialized');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize database schema:', error.message);
    return false;
  }
}

// Helper function to verify database schema
function verifyDatabaseSchema() {
  const requiredTables = [
    'events', 
    'guest_preferences', 
    'event_songs', 
    'event_sessions',
    'song_requests',
    'request_votes',
    'request_settings',
    'request_analytics'
  ];
  const missingTables = [];
  
  for (const table of requiredTables) {
    try {
      const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
      if (!result) {
        missingTables.push(table);
      }
    } catch (error) {
      console.error(`Error checking table ${table}:`, error.message);
      missingTables.push(table);
    }
  }
  
  if (missingTables.length > 0) {
    console.log('⚠️  Missing database tables:', missingTables.join(', '));
    console.log('💡 Initializing database schema...');
    return initializeDatabase();
  }
  
  console.log('✅ Database schema verified - all required tables exist');
  return true;
}

// Verify and initialize schema on startup
if (!verifyDatabaseSchema()) {
  console.error('Server cannot start without a properly initialized database.');
  process.exit(1);
}

// Simple in-memory KV store for fallback
const kvStore = new Map();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing middleware - must come before request logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Request body keys:', Object.keys(req.body));
  }
  next();
});

// Helper function to generate event code
function generateEventCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper function for consistent error responses
function sendError(res, statusCode, error, details = null, hint = null) {
  const errorResponse = {
    error,
    ...(details && { details }),
    ...(hint && { hint })
  };
  return res.status(statusCode).json(errorResponse);
}

// Helper function to create/update session
function upsertSession(eventCode, sessionType, userId = 'anonymous') {
  try {
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO event_sessions (event_code, session_type, user_id, is_active, last_activity, updated_at)
      VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(event_code, user_id, session_type) 
      DO UPDATE SET is_active = 1, last_activity = ?, updated_at = ?
    `).run(eventCode, sessionType, userId, now, now, now, now);
  } catch (error) {
    console.log(`Session tracking error (non-critical): ${error.message}`);
  }
}

// Create a new event
app.post('/make-server-6d46752d/events', async (req, res) => {
  try {
    const { name, theme, description, date, time, location, code } = req.body;
    console.log(`Creating event: ${name}, theme: ${theme}`);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    // Validate required fields
    if (!name || !theme) {
      return sendError(res, 400, 'Event name and theme are required', null, 'Please provide both event name and theme');
    }
    
    // Validate that name and theme are strings (not empty after trim)
    if (typeof name !== 'string' || !name.trim()) {
      return sendError(res, 400, 'Event name must be a non-empty string', null, 'Please provide a valid event name');
    }
    
    if (typeof theme !== 'string' || !theme.trim()) {
      return sendError(res, 400, 'Event theme must be a non-empty string', null, 'Please select a valid theme');
    }

    // Generate unique event code, prefer provided code when available
    let eventCode = (code ? String(code).toUpperCase() : generateEventCode());
    let attempts = 0;
    const maxAttempts = 10;
    
    // Ensure code is unique
    try {
      while (attempts < maxAttempts) {
        const existing = db.prepare('SELECT * FROM events WHERE code = ?').get(eventCode);
        if (!existing) break;
        if (code) {
          // If caller requested a specific code that exists, return existing event as success
          console.log(`Requested code already exists, returning existing event: ${eventCode}`);
          return res.json({
            success: true,
            event: {
              ...existing,
              createdAt: existing.created_at,
              isActive: existing.is_active === 1
            }
          });
        }
        eventCode = generateEventCode();
        attempts++;
      }
    } catch (dbCheckError) {
      console.error('Error checking for existing event code:', dbCheckError);
      // Continue anyway - the insert will fail if there's a duplicate
    }
    
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    const now = new Date().toISOString();
    
    // Ensure we have valid date and time
    const eventDate = date || new Date().toISOString().split('T')[0];
    const eventTime = time || new Date().toTimeString().slice(0, 5);
    
    const eventData = {
      id: eventId,
      name: name.trim(),
      theme: theme.trim(),
      description: description?.trim() || '',
      code: eventCode,
      date: eventDate,
      time: eventTime,
      location: location?.trim() || null,
      is_active: 1,
      created_at: now,
      updated_at: now
    };

    console.log(`Storing event with code: ${eventCode}`);
    console.log('Event data:', JSON.stringify(eventData, null, 2));
    
    // Save to SQLite with better error handling
    try {
      const stmt = db.prepare(`
        INSERT INTO events (id, name, theme, description, code, date, time, location, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const result = stmt.run(
        eventData.id, 
        eventData.name, 
        eventData.theme, 
        eventData.description, 
        eventData.code,
        eventData.date, 
        eventData.time, 
        eventData.location, 
        eventData.is_active, 
        eventData.created_at, 
        eventData.updated_at
      );
      
      console.log(`Successfully stored event in SQLite: ${eventCode}`);
      console.log('Insert result:', result);
      
      // Verify the event was actually inserted
      const verifyEvent = db.prepare('SELECT * FROM events WHERE code = ?').get(eventCode);
      if (!verifyEvent) {
        throw new Error('Event was not inserted - verification query returned empty');
      }
      
      // Also store in KV as backup
      kvStore.set(`event:${eventCode}`, {
        ...eventData,
        createdAt: eventData.created_at,
        isActive: eventData.is_active === 1
      });
      
      return res.json({ 
        success: true, 
        event: {
          ...eventData,
          createdAt: eventData.created_at,
          isActive: eventData.is_active === 1
        }
      });
    } catch (dbError) {
      console.error(`SQLite error details:`, dbError);
      console.error(`Error name: ${dbError.name}`);
      console.error(`Error message: ${dbError.message}`);
      console.error(`Error code: ${dbError.code}`);
      console.error(`Error stack: ${dbError.stack}`);
      
      // Check for common database errors
      if (dbError.message.includes('UNIQUE constraint')) {
        return sendError(res, 409, 'Event code already exists', dbError.message, 'Please try again - a new code will be generated');
      }
      if (dbError.message.includes('no such table')) {
        return sendError(res, 500, 'Database not initialized', dbError.message, 'Run "npm run init-db" to initialize the database');
      }
      if (dbError.message.includes('FOREIGN KEY constraint')) {
        return sendError(res, 500, 'Database constraint violation', dbError.message, 'Check database integrity');
      }
      
      return sendError(res, 500, 'Failed to create event', dbError.message, 'Check if database is initialized with npm run init-db');
    }
  } catch (error) {
    console.error(`Error creating event: ${error.message}`);
    console.error(`Error stack: ${error.stack}`);
    return sendError(res, 500, 'Failed to create event', error.message);
  }
});

// Get event by code
app.get('/make-server-6d46752d/events/:code', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const sessionType = req.query.session_type || 'guest';
    const userId = req.query.user_id || 'anonymous';
    
    console.log(`Looking up event with code: ${code}`);
    
    // Track session
    upsertSession(code, sessionType, userId);
    
    // Try to get from SQLite
    let event = null;
    try {
      const eventData = db.prepare('SELECT * FROM events WHERE code = ?').get(code);
      if (eventData) {
        event = {
          ...eventData,
          createdAt: eventData.created_at,
          isActive: eventData.is_active === 1
        };
        console.log(`Found event in SQLite: ${code}`);
      }
    } catch (dbError) {
      console.log(`SQLite lookup error: ${dbError.message}`);
    }
    
    // Fallback to KV store
    if (!event) {
      event = kvStore.get(`event:${code}`);
      console.log(`Found event in KV:`, event ? 'yes' : 'no');
    }
    
    if (!event) {
      console.log(`Event not found for code: ${code}`);
      return sendError(res, 404, 'Event not found', `No event found with code: ${code}`, 'Verify the event code is correct');
    }

    // Get all preferences for this event
    let preferences = [];
    
    try {
      const prefData = db.prepare('SELECT * FROM guest_preferences WHERE event_code = ?').all(code);
      if (prefData) {
        preferences = prefData.map((p) => ({
          userId: p.guest_id,
          artists: JSON.parse(p.artists || '[]'),
          genres: JSON.parse(p.genres || '[]'),
          recentTracks: JSON.parse(p.recent_tracks || '[]'),
          spotifyPlaylists: JSON.parse(p.spotify_playlists || '[]'),
          tracksData: JSON.parse(p.tracks_data || '[]'),
          stats: JSON.parse(p.stats || '{}'),
          source: p.source || 'manual',
          submittedAt: p.submitted_at
        }));
        console.log(`Found ${preferences.length} preferences in SQLite`);
      }
    } catch (prefError) {
      console.log(`SQLite preferences lookup error: ${prefError.message}`);
    }
    
    return res.json({ 
      success: true, 
      event: {
        ...event,
        preferences: preferences || []
      }
    });
  } catch (error) {
    console.log(`Error fetching event: ${error.message}`);
    return sendError(res, 500, 'Failed to fetch event', error.message);
  }
});

// Submit guest preferences
app.post('/make-server-6d46752d/events/:code/preferences', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const preferences = req.body;
    const guestId = preferences.guestId || `guest_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    
    console.log(`Submitting preferences for event: ${code}`);
    
    // Track guest session
    upsertSession(code, 'guest', guestId);
    
    // Verify event exists
    try {
      const event = db.prepare('SELECT code FROM events WHERE code = ?').get(code);
      if (!event) {
        if (!kvStore.has(`event:${code}`)) {
          console.log(`Event not found for code: ${code}`);
          return sendError(res, 404, 'Event not found', `No event found with code: ${code}`, 'Verify the event code is correct');
        }
      }
    } catch (dbError) {
      if (!kvStore.has(`event:${code}`)) {
        console.log(`Event not found for code: ${code}`);
        return res.status(404).json({ error: 'Event not found' });
      }
    }
    
    // Process Spotify playlist data if provided
    const tracksData = preferences.tracksData || preferences.tracks || [];
    const stats = preferences.stats || {};
    const now = new Date().toISOString();
    
    const guestPreferences = {
      event_code: code,
      guest_id: guestId,
      artists: JSON.stringify(preferences.artists || []),
      genres: JSON.stringify(preferences.genres || []),
      recent_tracks: JSON.stringify(preferences.recentTracks || []),
      spotify_playlists: JSON.stringify(preferences.spotifyPlaylists || []),
      spotify_analyzed: preferences.spotifyAnalyzed || (preferences.source === 'spotify') ? 1 : 0,
      source: preferences.source || 'manual',
      tracks_data: JSON.stringify(tracksData),
      stats: JSON.stringify(stats),
      submitted_at: now
    };

    // Save to SQLite
    try {
      db.prepare(`
        INSERT INTO guest_preferences (event_code, guest_id, artists, genres, recent_tracks, spotify_playlists, spotify_analyzed, source, tracks_data, stats, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(event_code, guest_id) 
        DO UPDATE SET 
          artists = excluded.artists,
          genres = excluded.genres,
          recent_tracks = excluded.recent_tracks,
          spotify_playlists = excluded.spotify_playlists,
          spotify_analyzed = excluded.spotify_analyzed,
          source = excluded.source,
          tracks_data = excluded.tracks_data,
          stats = excluded.stats,
          submitted_at = excluded.submitted_at
      `).run(
        guestPreferences.event_code, guestPreferences.guest_id, guestPreferences.artists,
        guestPreferences.genres, guestPreferences.recent_tracks, guestPreferences.spotify_playlists,
        guestPreferences.spotify_analyzed, guestPreferences.source, guestPreferences.tracks_data,
        guestPreferences.stats, guestPreferences.submitted_at
      );
      
      console.log(`Stored preferences in SQLite for event ${code}, guest ${guestId}`);
      
      // Store tracks in event_songs table for aggregation
      if (tracksData && tracksData.length > 0) {
        for (const track of tracksData) {
          const trackId = track.id;
          const trackName = track.name;
          const artistName = Array.isArray(track.artists) ? track.artists[0] : (track.artists || 'Unknown Artist');
          const albumName = track.album || null;
          const popularity = track.popularity || 0;
          
          // Check if song already exists
          const existingSong = db.prepare(
            'SELECT frequency FROM event_songs WHERE event_code = ? AND spotify_track_id = ? AND track_name = ? AND artist_name = ?'
          ).get(code, trackId, trackName, artistName);
          
          if (existingSong) {
            // Increment frequency
            db.prepare(
              'UPDATE event_songs SET frequency = frequency + 1 WHERE event_code = ? AND spotify_track_id = ? AND track_name = ? AND artist_name = ?'
            ).run(code, trackId, trackName, artistName);
          } else {
            // Insert new song
            db.prepare(
              'INSERT INTO event_songs (event_code, spotify_track_id, track_name, artist_name, album_name, popularity, frequency) VALUES (?, ?, ?, ?, ?, ?, 1)'
            ).run(code, trackId, trackName, artistName, albumName, popularity);
          }
        }
      }
      
      // Also store in KV as backup
      kvStore.set(`preferences:${code}:${guestId}`, {
        ...guestPreferences,
        guestId,
        eventCode: code,
        submittedAt: now
      });
      
      return res.json({ success: true, guestId });
    } catch (dbError) {
      console.log(`SQLite error: ${dbError.message}`);
      return sendError(res, 500, 'Failed to save preferences', dbError.message, 'Check database connection');
    }
  } catch (error) {
    console.log(`Error submitting preferences: ${error.message}`);
    return sendError(res, 500, 'Failed to submit preferences', error.message);
  }
});

// Get crowd insights for an event
app.get('/make-server-6d46752d/events/:code/insights', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    console.log(`Getting insights for event: ${code}`);
    
    // Get all preferences for this event
    let preferences = [];
    
    try {
      const prefData = db.prepare('SELECT * FROM guest_preferences WHERE event_code = ? AND source = ?').all(code, 'spotify');
      if (prefData) {
        preferences = prefData.map((p) => ({
          userId: p.guest_id,
          artists: JSON.parse(p.artists || '[]'),
          genres: JSON.parse(p.genres || '[]'),
          recentTracks: JSON.parse(p.recent_tracks || '[]'),
          spotifyPlaylists: JSON.parse(p.spotify_playlists || '[]'),
          tracksData: JSON.parse(p.tracks_data || '[]'),
          stats: JSON.parse(p.stats || '{}'),
          source: p.source || 'spotify',
          submittedAt: p.submitted_at
        }));
      }
    } catch (prefError) {
      console.log(`SQLite preferences lookup error: ${prefError.message}`);
    }
    
    console.log(`Found ${preferences?.length || 0} preferences for event ${code}`);
    
    if (!preferences || preferences.length === 0) {
      return res.json({
        success: true,
        insights: {
          totalGuests: 0,
          topGenres: [],
          topArtists: [],
          recommendations: []
        }
      });
    }

    // Analyze preferences
    const genreCounts = {};
    const artistCounts = {};
    
    preferences.forEach((pref) => {
      if (pref.genres) {
        pref.genres.forEach((genre) => {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });
      }
      
      if (pref.artists) {
        pref.artists.forEach((artist) => {
          artistCounts[artist] = (artistCounts[artist] || 0) + 1;
        });
      }
    });

    // Sort and get top items
    const topGenres = Object.entries(genreCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([genre, count]) => ({
        name: genre,
        count,
        percentage: Math.round((count / preferences.length) * 100)
      }));

    const topArtists = Object.entries(artistCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([artist, count]) => ({ name: artist, count }));

    // Mock analysis function (same as in best-next endpoint)
    const analyzeTrack = (trackName, artistName) => {
      const hash = Math.abs((trackName + artistName).split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0));
      const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const bpm = 60 + (hash % 120);
      const energy = Math.min(100, 30 + (bpm - 60) / 2 + (hash % 30));
      return {
        bpm: Math.min(180, Math.max(60, bpm)),
        key: keys[hash % keys.length],
        energy: Math.min(100, Math.max(0, energy)),
        danceability: Math.min(100, Math.max(0, energy * 0.8 + (hash % 20)))
      };
    };

    // Get top songs from SQLite
    let recommendations = [];
    
    try {
      const songs = db.prepare(
        'SELECT * FROM event_songs WHERE event_code = ? ORDER BY frequency DESC'
      ).all(code);
      
      if (songs && songs.length > 0) {
        recommendations = songs.map((song) => {
          const analysis = analyzeTrack(song.track_name, song.artist_name);
          return {
            id: song.spotify_track_id,
            title: song.track_name,
            artist: song.artist_name,
            album: song.album_name || '',
            duration: '0:00',
            matchScore: Math.min(song.frequency * 10, 100),
            match_score: Math.min(song.frequency * 10, 100),
            reasons: [
              `Appeared ${song.frequency} time${song.frequency > 1 ? 's' : ''} in guest playlists`,
              'Top crowd favorite',
              song.popularity > 70 ? 'High popularity track' : 'Crowd-selected'
            ],
            energy: analysis.energy,
            danceability: analysis.danceability,
            bpm: analysis.bpm,
            key: analysis.key,
            source: 'spotify',
            spotify_track_id: song.spotify_track_id,
            preview_url: null, // SQLite doesn't store preview URLs
            analysis: analysis
          };
        });
      }
    } catch (dbError) {
      console.log(`SQLite top songs lookup error: ${dbError.message}`);
    }

    return res.json({
      success: true,
      insights: {
        totalGuests: preferences.length,
        topGenres,
        topArtists,
        recommendations
      }
    });
  } catch (error) {
    console.log(`Error generating insights: ${error.message}`);
    return sendError(res, 500, 'Failed to generate insights', error.message);
  }
});

// Get top 15 songs from guest preferences
app.get('/make-server-6d46752d/events/:code/top-songs', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    console.log(`Getting top songs for event: ${code}`);
    
    // Try to get from SQLite
    try {
      const songs = db.prepare(
        'SELECT * FROM event_songs WHERE event_code = ? ORDER BY frequency DESC'
      ).all(code);
      
      if (songs && songs.length > 0) {
        const topSongs = songs.map((song) => ({
          id: song.spotify_track_id,
          title: song.track_name,
          artist: song.artist_name,
          album: song.album_name || '',
          frequency: song.frequency,
          popularity: song.popularity || 0,
          spotifyTrackId: song.spotify_track_id,
          preview_url: null // SQLite doesn't store preview URLs
        }));
        
        console.log(`Found ${topSongs.length} top songs from SQLite`);
        return res.json({ success: true, songs: topSongs });
      }
    } catch (dbError) {
      console.log(`SQLite top songs lookup error: ${dbError.message}`);
    }
    
    return res.json({ success: true, songs: [] });
  } catch (error) {
    console.log(`Error getting top songs: ${error.message}`);
    return sendError(res, 500, 'Failed to get top songs', error.message);
  }
});

// ============================================================================
// Spotify Endpoints
// ============================================================================

// Spotify authentication route (for guests)
app.get('/make-server-6d46752d/spotify/auth', async (req, res) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) {
      console.log('Spotify client ID not configured');
      return sendError(res, 500, 'Spotify integration not configured', null, 'Set SPOTIFY_CLIENT_ID in .env file');
    }

    const scopes = 'user-read-private playlist-read-private playlist-read-collaborative user-follow-read';
    const redirectUri = process.env.SPOTIFY_GUEST_REDIRECT_URI || 'https://127.0.0.1:3000/guest';
    const state = Math.random().toString(36).substring(7);
    
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    console.log('🎵 Generated Spotify auth URL for GUEST');
    console.log(`   Redirect URI: ${redirectUri}`);
    console.log(`   ⚠️  Make sure this EXACT URI is in your Spotify app settings!`);
    console.log(`   Dashboard: https://developer.spotify.com/dashboard`);
    return res.json({ success: true, auth_url: authUrl });
  } catch (error) {
    console.log(`Error generating Spotify auth URL: ${error.message}`);
    return sendError(res, 500, 'Failed to generate auth URL', error.message);
  }
});

// Spotify callback route (for guests)
app.post('/make-server-6d46752d/spotify/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.log('Spotify credentials not configured');
      return sendError(res, 500, 'Spotify integration not configured', null, 'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env file');
    }

    const redirectUri = process.env.SPOTIFY_GUEST_REDIRECT_URI || 'https://127.0.0.1:3000/guest';
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.log(`Spotify token exchange failed: ${error}`);
      return sendError(res, 400, 'Failed to exchange code for token', error);
    }

    const tokenData = await tokenResponse.json();
    console.log('Successfully exchanged code for Spotify access token');
    
    return res.json({ 
      success: true, 
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });
  } catch (error) {
    console.log(`Error in Spotify callback: ${error.message}`);
    return sendError(res, 500, 'Failed to process Spotify callback', error.message);
  }
});

// Get Spotify playlists
app.post('/make-server-6d46752d/spotify/playlists', async (req, res) => {
  try {
    const { access_token } = req.body;
    
    if (!access_token) {
      return sendError(res, 400, 'Access token required');
    }

    // Get user's playlists
    const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!playlistsResponse.ok) {
      const error = await playlistsResponse.text();
      console.log(`Spotify playlists fetch failed: ${error}`);
      return sendError(res, 400, 'Failed to fetch playlists', error);
    }

    const playlistsData = await playlistsResponse.json();
    console.log(`Fetched ${playlistsData.items?.length || 0} Spotify playlists`);

    // Filter and format playlists
    const playlists = playlistsData.items?.map((playlist) => ({
      id: playlist.id,
      name: playlist.name,
      tracks: { total: playlist.tracks.total },
      images: playlist.images || [],
      description: playlist.description
    })) || [];

    return res.json({ success: true, playlists });
  } catch (error) {
    console.log(`Error fetching Spotify playlists: ${error.message}`);
    return sendError(res, 500, 'Failed to fetch playlists', error.message);
  }
});

// Get tracks from Spotify playlists (for preference analysis)
app.post('/make-server-6d46752d/spotify/playlist-tracks', async (req, res) => {
  try {
    const { access_token, playlist_ids } = req.body;
    
    if (!access_token || !playlist_ids || !Array.isArray(playlist_ids)) {
      return sendError(res, 400, 'Access token and playlist IDs required');
    }

    const allTracks = [];
    const allArtists = new Set();
    const allGenres = new Set();

    for (const playlistId of playlist_ids) {
      try {
        // Get playlist tracks
        const tracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
          headers: {
            'Authorization': `Bearer ${access_token}`
          }
        });

        if (tracksResponse.ok) {
          const tracksData = await tracksResponse.json();
          
          for (const item of tracksData.items || []) {
            if (item.track && item.track.artists) {
              allTracks.push({
                id: item.track.id,
                name: item.track.name,
                artists: item.track.artists.map((artist) => artist.name),
                album: item.track.album?.name,
                popularity: item.track.popularity,
                preview_url: item.track.preview_url
              });

              // Collect artist names
              item.track.artists.forEach((artist) => {
                allArtists.add(artist.name);
              });
            }
          }
        }
      } catch (error) {
        console.log(`Error fetching tracks for playlist ${playlistId}: ${error.message}`);
        // Continue with other playlists
      }
    }

    console.log(`Analyzed ${allTracks.length} tracks from ${playlist_ids.length} playlists`);

    return res.json({ 
      success: true, 
      tracks: allTracks,
      artists: Array.from(allArtists),
      genres: Array.from(allGenres) // Would need Spotify API audio features for real genres
    });
  } catch (error) {
    console.log(`Error analyzing playlist tracks: ${error.message}`);
    return sendError(res, 500, 'Failed to analyze playlist tracks', error.message);
  }
});

// DJ Spotify authentication route
app.get('/make-server-6d46752d/spotify/dj/auth', async (req, res) => {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    if (!clientId) {
      console.log('Spotify client ID not configured');
      return sendError(res, 500, 'Spotify integration not configured', null, 'Set SPOTIFY_CLIENT_ID in .env file');
    }

    const scopes = 'user-read-private playlist-modify-public playlist-modify-private';
    const redirectUri = process.env.SPOTIFY_DJ_REDIRECT_URI || 'https://127.0.0.1:3000/dj/spotify/callback';
    const state = Math.random().toString(36).substring(7);
    
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `response_type=code&` +
      `client_id=${clientId}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${state}`;

    console.log('🎵 Generated Spotify auth URL for DJ');
    console.log(`   Redirect URI: ${redirectUri}`);
    console.log(`   ⚠️  Make sure this EXACT URI is in your Spotify app settings!`);
    console.log(`   Dashboard: https://developer.spotify.com/dashboard`);
    return res.json({ success: true, auth_url: authUrl });
  } catch (error) {
    console.log(`Error generating DJ Spotify auth URL: ${error.message}`);
    return sendError(res, 500, 'Failed to generate auth URL', error.message);
  }
});

// DJ Spotify callback route
app.post('/make-server-6d46752d/spotify/dj/callback', async (req, res) => {
  try {
    const { code } = req.body;
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.log('Spotify credentials not configured');
      return sendError(res, 500, 'Spotify integration not configured', null, 'Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env file');
    }

    const redirectUri = process.env.SPOTIFY_DJ_REDIRECT_URI || 'https://127.0.0.1:3000/dj/spotify/callback';
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.log(`Spotify token exchange failed: ${error}`);
      return sendError(res, 400, 'Failed to exchange code for token', error);
    }

    const tokenData = await tokenResponse.json();
    console.log('Successfully exchanged code for DJ Spotify access token');
    
    return res.json({ 
      success: true, 
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in
    });
  } catch (error) {
    console.log(`Error in DJ Spotify callback: ${error.message}`);
    return sendError(res, 500, 'Failed to process Spotify callback', error.message);
  }
});

// Create Spotify playlist with top songs
app.post('/make-server-6d46752d/spotify/create-playlist', async (req, res) => {
  try {
    const { access_token, event_code, playlist_name } = req.body;
    
    if (!access_token || !event_code) {
      return sendError(res, 400, 'Access token and event code required');
    }

    // Get user's Spotify ID
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (!userResponse.ok) {
      return sendError(res, 400, 'Failed to get Spotify user info');
    }

    const userData = await userResponse.json();
    const userId = userData.id;

    // Create playlist
    const playlistName = playlist_name || `Synergy Event ${event_code} - Top Songs`;
    const createPlaylistResponse = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: playlistName,
        description: `Top songs from ${event_code} event guests`,
        public: true
      })
    });

    if (!createPlaylistResponse.ok) {
      const error = await createPlaylistResponse.text();
      console.log(`Failed to create playlist: ${error}`);
      return sendError(res, 400, 'Failed to create playlist', error);
    }

    const playlistData = await createPlaylistResponse.json();
    const playlistId = playlistData.id;

    // Get top songs for the event
    let topSongs = [];
    
    try {
      const songs = db.prepare(
        'SELECT spotify_track_id FROM event_songs WHERE event_code = ? ORDER BY frequency DESC'
      ).all(event_code.toUpperCase());
      
      if (songs && songs.length > 0) {
        topSongs = songs.map(s => s.spotify_track_id).filter(Boolean);
      }
    } catch (dbError) {
      console.log(`Error fetching top songs from SQLite: ${dbError.message}`);
    }
    
    // Fallback: Get from API endpoint if SQLite not available
    if (topSongs.length === 0) {
      try {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const topSongsResponse = await fetch(`${baseUrl}/make-server-6d46752d/events/${event_code}/top-songs`, {
          headers: {
            'Authorization': req.headers.authorization || ''
          }
        });
        if (topSongsResponse.ok) {
          const data = await topSongsResponse.json();
          if (data.success && data.songs) {
            topSongs = data.songs.map((s) => s.spotifyTrackId || s.id).filter(Boolean);
          }
        }
      } catch (apiError) {
        console.log(`Error fetching top songs from API: ${apiError.message}`);
      }
    }

    if (topSongs.length === 0) {
      return sendError(res, 400, 'No songs found for this event');
    }

    // Add tracks to playlist (Spotify accepts up to 100 tracks per request)
    const trackUris = topSongs.map(id => `spotify:track:${id}`);
    
    // Split into chunks of 100
    for (let i = 0; i < trackUris.length; i += 100) {
      const chunk = trackUris.slice(i, i + 100);
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          uris: chunk
        })
      });

      if (!addTracksResponse.ok) {
        const error = await addTracksResponse.text();
        console.log(`Failed to add tracks to playlist: ${error}`);
        // Continue with other chunks even if one fails
      }
    }

    console.log(`Created playlist ${playlistId} with ${topSongs.length} tracks`);
    
    return res.json({ 
      success: true, 
      playlist: {
        id: playlistId,
        name: playlistName,
        url: playlistData.external_urls?.spotify,
        trackCount: topSongs.length
      }
    });
  } catch (error) {
    console.log(`Error creating Spotify playlist: ${error.message}`);
    return sendError(res, 500, 'Failed to create playlist', error.message);
  }
});

// Health check
app.get('/make-server-6d46752d/health', (req, res) => {
  return res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database health check
app.get('/make-server-6d46752d/health/db', (req, res) => {
  try {
    const requiredTables = ['events', 'guest_preferences', 'event_songs', 'event_sessions'];
    const tableStatus = {};
    let allTablesExist = true;
    
    for (const table of requiredTables) {
      try {
        const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table);
        tableStatus[table] = !!result;
        if (!result) allTablesExist = false;
      } catch (error) {
        tableStatus[table] = false;
        allTablesExist = false;
      }
    }
    
    if (allTablesExist) {
      return res.json({ 
        status: 'ok', 
        database: 'connected',
        tables: tableStatus,
        timestamp: new Date().toISOString() 
      });
    } else {
      return res.status(503).json({ 
        status: 'error', 
        database: 'connected',
        tables: tableStatus,
        error: 'Some required tables are missing',
        hint: 'Run "npm run init-db" to initialize the database schema'
      });
    }
  } catch (error) {
    return res.status(503).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message 
    });
  }
});

// ===== SONG REQUEST SYSTEM ENDPOINTS =====

// Get or create request settings for an event
app.get('/make-server-6d46752d/events/:code/request-settings', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    
    try {
      const settings = db.prepare('SELECT * FROM request_settings WHERE event_code = ?').get(code);
      if (settings) {
        return res.json({
          success: true,
          settings: {
            eventCode: settings.event_code,
            requestsEnabled: settings.requests_enabled === 1,
            votingEnabled: settings.voting_enabled === 1,
            paidRequestsEnabled: settings.paid_requests_enabled === 1,
            genreRestrictions: JSON.parse(settings.genre_restrictions || '[]'),
            artistRestrictions: JSON.parse(settings.artist_restrictions || '[]'),
            openTime: settings.open_time,
            closeTime: settings.close_time,
            minVoteThreshold: settings.min_vote_threshold || 0,
            maxRequestsPerGuest: settings.max_requests_per_guest || 10,
            autoAcceptThreshold: settings.auto_accept_threshold || 5,
            createdAt: settings.created_at,
            updatedAt: settings.updated_at
          }
        });
      }
    } catch (dbError) {
      console.log(`Database lookup error: ${dbError.message}`);
    }
    
    // Return defaults if not found
    return res.json({
      success: true,
      settings: {
        eventCode: code,
        requestsEnabled: true,
        votingEnabled: true,
        paidRequestsEnabled: false,
        genreRestrictions: [],
        artistRestrictions: [],
        openTime: null,
        closeTime: null,
        minVoteThreshold: 0,
        maxRequestsPerGuest: 10,
        autoAcceptThreshold: 5
      }
    });
  } catch (error) {
    console.log(`Error fetching request settings: ${error.message}`);
    return sendError(res, 500, 'Failed to fetch request settings', error.message);
  }
});

// Update request settings for an event
app.put('/make-server-6d46752d/events/:code/request-settings', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const updates = req.body;
    
    const now = new Date().toISOString();
    
    try {
      const existing = db.prepare('SELECT event_code FROM request_settings WHERE event_code = ?').get(code);
      
      if (existing) {
        db.prepare(
          `UPDATE request_settings SET
            requests_enabled = ?,
            voting_enabled = ?,
            paid_requests_enabled = ?,
            genre_restrictions = ?,
            artist_restrictions = ?,
            open_time = ?,
            close_time = ?,
            min_vote_threshold = ?,
            max_requests_per_guest = ?,
            auto_accept_threshold = ?,
            updated_at = ?
           WHERE event_code = ?`
        ).run(
          updates.requestsEnabled !== undefined ? (updates.requestsEnabled ? 1 : 0) : 1,
          updates.votingEnabled !== undefined ? (updates.votingEnabled ? 1 : 0) : 1,
          updates.paidRequestsEnabled !== undefined ? (updates.paidRequestsEnabled ? 1 : 0) : 0,
          JSON.stringify(updates.genreRestrictions || []),
          JSON.stringify(updates.artistRestrictions || []),
          updates.openTime || null,
          updates.closeTime || null,
          updates.minVoteThreshold || 0,
          updates.maxRequestsPerGuest || 10,
          updates.autoAcceptThreshold || 5,
          now,
          code
        );
      } else {
        db.prepare(
          `INSERT INTO request_settings (
            event_code, requests_enabled, voting_enabled, paid_requests_enabled,
            genre_restrictions, artist_restrictions, open_time, close_time,
            min_vote_threshold, max_requests_per_guest, auto_accept_threshold,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          code,
          updates.requestsEnabled !== undefined ? (updates.requestsEnabled ? 1 : 0) : 1,
          updates.votingEnabled !== undefined ? (updates.votingEnabled ? 1 : 0) : 1,
          updates.paidRequestsEnabled !== undefined ? (updates.paidRequestsEnabled ? 1 : 0) : 0,
          JSON.stringify(updates.genreRestrictions || []),
          JSON.stringify(updates.artistRestrictions || []),
          updates.openTime || null,
          updates.closeTime || null,
          updates.minVoteThreshold || 0,
          updates.maxRequestsPerGuest || 10,
          updates.autoAcceptThreshold || 5,
          now,
          now
        );
      }
      
      return res.json({ success: true });
    } catch (dbError) {
      console.log(`Database update error: ${dbError.message}`);
      return sendError(res, 500, 'Failed to update request settings', dbError.message);
    }
  } catch (error) {
    console.log(`Error updating request settings: ${error.message}`);
    return sendError(res, 500, 'Failed to update request settings', error.message);
  }
});

// Submit a song request
app.post('/make-server-6d46752d/events/:code/requests', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const requestData = req.body;
    
    const {
      guestId,
      spotifyTrackId,
      trackName,
      artistName,
      albumName,
      previewUrl,
      durationMs,
      requesterName,
      metadata
    } = requestData;
    
    if (!trackName || !artistName || !guestId) {
      return sendError(res, 400, 'Track name, artist name, and guest ID are required');
    }
    
    // Check if requests are enabled
    try {
      const settings = db.prepare('SELECT * FROM request_settings WHERE event_code = ?').get(code);
      if (settings && settings.requests_enabled === 0) {
        return sendError(res, 403, 'Requests are disabled for this event');
      }
      
      // Check max requests per guest
      if (settings) {
        const guestRequestCount = db.prepare(
          'SELECT COUNT(*) as count FROM song_requests WHERE event_code = ? AND guest_id = ?'
        ).get(code, guestId);
        const count = guestRequestCount?.count || 0;
        if (count >= (settings.max_requests_per_guest || 10)) {
          return sendError(res, 400, `Maximum ${settings.max_requests_per_guest || 10} requests per guest`);
        }
      }
    } catch (checkError) {
      console.log(`Settings check error: ${checkError.message}`);
    }
    
    // Check for duplicate
    try {
      const existing = db.prepare(
        'SELECT id FROM song_requests WHERE event_code = ? AND guest_id = ? AND LOWER(track_name) = LOWER(?) AND LOWER(artist_name) = LOWER(?)'
      ).get(code, guestId, trackName, artistName);
      if (existing) {
        return sendError(res, 400, 'You have already requested this song');
      }
    } catch (dupError) {
      console.log(`Duplicate check error: ${dupError.message}`);
    }
    
    // Mock AI track analysis
    const hashString = (str) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };
    
    const hash = hashString(`${trackName}${artistName}`);
    const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const genres = ['Pop', 'Rock', 'Hip-Hop', 'Electronic', 'R&B', 'Country', 'Jazz', 'Latin', 'Reggae', 'Blues'];
    
    // Generate mock analysis
    const bpm = 60 + (hash % 120) + (hash % 20);
    const normalizedBPM = Math.min(180, Math.max(60, bpm));
    const key = keys[hash % keys.length];
    const baseEnergy = Math.min(100, 30 + (normalizedBPM - 60) / 2 + (hash % 30));
    const energy = Math.min(100, Math.max(0, baseEnergy));
    const danceability = Math.min(100, Math.max(0, energy * 0.8 + (hash % 20)));
    const selectedGenres = [genres[hash % genres.length]];
    if (hash % 3 === 0 && genres[(hash + 7) % genres.length] !== selectedGenres[0]) {
      selectedGenres.push(genres[(hash + 7) % genres.length]);
    }
    
    const trackMetadata = {
      bpm: Math.round(normalizedBPM),
      key,
      energy: Math.round(energy),
      danceability: Math.round(danceability),
      genre: selectedGenres,
      ...(metadata || {})
    };
    
    const now = new Date().toISOString();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      db.prepare(
        `INSERT INTO song_requests (
          id, event_code, guest_id, spotify_track_id, track_name, artist_name,
          album_name, preview_url, duration_ms, status, vote_count, downvote_count,
          tip_amount, requester_name, submitted_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        requestId,
        code,
        guestId,
        spotifyTrackId || null,
        trackName,
        artistName,
        albumName || null,
        previewUrl || null,
        durationMs || null,
        'pending',
        0,
        0,
        0,
        requesterName || null,
        now,
        JSON.stringify(trackMetadata)
      );
      
      // Track analytics
      try {
        db.prepare(
          'INSERT INTO request_analytics (event_code, metric_name, metric_value, metadata) VALUES (?, ?, ?, ?)'
        ).run(code, 'request_submitted', 1, JSON.stringify({ guestId, trackName, artistName }));
      } catch (analyticsError) {
        console.log(`Analytics tracking error: ${analyticsError.message}`);
      }
      
      return res.json({
        success: true,
        request: {
          id: requestId,
          eventCode: code,
          guestId,
          spotifyTrackId,
          trackName,
          artistName,
          albumName,
          previewUrl,
          durationMs,
          status: 'pending',
          voteCount: 0,
          downvoteCount: 0,
          tipAmount: 0,
          requesterName,
          submittedAt: now,
          metadata: trackMetadata
        }
      });
    } catch (dbError) {
      console.log(`Database insert error: ${dbError.message}`);
      return sendError(res, 500, 'Failed to submit request', dbError.message);
    }
  } catch (error) {
    console.log(`Error submitting request: ${error.message}`);
    return sendError(res, 500, 'Failed to submit request', error.message);
  }
});

// Get all requests for an event
app.get('/make-server-6d46752d/events/:code/requests', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const status = req.query.status;
    const guestId = req.query.guestId; // Optional filter for guest's own requests
    
    let sql = 'SELECT * FROM song_requests WHERE event_code = ?';
    const params = [code];
    
    if (status && ['pending', 'accepted', 'rejected', 'played', 'queued'].includes(status)) {
      sql += ' AND status = ?';
      params.push(status);
    }
    
    if (guestId) {
      sql += ' AND guest_id = ?';
      params.push(guestId);
    }
    
    sql += ' ORDER BY vote_count DESC, downvote_count ASC, submitted_at ASC';
    
    try {
      const requests = db.prepare(sql).all(...params);
      
      const formattedRequests = requests.map((r) => ({
        id: r.id,
        eventCode: r.event_code,
        guestId: r.guest_id,
        spotifyTrackId: r.spotify_track_id,
        trackName: r.track_name,
        artistName: r.artist_name,
        albumName: r.album_name,
        previewUrl: r.preview_url,
        durationMs: r.duration_ms,
        status: r.status,
        voteCount: r.vote_count || 0,
        downvoteCount: r.downvote_count || 0,
        tipAmount: r.tip_amount || 0,
        requesterName: r.requester_name,
        submittedAt: r.submitted_at,
        playedAt: r.played_at,
        metadata: JSON.parse(r.metadata || '{}')
      }));
      
      return res.json({ success: true, requests: formattedRequests });
    } catch (dbError) {
      console.log(`Database query error: ${dbError.message}`);
      return res.json({ success: true, requests: [] });
    }
  } catch (error) {
    console.log(`Error fetching requests: ${error.message}`);
    return sendError(res, 500, 'Failed to fetch requests', error.message);
  }
});

// Update request status
app.put('/make-server-6d46752d/events/:code/requests/:id', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const requestId = req.params.id;
    const { status, metadata, tipAmount } = req.body;
    
    try {
      const now = new Date().toISOString();
      const updateFields = [];
      const updateParams = [];
      
      if (status && ['pending', 'accepted', 'rejected', 'played', 'queued'].includes(status)) {
        updateFields.push('status = ?');
        updateParams.push(status);
        
        if (status === 'played' && !req.query.played_at) {
          updateFields.push('played_at = ?');
          updateParams.push(now);
        }
      }
      
      if (metadata) {
        updateFields.push('metadata = ?');
        updateParams.push(JSON.stringify(metadata));
      }
      
      if (tipAmount !== undefined) {
        updateFields.push('tip_amount = ?');
        updateParams.push(tipAmount);
      }
      
      if (updateFields.length === 0) {
        return sendError(res, 400, 'No fields to update');
      }
      
      updateParams.push(requestId, code);
      
      db.prepare(
        `UPDATE song_requests SET ${updateFields.join(', ')} WHERE id = ? AND event_code = ?`
      ).run(...updateParams);
      
      // Track analytics
      try {
        db.prepare(
          'INSERT INTO request_analytics (event_code, metric_name, metric_value, metadata) VALUES (?, ?, ?, ?)'
        ).run(code, `request_${status}`, 1, JSON.stringify({ requestId }));
      } catch (analyticsError) {
        console.log(`Analytics tracking error: ${analyticsError.message}`);
      }
      
      return res.json({ success: true });
    } catch (dbError) {
      console.log(`Database update error: ${dbError.message}`);
      return sendError(res, 500, 'Failed to update request', dbError.message);
    }
  } catch (error) {
    console.log(`Error updating request: ${error.message}`);
    return sendError(res, 500, 'Failed to update request', error.message);
  }
});

// Vote on a request
app.post('/make-server-6d46752d/events/:code/requests/:id/vote', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const requestId = req.params.id;
    const { guestId, voteType } = req.body;
    
    if (!guestId || !voteType || !['upvote', 'downvote'].includes(voteType)) {
      return sendError(res, 400, 'Guest ID and vote type (upvote/downvote) are required');
    }
    
    // Check if voting is enabled
    try {
      const settings = db.prepare('SELECT voting_enabled FROM request_settings WHERE event_code = ?').get(code);
      if (settings && settings.voting_enabled === 0) {
        return sendError(res, 403, 'Voting is disabled for this event');
      }
    } catch (checkError) {
      console.log(`Settings check error: ${checkError.message}`);
    }
    
    try {
      const now = new Date().toISOString();
      const existingVote = db.prepare(
        'SELECT * FROM request_votes WHERE request_id = ? AND guest_id = ?'
      ).get(requestId, guestId);
      
      if (existingVote) {
        if (existingVote.vote_type !== voteType) {
          db.prepare('UPDATE request_votes SET vote_type = ? WHERE id = ?').run(voteType, existingVote.id);
          
          const currentRequest = db.prepare('SELECT vote_count, downvote_count FROM song_requests WHERE id = ?').get(requestId);
          if (currentRequest) {
            let newVoteCount = currentRequest.vote_count || 0;
            let newDownvoteCount = currentRequest.downvote_count || 0;
            
            if (existingVote.vote_type === 'upvote' && voteType === 'downvote') {
              newVoteCount = Math.max(0, newVoteCount - 1);
              newDownvoteCount += 1;
            } else if (existingVote.vote_type === 'downvote' && voteType === 'upvote') {
              newDownvoteCount = Math.max(0, newDownvoteCount - 1);
              newVoteCount += 1;
            }
            
            db.prepare('UPDATE song_requests SET vote_count = ?, downvote_count = ? WHERE id = ?')
              .run(newVoteCount, newDownvoteCount, requestId);
          }
        }
      } else {
        const voteId = `vote_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        db.prepare(
          'INSERT INTO request_votes (id, request_id, guest_id, vote_type, created_at) VALUES (?, ?, ?, ?, ?)'
        ).run(voteId, requestId, guestId, voteType, now);
        
        const currentRequest = db.prepare('SELECT vote_count, downvote_count FROM song_requests WHERE id = ?').get(requestId);
        if (currentRequest) {
          let newVoteCount = currentRequest.vote_count || 0;
          let newDownvoteCount = currentRequest.downvote_count || 0;
          
          if (voteType === 'upvote') {
            newVoteCount += 1;
          } else {
            newDownvoteCount += 1;
          }
          
          db.prepare('UPDATE song_requests SET vote_count = ?, downvote_count = ? WHERE id = ?')
            .run(newVoteCount, newDownvoteCount, requestId);
        }
      }
      
      const updatedRequest = db.prepare('SELECT * FROM song_requests WHERE id = ?').get(requestId);
      
      return res.json({
        success: true,
        request: updatedRequest ? {
          id: updatedRequest.id,
          voteCount: updatedRequest.vote_count || 0,
          downvoteCount: updatedRequest.downvote_count || 0
        } : null
      });
    } catch (dbError) {
      console.log(`Database vote error: ${dbError.message}`);
      return sendError(res, 500, 'Failed to process vote', dbError.message);
    }
  } catch (error) {
    console.log(`Error processing vote: ${error.message}`);
    return sendError(res, 500, 'Failed to process vote', error.message);
  }
});

// Get best next track recommendation from request pool
app.get('/make-server-6d46752d/events/:code/requests/best-next', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    const currentTrackId = req.query.current_track_id;
    const currentTrackTitle = req.query.current_track_title;
    const currentTrackArtist = req.query.current_track_artist;
    const currentBPM = req.query.current_bpm;
    const currentKey = req.query.current_key;
    
    // Get pending/accepted requests
    const requests = db.prepare(
      'SELECT * FROM song_requests WHERE event_code = ? AND status IN (?, ?) ORDER BY vote_count DESC'
    ).all(code, 'pending', 'accepted');
    
    if (requests.length === 0) {
      return res.json({ success: true, recommendation: null });
    }
    
    // Mock analysis function
    const analyzeTrack = (trackName, artistName) => {
      const hash = Math.abs((trackName + artistName).split('').reduce((h, c) => ((h << 5) - h) + c.charCodeAt(0), 0));
      const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const bpm = 60 + (hash % 120);
      const energy = Math.min(100, 30 + (bpm - 60) / 2 + (hash % 30));
      return {
        bpm: Math.min(180, Math.max(60, bpm)),
        key: keys[hash % keys.length],
        energy: Math.min(100, Math.max(0, energy)),
        danceability: Math.min(100, Math.max(0, energy * 0.8 + (hash % 20)))
      };
    };
    
    // If current track provided, analyze compatibility
    let currentAnalysis = null;
    if (currentTrackId) {
      const current = db.prepare(
        'SELECT track_name, artist_name, metadata FROM song_requests WHERE id = ?'
      ).get(currentTrackId);
      if (current && current.metadata) {
        try {
          currentAnalysis = JSON.parse(current.metadata);
        } catch {}
      }
    } else if (currentTrackTitle && currentTrackArtist) {
      // Analyze current track from title/artist if provided
      currentAnalysis = analyzeTrack(currentTrackTitle, currentTrackArtist);
      // Override with provided BPM/key if available
      if (currentBPM) {
        currentAnalysis.bpm = parseInt(currentBPM) || currentAnalysis.bpm;
      }
      if (currentKey) {
        currentAnalysis.key = currentKey;
      }
    }
    
    // Helper function to determine key compatibility
    const getKeyCompatibility = (key1, key2) => {
      if (!key1 || !key2) return false;
      // Check if same key
      if (key1 === key2) return true;
      // Check relative keys (simplified - adjacent keys are harmonic)
      const keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const index1 = keys.indexOf(key1);
      const index2 = keys.indexOf(key2);
      if (index1 === -1 || index2 === -1) return false;
      const diff = Math.min(Math.abs(index1 - index2), 12 - Math.abs(index1 - index2));
      return diff <= 2; // Adjacent keys are compatible
    };
    
    // Calculate compatibility scores with improved algorithm
    const scored = requests.map((r) => {
      const requestMetadata = JSON.parse(r.metadata || '{}');
      const reqAnalysis = analyzeTrack(r.track_name, r.artist_name);
      
      let compatibilityScore = 100;
      if (currentAnalysis) {
        const trackBPM = currentAnalysis.bpm || 120;
        const trackEnergy = currentAnalysis.energy || 75;
        const trackKey = currentAnalysis.key;
        
        // BPM score (0-40 points) - prefer ±5 BPM, acceptable ±15 BPM
        const bpmDiff = Math.abs(trackBPM - reqAnalysis.bpm);
        let bpmScore = 0;
        if (bpmDiff <= 5) bpmScore = 40;
        else if (bpmDiff <= 10) bpmScore = 35;
        else if (bpmDiff <= 15) bpmScore = 30;
        else if (bpmDiff <= 25) bpmScore = 25;
        else bpmScore = Math.max(0, 30 - (bpmDiff - 15));
        
        // Energy score (0-30 points) - prefer similar energy
        const energyDiff = Math.abs(trackEnergy - reqAnalysis.energy);
        let energyScore = 0;
        if (energyDiff <= 10) energyScore = 30;
        else if (energyDiff <= 20) energyScore = 25;
        else if (energyDiff <= 30) energyScore = 20;
        else energyScore = Math.max(0, 20 - (energyDiff - 20));
        
        // Key score (0-10 points) - bonus for harmonic key matching
        const keyScore = getKeyCompatibility(trackKey, reqAnalysis.key) ? 10 : 0;
        
        // Base compatibility (20 points)
        const baseScore = 20;
        
        compatibilityScore = bpmScore + energyScore + keyScore + baseScore;
      }
      
      const popularityBonus = Math.min(r.vote_count * 5, 15);
      const totalScore = compatibilityScore + popularityBonus;
      
      return {
        requestId: r.id,
        trackName: r.track_name,
        artistName: r.artist_name,
        compatibilityScore: Math.round(compatibilityScore),
        totalScore: Math.round(totalScore),
        voteCount: r.vote_count || 0,
        analysis: reqAnalysis,
        bpmDiff: currentAnalysis ? Math.abs((currentAnalysis.bpm || 120) - reqAnalysis.bpm) : 0,
        energyDiff: currentAnalysis ? reqAnalysis.energy - (currentAnalysis.energy || 75) : 0
      };
    });
    
    // Sort by total score
    scored.sort((a, b) => b.totalScore - a.totalScore);
    const best = scored[0];
    
    // Generate detailed reasons with BPM/energy info
    const reasons = [];
    if (best.compatibilityScore >= 90) reasons.push('Perfect musical match');
    else if (best.compatibilityScore >= 80) reasons.push('Excellent match');
    else if (best.compatibilityScore >= 70) reasons.push('Good match');
    
    if (best.voteCount > 0) reasons.push(`${best.voteCount} crowd votes`);
    
    if (currentAnalysis) {
      if (best.bpmDiff <= 5) reasons.push('BPM nearly identical');
      else if (best.bpmDiff <= 10) reasons.push('BPM close match');
      else if (best.bpmDiff <= 15) reasons.push('BPM within range');
      
      if (best.energyDiff > 10) reasons.push(`+${Math.round(best.energyDiff)}% energy boost`);
      else if (best.energyDiff < -10) reasons.push(`${Math.round(best.energyDiff)}% energy drop`);
      
      if (getKeyCompatibility(currentAnalysis.key, best.analysis.key)) {
        reasons.push('Harmonic key match');
      }
    }
    
    return res.json({
      success: true,
      recommendation: {
        requestId: best.requestId,
        trackName: best.trackName,
        artistName: best.artistName,
        compatibilityScore: best.compatibilityScore,
        reason: reasons.join(', ') || 'Good fit for current vibe',
        analysis: best.analysis,
        bpmDiff: best.bpmDiff,
        energyDiff: best.energyDiff
      }
    });
  } catch (error) {
    console.log(`Error getting best next track: ${error.message}`);
    return sendError(res, 500, 'Failed to get recommendation', error.message);
  }
});

// Get request analytics for an event
app.get('/make-server-6d46752d/events/:code/request-analytics', async (req, res) => {
  try {
    const code = req.params.code.toUpperCase();
    
    try {
      // Get total requests
      const totalRequests = db.prepare('SELECT COUNT(*) as count FROM song_requests WHERE event_code = ?').get(code);
      const requestCount = totalRequests?.count || 0;
      
      // Get requests by status
      const statusCounts = db.prepare(
        'SELECT status, COUNT(*) as count FROM song_requests WHERE event_code = ? GROUP BY status'
      ).all(code);
      
      // Get total votes
      const voteData = db.prepare(
        `SELECT 
          SUM(vote_count) as total_upvotes,
          SUM(downvote_count) as total_downvotes
         FROM song_requests WHERE event_code = ?`
      ).get(code);
      
      // Get most requested tracks
      const topRequests = db.prepare(
        `SELECT track_name, artist_name, COUNT(*) as request_count, SUM(vote_count) as total_votes
         FROM song_requests WHERE event_code = ? 
         GROUP BY track_name, artist_name 
         ORDER BY request_count DESC, total_votes DESC 
         LIMIT 10`
      ).all(code);
      
      // Get average request-to-play time
      const playedRequests = db.prepare(
        `SELECT submitted_at, played_at 
         FROM song_requests 
         WHERE event_code = ? AND status = 'played' AND played_at IS NOT NULL`
      ).all(code);
      
      let avgWaitTime = 0;
      if (playedRequests.length > 0) {
        const waitTimes = playedRequests.map((r) => {
          const submitted = new Date(r.submitted_at).getTime();
          const played = new Date(r.played_at).getTime();
          return (played - submitted) / 1000 / 60; // minutes
        });
        avgWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
      }
      
      // Get genre distribution
      const genreDistribution = {};
      const allRequests = db.prepare('SELECT metadata FROM song_requests WHERE event_code = ?').all(code);
      allRequests.forEach((r) => {
        try {
          const metadata = JSON.parse(r.metadata || '{}');
          if (metadata.genre && Array.isArray(metadata.genre)) {
            metadata.genre.forEach((g) => {
              genreDistribution[g] = (genreDistribution[g] || 0) + 1;
            });
          }
        } catch {}
      });
      
      const statusBreakdown = {};
      statusCounts.forEach((s) => {
        statusBreakdown[s.status] = s.count || 0;
      });
      
      return res.json({
        success: true,
        analytics: {
          totalRequests: requestCount,
          statusBreakdown,
          totalUpvotes: voteData?.total_upvotes || 0,
          totalDownvotes: voteData?.total_downvotes || 0,
          avgWaitTimeMinutes: Math.round(avgWaitTime * 10) / 10,
          topRequestedTracks: topRequests.map((r) => ({
            trackName: r.track_name,
            artistName: r.artist_name,
            requestCount: r.request_count,
            totalVotes: r.total_votes || 0
          })),
          genreDistribution: Object.entries(genreDistribution)
            .sort(([, a], [, b]) => b - a)
            .map(([genre, count]) => ({ genre, count }))
        }
      });
    } catch (dbError) {
      console.log(`Database analytics error: ${dbError.message}`);
      return res.json({ success: true, analytics: {} });
    }
  } catch (error) {
    console.log(`Error fetching analytics: ${error.message}`);
    return sendError(res, 500, 'Failed to fetch analytics', error.message);
  }
});

// Search Spotify tracks (for request submission)
app.post('/make-server-6d46752d/spotify/search', async (req, res) => {
  try {
    const { query: searchQuery, access_token, limit = 20 } = req.body;
    
    if (!searchQuery || !access_token) {
      return sendError(res, 400, 'Search query and access token are required');
    }
    
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=${limit}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    if (!response.ok) {
      return sendError(res, 400, 'Spotify search failed');
    }
    
    const data = await response.json();
    
    const tracks = (data.tracks?.items || []).map((track) => ({
      id: track.id,
      spotifyTrackId: track.id,
      trackName: track.name,
      artistName: track.artists[0]?.name || 'Unknown',
      albumName: track.album?.name || '',
      previewUrl: track.preview_url,
      durationMs: track.duration_ms,
      albumArt: track.album?.images?.[0]?.url,
      artistId: track.artists[0]?.id,
      albumId: track.album?.id
    }));
    
    return res.json({ success: true, tracks });
  } catch (error) {
    console.log(`Error searching Spotify: ${error.message}`);
    return sendError(res, 500, 'Failed to search Spotify', error.message);
  }
});

// Debug: List all routes
app.get('/make-server-6d46752d/routes', (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        method: Object.keys(middleware.route.methods)[0].toUpperCase(),
        path: middleware.route.path
      });
    }
  });
  return res.json({ routes });
});

// Catch-all for debugging
app.use('*', (req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'Route not found', 
    method: req.method, 
    path: req.originalUrl,
    hint: 'Make sure the server is running and the route exists'
  });
});

// Load SSL certificates for HTTPS
const CERT_DIR = path.join(__dirname, '..', 'certs');
const sslOptions = {
  key: fs.readFileSync(path.join(CERT_DIR, 'localhost-key.pem')),
  cert: fs.readFileSync(path.join(CERT_DIR, 'localhost.pem'))
};

// Start server with HTTPS
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`🚀 Local server running on https://localhost:${PORT}`);
  console.log(`📊 Database: ${DB_PATH}`);
  console.log(`🔗 API base URL: https://127.0.0.1:${PORT}/make-server-6d46752d`);
  console.log(`ℹ️  Frontend proxies via HTTPS at https://127.0.0.1:3000`);
});

