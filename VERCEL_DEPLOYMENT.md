# Vercel Deployment Guide

This project is configured for deployment on Vercel. Follow these steps to deploy.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. A Supabase project (sign up at https://supabase.com)
3. Spotify API credentials (get from https://developer.spotify.com/dashboard)

## Setup Steps

### 1. Set Up Supabase Database

1. Create a new Supabase project at https://supabase.com
2. Run the migrations in `supabase/migrations/`:
   - `001_initial_schema.sql`
   - `002_realtime_sessions.sql`
   - `003_song_requests.sql`

3. Get your Supabase credentials:
   - Project URL (e.g., `https://xxxxx.supabase.co`)
   - Anon/Public Key (found in Settings → API)

### 2. Configure Spotify API

1. Go to https://developer.spotify.com/dashboard
2. Create a new app or use an existing one
3. Get your Client ID and Client Secret
4. Add redirect URIs:
   - `https://your-vercel-app.vercel.app/guest`
   - `https://your-vercel-app.vercel.app/dj/spotify/callback`

### 3. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from the synergy directory)
cd synergy
vercel

# Follow the prompts
```

#### Option B: Using Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `synergy`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

### 4. Configure Credentials

You have two options for configuring credentials:

#### Option A: Hardcode in Config File (Simpler, but less secure)

1. Copy the example config:
   ```bash
   cp api/config.example.ts api/config.ts
   ```

2. Edit `api/config.ts` and replace the placeholder values with your actual credentials:
   ```typescript
   export const config = {
     supabase: {
       url: 'https://xxxxx.supabase.co', // Your actual Supabase URL
       anonKey: 'your-actual-anon-key', // Your actual anon key
     },
     spotify: {
       clientId: 'your-actual-client-id',
       clientSecret: 'your-actual-client-secret',
       guestRedirectUri: 'https://your-app.vercel.app/guest',
       djRedirectUri: 'https://your-app.vercel.app/dj/spotify/callback',
     },
   };
   ```

⚠️ **Security Warning**: If you hardcode credentials, make sure to:
- Add `api/config.ts` to `.gitignore` (already included)
- Never commit real credentials to Git
- Only use this approach for personal projects or trusted repositories

#### Option B: Use Vercel Environment Variables (Recommended for production)

In your Vercel project settings, add these environment variables:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret
SPOTIFY_GUEST_REDIRECT_URI=https://your-app.vercel.app/guest
SPOTIFY_DJ_REDIRECT_URI=https://your-app.vercel.app/dj/spotify/callback
```

The config file will automatically use environment variables if they're set, otherwise it falls back to the hardcoded values.

**Important**: After adding environment variables or updating config, redeploy your application.

### 5. Verify Deployment

1. Visit your deployed app URL
2. Check the health endpoint: `https://your-app.vercel.app/api/health`
3. Check database health: `https://your-app.vercel.app/api/health/db`

## How It Works

- **Frontend**: Built with Vite and served as static files
- **API Routes**: Serverless functions in `/api` directory handle all backend requests
- **Database**: Uses Supabase (PostgreSQL) instead of SQLite for production
- **Routing**: All `/make-server-6d46752d/*` requests are rewritten to `/api/*`

## Local Development vs Production

- **Local**: Uses SQLite database and Express server (`server/local-server.js`)
- **Production**: Uses Supabase database and Vercel serverless functions

The API client (`src/utils/supabase/client.tsx`) automatically uses the correct endpoints based on the environment.

## Troubleshooting

### Database Connection Issues

If you see "Supabase not configured" errors:
1. Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in Vercel
2. Check that your Supabase project is active
3. Ensure migrations have been run

### Spotify Auth Issues

If Spotify authentication fails:
1. Verify redirect URIs match exactly in Spotify dashboard
2. Check that `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set
3. Ensure redirect URIs use `https://` (not `http://`)

### Build Errors

If the build fails:
1. Check Node.js version (should be 18+)
2. Verify all dependencies are in `package.json`
3. Check build logs in Vercel dashboard

## Additional Notes

- The app uses a fallback in-memory store if Supabase is not configured (for testing only)
- For production, Supabase is required
- SQLite database files are ignored in deployment (`.vercelignore`)
- All API routes handle CORS automatically

## Support

For issues or questions:
1. Check Vercel deployment logs
2. Check Supabase dashboard for database issues
3. Review environment variables configuration

