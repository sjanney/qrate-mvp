// Configuration file for API routes
// ⚠️ WARNING: This file contains sensitive credentials
// DO NOT commit real credentials to Git!
// For production, use Vercel environment variables instead

// Type declaration for Node.js process (for serverless functions)
declare const process: {
  env: { [key: string]: string | undefined };
} | undefined;

// Helper to read environment variables safely
function readEnv(key: string): string | undefined {
  try {
    if (typeof process !== 'undefined' && process && process.env) {
      const val = process.env[key];
      if (val) {
        return String(val);
      }
    }
  } catch {
    // Ignore errors during build
  }
  return undefined;
}

// Helper to get config value with fallback (using ternary to avoid BinaryExpression issues)
function getConfigValue(envValue: string | undefined, fallback: string): string {
  if (envValue) {
    return envValue;
  }
  return fallback;
}

// Build config object at runtime to avoid static analysis issues
function buildConfig() {
  const supabaseUrl = readEnv('SUPABASE_URL');
  const supabaseKey = readEnv('SUPABASE_ANON_KEY');
  const spotifyClientId = readEnv('SPOTIFY_CLIENT_ID');
  const spotifyClientSecret = readEnv('SPOTIFY_CLIENT_SECRET');
  const guestRedirectUri = readEnv('SPOTIFY_GUEST_REDIRECT_URI');
  const djRedirectUri = readEnv('SPOTIFY_DJ_REDIRECT_URI');

  return {
    supabase: {
      url: getConfigValue(supabaseUrl, 'YOUR_SUPABASE_URL_HERE'),
      anonKey: getConfigValue(supabaseKey, 'YOUR_SUPABASE_ANON_KEY_HERE'),
    },
    spotify: {
      clientId: getConfigValue(spotifyClientId, 'YOUR_SPOTIFY_CLIENT_ID_HERE'),
      clientSecret: getConfigValue(spotifyClientSecret, 'YOUR_SPOTIFY_CLIENT_SECRET_HERE'),
      guestRedirectUri: getConfigValue(guestRedirectUri, 'https://qrate-mvp.vercel.app/guest'),
      djRedirectUri: getConfigValue(djRedirectUri, 'https://qrate-mvp.vercel.app/dj/spotify/callback'),
    },
  };
}

// Export the config (evaluated at runtime, not build time)
export const config = buildConfig();

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

