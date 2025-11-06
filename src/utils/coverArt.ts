// Lightweight album art lookup via iTunes Search API with caching
// No auth required; suitable fallback when Spotify images are unavailable

type CacheEntry = { url: string; ts: number };

const memoryCache: Record<string, CacheEntry> = {};
const LOCAL_STORAGE_KEY = 'cover_art_cache_v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function getCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function makeKey(title: string, artist: string) {
  return `${title.trim().toLowerCase()}::${artist.trim().toLowerCase()}`;
}

export async function fetchAlbumArt(title: string, artist: string): Promise<string | null> {
  if (!title || !artist) return null;
  const key = makeKey(title, artist);

  // Memory cache
  const mem = memoryCache[key];
  if (mem && Date.now() - mem.ts < MAX_AGE_MS) {
    return mem.url;
  }

  // LocalStorage cache
  const ls = getCache();
  const entry = ls[key];
  if (entry && Date.now() - entry.ts < MAX_AGE_MS) {
    memoryCache[key] = entry;
    return entry.url;
  }

  try {
    const term = encodeURIComponent(`${title} ${artist}`);
    const resp = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&limit=1`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const artwork = data?.results?.[0]?.artworkUrl100 || null;
    if (artwork) {
      const hiRes = artwork.replace('100x100bb', '512x512bb');
      const value = { url: hiRes, ts: Date.now() };
      memoryCache[key] = value;
      ls[key] = value;
      setCache(ls);
      return hiRes;
    }
    return null;
  } catch {
    return null;
  }
}

export async function resolveAlbumArts(
  tracks: Array<{ id: string; title: string; artist: string }>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  await Promise.all(
    tracks.map(async (t) => {
      const url = await fetchAlbumArt(t.title, t.artist);
      if (url) result[t.id] = url;
    })
  );
  return result;
}

// Fetch iTunes preview URL for a track
export async function fetchPreviewUrl(title: string, artist: string): Promise<string | null> {
  if (!title || !artist) return null;
  const key = makeKey(title, artist);

  // Check memory cache
  const mem = memoryCache[key + '_preview'];
  if (mem && Date.now() - mem.ts < MAX_AGE_MS) {
    return mem.url;
  }

  // Check localStorage cache
  const ls = getCache();
  const entry = ls[key + '_preview'];
  if (entry && Date.now() - entry.ts < MAX_AGE_MS) {
    memoryCache[key + '_preview'] = entry;
    return entry.url;
  }

  try {
    const term = encodeURIComponent(`${title} ${artist}`);
    const resp = await fetch(`https://itunes.apple.com/search?term=${term}&media=music&limit=1`);
    if (!resp.ok) return null;
    const data = await resp.json();
    const previewUrl = data?.results?.[0]?.previewUrl || null;
    if (previewUrl) {
      const value = { url: previewUrl, ts: Date.now() };
      memoryCache[key + '_preview'] = value;
      ls[key + '_preview'] = value;
      setCache(ls);
      return previewUrl;
    }
    return null;
  } catch {
    return null;
  }
}

// Resolve preview URLs for multiple tracks
export async function resolvePreviewUrls(
  tracks: Array<{ id: string; title: string; artist: string }>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  await Promise.all(
    tracks.map(async (t) => {
      const url = await fetchPreviewUrl(t.title, t.artist);
      if (url) result[t.id] = url;
    })
  );
  return result;
}


