#!/bin/bash
# Quick script to restart both dev servers

echo "🛑 Stopping any running servers..."

# Kill processes on ports 3000 and 3001
lsof -ti:3001 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Also kill by process name as fallback
pkill -f "node.*local-server.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

echo "✅ Servers stopped"
echo ""
echo "🚀 Starting servers with HTTPS..."
echo ""

# Change to the synergy directory
cd "$(dirname "$0")/.." || exit 1

# Run the dev:all script
npm run dev:all

