import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Search, Music, Loader2, Check, AlertCircle, TrendingUp, ArrowLeft, Play, Plus } from 'lucide-react';
import { apiCall } from '../utils/supabase/client';
import { motion } from 'framer-motion';
import { SpotifyLogo } from './SpotifyLogo';
import { RequestList } from './RequestList';
import type { SongRequest } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface RequestSubmissionProps {
  event: { code: string; name: string };
  guestId: string;
  spotifyAccessToken?: string;
  onRequestSubmitted: (request: SongRequest) => void;
  onBack?: () => void;
}

interface SpotifyTrack {
  id: string;
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  albumName: string;
  previewUrl?: string;
  durationMs?: number;
  albumArt?: string;
}

export function RequestSubmission({ 
  event, 
  guestId, 
  spotifyAccessToken, 
  onRequestSubmitted,
  onBack 
}: RequestSubmissionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState<SongRequest | null>(null);
  const [requestSettings, setRequestSettings] = useState<any>(null);

  // Load request settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiCall(`/events/${event.code}/request-settings`, { method: 'GET' });
        if (response.success && response.settings) {
          setRequestSettings(response.settings);
        }
      } catch (err) {
        console.error('Failed to load request settings:', err);
      }
    };
    loadSettings();
  }, [event.code]);

  // Search Spotify tracks
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    if (!spotifyAccessToken) {
      setError('Spotify connection required. Please connect your Spotify account first.');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await apiCall('/spotify/search', {
        method: 'POST',
        body: JSON.stringify({
          query: searchQuery,
          access_token: spotifyAccessToken,
          limit: 20
        })
      });

      if (response.success && response.tracks) {
        setSearchResults(response.tracks);
      } else {
        setError('Failed to search Spotify. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search Spotify');
    } finally {
      setIsSearching(false);
    }
  };

  // Submit a request
  const handleSubmitRequest = async (track: SpotifyTrack) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiCall(`/events/${event.code}/requests`, {
        method: 'POST',
        body: JSON.stringify({
          guestId,
          spotifyTrackId: track.spotifyTrackId,
          trackName: track.trackName,
          artistName: track.artistName,
          albumName: track.albumName,
          previewUrl: track.previewUrl,
          durationMs: track.durationMs
        })
      });

      if (response.success && response.request) {
        setSubmittedRequest(response.request);
        setSuccess(true);
        onRequestSubmitted(response.request);
        
        // Clear search after successful submission
        setTimeout(() => {
          setSearchQuery('');
          setSearchResults([]);
          setSuccess(false);
        }, 3000);
      } else {
        setError(response.error || 'Failed to submit request');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-2 h-2 bg-[var(--neon-pink)] rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-[var(--neon-cyan)] rounded-full animate-pulse delay-500"></div>
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--neon-purple)]/20 to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[var(--neon-pink)]/20 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          {onBack && (
            <Button 
              variant="ghost" 
              onClick={onBack} 
              className="glass-effect glass-effect-hover text-white/80 hover:text-white border-[var(--glass-border)]"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          {/* Header */}
          <div className="text-center space-y-3">
            <h2 className="text-4xl md:text-5xl font-bold text-white flex items-center justify-center gap-3">
              <Music className="w-8 h-8 text-[var(--neon-pink)]" />
              Request a Song
            </h2>
            <p className="text-xl text-white/80">Search for your favorite track and add it to the queue</p>
          </div>

          {/* Success Message */}
          {success && submittedRequest && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-effect-strong border-2 border-green-500/40 bg-green-500/10 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <Check className="w-6 h-6 text-green-400" />
                <div className="flex-1">
                  <p className="text-white font-semibold">Request submitted!</p>
                  <p className="text-white/80 text-sm">
                    {submittedRequest.trackName} by {submittedRequest.artistName}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect-strong border-2 border-red-500/40 bg-red-500/10 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <p className="text-white text-sm">{error}</p>
              </div>
            </motion.div>
          )}

          {/* Search Bar */}
          <Card className="glass-effect-strong">
            <CardContent className="p-6">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" />
                  <Input
                    type="text"
                    placeholder="Search for a song, artist, or album..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSearching) {
                        handleSearch();
                      }
                    }}
                    className="pl-12 pr-4 py-3 glass-effect-strong border-2 border-[var(--glass-border)] text-white placeholder:text-white/50 focus:border-[var(--neon-cyan)] focus:ring-2 focus:ring-[var(--neon-cyan)]/30"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() || isSearching || !spotifyAccessToken}
                  className="bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] hover:from-[var(--neon-pink)]/90 hover:to-[var(--neon-purple)]/90 text-white font-semibold"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </>
                  )}
                </Button>
              </div>
              
              {!spotifyAccessToken && (
                <div className="mt-3 flex items-center gap-2 text-yellow-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Spotify connection required to search for tracks</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[var(--neon-cyan)]" />
                Search Results ({searchResults.length})
              </h3>
              
              <div className="grid gap-3">
                {searchResults.map((track, index) => (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className="glass-effect-strong glass-effect-hover group">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          {track.albumArt ? (
                            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                              <img 
                                src={track.albumArt} 
                                alt={track.albumName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[var(--neon-purple)]/30 to-[var(--neon-pink)]/30 flex items-center justify-center flex-shrink-0">
                              <Music className="w-8 h-8 text-white/50" />
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white truncate group-hover:text-[var(--neon-cyan)] transition-colors">
                              {track.trackName}
                            </h4>
                            <p className="text-sm text-gray-300 truncate">{track.artistName}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              {track.albumName && <span className="truncate">{track.albumName}</span>}
                              {track.durationMs && (
                                <>
                                  <span>•</span>
                                  <span>{formatDuration(track.durationMs)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {track.previewUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const audio = new Audio(track.previewUrl);
                                  audio.play().catch(() => {});
                                }}
                                className="glass-effect border-[var(--glass-border)] text-white hover:bg-[var(--neon-cyan)]/20"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleSubmitRequest(track)}
                              disabled={isSubmitting}
                              className="bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-white hover:shadow-lg hover:shadow-[var(--neon-pink)]/30"
                            >
                              {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-2" />
                                  Request
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
            </motion.div>
          )}

          {/* Empty State */}
          {!isSearching && searchQuery && searchResults.length === 0 && (
            <Card className="glass-effect-strong">
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/70 text-lg">No results found</p>
                <p className="text-white/50 text-sm mt-2">Try a different search term</p>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          {!searchQuery && searchResults.length === 0 && (
            <Card className="glass-effect-strong">
              <CardContent className="p-6">
                <div className="space-y-3 text-white/90">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <SpotifyLogo size={20} />
                    How to Request a Song
                  </h3>
                  <ol className="space-y-2 list-decimal list-inside text-sm">
                    <li>Search for your favorite track using the search bar above</li>
                    <li>Click "Request" on any song you want to add</li>
                    <li>Your request will be added to the queue for the DJ to review</li>
                    {requestSettings?.votingEnabled && (
                      <li>Other guests can upvote your request to help it get played faster!</li>
                    )}
                  </ol>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Request Queue Tab - View and Vote on Other Requests */}
        {requestSettings?.votingEnabled && (
          <div className="mt-8">
            <RequestList 
              eventCode={event.code}
              guestId={guestId}
              spotifyAccessToken={spotifyAccessToken}
            />
          </div>
        )}
      </div>
    </div>
  );
}

