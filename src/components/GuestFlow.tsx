import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { ArrowLeft, Music, Check, Users, Sparkles, Loader2, AlertCircle, ArrowRight, Zap, TrendingUp, Search, X } from 'lucide-react';
import { apiCall } from '../utils/supabase/client';
import { motion } from 'framer-motion';
import { SpotifyLogo } from './SpotifyLogo';
import { RequestSubmission } from './RequestSubmission';
import { GuestDashboard } from './GuestDashboard';
import type { SongRequest } from '../types';

interface GuestFlowProps {
  event: any;
  onPreferencesSubmitted: (preferences: any) => void;
  onBack: () => void;
}

export function GuestFlow({ event, onPreferencesSubmitted, onBack }: GuestFlowProps) {
  const [step, setStep] = useState<'welcome' | 'connect' | 'select' | 'success' | 'request' | 'dashboard' | 'oauth-loading' | 'oauth-error'>('welcome');
  
  // Spotify OAuth state
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null);
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<any[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [guestId] = useState<string>(() => {
    // Generate or retrieve persistent guest ID
    const stored = sessionStorage.getItem(`guest_id_${event?.code}`);
    if (stored) return stored;
    const newId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
    if (event?.code) sessionStorage.setItem(`guest_id_${event.code}`, newId);
    return newId;
  });
  const [spotifyStats, setSpotifyStats] = useState<{
    playlists: number;
    tracks: number;
    artists: string[];
    genres: string[];
  } | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [isLoadingSpotify, setIsLoadingSpotify] = useState(false);
  const [pendingAuthUrl, setPendingAuthUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Handle OAuth callback from Spotify
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setOauthError(error === 'access_denied' ? 'Spotify authorization was cancelled' : 'Spotify authorization failed');
        setStep('oauth-error');
        // Clean up URL: remove Spotify params but keep existing event param
        const cleanUrl1 = new URL(window.location.href);
        cleanUrl1.searchParams.delete('code');
        cleanUrl1.searchParams.delete('error');
        const cleaned1 = cleanUrl1.pathname + (cleanUrl1.searchParams.toString() ? `?${cleanUrl1.searchParams.toString()}` : '');
        window.history.replaceState({}, '', cleaned1);
        return;
      }

      // Check for OAuth callback code regardless of current step
      if (code) {
        setIsLoadingSpotify(true);
        setOauthError(null);
        setStep('oauth-loading');
        
        try {
          // Exchange code for access token
          const tokenResponse = await apiCall('/spotify/callback', {
            method: 'POST',
            body: JSON.stringify({ code }),
          });

          if (tokenResponse.success && tokenResponse.access_token) {
            setSpotifyAccessToken(tokenResponse.access_token);
            
            // Fetch user's playlists
            const playlistsResponse = await apiCall('/spotify/playlists', {
              method: 'POST',
              body: JSON.stringify({ access_token: tokenResponse.access_token }),
            });

            if (playlistsResponse.success && playlistsResponse.playlists) {
              const playlists = playlistsResponse.playlists;
              setSpotifyPlaylists(playlists);
              setSelectedPlaylistIds(playlists.slice(0, 5).map((p: any) => p.id));
              // Ensure URL contains the event param so App state persists
              try {
                // Get session code from URL first, then fallback to prop or localStorage
                const urlParams = new URLSearchParams(window.location.search);
                const sessionCodeFromUrl = urlParams.get('event')?.toUpperCase();
                const sessionCode = sessionCodeFromUrl || event?.code || localStorage.getItem('spotify_oauth_event_code')?.toUpperCase();
                if (sessionCode) {
                  const url = new URL(window.location.href);
                  url.searchParams.set('event', sessionCode);
                  window.history.replaceState({}, '', url.pathname + '?' + url.searchParams.toString());
                }
              } catch {}
              setStep('select');
            } else {
              throw new Error('Failed to fetch playlists');
            }
          } else {
            throw new Error('Failed to exchange authorization code');
          }
        } catch (error: any) {
          console.error('OAuth callback error:', error);
          // Provide actionable guidance for common Spotify errors
          const rawMessage = error?.message || '';
          if (typeof rawMessage === 'string' && rawMessage.toLowerCase().includes('invalid_grant')) {
            setOauthError(
              'Spotify reported an invalid authorization code.\n\n' +
              'Most likely cause: Redirect URI mismatch.\n' +
              '- Ensure you are using the correct redirect URI in your Spotify app settings.\n' +
              '- For production: https://qrate-mvp.vercel.app/guest\n' +
              '- Make sure SPOTIFY_GUEST_REDIRECT_URI is set to the same URI.\n' +
              '- Retry the connection.'
            );
          } else {
            setOauthError(rawMessage || 'Failed to connect Spotify');
          }
          setStep('oauth-error');
          // Keep stored event code so App can preserve guest flow context on errors
        } finally {
          setIsLoadingSpotify(false);
          // Clean up URL: remove Spotify params but keep existing event param
          const cleanUrl2 = new URL(window.location.href);
          cleanUrl2.searchParams.delete('code');
          cleanUrl2.searchParams.delete('error');
          const cleaned2 = cleanUrl2.pathname + (cleanUrl2.searchParams.toString() ? `?${cleanUrl2.searchParams.toString()}` : '');
          window.history.replaceState({}, '', cleaned2);
        }
      }
    };

    handleOAuthCallback();
    // Run only once on mount to avoid repeated token exchange attempts
  }, []);

  // Persist step to avoid accidental resets on remounts
  useEffect(() => {
    const key = `guest_step_${event?.code || 'unknown'}`;
    // Attempt restore only if not in OAuth flow
    if (step === 'welcome') {
      const restored = sessionStorage.getItem(key) as typeof step | null;
      if (restored && ['connect', 'select', 'success'].includes(restored)) {
        setStep(restored);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const key = `guest_step_${event?.code || 'unknown'}`;
    sessionStorage.setItem(key, step);
  }, [step, event?.code]);

  const togglePlaylist = (id: string) => {
    setSelectedPlaylistIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submitSelectedPlaylists = async (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (!spotifyAccessToken) return;
    
    // Always get the session code from URL first, then fallback to prop
    const urlParams = new URLSearchParams(window.location.search);
    const sessionCodeFromUrl = urlParams.get('event')?.toUpperCase();
    const sessionCode = sessionCodeFromUrl || event?.code;
    
    if (!sessionCode) {
      setOauthError('No session code found. Please refresh and try again.');
      return;
    }
    
    if (selectedPlaylistIds.length === 0) {
      setOauthError('Select at least one playlist');
      return;
    }

    setIsLoadingSpotify(true);
    setOauthError(null);
    try {
      const tracksResponse = await apiCall('/spotify/playlist-tracks', {
        method: 'POST',
        body: JSON.stringify({
          access_token: spotifyAccessToken,
          playlist_ids: selectedPlaylistIds.slice(0, 10),
        }),
      });

      if (!tracksResponse.success) {
        throw new Error('Failed to analyze selected playlists');
      }

      setSpotifyStats({
        playlists: selectedPlaylistIds.length,
        tracks: tracksResponse.tracks?.length || 0,
        artists: tracksResponse.artists || [],
        genres: tracksResponse.genres || [],
      });

      // Submit preferences to session
      const preferences = {
        artists: tracksResponse.artists || [],
        genres: tracksResponse.genres || [],
        source: 'spotify',
        spotifyPlaylists: selectedPlaylistIds,
        tracksData: tracksResponse.tracks || [],
        guestId: guestId,
        submittedAt: new Date().toISOString(),
        spotifyAnalyzed: true,
        stats: {
          playlists: selectedPlaylistIds.length,
          tracks: tracksResponse.tracks?.length || 0,
        },
      };

      try {
        await apiCall(`/events/${sessionCode}/preferences`, {
          method: 'POST',
          body: JSON.stringify(preferences),
        });
      } catch (saveError: any) {
        // Surface but do not block user confirmation; DJ can still proceed after manual retry
        console.error('Failed to save preferences to backend:', saveError);
      }

      // Ensure URL contains the latest event param and clear OAuth state param
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('event', sessionCode);
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url.pathname + '?' + url.searchParams.toString());
        localStorage.setItem('spotify_oauth_event_code', sessionCode);
      } catch {}

      // Show confirmation regardless of backend save outcome to avoid blocking UX
      setStep('dashboard'); // Go to dashboard after preferences are submitted
      onPreferencesSubmitted(preferences);
      // Keep localStorage event code until user leaves guest flow to prevent fallback to landing
    } catch (error: any) {
      setOauthError(error.message || 'Failed to submit playlists');
      setStep('oauth-error');
    } finally {
      setIsLoadingSpotify(false);
    }
  };

  const connectSpotify = async () => {
    if (isLoadingSpotify) return; // single-flight guard
    setIsLoadingSpotify(true);
    setOauthError(null);
    
    // Always get the session code from URL first, then fallback to prop
    const urlParams = new URLSearchParams(window.location.search);
    const sessionCodeFromUrl = urlParams.get('event')?.toUpperCase();
    const sessionCode = sessionCodeFromUrl || event?.code;
    
    // Store event code in localStorage so we can restore it after OAuth redirect
    if (sessionCode) {
      localStorage.setItem('spotify_oauth_event_code', sessionCode);
    }
    
    try {
      // Validate event exists before redirecting
      if (!sessionCode) {
        throw new Error('No event code found. Please join an event first.');
      }
      const check = await apiCall(`/events/${sessionCode}`, { method: 'GET' });
      if (!check?.success) {
        throw new Error('Event not found. Please verify the event code.');
      }

      // Get Spotify authorization URL
      const response = await apiCall('/spotify/auth', {
        method: 'GET',
      });

      if (response && response.success && response.auth_url) {
        const target = String(response.auth_url);
        setPendingAuthUrl(target);
        // Direct navigation - more reliable than popup
        window.location.href = target;
      } else {
        // Check if response has error information
        const errorMsg = response?.error || response?.hint || 'Failed to get Spotify authorization URL';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Spotify connection error:', error);
      console.error('Full error details:', {
        message: error.message,
        hint: error.hint,
        name: error.name,
        stack: error.stack
      });
      
      const errorMessage = error.message || 'Failed to connect to Spotify';
      const errorHint = error.hint || '';
      
      // Provide helpful error message based on error type
      let userFriendlyError = errorMessage;
      if (errorHint) {
        userFriendlyError = `${errorMessage}\n\n${errorHint}`;
      } else if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
        userFriendlyError = `⚠️ Backend API not accessible\n\n` +
          `The API endpoint may not be deployed or accessible.\n\n` +
          `To fix this:\n` +
          `1. Check that the API is running\n` +
          `2. Ensure Spotify credentials (SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET) are configured\n` +
          `3. Verify the API endpoint is accessible\n\n` +
          `Spotify connection is required to participate.`;
      } else if (errorMessage.includes('not configured') || errorMessage.includes('YOUR_')) {
        userFriendlyError = `⚠️ Spotify integration not configured\n\n` +
          `Spotify credentials need to be set up.\n\n` +
          `Please configure SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in the API configuration.`;
      }
      
      setOauthError(userFriendlyError);
      setIsLoadingSpotify(false);
      setStep('oauth-error');
      // Keep stored event code so user stays in guest flow and can retry
    }
  };


  // Welcome step with party greeting
  if (step === 'welcome') {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-2 h-2 bg-[var(--neon-pink)] rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-1 h-1 bg-[var(--neon-cyan)] rounded-full animate-pulse delay-500"></div>
          <div className="absolute bottom-32 left-16 w-1.5 h-1.5 bg-[var(--neon-yellow)] rounded-full animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 right-32 w-1 h-1 bg-[var(--neon-purple)] rounded-full animate-pulse delay-700"></div>
          
          {/* Gradient Orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--neon-pink)]/20 to-transparent rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[var(--neon-cyan)]/20 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-[var(--neon-purple)]/15 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-8"
          >
            {/* Party Header */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              <div className="w-24 h-24 glass-effect-strong rounded-full flex items-center justify-center mx-auto border-2 border-[var(--neon-pink)]/50">
                <Music className="w-12 h-12 text-[var(--neon-pink)]" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">Welcome to</h1>
                <h2 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-[var(--neon-pink)] via-[var(--neon-yellow)] to-[var(--neon-cyan)] bg-clip-text text-transparent mb-3">
                  {event.name}
                </h2>
                <div className="inline-flex items-center gap-2 px-4 py-2 glass-effect rounded-full">
                  <Zap className="w-4 h-4 text-[var(--neon-yellow)]" />
                  <p className="text-lg text-white/90 font-medium">{event.theme}</p>
                </div>
              </div>
            </motion.div>

            {/* How it Works */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="glass-effect-strong glass-effect-hover rounded-2xl p-8 space-y-6"
            >
              <h3 className="text-2xl font-bold flex items-center justify-center gap-3 text-white">
                <Sparkles className="w-6 h-6 text-[var(--neon-cyan)]" />
                How It Works
              </h3>
              <div className="space-y-4 text-white/90">
                {[
                  { num: 1, text: "Connect your Spotify account" },
                  { num: 2, text: "Select your favorite playlists" },
                  { num: 3, text: "Our AI creates the perfect mix" }
                ].map((item, idx) => (
                  <motion.div
                    key={item.num}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 + idx * 0.1 }}
                    className="flex items-start gap-4 group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-[var(--neon-pink)] to-[var(--neon-purple)] rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-lg shadow-[var(--neon-pink)]/30 group-hover:scale-110 transition-transform">
                      {item.num}
                    </div>
                    <p className="text-base md:text-lg pt-2">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="glass-effect glass-effect-accent-cyan rounded-xl p-5"
            >
              <div className="flex justify-center items-center gap-3 text-white/90">
                <div className="p-2 bg-[var(--neon-cyan)]/20 rounded-lg">
                  <Users className="w-5 h-5 text-[var(--neon-cyan)]" />
                </div>
                <span className="text-base font-medium">
                  Join <span className="text-[var(--neon-cyan)] font-bold">{Math.floor(Math.random() * 50) + 10}</span> other guests helping create tonight's vibe
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 }}
              className="space-y-4"
            >
              <Button 
                type="button"
                onClick={() => setStep('connect')} 
                size="lg" 
                className="w-full bg-gradient-to-r from-[var(--neon-pink)] via-[var(--neon-yellow)] to-[var(--neon-cyan)] hover:from-[var(--neon-pink)]/90 hover:via-[var(--neon-yellow)]/90 hover:to-[var(--neon-cyan)]/90 text-white font-bold py-6 text-lg rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[var(--neon-pink)]/30 hover:scale-105"
              >
                Let's Get Started!
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              <button 
                onClick={onBack} 
                className="text-white/60 hover:text-white/90 text-sm underline transition-colors w-full"
              >
                ← Back to landing
              </button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Connection method selection
  if (step === 'connect') {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-2 h-2 bg-[var(--neon-pink)] rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-1 h-1 bg-[var(--neon-cyan)] rounded-full animate-pulse delay-500"></div>
          <div className="absolute bottom-32 left-16 w-1.5 h-1.5 bg-[var(--neon-yellow)] rounded-full animate-pulse delay-1000"></div>
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#1DB954]/20 to-transparent rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[var(--neon-cyan)]/20 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setStep('welcome')} 
              className="mb-6 glass-effect glass-effect-hover text-white/80 hover:text-white border-[var(--glass-border)]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-center space-y-3"
              >
                <h2 className="text-4xl md:text-5xl font-bold text-white flex items-center justify-center gap-3">
                  <SpotifyLogo size={48} />
                  Connect Spotify
                </h2>
                <p className="text-xl text-white/80">Share your music taste and join the party</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-6"
              >
                {pendingAuthUrl && (
                  <div className="glass-effect-strong glass-effect-accent-cyan rounded-xl p-4 text-center">
                    <p className="text-white/90 text-sm flex items-center justify-center gap-2 flex-wrap">
                      If you weren't redirected,{' '}
                      <a href={pendingAuthUrl} className="underline text-[var(--neon-cyan)] hover:text-[var(--neon-cyan)]/80 font-medium inline-flex items-center gap-1.5" rel="noreferrer">
                        continue to Spotify
                        <SpotifyLogo size={16} />
                      </a>
                      .
                    </p>
                  </div>
                )}
                
                {/* Spotify Option - Only Option */}
                <Card
                  className="bg-gradient-to-br from-[#1DB954] to-[#1ed760] border-2 border-[#1DB954] text-white cursor-pointer hover:from-[#1ed760] hover:to-[#1DB954] hover:scale-105 transition-all duration-300 shadow-lg shadow-[#1DB954]/30 hover:shadow-[#1DB954]/50"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); connectSpotify(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); connectSpotify(); } }}
                >
                  <CardContent className="p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center backdrop-blur-sm border-2 border-white/30 shadow-lg">
                        <SpotifyLogo size={40} />
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="font-bold text-2xl mb-2 flex items-center justify-center md:justify-start gap-2">
                          <SpotifyLogo size={32} />
                          Connect Spotify
                        </h3>
                        <p className="text-white/90 text-base mb-1">Import your playlists automatically</p>
                        <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                          <Badge className="bg-white/20 text-white border-white/30">
                            Required
                          </Badge>
                          <Badge className="bg-white/20 text-white border-white/30">
                            Secure
                          </Badge>
                        </div>
                      </div>
                      <ArrowRight className="w-6 h-6 hidden md:block" />
                    </div>
                  </CardContent>
                </Card>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="glass-effect glass-effect-hover rounded-xl p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-[var(--neon-yellow)]/20 rounded-lg flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-[var(--neon-yellow)]" />
                    </div>
                    <div>
                      <p className="text-white/90 text-sm leading-relaxed">
                        <span className="font-semibold text-white">Why Spotify?</span> We analyze your playlists to understand your music taste. Your preferences help create the perfect party playlist that everyone will love!
                      </p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Playlist selection step
  if (step === 'select') {
    // Filter playlists based on search query
    const filteredPlaylists = spotifyPlaylists.filter((p: any) => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-2 h-2 bg-[var(--neon-pink)] rounded-full animate-pulse"></div>
          <div className="absolute top-40 right-20 w-1 h-1 bg-[var(--neon-cyan)] rounded-full animate-pulse delay-500"></div>
          
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--neon-purple)]/20 to-transparent rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[var(--neon-pink)]/20 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <Button 
              variant="ghost" 
              onClick={() => setStep('connect')} 
              className="glass-effect glass-effect-hover text-white/80 hover:text-white border-[var(--glass-border)]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {/* Header Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-center space-y-3"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white flex items-center justify-center gap-3">
                <Music className="w-8 h-8 text-[var(--neon-pink)]" />
                Choose Your Playlists
              </h2>
              <p className="text-xl text-white/80">Select the playlists that represent your vibe</p>
            </motion.div>

            {/* Search and Controls Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-4"
            >
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                <Input
                  type="text"
                  placeholder="Search playlists by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-10 py-3 glass-effect-strong border-2 border-[var(--glass-border)] text-white placeholder:text-white/50 focus:border-[var(--neon-cyan)] focus:ring-2 focus:ring-[var(--neon-cyan)]/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Selection Info and Actions */}
              <div className="glass-effect-strong rounded-xl p-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--neon-cyan)]/20 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-[var(--neon-cyan)]" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">
                          <span className="text-[var(--neon-pink)]">{selectedPlaylistIds.length}</span>
                          {' '}of{' '}
                          <span className="text-white/80">{filteredPlaylists.length}</span>
                          {' '}selected
                          {searchQuery && spotifyPlaylists.length !== filteredPlaylists.length && (
                            <span className="text-sm text-white/60 font-normal ml-2">
                              (filtered from {spotifyPlaylists.length} total)
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-white/70">
                          {selectedPlaylistIds.length === 0 ? 'Select at least 1 playlist' : 'Ready to submit'}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="glass-effect border-[var(--glass-border)] text-white hover:bg-white/10 hover:border-[var(--neon-cyan)]"
                      onClick={() => {
                        const filteredIds = filteredPlaylists.map((p: any) => p.id);
                        setSelectedPlaylistIds((prev) => {
                          const allFilteredSelected = filteredIds.every(id => prev.includes(id));
                          if (allFilteredSelected) {
                            return prev.filter(id => !filteredIds.includes(id));
                          } else {
                            return [...new Set([...prev, ...filteredIds])];
                          }
                        });
                      }}
                    >
                      {filteredPlaylists.every((p: any) => selectedPlaylistIds.includes(p.id)) ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="glass-effect border-[var(--glass-border)] text-white hover:bg-white/10 hover:border-[var(--neon-pink)]"
                      onClick={() => setSelectedPlaylistIds([])}
                      disabled={selectedPlaylistIds.length === 0}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Playlists Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {filteredPlaylists.length === 0 ? (
                <div className="glass-effect-strong rounded-xl p-12 text-center">
                  <Search className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/70 text-lg">No playlists found matching "{searchQuery}"</p>
                  <p className="text-white/50 text-sm mt-2">Try a different search term</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredPlaylists.map((p: any, idx: number) => {
                    const imageUrl = p.images?.[0]?.url || p.images?.[1]?.url || '';
                    const selected = selectedPlaylistIds.includes(p.id);
                    const trackCount = p.tracks?.total || 0;
                    
                    return (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.02 }}
                      >
                        <Card
                          onClick={() => togglePlaylist(p.id)}
                          className={`group relative cursor-pointer glass-effect-strong border-2 transition-all duration-200 overflow-hidden ${
                            selected 
                              ? 'border-[var(--neon-pink)] ring-2 ring-[var(--neon-pink)]/50 shadow-lg shadow-[var(--neon-pink)]/20 bg-gradient-to-br from-[var(--neon-pink)]/10 to-transparent' 
                              : 'border-[var(--glass-border)] hover:border-[var(--neon-purple)]/50 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-4 p-3">
                            {/* Checkbox Indicator */}
                            <div className="flex-shrink-0">
                              <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                selected 
                                  ? 'bg-[var(--neon-pink)] shadow-lg shadow-[var(--neon-pink)]/50' 
                                  : 'bg-black/40 backdrop-blur-sm border-2 border-white/30 group-hover:border-white/50'
                              }`}>
                                {selected && <Check className="w-3 h-3 text-white" />}
                              </div>
                            </div>

                            {/* Playlist Image - Smaller */}
                            <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg">
                              {imageUrl ? (
                                <>
                                  <img 
                                    src={imageUrl} 
                                    alt={p.name} 
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                                  />
                                  {selected && (
                                    <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-pink)]/40 to-[var(--neon-purple)]/40" />
                                  )}
                                </>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--neon-purple)]/30 to-[var(--neon-pink)]/30">
                                  <Music className="w-6 h-6 text-white/50" />
                                </div>
                              )}
                            </div>

                            {/* Playlist Info - Text alongside */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <h3 
                                    className="font-bold text-white text-sm mb-1 truncate" 
                                    title={p.name}
                                  >
                                    {p.name}
                                  </h3>
                                  {p.description && (
                                    <CardDescription className="text-white/60 text-xs line-clamp-1 truncate">
                                      {p.description}
                                    </CardDescription>
                                  )}
                                </div>
                                {/* Track count badge */}
                                <Badge className="bg-black/60 backdrop-blur-sm text-white border-0 text-xs font-medium flex-shrink-0 ml-2">
                                  {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Error Message */}
            {oauthError && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-effect border-2 border-red-500/40 bg-red-500/10 text-white rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{oauthError}</p>
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="sticky bottom-0 pt-4 bg-gradient-to-t from-background/95 via-background/90 to-transparent pb-2"
            >
              <Button 
                type="button"
                onClick={submitSelectedPlaylists}
                size="lg"
                className="w-full bg-gradient-to-r from-[var(--neon-pink)] via-[var(--neon-yellow)] to-[var(--neon-cyan)] hover:from-[var(--neon-pink)]/90 hover:via-[var(--neon-yellow)]/90 hover:to-[var(--neon-cyan)]/90 text-white font-bold py-6 text-lg rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[var(--neon-pink)]/30 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                disabled={isLoadingSpotify || selectedPlaylistIds.length === 0}
              >
                {isLoadingSpotify ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Adding to Session...
                  </>
                ) : (
                  <>
                    {selectedPlaylistIds.length > 0 ? (
                      <>
                        Add {selectedPlaylistIds.length} Playlist{selectedPlaylistIds.length !== 1 ? 's' : ''} to Session
                      </>
                    ) : (
                      'Select Playlists to Continue'
                    )}
                    {selectedPlaylistIds.length > 0 && <ArrowRight className="w-5 h-5 ml-2" />}
                  </>
                )}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    );
  }


  // OAuth loading step
  if (step === 'oauth-loading' || isLoadingSpotify) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#1DB954]/20 to-transparent rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[var(--neon-cyan)]/20 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        </div>
        <div className="container mx-auto px-4 py-8 max-w-md relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-8"
          >
            <div className="w-24 h-24 glass-effect-strong rounded-full flex items-center justify-center mx-auto border-2 border-[#1DB954]/50">
              <Loader2 className="w-12 h-12 text-[#1DB954] animate-spin" />
            </div>
            <div className="space-y-3">
              <h2 className="text-3xl font-bold text-white">Connecting to Spotify...</h2>
              <p className="text-white/80 text-lg">
                Please wait while we connect your account
              </p>
            </div>
            <div className="glass-effect rounded-xl p-4">
              <p className="text-white/70 text-sm">This will only take a moment!</p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // OAuth error step
  if (step === 'oauth-error') {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-red-500/20 to-transparent rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-purple-500/20 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        </div>
        <div className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-8"
          >
            <div className="w-24 h-24 glass-effect-strong rounded-full flex items-center justify-center mx-auto border-2 border-red-500/50">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
            <div className="space-y-3">
              <h2 className="text-4xl font-bold text-white">Connection Failed</h2>
              <p className="text-white/70 text-lg">We couldn't connect to Spotify</p>
            </div>
            <div className="glass-effect-strong border-2 border-red-500/30 rounded-xl p-6 text-left">
              <p className="text-white/90 text-sm whitespace-pre-line leading-relaxed">
                {oauthError || 'Failed to connect to Spotify'}
              </p>
            </div>
            
            <div className="space-y-4">
              <Button 
                onClick={() => {
                  setStep('connect');
                  setOauthError(null);
                }}
                size="lg" 
                className="w-full bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] hover:from-[var(--neon-pink)]/90 hover:to-[var(--neon-purple)]/90 text-white font-bold py-6 text-lg rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[var(--neon-pink)]/30 hover:scale-105"
              >
                <Zap className="w-5 h-5 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={onBack}
                variant="outline" 
                size="lg" 
                className="w-full glass-effect border-[var(--glass-border)] text-white hover:bg-white/20 hover:border-[var(--neon-cyan)] py-6 text-lg"
              >
                Go Back
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Guest Dashboard - Central hub after Spotify connection
  if (step === 'dashboard') {
    return (
      <GuestDashboard
        event={event}
        guestId={guestId}
        spotifyAccessToken={spotifyAccessToken || null}
      />
    );
  }

  // Request submission step (legacy, can be removed if not needed)
  if (step === 'request') {
    return (
      <RequestSubmission
        event={event}
        guestId={guestId}
        spotifyAccessToken={spotifyAccessToken || null}
        onRequestSubmitted={(request: SongRequest) => {
          // Optionally show success message
          console.log('Request submitted:', request);
        }}
        onBack={() => setStep('dashboard')}
      />
    );
  }

  // Success step
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-2 h-2 bg-[var(--neon-pink)] rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-[var(--neon-cyan)] rounded-full animate-pulse delay-500"></div>
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-green-500/20 to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-emerald-500/20 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-[var(--neon-cyan)]/15 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-2xl relative z-10 flex items-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-full text-center space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="glass-effect-strong glass-effect-accent-cyan rounded-xl p-4 border-2 border-[var(--neon-cyan)]/50"
          >
            <p className="text-white font-semibold text-lg">
              🎉 Your playlists were added to this session. Thanks for contributing!
            </p>
          </motion.div>
          
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="w-24 h-24 glass-effect-strong rounded-full flex items-center justify-center mx-auto border-2 border-green-400/50"
            >
              <Check className="w-14 h-14 text-green-400" />
            </motion.div>
            <div className="space-y-3">
              <h2 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-[var(--neon-cyan)] bg-clip-text text-transparent">
                Perfect! 🎉
              </h2>
              <p className="text-white/90 text-xl">
                Your music taste has been added to the mix
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="glass-effect-strong glass-effect-hover rounded-xl p-8 space-y-4"
          >
            <h3 className="font-bold text-2xl text-white flex items-center justify-center gap-2">
              <TrendingUp className="w-6 h-6 text-[var(--neon-cyan)]" />
              Your Contribution
            </h3>
            {spotifyStats && (
              <div className="space-y-4 text-white/90">
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-effect rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-[var(--neon-pink)]">{spotifyStats.playlists}</div>
                    <div className="text-sm text-white/70 mt-1">Playlists</div>
                  </div>
                  <div className="glass-effect rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-[var(--neon-cyan)]">{spotifyStats.tracks}</div>
                    <div className="text-sm text-white/70 mt-1">Tracks</div>
                  </div>
                  <div className="glass-effect rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-[var(--neon-purple)]">{spotifyStats.artists.length}</div>
                    <div className="text-sm text-white/70 mt-1">Artists</div>
                  </div>
                </div>
                {spotifyStats.artists.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <p className="text-sm text-white/70 mb-3 font-medium">Top Artists:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {spotifyStats.artists.slice(0, 5).map((artist) => (
                        <Badge key={artist} className="glass-effect-accent-pink text-white border-[var(--neon-pink)]/30">
                          {artist}
                        </Badge>
                      ))}
                      {spotifyStats.artists.length > 5 && (
                        <Badge className="glass-effect text-white border-[var(--glass-border)]">
                          +{spotifyStats.artists.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="glass-effect rounded-xl p-6"
          >
            <p className="text-white/90 text-base leading-relaxed">
              The DJ now has your preferences and our AI is working to create 
              the perfect playlist that matches everyone's taste. 
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="space-y-4"
          >
            <p className="text-2xl font-bold text-white">Enjoy the party! 🎵</p>
            
            <Button 
              onClick={onBack} 
              variant="outline" 
              size="lg" 
              className="w-full glass-effect border-[var(--glass-border)] text-white hover:bg-white/20 hover:border-[var(--neon-cyan)] py-6 text-lg"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Landing
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}