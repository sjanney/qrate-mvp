import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  ThumbsUp, ThumbsDown, Music, Clock, TrendingUp, 
  Loader2, RefreshCw, TrendingDown, Play, Volume2
} from 'lucide-react';
import { apiCall } from '../utils/supabase/client';
import { motion } from 'framer-motion';
import type { SongRequest } from '../types';

interface RequestListProps {
  eventCode: string;
  guestId: string;
  spotifyAccessToken?: string;
}

export function RequestList({ eventCode, guestId, spotifyAccessToken }: RequestListProps) {
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [voteLoading, setVoteLoading] = useState<Record<string, boolean>>({});
  const [userVotes, setUserVotes] = useState<Record<string, 'upvote' | 'downvote' | null>>({});
  const [requestSettings, setRequestSettings] = useState<any>(null);

  // Load request settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiCall(`/events/${eventCode}/request-settings`, { method: 'GET' });
        if (response.success && response.settings) {
          setRequestSettings(response.settings);
        }
      } catch (err) {
        console.error('Failed to load request settings:', err);
      }
    };
    loadSettings();
  }, [eventCode]);

  // Fetch requests - only update if data actually changed
  const fetchRequests = async () => {
    try {
      const response = await apiCall(`/events/${eventCode}/requests`, { method: 'GET' });
      if (response.success && response.requests) {
        // Only update state if data actually changed (prevent unnecessary re-renders)
        setRequests(prev => {
          const prevIds = prev.map(r => `${r.id}-${r.status}-${r.voteCount}-${r.downvoteCount}`).join(',');
          const newIds = response.requests.map((r: SongRequest) => `${r.id}-${r.status}-${r.voteCount}-${r.downvoteCount}`).join(',');
          
          if (prevIds === newIds && prev.length === response.requests.length) {
            return prev; // No changes, return previous state to prevent re-render
          }
          return response.requests;
        });
      }
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and polling - only show loading on initial load
  useEffect(() => {
    setIsLoading(true);
    fetchRequests();
    
    const interval = setInterval(() => {
      setIsLoading(false); // Don't show loading spinner on background updates
      fetchRequests();
    }, 3000); // Poll every 3 seconds
    
    return () => clearInterval(interval);
  }, [eventCode]);

  // Vote on a request
  const handleVote = async (requestId: string, voteType: 'upvote' | 'downvote') => {
    if (!requestSettings?.votingEnabled) return;
    
    setVoteLoading(prev => ({ ...prev, [requestId]: true }));
    
    try {
      const response = await apiCall(`/events/${eventCode}/requests/${requestId}/vote`, {
        method: 'POST',
        body: JSON.stringify({
          guestId,
          voteType
        })
      });
      
      if (response.success) {
        // Update local vote state
        const currentVote = userVotes[requestId];
        if (currentVote === voteType) {
          // Toggle off if clicking same vote
          setUserVotes(prev => ({ ...prev, [requestId]: null }));
        } else {
          setUserVotes(prev => ({ ...prev, [requestId]: voteType }));
        }
        
        // Refresh requests to get updated vote counts (with loading on user action)
        setIsLoading(true);
        await fetchRequests();
      }
    } catch (err) {
      console.error('Failed to vote:', err);
    } finally {
      setVoteLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Sort requests by vote score and time
  const sortedRequests = [...requests].sort((a, b) => {
    const scoreA = a.voteCount - a.downvoteCount;
    const scoreB = b.voteCount - b.downvoteCount;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
  });

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
      accepted: { label: 'Accepted', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: TrendingUp },
      queued: { label: 'Queued', className: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Play },
      played: { label: 'Played', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Volume2 },
      rejected: { label: 'Rejected', className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: TrendingDown }
    };
    
    const variant = variants[status] || variants.pending;
    const Icon = variant.icon;
    return (
      <Badge className={`${variant.className} text-xs flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {variant.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Music className="w-5 h-5 text-[var(--neon-pink)]" />
          Request Queue ({requests.length})
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRequests}
          disabled={isLoading}
          className="glass-effect border-[var(--glass-border)] text-white hover:bg-[var(--neon-cyan)]/20"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {isLoading && requests.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="glass-effect-strong">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-700/30 rounded-lg animate-shimmer"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-700/30 rounded animate-shimmer w-3/4"></div>
                    <div className="h-3 bg-gray-700/20 rounded animate-shimmer w-1/2"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sortedRequests.length === 0 ? (
        <Card className="glass-effect-strong">
          <CardContent className="p-12 text-center">
            <Music className="w-12 h-12 text-white/30 mx-auto mb-4" />
            <p className="text-white/70">No requests yet</p>
            <p className="text-white/50 text-sm mt-2">Be the first to request a song!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {sortedRequests.map((request, index) => {
            const userVote = userVotes[request.id];
            const netVotes = request.voteCount - request.downvoteCount;
            
            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className={`glass-effect-strong glass-effect-hover group ${
                  request.status === 'queued' ? 'border-2 border-green-500/40' :
                  request.status === 'played' ? 'border-2 border-purple-500/40' :
                  netVotes > 5 ? 'border-2 border-[var(--neon-cyan)]/40' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-2 flex-wrap">
                          <h4 className="font-bold text-white truncate group-hover:text-[var(--neon-cyan)] transition-colors">
                            {request.trackName}
                          </h4>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-sm text-gray-300 mb-1 truncate">{request.artistName}</p>
                        {request.albumName && (
                          <p className="text-xs text-gray-400 mb-2 truncate">{request.albumName}</p>
                        )}
                        
                        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400 mt-2">
                          {request.durationMs && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(request.durationMs)}
                            </div>
                          )}
                          {request.requesterName && (
                            <>
                              <span>•</span>
                              <span>by {request.requesterName}</span>
                            </>
                          )}
                        </div>

                        {/* Votes Display */}
                        {requestSettings?.votingEnabled && (
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <ThumbsUp className={`w-4 h-4 ${
                                  userVote === 'upvote' ? 'text-green-400' : 'text-gray-400'
                                }`} />
                                <span className={`text-sm font-semibold ${
                                  userVote === 'upvote' ? 'text-green-400' : 'text-gray-300'
                                }`}>
                                  {request.voteCount}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ThumbsDown className={`w-4 h-4 ${
                                  userVote === 'downvote' ? 'text-red-400' : 'text-gray-400'
                                }`} />
                                <span className={`text-sm font-semibold ${
                                  userVote === 'downvote' ? 'text-red-400' : 'text-gray-300'
                                }`}>
                                  {request.downvoteCount}
                                </span>
                              </div>
                            </div>
                            {netVotes > 0 && (
                              <Badge className="bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border-[var(--neon-cyan)]/30 text-xs">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                +{netVotes} votes
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Voting Buttons */}
                      {requestSettings?.votingEnabled && request.status === 'pending' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(request.id, 'upvote')}
                            disabled={voteLoading[request.id]}
                            className={`glass-effect transition-all ${
                              userVote === 'upvote'
                                ? 'border-green-500/50 bg-green-500/20 text-green-400'
                                : 'border-[var(--glass-border)] text-white hover:bg-green-500/10 hover:border-green-500/40'
                            }`}
                          >
                            {voteLoading[request.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ThumbsUp className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(request.id, 'downvote')}
                            disabled={voteLoading[request.id]}
                            className={`glass-effect transition-all ${
                              userVote === 'downvote'
                                ? 'border-red-500/50 bg-red-500/20 text-red-400'
                                : 'border-[var(--glass-border)] text-white hover:bg-red-500/10 hover:border-red-500/40'
                            }`}
                          >
                            {voteLoading[request.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <ThumbsDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

