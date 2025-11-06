# Environment Variables Template

Copy this to create your `.env` file:

```bash
# Spotify API Credentials
# Get these from: https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here

# Optional: Custom redirect URIs (defaults use loopback IP over HTTPS)
# If unset, backend will use:
#   SPOTIFY_GUEST_REDIRECT_URI = https://127.0.0.1:3000/guest
#   SPOTIFY_DJ_REDIRECT_URI    = https://127.0.0.1:3000/dj/spotify/callback
# SPOTIFY_GUEST_REDIRECT_URI=https://127.0.0.1:3000/guest
# SPOTIFY_DJ_REDIRECT_URI=https://127.0.0.1:3000/dj/spotify/callback

# Server Configuration (optional)
# PORT=3001
```

## Setup Steps

1. **Create `.env` file in the synergy directory**
   ```bash
   cd /Users/shanejanney/Desktop/synergy/synergy-app/synergy
   touch .env
   ```

2. **Copy the template above into `.env`**

3. **Get Spotify Credentials**:
   - Go to: https://developer.spotify.com/dashboard
   - Log in with your Spotify account
   - Click "Create app" (or select existing app)
   - Copy your Client ID and Client Secret
   - Paste into `.env` file

4. **Configure Redirect URIs** in Spotify Dashboard:
   - Click your app → Settings
   - Scroll to "Redirect URIs"
  - Add these EXACT URIs (recommend using 127.0.0.1):
    - `https://127.0.0.1:3000/guest`
    - `https://127.0.0.1:3000/dj/spotify/callback`
   - Click "Save"

5. **Restart your app**:
   ```bash
   npm run restart
   ```

## IMPORTANT: Redirect URIs

Add these to your Spotify App Settings → Redirect URIs:

```
https://localhost:3000/guest
https://127.0.0.1:3000/guest
https://localhost:3000/dj/spotify/callback
https://127.0.0.1:3000/dj/spotify/callback
```

⚠️ Must use `https://` (not `http://`)

See `SPOTIFY_SETUP_GUIDE.md` for detailed instructions!

