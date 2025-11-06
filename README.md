
  # synergy

  This is a code bundle for synergy.
  
  ## Setup

  1. Run `npm i` to install the dependencies.
  2. Run `npm run init-db` to initialize the local SQLite database.
  3. Set up HTTPS for local development (required for Spotify OAuth):
     - Install mkcert: `brew install mkcert` (macOS) or follow [mkcert installation guide](https://github.com/FiloSottile/mkcert#installation)
     - Install the local CA: `mkcert -install` (you'll be prompted for your password)
     - Generate SSL certificates:
       ```bash
       mkdir -p certs
       cd certs
       mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1
       ```
     - The certificates will be created in the `certs/` directory
  4. Set up Spotify API credentials (required for Spotify integration):
     - Create a `.env` file in the root directory (see `ENV_TEMPLATE.md`)
     - Go to https://developer.spotify.com/dashboard
     - Create a new app and copy your Client ID and Client Secret
     - Add them to your `.env` file:
       ```
       SPOTIFY_CLIENT_ID=your_client_id_here
       SPOTIFY_CLIENT_SECRET=your_client_secret_here
       ```
     - **Important:** Add these HTTPS redirect URIs in your Spotify app settings (Settings → Redirect URIs):
       - `https://localhost:3000/guest` (for guest authentication)
       - `https://localhost:3000/dj/spotify/callback` (for DJ authentication)
       - `https://127.0.0.1:3000/guest` (alternative for guest authentication)
       - `https://127.0.0.1:3000/dj/spotify/callback` (alternative for DJ authentication)
       
     Note: Spotify requires HTTPS redirect URIs for security. We use mkcert to generate trusted local SSL certificates.
     
     **⚠️ Getting "INVALID_CLIENT: Insecure redirect URI" error?**  
     → See `SPOTIFY_QUICK_FIX.md` for immediate help!

  ## Running the code

  ### Quick Start (Recommended)
  
  Run `npm run dev:all` to start both the local API server and frontend dev server together.
  
  This will:
  - Start the local API server on `https://localhost:3001` (uses SQLite database with HTTPS)
  - Start the Vite dev server on `https://localhost:3000` (with HTTPS)
  - Both servers use HTTPS for secure communication
  
  Press `Ctrl+C` to stop both servers.
  
  **Or use:** `npm run restart` to stop and restart everything cleanly.

  ### Manual Start (Alternative)

  If you prefer to run them separately:
  
  **Terminal 1:** Start the local API server
  ```bash
  npm run server
  ```
  
  **Terminal 2:** Start the frontend dev server
  ```bash
  npm run dev
  ```

  ## Database Management

  - `npm run init-db` - Initialize/reset the SQLite database
  - `npm run reset-db` - Reset the database (deletes and recreates)
  