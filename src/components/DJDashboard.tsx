import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ArrowLeft, Users, QrCode, Play, Pause, SkipForward, Heart, Clock, TrendingUp, Music, RefreshCw, Plus, Headphones, GripVertical, X, CheckCircle, Sparkles, Volume2, Zap, Activity, Star, Loader2, Hash, Volume1, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiCall } from '../utils/supabase/client';
import { resolveAlbumArts, resolvePreviewUrls } from '../utils/coverArt';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Input } from './ui/input';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { SpotifyLogo } from './SpotifyLogo';
import { RequestQueue } from './RequestQueue';
import type { SongRequest } from '../types';
import { getBPMDifferenceColor, getTransitionQualityBadge, getEnergyProgression } from '../utils/transitionHelper';

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  matchScore?: number;
  reasons?: string[];
  energy?: number;
  danceability?: number;
  source: 'ai' | 'spotify' | 'apple';
  previewUrl?: string | null;
  metadata?: {
    bpm?: number;
    key?: string;
    energy?: number;
    danceability?: number;
    compatibilityScore?: number;
    genre?: string[];
    [key: string]: any;
  };
}

interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  duration: string;
  tracks: Track[];
}

interface Event {
  id: string;
  name: string;
  theme: string;
  code: string;
  preferences: Array<{
    userId: string;
    artists: string[];
    genres: string[];
    recentTracks: string[];
  }>;
  connectedPlaylist?: Playlist;
}

interface DJDashboardProps {
  event: Event;
  onBack: () => void;
  onShowQRCode: () => void;
  onConnectPlaylist: () => void;
}

// Detect if touch device for better DnD experience
const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// Draggable Queue Item Component
interface DraggableQueueItemProps {
  song: Track;
  index: number;
  currentSongIndex: number;
  onPlaySong: (index: number) => void;
  onRemoveFromQueue: (songId: string) => void;
  onMoveItem: (dragIndex: number, hoverIndex: number) => void;
  getSourceBadge: (source: string) => React.ReactElement;
  getAlbumArtUrl: (id: string) => string | undefined;
}

function DraggableQueueItem({ 
  song, 
  index, 
  currentSongIndex, 
  onPlaySong, 
  onRemoveFromQueue, 
  onMoveItem, 
  getSourceBadge,
  getAlbumArtUrl
}: DraggableQueueItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: 'queue-item',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'queue-item',
    hover: (draggedItem: { index: number }) => {
      if (draggedItem.index !== index) {
        onMoveItem(draggedItem.index, index);
        draggedItem.index = index;
      }
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    // Don't play if clicking on the drag handle or remove button
    const target = e.target as HTMLElement;
    if (target.closest('[data-drag-handle]') || target.closest('button')) {
      return;
    }
    if (!isDragging) {
      onPlaySong(index);
    }
  };

  // Connect drag source to dragRef only, drop target to the whole card
  drag(dragRef);
  drop(ref);

  return (
    <motion.div 
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={`
          glass-effect-strong glass-effect-hover
          ${index === currentSongIndex ? "neon-glow border-[var(--neon-cyan)]/50 bg-gradient-to-r from-[var(--neon-cyan)]/10 to-transparent" : ""} 
          ${isDragging ? "opacity-50 scale-95" : ""}
          cursor-pointer transition-all duration-300 hover:scale-[1.02] group
        `}
        onClick={handleClick}
      >
      <CardContent className="p-3 sm:p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-all duration-300
              ${index === currentSongIndex 
                ? 'bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black animate-pulse-neon' 
                : 'bg-gradient-to-br from-[var(--neon-pink)] to-[var(--neon-purple)] text-white'
              }`}>
              {index === currentSongIndex ? <Volume2 className="w-3 h-3" /> : index + 1}
            </div>
            <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0">
              <img
                src={getAlbumArtUrl(song.id) || `https://picsum.photos/seed/${encodeURIComponent(song.id)}/64/64`}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 mb-1 flex-wrap">
                <h4 className="font-medium text-sm sm:text-sm truncate text-white group-hover:text-[var(--neon-cyan)] transition-colors">{song.title}</h4>
                {index === currentSongIndex && (
                  <Badge className="bg-[var(--neon-cyan)] text-black text-xs flex-shrink-0 animate-pulse">
                    <Activity className="w-3 h-3 mr-1" />
                    Live
                  </Badge>
                )}
                <div className="flex-shrink-0">
                  {getSourceBadge(song.source)}
                </div>
              </div>
              <p className="text-xs sm:text-xs text-gray-400 truncate">{song.artist}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <div 
              ref={dragRef} 
              data-drag-handle
              className="cursor-grab active:cursor-grabbing p-2 rounded hover:bg-[var(--neon-pink)]/20 transition-colors touch-none group/drag"
              onMouseDown={(e) => e.preventDefault()}
            >
              <GripVertical className="w-4 h-4 text-gray-400 group-hover/drag:text-[var(--neon-pink)] transition-colors" />
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFromQueue(song.id);
              }}
              className="text-xs px-2 py-1 h-auto hover:bg-[var(--destructive)]/20 hover:text-[var(--destructive)]"
            >
              <X className="w-3 h-3 sm:hidden" />
              <span className="hidden sm:inline">Remove</span>
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>
    </motion.div>
  );
}

export function DJDashboard({ event, onBack, onShowQRCode, onConnectPlaylist }: DJDashboardProps) {
  const [currentQueue, setCurrentQueue] = useState<Track[]>([]);
  const [connectedPlaylist, setConnectedPlaylist] = useState<Playlist | null>(event?.connectedPlaylist || null);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [addedSongs, setAddedSongs] = useState<Set<string>>(new Set());
  const [topSongs, setTopSongs] = useState<Track[]>([]);
  const [isLoadingTopSongs, setIsLoadingTopSongs] = useState(false);
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationSort, setRecommendationSort] = useState<'score' | 'bpm'>('score');
  // Generate random insights on each render for demo purposes
  const [insights, setInsights] = useState(() => ({
    totalGuests: event.preferences.length,
    averageAge: Math.floor(Math.random() * 20) + 20, // Random age 20-40
    topGenres: ['Pop', 'Hip Hop', 'Electronic', 'Rock', 'R&B'], // Mock genres
    energyLevel: Math.floor(Math.random() * 40) + 60, // Random energy 60-100
    moodScore: Math.floor(Math.random() * 40) + 60 // Random mood 60-100
  }));
  // DJ Spotify export state
  const [djSpotifyToken, setDjSpotifyToken] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedPlaylist, setExportedPlaylist] = useState<{ url: string; name: string } | null>(null);
  // Album art resolution
  const [albumArtMap, setAlbumArtMap] = useState<Record<string, string>>({});
  // iTunes preview URL fallback
  const [previewUrlMap, setPreviewUrlMap] = useState<Record<string, string>>({});
  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPlaylistName, setExportPlaylistName] = useState<string>(`QRate Event ${event.code} - Top Songs`);
  const [exportSource, setExportSource] = useState<'top' | 'ai'>('top');
  
  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem('dj_player_volume');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [isLoading, setIsLoading] = useState(false);
  
  // Helpers: shuffle (no mock song generation)
  const shuffle = <T,>(arr: T[]) => arr
    .map((a) => ({ sort: Math.random(), value: a }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);

  const finalizeRecommendations = (list: Track[]): Track[] => {
    const shuffled = shuffle(list);
    return shuffled; // Show all recommendations, no artificial limit
  };
  
  // Sort and filter recommendations based on current track for better transitions
  const sortedRecommendations = useMemo(() => {
    // Don't re-sort on every song change - only sort when explicitly changing sort mode or recommendations change
    if (!currentQueue[currentSongIndex] || recommendationSort === 'score') {
      return recommendations;
    }
    
    const currentTrack = currentQueue[currentSongIndex];
    const currentBPM = currentTrack.metadata?.bpm || currentTrack.energy || 120;
    
    return [...recommendations].sort((a, b) => {
      const aBPM = a.metadata?.bpm || a.energy || 120;
      const bBPM = b.metadata?.bpm || b.energy || 120;
      const aDiff = Math.abs(aBPM - currentBPM);
      const bDiff = Math.abs(bBPM - currentBPM);
      return aDiff - bDiff; // Sort by BPM closeness to current track
    });
  }, [recommendations, recommendationSort]); // Removed currentQueue and currentSongIndex to prevent flicker on every song change

  // Handle DJ OAuth callback for Spotify (and restore token from storage)
  useEffect(() => {
    const stored = localStorage.getItem('dj_spotify_access_token');
    if (stored) setDjSpotifyToken(stored);
    const storedExport = localStorage.getItem('exported_playlist_info');
    if (storedExport) {
      try { setExportedPlaylist(JSON.parse(storedExport)); } catch {}
    }

    const path = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (path === '/dj/spotify/callback' && code) {
      (async () => {
        try {
          const tokenResponse = await apiCall('/spotify/dj/callback', {
            method: 'POST',
            body: JSON.stringify({ code })
          });
          if (tokenResponse.success && tokenResponse.access_token) {
            setDjSpotifyToken(tokenResponse.access_token);
            localStorage.setItem('dj_spotify_access_token', tokenResponse.access_token);
          }
        } catch (e) {
          console.error('DJ Spotify callback failed', e);
        } finally {
          // Clean URL, stay on current dashboard
          window.history.replaceState({}, '', '/dj/dashboard');
        }
      })();
    }
  }, []);

  const handleExportToSpotify = async () => {
    try {
      setExportError(null);
      setExportedPlaylist(null);
      if (!event?.code) return;
      // If no token, initiate DJ auth
      if (!djSpotifyToken) {
        const resp = await apiCall('/spotify/dj/auth', { method: 'GET' });
        if (resp.success && resp.auth_url) {
          // Persist event code to survive redirect (App already handles restoring)
          localStorage.setItem('spotify_oauth_event_code', event.code);
          window.location.href = resp.auth_url;
          return;
        }
        throw new Error('Failed to start Spotify authorization');
      }

      setIsExporting(true);
      const trackIds = exportSource === 'ai' ? recommendations.map(r => r.id).filter(Boolean) : undefined;
      const response = await apiCall('/spotify/create-playlist', {
        method: 'POST',
        body: JSON.stringify({
          access_token: djSpotifyToken,
          event_code: event.code,
          playlist_name: exportPlaylistName,
          track_ids: trackIds
        })
      });

      if (response.success && response.playlist) {
        setExportedPlaylist({ url: response.playlist.url, name: response.playlist.name });
        try { localStorage.setItem('exported_playlist_info', JSON.stringify({ url: response.playlist.url, name: response.playlist.name })); } catch {}
      } else {
        throw new Error(response.error || 'Failed to create playlist');
      }
    } catch (e: any) {
      setExportError(e.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };
  
  // Fetch insights and recommendations (initial load)
  useEffect(() => {
    const fetchInsights = async () => {
      if (!event?.code) return;
      
      setIsLoadingRecommendations(true);
      try {
        const response = await apiCall(`/events/${event.code}/insights`, {
          method: 'GET',
        });
        
        if (response.success && response.insights) {
          const insightsData = response.insights;
          
          // Update insights - keep random generated values
          setInsights(prev => ({
            totalGuests: insightsData.totalGuests || event.preferences.length,
            averageAge: prev.averageAge, // Keep random generated value
            topGenres: prev.topGenres, // Keep mock genres
            energyLevel: prev.energyLevel, // Keep random generated value
            moodScore: prev.moodScore // Keep random generated value
          }));
          
          // Gate data by guest presence
          const guestCount = insightsData.totalGuests || 0;
          if (guestCount === 0) {
            setRecommendations([]);
            setTopSongs([]);
          } else {
            // When guests present, refresh top songs
            try {
              const top = await apiCall(`/events/${event.code}/top-songs`, { method: 'GET' });
              if (top.success && top.songs) {
                const formattedSongs: Track[] = top.songs.map((song: any, index: number) => ({
                  id: song.id || song.spotifyTrackId || `song-${index}`,
                  title: song.title || song.track_name,
                  artist: song.artist || song.artist_name,
                  album: song.album || song.album_name || '',
                  duration: '0:00',
                  matchScore: song.frequency ? Math.min(song.frequency * 10, 100) : 0,
                  reasons: [`Appeared ${song.frequency || 1} time${(song.frequency || 1) > 1 ? 's' : ''} in guest playlists`],
                  energy: song.popularity || 0,
                  danceability: 0,
                  source: 'spotify',
                  previewUrl: song.preview_url || null
                }));
                setTopSongs(formattedSongs);
              }
            } catch {}
          }

          // Format recommendations
          if (insightsData.recommendations && Array.isArray(insightsData.recommendations)) {
            const formattedRecommendations: Track[] = insightsData.recommendations.map((rec: any) => ({
              id: rec.id || rec.spotify_track_id || `rec-${Math.random()}`,
              title: rec.title || rec.name,
              artist: rec.artist || rec.artist_name || 'Unknown Artist',
              album: rec.album || rec.album_name || '',
              duration: rec.duration || '0:00',
              matchScore: rec.matchScore || rec.match_score || 0,
              reasons: rec.reasons || [],
              energy: rec.energy || 0,
              danceability: rec.danceability || 0,
              source: rec.source || 'ai',
              previewUrl: rec.preview_url || null,
              metadata: {
                bpm: rec.bpm || rec.analysis?.bpm,
                key: rec.key || rec.analysis?.key,
                energy: rec.energy || 0,
                danceability: rec.danceability || 0
              }
            }));
            setRecommendations(finalizeRecommendations(formattedRecommendations));
          }
        }
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setIsLoadingRecommendations(false);
      }
    };
    
    fetchInsights();
  }, [event?.code]);

  // Resolve album art for current lists (recommendations, topSongs, queue)
  useEffect(() => {
    const run = async () => {
      const pending: Record<string, { id: string; title: string; artist: string }> = {};
      [...recommendations, ...topSongs, ...currentQueue].forEach((t) => {
        if (!albumArtMap[t.id]) pending[t.id] = { id: t.id, title: t.title, artist: t.artist };
      });
      const list = Object.values(pending);
      if (list.length === 0) return;
      const resolved = await resolveAlbumArts(list);
      if (Object.keys(resolved).length > 0) setAlbumArtMap((prev) => ({ ...prev, ...resolved }));
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations, topSongs, currentQueue]);

  // Resolve iTunes preview URLs for tracks without Spotify previews
  useEffect(() => {
    const run = async () => {
      // Find tracks that need preview URLs
      const needsPreview: Array<{ id: string; title: string; artist: string }> = [];
      [...recommendations, ...topSongs, ...currentQueue].forEach((t) => {
        // Only fetch if:
        // 1. No Spotify preview URL
        // 2. Haven't already fetched iTunes preview
        // 3. Have valid title and artist
        if (!t.previewUrl && !previewUrlMap[t.id] && t.title && t.artist) {
          needsPreview.push({ id: t.id, title: t.title, artist: t.artist });
        }
      });
      
      if (needsPreview.length === 0) return;
      
      // Resolve preview URLs in batches of 10 to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < needsPreview.length; i += batchSize) {
        const batch = needsPreview.slice(i, i + batchSize);
        const resolved = await resolvePreviewUrls(batch);
        if (Object.keys(resolved).length > 0) {
          setPreviewUrlMap((prev) => ({ ...prev, ...resolved }));
        }
        // Small delay between batches to respect rate limits
        if (i + batchSize < needsPreview.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendations, topSongs, currentQueue]);
  
  // Removed Supabase realtime; polling above keeps UI fresh

  // --- Spotify feasibility (no playback) ---
  const [feasibility, setFeasibility] = useState<{ httpsOk: boolean; premium?: boolean; token?: boolean }>(() => ({
    httpsOk: window.location.protocol === 'https:'
  }));

  useEffect(() => {
    const check = async () => {
      const httpsOk = window.location.protocol === 'https:';
      if (!djSpotifyToken) {
        setFeasibility({ httpsOk, token: false });
        return;
      }
      try {
        const resp = await fetch('https://api.spotify.com/v1/me', {
          headers: { Authorization: `Bearer ${djSpotifyToken}` }
        });
        if (!resp.ok) {
          setFeasibility({ httpsOk, token: false });
          return;
        }
        const me = await resp.json();
        const premium = (me?.product || '').toLowerCase() === 'premium';
        setFeasibility({ httpsOk, premium, token: true });
      } catch {
        setFeasibility({ httpsOk, token: true });
      }
    };
    check();
  }, [djSpotifyToken]);
  
  // Update insights, recommendations, and top songs when song changes (instead of polling)
  useEffect(() => {
    if (!event?.code) return;
    
    const updateData = async () => {
      try {
        const response = await apiCall(`/events/${event.code}/insights`, {
          method: 'GET',
        });
        
        if (response.success && response.insights) {
          const insightsData = response.insights;
          
          // Only update insights if data actually changed - KEEP ALL MOCK VALUES
          setInsights(prev => {
            const newInsights = {
              totalGuests: insightsData.totalGuests || 0,
              averageAge: prev.averageAge, // Keep random generated value
              topGenres: prev.topGenres, // Keep mock genres
              energyLevel: prev.energyLevel, // Keep random generated value
              moodScore: prev.moodScore // Keep random generated value
            };
            // Only update if totalGuests changed
            if (prev.totalGuests !== newInsights.totalGuests) {
              return newInsights;
            }
            return prev; // No change, prevent re-render
          });
          
          const guestCount = insightsData.totalGuests || 0;
          if (guestCount === 0) {
            setRecommendations([]);
            setTopSongs([]);
          } else {
            try {
              const top = await apiCall(`/events/${event.code}/top-songs`, { method: 'GET' });
              if (top.success && top.songs) {
                const formattedSongs: Track[] = top.songs.map((song: any, index: number) => ({
                  id: song.id || song.spotifyTrackId || `song-${index}`,
                  title: song.title || song.track_name,
                  artist: song.artist || song.artist_name,
                  album: song.album || song.album_name || '',
                  duration: '0:00',
                  matchScore: song.frequency ? Math.min(song.frequency * 10, 100) : 0,
                  reasons: [`Appeared ${song.frequency || 1} time${(song.frequency || 1) > 1 ? 's' : ''} in guest playlists`],
                  energy: song.popularity || 0,
                  danceability: 0,
                  source: 'spotify',
                  previewUrl: song.preview_url || null
                }));
                // Only update if data actually changed
                setTopSongs(prev => {
                  const prevIds = prev.map(s => s.id).join(',');
                  const newIds = formattedSongs.map(s => s.id).join(',');
                  if (prevIds !== newIds || prev.length !== formattedSongs.length) {
                    return formattedSongs;
                  }
                  return prev;
                });
              }
            } catch {}
          }

          if (insightsData.recommendations && Array.isArray(insightsData.recommendations)) {
            const formattedRecommendations: Track[] = insightsData.recommendations.map((rec: any) => ({
              id: rec.id || rec.spotify_track_id || `rec-${Math.random()}`,
              title: rec.title || rec.name,
              artist: rec.artist || rec.artist_name || 'Unknown Artist',
              album: rec.album || rec.album_name || '',
              duration: rec.duration || '0:00',
              matchScore: rec.matchScore || rec.match_score || 0,
              reasons: rec.reasons || [],
              energy: rec.energy || 0,
              danceability: rec.danceability || 0,
              source: rec.source || 'ai',
              previewUrl: rec.preview_url || null,
              metadata: {
                bpm: rec.bpm || rec.analysis?.bpm,
                key: rec.key || rec.analysis?.key,
                energy: rec.energy || 0,
                danceability: rec.danceability || 0
              }
            }));
            // Only update if data actually changed
            setRecommendations(prev => {
              const prevIds = prev.map(r => r.id).join(',');
              const newIds = formattedRecommendations.map(r => r.id).join(',');
              if (prevIds !== newIds || prev.length !== formattedRecommendations.length) {
                return formattedRecommendations;
              }
              return prev;
            });
          }
        }
      } catch (error) {
        console.error('Failed to update insights:', error);
      }
    };
    
    // Fetch initially
    updateData();
    
    // Then poll every 3 minutes
    const pollInterval = setInterval(() => {
      updateData();
    }, 3 * 60 * 1000); // 3 minutes
    
    return () => clearInterval(pollInterval);
  }, [event?.code]);
  
  // Fetch top songs from guests (initial load)
  useEffect(() => {
    const fetchTopSongs = async () => {
      if (!event?.code) return;
      
      setIsLoadingTopSongs(true);
      try {
        const response = await apiCall(`/events/${event.code}/top-songs`, {
          method: 'GET',
        });
        
        if (response.success && response.songs) {
          const formattedSongs: Track[] = response.songs.map((song: any, index: number) => ({
            id: song.id || song.spotifyTrackId || `song-${index}`,
            title: song.title || song.track_name,
            artist: song.artist || song.artist_name,
            album: song.album || song.album_name || '',
            duration: '0:00', // Duration not available from API
            matchScore: song.frequency ? Math.min(song.frequency * 10, 100) : 0,
            reasons: [`Appeared ${song.frequency || 1} time${(song.frequency || 1) > 1 ? 's' : ''} in guest playlists`],
            energy: song.popularity || 0,
            danceability: 0,
            source: 'spotify',
            previewUrl: song.preview_url || null
          }));
          const randomized = shuffle(formattedSongs);
          setTopSongs(randomized);
        }
      } catch (error) {
        console.error('Failed to fetch top songs:', error);
      } finally {
        setIsLoadingTopSongs(false);
      }
    };
    
    fetchTopSongs();
  }, [event?.code]);
  
  
  // Auto-add playlist songs to queue when playlist is connected
  useEffect(() => {
    if (connectedPlaylist && connectedPlaylist.tracks) {
      setCurrentQueue(prev => [...prev, ...connectedPlaylist.tracks.slice(0, 5)]);
    }
  }, [connectedPlaylist]);

  const addToQueue = (song: Track) => {
    setCurrentQueue([...currentQueue, song]);
    // Add creative feedback
    setAddedSongs(prev => new Set([...prev, song.id]));
    // Remove the feedback after animation
    setTimeout(() => {
      setAddedSongs(prev => {
        const newSet = new Set(prev);
        newSet.delete(song.id);
        return newSet;
      });
    }, 2000);
  };

  const removeFromQueue = (songId: string) => {
    setCurrentQueue(currentQueue.filter(song => song.id !== songId));
    // Adjust current song index if needed
    if (currentSongIndex >= currentQueue.length - 1) {
      setCurrentSongIndex(Math.max(0, currentQueue.length - 2));
    }
  };

  const skipToNext = () => {
    if (currentSongIndex < currentQueue.length - 1) {
      setCurrentSongIndex(currentSongIndex + 1);
    }
  };

  // Audio player functions
  const playTrack = (track: Track) => {
    if (!audioRef.current) return;
    
    if (!track.previewUrl) {
      console.warn('No preview URL for track:', track.title);
      return;
    }

    setIsLoading(true);
    audioRef.current.src = track.previewUrl;
    audioRef.current.volume = volume;
    
    audioRef.current.play().then(() => {
      setIsPlaying(true);
      setIsLoading(false);
    }).catch((error) => {
      console.error('Failed to play track:', error);
      setIsLoading(false);
    });
  };

  const pauseTrack = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    const currentTrack = currentQueue[currentSongIndex];
    
    // Get available preview URL (Spotify first, then iTunes fallback)
    const previewUrl = currentTrack?.previewUrl || previewUrlMap[currentTrack?.id || ''];
    
    // If track has preview URL, play it normally
    if (previewUrl) {
      if (!audioRef.current) return;
      
      // If switching from a different track or first time, load the preview
      if (audioRef.current.src !== previewUrl) {
        playTrack({ ...currentTrack, previewUrl } as Track);
      } else if (isPlaying) {
        pauseTrack();
      } else {
        audioRef.current.play().then(() => setIsPlaying(true));
      }
    } else {
      // No preview URL - open track in Spotify
      if (currentTrack?.id) {
        window.open(`https://open.spotify.com/track/${currentTrack.id}`, '_blank');
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setVolume(newVolume);
    localStorage.setItem('dj_player_volume', newVolume.toString());
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleTrackEnd = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    // Auto-advance to next track
    skipToNext();
  };

  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Request Analytics Component - MOCK DATA ONLY to prevent flicker
  const RequestAnalytics = ({ eventCode }: { eventCode: string }) => {
    // Generate random mock analytics data once per component mount
    const [mockAnalytics] = useState(() => ({
      totalRequests: Math.floor(Math.random() * 30) + 10,
      totalUpvotes: Math.floor(Math.random() * 100) + 50,
      avgWaitTimeMinutes: (Math.random() * 15 + 5).toFixed(1),
      statusBreakdown: {
        pending: Math.floor(Math.random() * 15) + 3,
        accepted: Math.floor(Math.random() * 10) + 2,
        queued: Math.floor(Math.random() * 8) + 1,
        played: Math.floor(Math.random() * 20) + 5
      }
    }));

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-effect rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-[var(--neon-cyan)]">{mockAnalytics.totalRequests}</div>
            <div className="text-xs text-gray-400">Total Requests</div>
          </div>
          <div className="glass-effect rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-green-400">{mockAnalytics.totalUpvotes}</div>
            <div className="text-xs text-gray-400">Total Upvotes</div>
          </div>
        </div>
        
        <div className="glass-effect rounded-lg p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">Avg Wait Time</span>
            <span className="text-sm font-bold text-white">{mockAnalytics.avgWaitTimeMinutes} min</span>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="text-xs text-gray-400 mb-1">Status Breakdown</div>
          {Object.entries(mockAnalytics.statusBreakdown).map(([status, count]: [string, any]) => (
            <div key={status} className="flex items-center justify-between text-xs">
              <span className="text-gray-300 capitalize">{status}</span>
              <span className="text-white font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Best Next Track Recommendation Component - MOCK DATA ONLY to prevent flicker
  const BestNextTrackRecommendation = ({ eventCode, currentTrack, availableSongs, albumArtMap, queueLength }: { eventCode: string; currentTrack?: Track; availableSongs: Track[]; albumArtMap: Record<string, string>; queueLength: number }) => {
    const [recommendation, setRecommendation] = useState<any>(null);

    useEffect(() => {
      // Pick a random song from availableSongs (top songs or recommendations)
      if (availableSongs.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        const selectedSong = availableSongs[randomIndex];
        
        const songMetadata = selectedSong.metadata || {};
        const currentMetadata = currentTrack?.metadata || {};
        
        // Mock analysis
        let bpmDiff = 0;
        let compatibilityScore = 75;
        
        if (currentMetadata.bpm && songMetadata.bpm) {
          bpmDiff = Math.abs(currentMetadata.bpm - songMetadata.bpm);
          if (bpmDiff <= 5) compatibilityScore = 95;
          else if (bpmDiff <= 10) compatibilityScore = 85;
          else if (bpmDiff <= 20) compatibilityScore = 75;
          else compatibilityScore = 65;
        }
        
        setRecommendation({
          requestId: selectedSong.id,
          trackName: selectedSong.title,
          artistName: selectedSong.artist,
          compatibilityScore,
          bpmDiff,
          analysis: songMetadata.bpm ? { bpm: songMetadata.bpm, key: songMetadata.key } : null,
          reason: 'AI recommendation'
        });
      } else {
        setRecommendation(null);
      }
      // Update when currentTrack changes OR when queue length changes (new song added)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventCode, currentTrack?.id, queueLength]);

    if (!recommendation) {
      return (
        <div className="text-center py-4 space-y-2">
          <p className="text-sm text-gray-400">
            No requests available
          </p>
          <p className="text-xs text-gray-500">
            Guest requests will appear here
          </p>
        </div>
      );
    }

    // Calculate transition quality and visual indicators
    const currentMetadata = currentTrack?.metadata || {};
    const quality = getBPMDifferenceColor(recommendation.bpmDiff || 0);
    const progression = recommendation.analysis && currentMetadata.energy ? 
      getEnergyProgression(currentMetadata.energy, recommendation.analysis.energy) : null;
    const bpmColorClass = quality === 'green' ? 'border-green-500 bg-green-500/10' :
                         quality === 'lime' ? 'border-emerald-500 bg-emerald-500/10' :
                         quality === 'yellow' ? 'border-yellow-500 bg-yellow-500/10' :
                         quality === 'orange' ? 'border-orange-500 bg-orange-500/10' :
                         'border-red-500 bg-red-500/10';

    return (
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          {/* Album Art */}
          <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={albumArtMap[recommendation.requestId] || `https://picsum.photos/seed/${encodeURIComponent(recommendation.trackName)}/128/128`}
              alt={recommendation.trackName}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-sm mb-1 truncate">{recommendation.trackName}</h4>
            <p className="text-xs text-gray-300 truncate">{recommendation.artistName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border-[var(--neon-cyan)]/30 text-xs">
            {recommendation.compatibilityScore}% match
          </Badge>
          {recommendation.analysis && (
            <>
              {recommendation.analysis.bpm && (
                <Badge className={`text-[10px] px-1.5 py-0.5 border-2 ${bpmColorClass}`}>
                  🎚️ {recommendation.analysis.bpm} BPM
                  {recommendation.bpmDiff > 0 && ` (${recommendation.bpmDiff > 0 ? '+' : ''}${recommendation.bpmDiff})`}
                </Badge>
              )}
              {recommendation.analysis.key && (
                <Badge className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white border-white/20">
                  🎹 {recommendation.analysis.key}
                </Badge>
              )}
            </>
          )}
          {progression && (
            <Badge className={`text-[10px] px-1.5 py-0.5 ${
              progression === 'building' ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/40' :
              progression === 'winding_down' ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/40' :
              'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/40'
            }`}>
              {progression === 'building' ? '⬆️ Building' :
               progression === 'winding_down' ? '⬇️ Winding' :
               '➡️ Maintaining'}
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-400 italic">{recommendation.reason}</p>
        <Button
          size="sm"
          onClick={async () => {
            // Add to queue directly
            const track: Track = {
              id: recommendation.requestId,
              title: recommendation.trackName,
              artist: recommendation.artistName,
              album: '',
              duration: '0:00',
              source: 'spotify',
              matchScore: recommendation.compatibilityScore,
              metadata: recommendation.analysis
            };
            
            // Try to update request status if it's a real request
            if (recommendation.reason === 'Random selection') {
              try {
                await apiCall(`/events/${eventCode}/requests/${recommendation.requestId}`, {
                  method: 'PUT',
                  body: JSON.stringify({ status: 'queued' })
                });
              } catch (err) {
                // Ignore if not a real request
                console.log('Could not update request status (may be mock data)');
              }
            }
            
            addToQueue(track);
          }}
          className="w-full bg-gradient-to-r from-[var(--neon-purple)] to-[var(--neon-pink)] text-white hover:shadow-lg hover:shadow-[var(--neon-purple)]/30"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to Queue
        </Button>
      </div>
    );
  };

  const addPlaylistToQueue = (playlist: Playlist) => {
    setConnectedPlaylist(playlist);
    setCurrentQueue([...currentQueue, ...playlist.tracks]);
  };

  // Play track when current song index changes
  useEffect(() => {
    if (!audioRef.current || currentQueue.length === 0) return;
    
    const currentTrack = currentQueue[currentSongIndex];
    // Get available preview URL (Spotify first, then iTunes fallback)
    const previewUrl = currentTrack?.previewUrl || previewUrlMap[currentTrack?.id || ''];
    
    if (currentTrack && previewUrl) {
      playTrack({ ...currentTrack, previewUrl } as Track);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSongIndex, previewUrlMap]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const moveItem = (dragIndex: number, hoverIndex: number) => {
    const draggedItem = currentQueue[dragIndex];
    const newQueue = [...currentQueue];
    newQueue.splice(dragIndex, 1);
    newQueue.splice(hoverIndex, 0, draggedItem);
    setCurrentQueue(newQueue);
    
    // Update current song index if needed
    if (dragIndex === currentSongIndex) {
      setCurrentSongIndex(hoverIndex);
    } else if (dragIndex < currentSongIndex && hoverIndex >= currentSongIndex) {
      setCurrentSongIndex(currentSongIndex - 1);
    } else if (dragIndex > currentSongIndex && hoverIndex <= currentSongIndex) {
      setCurrentSongIndex(currentSongIndex + 1);
    }
  };

  const playSong = (index: number) => {
    setCurrentSongIndex(index);
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'ai':
        return <Badge className="text-xs bg-gradient-to-r from-[var(--neon-purple)] to-[var(--neon-pink)] text-white border-0">
          <Sparkles className="w-3 h-3 mr-1" />
          AI
        </Badge>;
      case 'spotify':
        return <Badge className="text-xs bg-gradient-to-r from-green-500 to-green-600 text-white border-0">
          <SpotifyLogo size={12} />
          <span className="ml-1">Spotify</span>
        </Badge>;
      case 'apple':
        return <Badge className="text-xs bg-gradient-to-r from-gray-600 to-gray-700 text-white border-0">
          <Music className="w-3 h-3 mr-1" />
          Apple
        </Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--background)] via-[var(--card)] to-[var(--popover)]">
      <div className="container mx-auto px-4 py-6">
        {/* Header - Redesigned */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          {/* Top Row: Back button and Action Buttons */}
          <div className="flex items-center justify-between mb-4 gap-4">
            <Button 
              onClick={onBack} 
              className="glass-effect hover:bg-[var(--neon-pink)]/20 border border-[var(--glass-border)] hover:border-[var(--neon-pink)]/50 text-white transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <Button 
                size="sm" 
                onClick={onConnectPlaylist}
                className={`glass-effect border transition-all duration-300 ${
                  connectedPlaylist 
                    ? "border-[var(--neon-cyan)]/50 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10" 
                    : "border-[var(--glass-border)] text-white hover:border-[var(--neon-pink)]/50 hover:bg-[var(--neon-pink)]/10"
                }`}
              >
                <Headphones className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">
                  {connectedPlaylist ? "Change" : "Connect"}
                </span>
              </Button>
              
              <Button 
                size="sm" 
                onClick={onShowQRCode}
                className="glass-effect border border-[var(--glass-border)] hover:border-[var(--neon-purple)]/50 hover:bg-[var(--neon-purple)]/10 text-white transition-all duration-300"
              >
                <QrCode className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">QR</span>
              </Button>
              
              <Button 
                size="sm"
                onClick={() => { setExportError(null); setShowExportModal(true); }}
                disabled={isExporting}
                className={`glass-effect border transition-all duration-300 ${djSpotifyToken ? 'border-green-500/40 text-green-400 hover:bg-green-500/10' : 'border-white/20 text-white hover:bg-white/10'}`}
              >
                <Music className="w-4 h-4 mr-1" />
                {isExporting ? 'Exporting…' : 'Export'}
              </Button>
              
              <div className="flex items-center gap-2 glass-effect px-3 py-2 rounded-lg border border-[var(--glass-border)]">
                <Users className="w-4 h-4 text-[var(--neon-cyan)]" />
                <span className="text-sm text-white font-medium">{insights.totalGuests}</span>
              </div>
            </div>
          </div>

          {/* Event Title Section with Prominent Live Indicator */}
          <div className="glass-section p-6 relative overflow-hidden">
            {/* Animated Background Pulse for Live Indicator */}
            <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
              <div className="absolute top-4 right-4 w-32 h-32 bg-green-500/10 rounded-full blur-2xl animate-pulse"></div>
            </div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h1 className="text-3xl md:text-4xl font-bold text-white break-words">
                      {event.name}
                    </h1>
                    {/* Prominent Live Session Indicator with Green Icon */}
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500/30 via-emerald-500/30 to-green-400/30 border-2 border-green-400/50 shadow-lg shadow-green-500/30 backdrop-blur-sm"
                    >
                      <div className="relative flex items-center justify-center w-6 h-6">
                        <div className="w-4 h-4 bg-green-400 rounded-full animate-ping absolute"></div>
                        <div className="w-4 h-4 bg-green-400 rounded-full relative shadow-lg shadow-green-400/50"></div>
                      </div>
                      <span className="text-sm font-bold text-green-100 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-green-300 animate-pulse" />
                        LIVE
                      </span>
                    </motion.div>
                  </div>
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="flex items-center gap-1.5 glass-effect px-3 py-1.5 rounded-lg">
                      <Music className="w-4 h-4 text-[var(--neon-cyan)]" />
                      <span className="text-white/90 font-medium">{event.theme}</span>
                    </span>
                    <span className="flex items-center gap-1.5 glass-effect px-3 py-1.5 rounded-lg">
                      <Hash className="w-4 h-4 text-[var(--neon-purple)]" />
                      <span className="text-white/90 font-mono font-semibold">{event.code}</span>
                    </span>
                    <span className="flex items-center gap-1.5 glass-effect px-3 py-1.5 rounded-lg border border-green-500/30">
                      <Users className="w-4 h-4 text-green-400" />
                      <span className="text-white/90 font-semibold">{insights.totalGuests}</span>
                      <span className="text-xs text-gray-400">guests</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

      {exportedPlaylist && (
        <div className="mb-6">
          <Card className="glass-effect border-green-500/40">
            <CardContent className="p-3 flex items-center justify-between gap-3 text-sm">
              <div className="text-green-300">
                Exported to <a href={exportedPlaylist.url} target="_blank" rel="noreferrer" className="underline text-green-400">{exportedPlaylist.name}</a>
              </div>
              <Button size="sm" variant="outline" onClick={() => { setExportedPlaylist(null); try { localStorage.removeItem('exported_playlist_info'); } catch {} }}>
                Dismiss
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Content - Queue First for DJs */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Quick Queue Overview - Most Important for DJ */}
          {currentQueue.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="glass-effect-strong glass-effect-accent-cyan rounded-xl p-6 border-2 border-[var(--neon-cyan)]/30"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Volume2 className="w-6 h-6 text-[var(--neon-cyan)]" />
                    Now Playing
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Track {currentSongIndex + 1} of {currentQueue.length} in queue
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={togglePlayPause}
                    disabled={!currentQueue[currentSongIndex]}
                    className="glass-effect border-[var(--glass-border)] text-white hover:bg-[var(--neon-cyan)]/20 hover:border-[var(--neon-cyan)]"
                  >
                    {(() => {
                      const track = currentQueue[currentSongIndex];
                      const hasPreview = track?.previewUrl || previewUrlMap[track?.id || ''];
                      if (hasPreview) {
                        return (
                          <>
                            {isLoading ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : isPlaying ? (
                              <Pause className="w-4 h-4 mr-2" />
                            ) : (
                              <Play className="w-4 h-4 mr-2" />
                            )}
                            {isPlaying ? 'Pause' : 'Play'}
                          </>
                        );
                      } else {
                        return (
                          <>
                            <SpotifyLogo size={16} />
                            <span className="ml-2">Open in Spotify</span>
                          </>
                        );
                      }
                    })()}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={skipToNext}
                    disabled={currentQueue.length === 0 || currentSongIndex >= currentQueue.length - 1}
                    className="glass-effect border-[var(--glass-border)] text-white hover:bg-[var(--neon-cyan)]/20 hover:border-[var(--neon-cyan)]"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Skip
                  </Button>
                </div>
              </div>
              
              {currentQueue[currentSongIndex] && (
                <div className="glass-effect rounded-xl p-4 border border-[var(--neon-cyan)]/20">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={albumArtMap[currentQueue[currentSongIndex].id] || `https://picsum.photos/seed/${encodeURIComponent(currentQueue[currentSongIndex].id)}/160/160`}
                        alt={currentQueue[currentSongIndex].title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-blue)] flex items-center justify-center animate-pulse">
                          <Volume2 className="w-4 h-4 text-black" />
                        </div>
                        <h3 className="text-xl font-bold text-white truncate">{currentQueue[currentSongIndex].title}</h3>
                        {getSourceBadge(currentQueue[currentSongIndex].source)}
                      </div>
                      <p className="text-gray-300 mb-1">{currentQueue[currentSongIndex].artist}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span>{currentQueue[currentSongIndex].album}</span>
                        {currentQueue[currentSongIndex].duration && <span>• {currentQueue[currentSongIndex].duration}</span>}
                      </div>
                      
                      {/* Progress Bar */}
                      {(currentQueue[currentSongIndex].previewUrl || previewUrlMap[currentQueue[currentSongIndex].id]) && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                            <span>{Math.floor(currentTime)}s</span>
                            <span className="flex items-center gap-1">
                              <Music className="w-3 h-3" />
                              30s Preview
                            </span>
                            <span>30s</span>
                          </div>
                          <Progress value={(currentTime / 30) * 100} className="h-2 bg-[var(--glass-bg)] border border-[var(--glass-border)]" />
                        </div>
                      )}
                      
                      {(!currentQueue[currentSongIndex].previewUrl && !previewUrlMap[currentQueue[currentSongIndex].id]) && (
                        <div className="mt-3">
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            <Music className="w-3 h-3 mr-1" />
                            Preview not available
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Volume Control */}
                  {(currentQueue[currentSongIndex].previewUrl || previewUrlMap[currentQueue[currentSongIndex].id]) && (
                    <div className="flex items-center gap-3 mt-4 p-3 glass-effect rounded-lg">
                      <div className="flex items-center gap-2 flex-1">
                        {volume === 0 ? (
                          <VolumeX className="w-4 h-4 text-gray-400" />
                        ) : volume < 0.5 ? (
                          <Volume1 className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-gray-400" />
                        )}
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={volume}
                          onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                          className="flex-1 h-1 bg-[var(--glass-bg)] rounded-lg appearance-none cursor-pointer accent-[var(--neon-cyan)]"
                        />
                        <span className="text-xs text-gray-400 w-10">{Math.round(volume * 100)}%</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {currentQueue.length > 1 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400 font-medium">Next Up</span>
                    <span className="text-xs text-gray-500">{currentQueue.length - currentSongIndex - 1} more tracks</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {currentQueue.slice(currentSongIndex + 1, currentSongIndex + 4).map((song, idx) => (
                      <motion.div
                        key={song.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: idx * 0.1 }}
                        className="flex items-center gap-3 glass-effect rounded-lg p-2 text-sm hover:bg-white/5 transition-colors"
                      >
                        <span className="text-gray-400 font-mono w-6">{currentSongIndex + idx + 2}</span>
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                          <img
                            src={albumArtMap[song.id] || `https://picsum.photos/seed/${encodeURIComponent(song.id)}/80/80`}
                            alt={song.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white truncate font-medium">{song.title}</p>
                          <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <Tabs defaultValue={currentQueue.length > 0 ? "queue" : "recommendations"} className="w-full">
            <TabsList className="grid w-full grid-cols-4 glass-effect-strong p-1">
              <TabsTrigger 
                value="recommendations" 
                className="text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--neon-purple)] data-[state=active]:to-[var(--neon-pink)] data-[state=active]:text-white transition-all duration-300"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                AI Suggestions
              </TabsTrigger>
              <TabsTrigger 
                value="top-songs" 
                className="text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--neon-yellow)] data-[state=active]:to-[var(--neon-pink)] data-[state=active]:text-white transition-all duration-300"
              >
                <Star className="w-4 h-4 mr-2" />
                Top Songs ({topSongs.length})
              </TabsTrigger>
              <TabsTrigger 
                value="requests" 
                className="text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--neon-pink)] data-[state=active]:to-[var(--neon-purple)] data-[state=active]:text-white transition-all duration-300"
              >
                <Music className="w-4 h-4 mr-2" />
                Requests
              </TabsTrigger>
              <TabsTrigger 
                value="queue" 
                className="text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--neon-cyan)] data-[state=active]:to-[var(--neon-blue)] data-[state=active]:text-black transition-all duration-300"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Queue ({currentQueue.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="recommendations" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[var(--neon-purple)]" />
                    AI Recommendations
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    AI-curated tracks based on guest preferences and real-time crowd energy
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {currentQueue[currentSongIndex] && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRecommendationSort(recommendationSort === 'score' ? 'bpm' : 'score')}
                      className="glass-effect border-[var(--glass-border)] text-white hover:bg-[var(--neon-cyan)]/20 hover:border-[var(--neon-cyan)]"
                    >
                      {recommendationSort === 'score' ? 'Sort by Match' : 'Sort by BPM'}
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={async () => {
                      setIsLoadingRecommendations(true);
                      try {
                        const response = await apiCall(`/events/${event.code}/insights`, {
                          method: 'GET',
                        });
                        if (response.success && response.insights?.recommendations) {
                          const formattedRecommendations: Track[] = response.insights.recommendations.map((rec: any) => ({
                            id: rec.id || rec.spotify_track_id || `rec-${Math.random()}`,
                            title: rec.title || rec.name,
                            artist: rec.artist || rec.artist_name || 'Unknown Artist',
                            album: rec.album || rec.album_name || '',
                            duration: rec.duration || '0:00',
                            matchScore: rec.matchScore || rec.match_score || 0,
                            reasons: rec.reasons || [],
                            energy: rec.energy || 0,
                            danceability: rec.danceability || 0,
                            source: rec.source || 'ai',
                            previewUrl: rec.preview_url || null,
                            metadata: {
                              bpm: rec.bpm || rec.analysis?.bpm,
                              key: rec.key || rec.analysis?.key,
                              energy: rec.energy || 0,
                              danceability: rec.danceability || 0
                            }
                          }));
                          setRecommendations(finalizeRecommendations(formattedRecommendations));
                        }
                      } catch (error) {
                        console.error('Failed to refresh recommendations:', error);
                      } finally {
                        setIsLoadingRecommendations(false);
                      }
                    }} 
                    disabled={isLoadingRecommendations}
                    className="glass-effect border-[var(--glass-border)] text-white hover:bg-[var(--neon-purple)]/20 hover:border-[var(--neon-purple)]"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingRecommendations ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              {isLoadingRecommendations ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="glass-effect-strong">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-gray-700/30 rounded-lg animate-shimmer"></div>
                          <div className="flex-1 space-y-3">
                            <div className="space-y-2">
                              <div className="h-5 bg-gray-700/30 rounded animate-shimmer w-3/4"></div>
                              <div className="h-4 bg-gray-700/20 rounded animate-shimmer w-1/2"></div>
                            </div>
                            <div className="flex gap-2">
                              <div className="h-6 bg-gray-700/20 rounded-full animate-shimmer w-20"></div>
                              <div className="h-6 bg-gray-700/20 rounded-full animate-shimmer w-20"></div>
                              <div className="h-6 bg-gray-700/20 rounded-full animate-shimmer w-20"></div>
                            </div>
                            <div className="h-4 bg-gray-700/20 rounded animate-shimmer w-full"></div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : recommendations.length === 0 ? (
                <Card className="glass-effect-strong">
                  <CardContent className="p-8 text-center">
                    <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      AI recommendations will appear here based on guest preferences
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1.5">
                      Connect Spotify to get personalized recommendations
                      <SpotifyLogo size={14} />
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {exportedPlaylist && (
                    <Card className="glass-effect border-green-500/40">
                      <CardContent className="p-3 text-sm">
                        Exported to <a href={exportedPlaylist.url} target="_blank" rel="noreferrer" className="underline text-green-400">{exportedPlaylist.name}</a>
                      </CardContent>
                    </Card>
                  )}
                  {!exportedPlaylist && exportError && (
                    <Card className="glass-effect border-[var(--destructive)]/40">
                      <CardContent className="p-3 text-[var(--destructive)] text-sm">{exportError}</CardContent>
                    </Card>
                  )}
                  {sortedRecommendations.map((song, index) => {
                    // Calculate BPM compatibility if current track is playing
                    const currentTrack = currentQueue[currentSongIndex];
                    const currentBPM = currentTrack?.metadata?.bpm || currentTrack?.energy || 120;
                    const songBPM = song.metadata?.bpm || song.energy || 120;
                    const bpmDiff = Math.abs(currentBPM - songBPM);
                    const quality = getBPMDifferenceColor(bpmDiff);
                    const bpmColorClass = quality === 'green' ? 'border-green-500 bg-green-500/10' :
                                         quality === 'lime' ? 'border-emerald-500 bg-emerald-500/10' :
                                         quality === 'yellow' ? 'border-yellow-500 bg-yellow-500/10' :
                                         quality === 'orange' ? 'border-orange-500 bg-orange-500/10' :
                                         'border-red-500 bg-red-500/10';
                    
                    return (
                      <motion.div
                        key={song.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <Card className={`glass-effect-strong glass-effect-hover glass-effect-accent-purple group ${
                          addedSongs.has(song.id) 
                            ? 'neon-glow border-[var(--neon-cyan)]/50 bg-gradient-to-r from-[var(--neon-cyan)]/5 to-transparent scale-[1.02]' 
                            : ''
                        }`}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 flex gap-3">
                                <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                                  <img
                                    src={albumArtMap[song.id] || `https://picsum.photos/seed/${encodeURIComponent(song.id)}/128/128`}
                                    alt={song.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                                    addedSongs.has(song.id) 
                                      ? 'bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-blue)] animate-pulse' 
                                      : 'bg-gradient-to-br from-[var(--neon-pink)]/20 to-[var(--neon-purple)]/20 group-hover:from-[var(--neon-pink)]/30 group-hover:to-[var(--neon-purple)]/30'
                                  }`}>
                                    {addedSongs.has(song.id) ? (
                                      <CheckCircle className="w-5 h-5 text-black" />
                                    ) : (
                                      <Music className="w-5 h-5 text-[var(--neon-pink)] group-hover:text-[var(--neon-cyan)] transition-colors" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                      <h4 className="font-semibold text-sm text-white group-hover:text-[var(--neon-cyan)] transition-colors truncate max-w-[12rem] sm:max-w-[16rem]">{song.title}</h4>
                                      {getSourceBadge(song.source)}
                                      {addedSongs.has(song.id) && (
                                        <Badge className="bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black text-[10px] px-1.5 py-0.5 animate-pulse">
                                          <Zap className="w-3 h-3 mr-1" />
                                          Added!
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-300 mb-0.5 truncate max-w-[16rem]">{song.artist}</p>
                                    <p className="text-[11px] text-gray-400">{song.duration}</p>
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="flex items-center gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <TrendingUp className="w-4 h-4 text-[var(--neon-cyan)]" />
                                      <span className="text-xs font-bold text-[var(--neon-cyan)]">
                                        {song.matchScore}% match
                                      </span>
                                    </div>
                                    <div className="flex gap-1.5">
                                      <Badge className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-[var(--neon-yellow)]/20 to-[var(--neon-yellow)]/10 text-[var(--neon-yellow)] border border-[var(--neon-yellow)]/30">
                                        ⚡ {song.energy || Math.floor(50 + Math.random()*50)}%
                                      </Badge>
                                      <Badge className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-[var(--neon-purple)]/20 to-[var(--neon-purple)]/10 text-[var(--neon-purple)] border border-[var(--neon-purple)]/30">
                                        💃 {song.danceability || Math.floor(40 + Math.random()*60)}%
                                      </Badge>
                                      {currentQueue[currentSongIndex] && (
                                        <Badge className={`text-[10px] px-1.5 py-0.5 border-2 ${bpmColorClass}`}>
                                          🎚️ {songBPM} BPM
                                          {bpmDiff > 0 && ` (${bpmDiff > 0 ? '+' : ''}${bpmDiff})`}
                                        </Badge>
                                      )}
                                      {!currentQueue[currentSongIndex] && (
                                        <Badge className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-[var(--neon-cyan)]/20 to-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30">
                                          🎚️ {songBPM} BPM
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-[11px] text-gray-400 italic truncate max-w-[20rem]">
                                    {song.reasons?.join(' • ')}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col gap-2 ml-4">
                                <Button 
                                  size="sm" 
                                  onClick={() => addToQueue(song)}
                                  disabled={addedSongs.has(song.id)}
                                  className={`h-8 px-2 text-xs transition-all duration-500 transform hover:scale-105 ${
                                    addedSongs.has(song.id) 
                                      ? 'bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black shadow-lg shadow-[var(--neon-cyan)]/25' 
                                      : 'bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-white hover:shadow-lg hover:shadow-[var(--neon-pink)]/25'
                                  }`}
                                >
                                  {addedSongs.has(song.id) ? (
                                    <>
                                      <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                      Added!
                                    </>
                                  ) : (
                                    <>
                                      <Plus className="w-3.5 h-3.5 mr-1" />
                                      Add to Queue
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="top-songs" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Star className="w-5 h-5 text-[var(--neon-yellow)]" />
                    Crowd Favorites ({topSongs.length})
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Most popular tracks from all guest playlists - guaranteed crowd pleasers
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                  size="sm" 
                  variant="outline"
                  onClick={async () => {
                    setIsLoadingTopSongs(true);
                    try {
                      const response = await apiCall(`/events/${event.code}/top-songs`, {
                        method: 'GET',
                      });
                      if (response.success && response.songs) {
                        const formattedSongs: Track[] = response.songs.map((song: any, index: number) => ({
                          id: song.id || song.spotifyTrackId || `song-${index}`,
                          title: song.title || song.track_name,
                          artist: song.artist || song.artist_name,
                          album: song.album || song.album_name || '',
                          duration: '0:00',
                          matchScore: song.frequency ? Math.min(song.frequency * 10, 100) : 0,
                          reasons: [`Appeared ${song.frequency || 1} time${(song.frequency || 1) > 1 ? 's' : ''} in guest playlists`],
                          energy: song.popularity || 0,
                          danceability: 0,
                          source: 'spotify'
                        }));
                        setTopSongs(formattedSongs);
                      }
                    } catch (error) {
                      console.error('Failed to refresh top songs:', error);
                    } finally {
                      setIsLoadingTopSongs(false);
                    }
                  }}
                  disabled={isLoadingTopSongs}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isLoadingTopSongs ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button size="sm" onClick={() => { setExportError(null); setExportSource('top'); setShowExportModal(true); }} className="glass-effect border border-green-500/40 text-green-400 hover:bg-green-500/10">
                  <Music className="w-4 h-4 mr-1" />
                  Export
                </Button>
                </div>
              </div>

              {isLoadingTopSongs ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="glass-effect-strong">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-gray-700/30 rounded-md animate-shimmer"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-700/30 rounded animate-shimmer w-2/3"></div>
                            <div className="h-3 bg-gray-700/20 rounded animate-shimmer w-1/2"></div>
                            <div className="flex gap-2">
                              <div className="h-5 bg-gray-700/20 rounded-full animate-shimmer w-24"></div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : topSongs.length === 0 ? (
                <Card className="glass-effect-strong">
                  <CardContent className="p-8 text-center">
                    <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No songs yet. Guests can connect their Spotify to contribute!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {topSongs.map((song, index) => (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    >
                      <Card className={`glass-effect-strong glass-effect-hover group ${
                        addedSongs.has(song.id) 
                          ? 'neon-glow border-[var(--neon-cyan)]/50 bg-gradient-to-r from-[var(--neon-cyan)]/5 to-transparent scale-[1.02]' 
                          : ''
                      }`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 flex gap-3">
                              <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                                <img
                                  src={albumArtMap[song.id] || `https://picsum.photos/seed/${encodeURIComponent(song.id)}/128/128`}
                                  alt={song.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 ${
                                  addedSongs.has(song.id) 
                                    ? 'bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-blue)] animate-pulse' 
                                    : 'bg-gradient-to-br from-[var(--neon-yellow)]/20 to-[var(--neon-pink)]/20 group-hover:from-[var(--neon-yellow)]/30 group-hover:to-[var(--neon-pink)]/30'
                                }`}>
                                  {addedSongs.has(song.id) ? (
                                    <CheckCircle className="w-5 h-5 text-black" />
                                  ) : (
                                    <Star className="w-5 h-5 text-[var(--neon-yellow)] group-hover:text-[var(--neon-cyan)] transition-colors" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <h4 className="font-semibold text-sm text-white group-hover:text-[var(--neon-cyan)] transition-colors truncate max-w-[12rem] sm:max-w-[16rem]">{song.title}</h4>
                                    {getSourceBadge(song.source)}
                                    {index < 3 && (
                                      <Badge className="bg-gradient-to-r from-[var(--neon-yellow)] to-[var(--neon-pink)] text-white text-[10px] px-1.5 py-0.5">
                                        #{index + 1}
                                      </Badge>
                                    )}
                                    {addedSongs.has(song.id) && (
                                      <Badge className="bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black text-[10px] px-1.5 py-0.5 animate-pulse">
                                        <Zap className="w-3 h-3 mr-1" />
                                        Added!
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-300 mb-0.5 truncate max-w-[16rem]">{song.artist}</p>
                                  {song.album && <p className="text-[11px] text-gray-400">{song.album}</p>}
                                </div>
                              </div>
                              
                              <div className="space-y-3">
                                <div className="flex items-center gap-4 flex-wrap">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-[var(--neon-yellow)]" />
                                    <span className="text-xs font-bold text-[var(--neon-yellow)]">
                                      {song.matchScore || Math.floor(50 + Math.random()*50)}% popularity
                                    </span>
                                  </div>
                                  <Badge className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-[var(--neon-pink)]/20 to-[var(--neon-pink)]/10 text-[var(--neon-pink)] border border-[var(--neon-pink)]/30">
                                    <Users className="w-3 h-3 mr-1" />
                                    {song.reasons?.[0] || `${10 + Math.floor(Math.random()*90)} crowd votes`}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 ml-4">
                              <Button 
                                size="sm" 
                                onClick={() => addToQueue(song)}
                                disabled={addedSongs.has(song.id)}
                                className={`h-8 px-2 text-xs transition-all duration-500 transform hover:scale-105 ${
                                  addedSongs.has(song.id) 
                                    ? 'bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black shadow-lg shadow-[var(--neon-cyan)]/25' 
                                    : 'bg-gradient-to-r from-[var(--neon-yellow)] to-[var(--neon-pink)] text-white hover:shadow-lg hover:shadow-[var(--neon-yellow)]/25'
                                }`}
                              >
                                {addedSongs.has(song.id) ? (
                                  <>
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                    Added!
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                    Add to Queue
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="space-y-4">
              <RequestQueue 
                eventCode={event.code}
                onAddToQueue={(request: SongRequest) => {
                  // Convert SongRequest to Track format and add to queue
                  const track: Track = {
                    id: request.spotifyTrackId || request.id,
                    title: request.trackName,
                    artist: request.artistName,
                    album: request.albumName || '',
                    duration: request.durationMs ? formatDuration(request.durationMs) : '0:00',
                    matchScore: request.voteCount * 10,
                    reasons: [`Requested by ${request.requesterName || 'guest'}`, `${request.voteCount} upvotes`],
                    energy: request.metadata?.energy || 0,
                    danceability: request.metadata?.danceability || 0,
                    source: 'spotify',
                    previewUrl: request.previewUrl || null
                  };
                  addToQueue(track);
                }}
              />
            </TabsContent>
            
            <TabsContent value="queue" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Volume2 className="w-5 h-5 text-[var(--neon-cyan)]" />
                    Full Queue ({currentQueue.length})
                  </h3>
                  {currentQueue.length > 0 && (
                    <p className="text-sm text-gray-400 mt-1">
                      Drag to reorder • Click to play
                    </p>
                  )}
                </div>
                {currentQueue.length > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={skipToNext}
                    disabled={currentSongIndex >= currentQueue.length - 1}
                    className="glass-effect border-[var(--glass-border)] text-white hover:bg-[var(--neon-cyan)]/20 hover:border-[var(--neon-cyan)]"
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Skip Current
                  </Button>
                )}
              </div>

              {currentQueue.length === 0 ? (
                <Card className="glass-effect-strong">
                  <CardContent className="p-12 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--neon-cyan)]/20 to-[var(--neon-blue)]/20 flex items-center justify-center animate-float">
                      <Music className="w-10 h-10 text-[var(--neon-cyan)]" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Queue is Empty
                    </h3>
                    <p className="text-gray-400 mb-4">
                      {connectedPlaylist ? 'Add AI recommendations to get the party started!' : 'Connect a playlist or add recommendations to begin!'}
                    </p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-effect text-xs text-[var(--neon-purple)]">
                      <Sparkles className="w-3 h-3" />
                      AI is ready to suggest perfect tracks
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <DndProvider backend={isTouchDevice() ? TouchBackend : HTML5Backend}>
                  <div className="space-y-3">
                    {currentQueue.map((song, index) => (
                      <DraggableQueueItem
                        song={song}
                        index={index}
                        currentSongIndex={currentSongIndex}
                        onPlaySong={playSong}
                        onRemoveFromQueue={removeFromQueue}
                        onMoveItem={moveItem}
                        getSourceBadge={getSourceBadge}
                        getAlbumArtUrl={(id) => albumArtMap[id]}
                      />
                    ))}
                  </div>
                  <div className="mt-6 p-4 glass-effect rounded-xl border border-[var(--glass-border)] text-xs text-center">
                    <div className="flex items-center justify-center gap-2 text-[var(--neon-cyan)] mb-2">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-medium">Pro Tips</span>
                    </div>
                    <p className="text-gray-400">
                      Drag songs by the grip handle (⋮⋮) to reorder • Click anywhere else to play instantly
                    </p>
                  </div>
                </DndProvider>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="space-y-6"
        >
          {/* Event Info */}
          <Card className="glass-effect-strong glass-effect-hover glass-effect-accent-cyan">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--neon-cyan)]/20 to-[var(--neon-blue)]/20">
                  <QrCode className="w-5 h-5 text-[var(--neon-cyan)]" />
                </div>
                Event Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="w-32 h-32 glass-effect rounded-xl flex items-center justify-center mx-auto mb-4 hover:scale-105 transition-transform duration-300 cursor-pointer group">
                  <QrCode className="w-16 h-16 text-[var(--neon-cyan)] group-hover:text-[var(--neon-pink)] transition-colors" />
                </div>
                <p className="text-sm text-gray-400 mb-2">Event Code</p>
                <p className="text-3xl font-mono font-bold text-[var(--neon-cyan)]">{event.code}</p>
                <p className="text-xs text-gray-400 mt-3">
                  Share this code for guests to join the experience
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Best Next Track Recommendation */}
          <Card className="glass-effect-strong glass-effect-hover glass-effect-accent-purple border-2 border-[var(--neon-purple)]/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--neon-purple)]/20 to-[var(--neon-pink)]/20">
                  <Sparkles className="w-5 h-5 text-[var(--neon-purple)]" />
                </div>
                AI Best Next Track
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BestNextTrackRecommendation 
                eventCode={event.code} 
                currentTrack={currentQueue[currentSongIndex]} 
                availableSongs={[...recommendations, ...topSongs]}
                albumArtMap={albumArtMap}
                queueLength={currentQueue.length}
              />
            </CardContent>
          </Card>

          {/* Crowd Insights */}
          <Card className="glass-effect-strong glass-effect-hover glass-effect-accent-purple">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--neon-purple)]/20 to-[var(--neon-pink)]/20">
                  <Activity className="w-5 h-5 text-[var(--neon-purple)]" />
                </div>
                Crowd Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between p-3 glass-effect rounded-lg">
                <span className="text-sm text-gray-300">Guests Joined</span>
                <span className="font-bold text-[var(--neon-cyan)] text-lg">{insights.totalGuests}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 glass-effect rounded-lg">
                <span className="text-sm text-gray-300">Average Age</span>
                <span className="font-bold text-[var(--neon-pink)]">{insights.averageAge}</span>
              </div>
              
              <div className="p-3 glass-effect rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-300">Energy Level</span>
                  <span className="font-bold text-[var(--neon-yellow)]">{insights.energyLevel}%</span>
                </div>
                <Progress 
                  value={insights.energyLevel} 
                  className="h-3 bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                />
              </div>
              
              <div className="p-3 glass-effect rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-300">Mood Score</span>
                  <span className="font-bold text-[var(--neon-cyan)]">{insights.moodScore}%</span>
                </div>
                <Progress 
                  value={insights.moodScore} 
                  className="h-3 bg-[var(--glass-bg)] border border-[var(--glass-border)]"
                />
              </div>
              
              <div className="p-3 glass-effect rounded-lg">
                <span className="text-sm text-gray-400 block mb-3">Top Genres</span>
                <div className="flex flex-wrap gap-2">
                  {insights.topGenres.map((genre, index) => (
                    <Badge 
                      key={index} 
                      className={`text-xs transition-all duration-300 hover:scale-105 ${
                        index === 0 ? 'bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-white' :
                        index === 1 ? 'bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black' :
                        'bg-gradient-to-r from-[var(--neon-yellow)] to-[var(--neon-yellow)]/80 text-black'
                      }`}
                    >
                      {genre}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spotify Feasibility (no playback yet) */}
          <Card className="glass-effect-strong glass-effect-hover glass-effect-accent-cyan">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--neon-cyan)]/20 to-[var(--neon-blue)]/20">
                  <Music className="w-5 h-5 text-[var(--neon-cyan)]" />
                </div>
                Spotify Status
              </CardTitle>
              <CardDescription>
                Playback control is disabled for now. You can still export playlists.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 glass-effect rounded-lg">
                <span className="text-gray-300">HTTPS</span>
                <span className={feasibility.httpsOk ? 'text-green-400' : 'text-[var(--destructive)]'}>
                  {feasibility.httpsOk ? 'OK' : 'Not secure'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 glass-effect rounded-lg">
                <span className="text-gray-300">Spotify Connected</span>
                <span className={feasibility.token ? 'text-green-400' : 'text-yellow-400'}>
                  {feasibility.token ? 'Yes' : 'Connect via Export button'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 glass-effect rounded-lg">
                <span className="text-gray-300">Account (Premium)</span>
                <span className={feasibility.premium ? 'text-green-400' : 'text-gray-400'}>
                  {feasibility.premium ? 'Premium' : 'Unknown/Free'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Request Analytics */}
          <Card className="glass-effect-strong glass-effect-hover">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--neon-yellow)]/20 to-[var(--neon-yellow)]/10">
                  <TrendingUp className="w-5 h-5 text-[var(--neon-yellow)]" />
                </div>
                Request Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RequestAnalytics eventCode={event.code} />
            </CardContent>
          </Card>

          {/* Connected Playlist */}
          {connectedPlaylist && (
            <Card className="glass-effect-strong glass-effect-hover">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-[var(--neon-yellow)]/20 to-[var(--neon-yellow)]/10">
                    <Headphones className="w-5 h-5 text-[var(--neon-yellow)]" />
                  </div>
                  Connected Playlist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 glass-effect rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-white">{connectedPlaylist.name}</h4>
                      {getSourceBadge(connectedPlaylist.tracks[0]?.source || 'spotify')}
                    </div>
                    <p className="text-sm text-gray-400">
                      {connectedPlaylist.trackCount} tracks • {connectedPlaylist.duration}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={onConnectPlaylist} 
                    className="w-full bg-gradient-to-r from-[var(--neon-yellow)] to-[var(--neon-yellow)]/80 text-black hover:shadow-lg hover:shadow-[var(--neon-yellow)]/20 transition-all duration-300"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Change Playlist
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
      {/* Export Modal */}
      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="glass-effect-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Export Playlist to Spotify
              <SpotifyLogo size={20} />
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="playlistName">Playlist name</Label>
              <Input id="playlistName" value={exportPlaylistName} onChange={(e) => setExportPlaylistName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-2 block">Source</Label>
              <RadioGroup value={exportSource} onValueChange={(v) => setExportSource(v as any)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="top" id="src-top" />
                  <Label htmlFor="src-top">Top Songs</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ai" id="src-ai" />
                  <Label htmlFor="src-ai">AI Recommendations</Label>
                </div>
              </RadioGroup>
            </div>
            {exportError && (
              <div className="text-[var(--destructive)] text-sm">{exportError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportModal(false)}>Cancel</Button>
            <Button onClick={async () => { await handleExportToSpotify(); setShowExportModal(false); }} disabled={isExporting}>
              {isExporting ? 'Exporting…' : 'Export'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleTrackEnd}
        style={{ display: 'none' }}
      />
    </div>
    </div>
  );
}