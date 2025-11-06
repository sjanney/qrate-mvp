# ✅ HTTPS Migration & Event Creation Fix - Quick Start

## What Was Fixed

### Problem 1: Protocol Mismatch ❌ → ✅
- **Before**: Backend on HTTP, Frontend on HTTPS
- **After**: Both on HTTPS - secure communication throughout

### Problem 2: Event Creation Timeout ❌ → ✅
- **Before**: "Request timed out - please try again"
- **After**: Events create successfully within seconds

## Quick Start (3 Steps)

### Step 1: Restart Your Servers
```bash
cd /Users/shanejanney/Desktop/synergy/synergy-app/synergy
npm run restart
```

**OR** if you don't have servers running yet:
```bash
npm run dev:all
```

### Step 2: Open Your Browser
Navigate to: **https://localhost:3000**

⚠️ **Important**: You might see a security warning. This is normal for local development.
- Click "Advanced" 
- Click "Proceed to localhost (unsafe)"

### Step 3: Create an Event!
1. Click "Host" or navigate to Host Dashboard
2. Click "Create Event"
3. Fill in the required fields:
   - **Event Name**: e.g., "Friday Night Party"
   - **Theme**: Select from dropdown (e.g., "High Energy Dance")
   - **Date**: Auto-filled with today
   - **Time**: Auto-filled with current time
   - Location (optional)
   - Description (optional)
4. Click **"Create Event & Generate QR Code"**

**✅ Should work in a few seconds!**

## What's Running Now

```
┌─────────────────────────────────────────┐
│  Frontend (Vite Dev Server)             │
│  https://localhost:3000                 │
│  - React App with UI                    │
│  - HTTPS with SSL certificates          │
└──────────────┬──────────────────────────┘
               │
               │ Proxy: /make-server-6d46752d
               │ (HTTPS → HTTPS)
               ↓
┌─────────────────────────────────────────┐
│  Backend API Server (Express + HTTPS)   │
│  https://localhost:3001                 │
│  - Event creation endpoints             │
│  - SQLite database                      │
│  - Spotify integration                  │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  SQLite Database                        │
│  synergy/database/synergy.db            │
│  - Events, preferences, songs, sessions │
└─────────────────────────────────────────┘
```

## Verification Commands

### Check Backend Health
```bash
curl -k https://localhost:3001/make-server-6d46752d/health
```
Expected: `{"status":"ok","timestamp":"..."}`

### Check if Ports are in Use
```bash
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
```

### View Backend Logs
Backend logs will show in the terminal where you ran `npm run dev:all`

Look for:
- ✅ `🚀 Local server running on https://localhost:3001`
- ✅ `✅ Database schema verified`
- ✅ `📊 Database: .../synergy.db`

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev:all` | Start both servers together |
| `npm run restart` | Stop all servers and restart |
| `npm run server` | Start only backend server |
| `npm run dev` | Start only frontend server |
| `npm run init-db` | Initialize/reset database |

## Common Issues & Solutions

### Issue: "Port 3001 already in use"
**Solution:**
```bash
lsof -ti:3001 | xargs kill -9
npm run dev:all
```

### Issue: Still getting timeout errors
**Solution:**
1. Check if both servers are running (you should see logs from both)
2. Verify backend health: `curl -k https://localhost:3001/make-server-6d46752d/health`
3. Check browser console (F12) for specific errors
4. Try restarting: `npm run restart`

### Issue: "This site can't be reached"
**Solution:**
- Make sure you're using **https://** (not http://)
- URL should be: `https://localhost:3000`
- Check if servers are running: `lsof -i :3000`

### Issue: Browser security warning won't go away
**Solution:**
```bash
# Install mkcert CA (one-time setup)
mkcert -install

# Restart browser completely
# Then open https://localhost:3000 again
```

## File Changes Summary

### Modified Files (7):
1. ✅ `server/local-server.js` - Added HTTPS support
2. ✅ `vite.config.ts` - Updated proxy for HTTPS
3. ✅ `src/utils/supabase/client.tsx` - Increased timeout
4. ✅ `scripts/start-dev.js` - Updated logs
5. ✅ `package.json` - Added restart script
6. ✅ `README.md` - Updated documentation

### New Files (5):
1. ✅ `certs/localhost-key.pem` - SSL private key
2. ✅ `certs/localhost.pem` - SSL certificate
3. ✅ `HTTPS_MIGRATION.md` - Technical details
4. ✅ `FIXES_APPLIED.md` - Fix documentation
5. ✅ `QUICK_START.md` - This file
6. ✅ `scripts/restart-servers.sh` - Restart helper

## Testing Checklist

- [ ] Servers start without errors
- [ ] Backend health check returns OK
- [ ] Can access https://localhost:3000
- [ ] Can create an event without timeout
- [ ] Event code is generated
- [ ] QR code is displayed
- [ ] Can view event details

## Need Help?

If you're still having issues:

1. **Check the logs** in your terminal where servers are running
2. **Open browser DevTools** (F12) → Console tab
3. **Look for error messages** in red
4. **Check Network tab** to see which requests are failing

All systems should now be working! 🎉

---

**Next Steps After Event Creation:**
- Test guest joining with event code
- Try Spotify integration (if configured)
- Test DJ dashboard features
- Create multiple events to verify database persistence

