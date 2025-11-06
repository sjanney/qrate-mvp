// Configuration file for API routes
// ⚠️ WARNING: This file contains sensitive credentials
// DO NOT commit real credentials to Git!
// For production, use Vercel environment variables instead

export const config = {
  supabase: {
    url: process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE',
    anonKey: process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE',
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || 'YOUR_SPOTIFY_CLIENT_ID_HERE',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || 'YOUR_SPOTIFY_CLIENT_SECRET_HERE',
    guestRedirectUri: process.env.SPOTIFY_GUEST_REDIRECT_URI || 'https://your-app.vercel.app/guest',
    djRedirectUri: process.env.SPOTIFY_DJ_REDIRECT_URI || 'https://your-app.vercel.app/dj/spotify/callback',
  },
};

// Helper to check if config is properly set
export function isConfigValid(): boolean {
  const hasSupabase = 
    config.supabase.url !== 'YOUR_SUPABASE_URL_HERE' &&
    config.supabase.anonKey !== 'YOUR_SUPABASE_ANON_KEY_HERE' &&
    config.supabase.url.startsWith('http');
    
  const hasSpotify = 
    config.spotify.clientId !== 'YOUR_SPOTIFY_CLIENT_ID_HERE' &&
    config.spotify.clientSecret !== 'YOUR_SPOTIFY_CLIENT_SECRET_HERE';
    
  return hasSupabase && hasSpotify;
}

