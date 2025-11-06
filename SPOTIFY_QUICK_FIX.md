# 🎵 Quick Fix: "INVALID_CLIENT: Insecure redirect URI"

## What You Need to Do RIGHT NOW

### 1. Restart Your App & Watch the Logs
```bash
npm run restart
```

### 2. Click "Connect Spotify" in Guest Flow

Watch your terminal. You'll see something like:

```
🎵 Generated Spotify auth URL for GUEST
   Origin: https://localhost:3000
   Redirect URI: https://localhost:3000/guest
   ⚠️  Make sure this EXACT URI is in your Spotify app settings!
   Dashboard: https://developer.spotify.com/dashboard
```

### 3. Copy That EXACT Redirect URI

Example: `https://localhost:3000/guest`

### 4. Add It to Spotify Dashboard

1. Go to: **https://developer.spotify.com/dashboard**
2. Click your app
3. Click **"Settings"**
4. Find **"Redirect URIs"** section
5. Paste: `https://localhost:3000/guest`
6. Also add: `https://127.0.0.1:3000/guest`
7. Click **"Save"**

### 5. Try Again!

- Wait 10 seconds
- Click "Connect Spotify" again
- **Should work!** ✅

## Full List of URIs to Add

Add ALL of these to your Spotify app settings:

```
https://localhost:3000/guest
https://127.0.0.1:3000/guest
https://localhost:3000/dj/spotify/callback
https://127.0.0.1:3000/dj/spotify/callback
```

## Why This Happens

Spotify requires **exact match** of redirect URIs for security. If your app sends `https://localhost:3000/guest` but you only have `http://localhost:3000/guest` (or forgot the `/guest` part), Spotify rejects it.

## Common Mistakes

❌ Using `http://` instead of `https://`  
❌ Forgetting the `/guest` path  
❌ Adding trailing slash `/guest/`  
❌ Using wrong port number  

✅ Exact match from terminal logs  
✅ Using `https://`  
✅ Including full path  

## Still Not Working?

1. Make sure you clicked "Save" in Spotify dashboard
2. Wait 30 seconds for changes to propagate
3. Clear browser cache or use incognito mode
4. Double-check your `.env` file has correct Client ID/Secret
5. See `SPOTIFY_SETUP_GUIDE.md` for detailed troubleshooting

---

**TL;DR:** Copy the exact redirect URI from your terminal logs and paste it into Spotify Developer Dashboard → Your App → Settings → Redirect URIs → Save

