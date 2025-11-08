import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Music, Users, Clock, ArrowLeft, Check, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { apiCall } from '../utils/supabase/client';
import { SpotifyLogo } from './SpotifyLogo';

interface Playlist {
  id: string;
  name: string;
  trackCount: number;
  duration: string;
  image?: string;
  tracks: Track[];
}

interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  source: 'spotify' | 'apple';
}

interface Event {
  code: string;
  name: string;
}

interface PlaylistConnectionProps {
  event: Event;
  onPlaylistSelected: (playlist: Playlist) => void;
  onBack: () => void;
}


export function PlaylistConnection({ event, onPlaylistSelected, onBack }: PlaylistConnectionProps) {
  const [selectedService, setSelectedService] = useState<'spotify' | 'apple' | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [spotifyAccessToken, setSpotifyAccessToken] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportedPlaylist, setExportedPlaylist] = useState<{ url: string; name: string } | null>(null);
  const [playlistName, setPlaylistName] = useState(`QRate Event ${event.code} - Top Songs`);

  // Handle OAuth callback from Spotify
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setExportError(error === 'access_denied' ? 'Spotify authorization was cancelled' : 'Spotify authorization failed');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (code) {
        try {
          setSelectedService('spotify');
          const tokenResponse = await apiCall('/spotify/dj/callback', {
            method: 'POST',
            body: JSON.stringify({ code }),
          });

          if (tokenResponse.success && tokenResponse.access_token) {
            setSpotifyAccessToken(tokenResponse.access_token);
            setIsConnected(true);
            window.history.replaceState({}, '', window.location.pathname);
          } else {
            throw new Error('Failed to exchange authorization code');
          }
        } catch (error: any) {
          console.error('OAuth callback error:', error);
          setExportError(error.message || 'Failed to connect Spotify');
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    };

    handleOAuthCallback();
  }, [selectedService]);

  const connectSpotify = async () => {
    try {
      setSelectedService('spotify');
      setExportError(null);
      // Persist event code so App can restore state after OAuth redirect
      if (event?.code) {
        localStorage.setItem('spotify_oauth_event_code', event.code);
      }
      
      const response = await apiCall('/spotify/dj/auth', {
        method: 'GET',
      });

      if (response && response.success && response.auth_url) {
        const target = String(response.auth_url);
        window.location.href = target;
      } else {
        // Check if response has error information
        const errorMsg = response?.error || response?.hint || 'Failed to get Spotify authorization URL';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Spotify connection error:', error);
      const errorMessage = error.message || 'Failed to connect to Spotify';
      const errorHint = error.hint || '';
      
      // Provide helpful error message
      let displayError = errorMessage;
      if (errorHint) {
        displayError = `${errorMessage}\n\n${errorHint}`;
      } else if (errorMessage.includes('not configured') || errorMessage.includes('YOUR_')) {
        displayError = 'Spotify integration not configured. Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in the API configuration.';
      } else if (errorMessage.includes('Network error') || errorMessage.includes('Failed to fetch')) {
        displayError = 'Unable to connect to the API. Please check that the API endpoint is accessible.';
      }
      setExportError(displayError);
    }
  };

  const handleExportPlaylist = async () => {
    if (!spotifyAccessToken || !event.code) return;

    setIsExporting(true);
    setExportError(null);

    try {
      const response = await apiCall('/spotify/create-playlist', {
        method: 'POST',
        body: JSON.stringify({
          access_token: spotifyAccessToken,
          event_code: event.code,
          playlist_name: playlistName
        }),
      });

      if (response.success && response.playlist) {
        setExportedPlaylist({
          url: response.playlist.url,
          name: response.playlist.name
        });
        // Call onPlaylistSelected with the exported playlist info
        onPlaylistSelected({
          id: response.playlist.id,
          name: response.playlist.name,
          trackCount: response.playlist.trackCount,
          duration: '0:00',
          tracks: []
        });
      } else {
        throw new Error(response.error || 'Failed to create playlist');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      setExportError(error.message || 'Failed to export playlist');
    } finally {
      setIsExporting(false);
    }
  };

  const handleServiceConnect = (service: 'spotify' | 'apple') => {
    if (service === 'spotify') {
      connectSpotify();
    } else {
      alert('Apple Music integration coming soon!');
    }
  };

  const handlePlaylistSelect = (playlist: Playlist) => {
    onPlaylistSelected(playlist);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-2xl mb-2 flex items-center justify-center gap-2">
                Export Top Songs to Spotify
                <SpotifyLogo size={28} />
              </h1>
              <p className="text-muted-foreground">
                Connect your Spotify account to export the top 15 songs from your event guests
              </p>
            </div>

            {exportError && (
              <Card className="border-destructive">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">{exportError}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="cursor-pointer transition-all hover:shadow-lg" onClick={() => handleServiceConnect('spotify')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-md">
                    <SpotifyLogo size={32} />
                  </div>
                  Connect Spotify
                </CardTitle>
                <CardDescription>
                  Export top 15 songs to your Spotify account
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer transition-all hover:shadow-lg opacity-50" onClick={() => handleServiceConnect('apple')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                    <Music className="w-6 h-6 text-white" />
                  </div>
                  Connect Apple Music
                </CardTitle>
                <CardDescription>
                  Apple Music export coming soon
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // After Spotify OAuth, show export option
  if (selectedService === 'spotify' && isConnected && spotifyAccessToken) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>

          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Check className="w-5 h-5 text-green-500" />
                <h1 className="text-2xl">Connected to Spotify</h1>
              </div>
              <p className="text-muted-foreground">
                Export the top 15 songs from event {event.code} to your Spotify account
              </p>
            </div>

            {exportError && (
              <Card className="border-destructive">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="w-5 h-5" />
                    <p className="text-sm">{exportError}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {exportedPlaylist ? (
              <Card className="border-green-500">
                <CardContent className="p-6 text-center space-y-4">
                  <Check className="w-12 h-12 text-green-500 mx-auto" />
                  <h2 className="text-xl font-bold">Playlist Created!</h2>
                  <p className="text-muted-foreground">{exportedPlaylist.name}</p>
                  <Button 
                    onClick={() => window.open(exportedPlaylist.url, '_blank')}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open in Spotify
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={onBack}
                    className="w-full"
                  >
                    Back to Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Playlist Name</label>
                    <Input
                      value={playlistName}
                      onChange={(e) => setPlaylistName(e.target.value)}
                      placeholder="My Event Playlist"
                    />
                  </div>
                  <Button 
                    onClick={handleExportPlaylist}
                    disabled={isExporting || !playlistName.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Playlist...
                      </>
                    ) : (
                      <>
                        <SpotifyLogo size={16} className="mr-2" />
                        Export Top 15 Songs to Spotify
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // This should not happen - Spotify is the only supported service
  return null;
}