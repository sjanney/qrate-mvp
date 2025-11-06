# 🎵 Spotify OAuth Setup Guide

## Problem: "INVALID_CLIENT: Insecure redirect URI"

This error means the redirect URI your app is sending to Spotify **doesn't exactly match** what's configured in your Spotify Developer Dashboard.

## Quick Fix (5 Steps)

### Step 1: Find Your Redirect URIs

Run your app and check the terminal logs when you click "Connect Spotify". You'll see:

```
🎵 Generated Spotify auth URL for GUEST
   Origin: https://localhost:3000
   Redirect URI: https://localhost:3000/guest
   ⚠️  Make sure this EXACT URI is in your Spotify app settings!
```

**Write down this exact URI!**

### Step 2: Go to Spotify Developer Dashboard

1. Open: **https://developer.spotify.com/dashboard**
2. Log in with your Spotify account
3. Click on your app (or create one if you haven't)

### Step 3: Add Redirect URIs

1. Click **"Settings"** (or "Edit Settings")
2. Scroll down to **"Redirect URIs"**
3. Add these EXACT URIs (one per line):

```
https://localhost:3000/guest
https://127.0.0.1:3000/guest
https://localhost:3000/dj/spotify/callback
https://127.0.0.1:3000/dj/spotify/callback
```

⚠️ **IMPORTANT:**
- Use `https://` (NOT `http://`)
- Include the `/guest` or `/dj/spotify/callback` path
- No trailing slash
- Exact match including port number

### Step 4: Save Changes

1. Click **"Save"** at the bottom
2. Wait a few seconds for changes to propagate

### Step 5: Try Again

1. Restart your app: `npm run restart`
2. Go to guest flow
3. Click "Connect Spotify"
4. **Should work now!** ✅

## Visual Guide

### Spotify Dashboard - Redirect URIs Section

```
┌─────────────────────────────────────────────────┐
│  App Settings                                   │
├─────────────────────────────────────────────────┤
│  App Name: Synergy Music App                   │
│  Client ID: abc123...                           │
│  Client Secret: [Show Client Secret]           │
│                                                 │
│  Redirect URIs:                                 │
│  ┌────────────────────────────────────────────┐│
│  │ https://localhost:3000/guest              ││
│  │ https://127.0.0.1:3000/guest              ││
│  │ https://localhost:3000/dj/spotify/callback││
│  │ https://127.0.0.1:3000/dj/spotify/callback││
│  └────────────────────────────────────────────┘│
│  [+ Add Another]                                │
│                                                 │
│  [Cancel]                           [Save]      │
└─────────────────────────────────────────────────┘
```

## Common Mistakes

### ❌ Wrong Protocol
```
http://localhost:3000/guest     ← NO! Must be https://
```

### ❌ Missing Path
```
https://localhost:3000          ← NO! Must include /guest
```

### ❌ Trailing Slash
```
https://localhost:3000/guest/   ← NO! No trailing slash
```

### ❌ Wrong Port
```
https://localhost:5173/guest    ← Check what port you're using!
```

### ✅ Correct Format
```
https://localhost:3000/guest    ← YES! Perfect!
```

## Debugging

### See Exact Redirect URI Being Used

The backend now logs the exact redirect URI when you connect. Look in your terminal:

```bash
npm run restart
# Then click "Connect Spotify" and check the logs
```

You'll see:
```
🎵 Generated Spotify auth URL for GUEST
   Origin: https://localhost:3000
   Redirect URI: https://localhost:3000/guest
   ⚠️  Make sure this EXACT URI is in your Spotify app settings!
   Dashboard: https://developer.spotify.com/dashboard
```

### Copy the Exact URI

Copy the `Redirect URI` shown in the logs and paste it exactly into your Spotify app settings.

## Environment Variables

Make sure these are set in your `.env` file:

```bash
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

Get these from: https://developer.spotify.com/dashboard → Your App → Settings

## Different Redirect URIs Needed

### Guest Flow (Users joining events)
- **Path**: `/guest`
- **URI**: `https://localhost:3000/guest`
- **Used for**: Connecting guest Spotify to analyze playlists

### DJ Flow (Event hosts/DJs)
- **Path**: `/dj/spotify/callback`
- **URI**: `https://localhost:3000/dj/spotify/callback`
- **Used for**: Creating Spotify playlists with event songs

## Why Both localhost AND 127.0.0.1?

Some browsers/systems use `localhost` while others use `127.0.0.1`. Adding both ensures it works everywhere.

## Still Getting Errors?

### Error: "INVALID_CLIENT: Invalid redirect URI"

1. Double-check the URIs in Spotify dashboard
2. Make sure you clicked "Save"
3. Wait 30 seconds for changes to propagate
4. Restart your app: `npm run restart`
5. Clear browser cache or try incognito mode

### Error: "INVALID_CLIENT: Invalid client"

- Check that `SPOTIFY_CLIENT_ID` in `.env` matches your dashboard
- The Client ID should be a long alphanumeric string

### Error: "INVALID_CLIENT: Invalid client secret"

- Check that `SPOTIFY_CLIENT_SECRET` in `.env` is correct
- Click "Show Client Secret" in dashboard to copy it

## Complete Example

Let's say you run `npm run restart` and see:

```
🎵 Generated Spotify auth URL for GUEST
   Origin: https://localhost:3000
   Redirect URI: https://localhost:3000/guest
```

**Steps:**

1. ✅ Copy `https://localhost:3000/guest`
2. ✅ Go to https://developer.spotify.com/dashboard
3. ✅ Open your app → Settings
4. ✅ Find "Redirect URIs" section
5. ✅ Paste `https://localhost:3000/guest`
6. ✅ Also add `https://127.0.0.1:3000/guest`
7. ✅ Click "Save"
8. ✅ Wait 10 seconds
9. ✅ Try connecting Spotify again

**Should work!** 🎉

## Testing Checklist

After configuring:

- [ ] Copied exact URI from terminal logs
- [ ] Added to Spotify app settings
- [ ] Clicked "Save" in Spotify dashboard
- [ ] Waited 30 seconds
- [ ] Restarted app (`npm run restart`)
- [ ] Opened https://localhost:3000
- [ ] Entered event code
- [ ] Clicked "Connect Spotify"
- [ ] ✅ Redirected to Spotify login (no error!)

## Production Deployment

When deploying to production, add your production URLs:

```
https://yourdomain.com/guest
https://yourdomain.com/dj/spotify/callback
```

Never use HTTP in production!

## Support Links

- Spotify Developer Dashboard: https://developer.spotify.com/dashboard
- Spotify Web API Docs: https://developer.spotify.com/documentation/web-api
- OAuth Guide: https://developer.spotify.com/documentation/web-api/concepts/authorization

---

**Summary:** The key is making sure the redirect URI in your code **exactly matches** what's in your Spotify app settings. Use the terminal logs to see the exact URI being used!

