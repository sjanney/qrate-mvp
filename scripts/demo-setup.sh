#!/bin/bash
# Demo setup script - Initialize database for demo

echo "🎵 Synergy Demo Setup"
echo "===================="
echo ""
echo "Initializing local SQLite database..."

# Run database initialization
npm run init-db

echo ""
echo "✅ Database initialized successfully!"
echo ""
echo "📝 Next steps:"
echo "   1. Start the dev server: npm run dev"
echo "   2. Create an event in the Host Dashboard"
echo "   3. Use the event code to join as a guest"
echo ""
echo "💡 To reset the database for a fresh demo:"
echo "   npm run reset-db"
echo ""

