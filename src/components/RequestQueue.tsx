import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
  CheckCircle, XCircle, Play, ThumbsUp, ThumbsDown, 
  Music, Clock, TrendingUp, Loader2, RefreshCw, Filter,
  Search, DollarSign, Crown
} from 'lucide-react';
import { apiCall } from '../utils/supabase/client';
import { motion } from 'framer-motion';
import type { SongRequest, RequestStatus } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface RequestQueueProps {
  eventCode: string;
  onAddToQueue?: (request: SongRequest) => void;
}

export function RequestQueue({ eventCode, onAddToQueue }: RequestQueueProps) {
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [requestSettings, setRequestSettings] = useState<any>(null);
  const [voteLoading, setVoteLoading] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

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
      const response = await apiCall(
        `/events/${eventCode}/requests${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`,
        { method: 'GET' }
      );
      
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
  }, [eventCode, statusFilter]);

  // Update request status
  const updateRequestStatus = async (requestId: string, newStatus: RequestStatus) => {
    setActionLoading(prev => ({ ...prev, [requestId]: true }));
    try {
      const response = await apiCall(`/events/${eventCode}/requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.success) {
        // Refresh requests after status change (force update for user action)
        setIsLoading(true);
        await fetchRequests();
        
        // If playing, add to queue
        if (newStatus === 'queued' && onAddToQueue) {
          const updatedRequest = requests.find(r => r.id === requestId);
          if (updatedRequest) {
            onAddToQueue(updatedRequest);
          }
        }
      }
    } catch (err) {
      console.error('Failed to update request status:', err);
    } finally {
      setActionLoading(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // Filter requests by search query
  const filteredRequests = requests.filter(req => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      req.trackName.toLowerCase().includes(query) ||
      req.artistName.toLowerCase().includes(query) ||
      req.albumName?.toLowerCase().includes(query) ||
      req.requesterName?.toLowerCase().includes(query)
    );
  });

  // Sort requests by votes and time
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    // First by vote score (upvotes - downvotes)
    const scoreA = a.voteCount - a.downvoteCount;
    const scoreB = b.voteCount - b.downvoteCount;
    if (scoreB !== scoreA) return scoreB - scoreA;
    
    // Then by submission time (older first)
    return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
  });

  const getStatusBadge = (status: RequestStatus) => {
    const variants: Record<RequestStatus, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      accepted: { label: 'Accepted', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      rejected: { label: 'Rejected', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
      queued: { label: 'Queued', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
      played: { label: 'Played', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
    };
    
    const variant = variants[status];
    return (
      <Badge className={`${variant.className} text-xs`}>
        {variant.label}
      </Badge>
    );
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const acceptedCount = requests.filter(r => r.status === 'accepted').length;
  const queuedCount = requests.filter(r => r.status === 'queued').length;
  const playedCount = requests.filter(r => r.status === 'played').length;

  return (
    <div className="space-y-4">
      {/* Header with Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-[var(--neon-pink)]" />
            Song Requests ({requests.length})
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

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 glass-effect-strong border border-[var(--glass-border)] rounded-lg text-white placeholder:text-white/50 text-sm focus:outline-none focus:border-[var(--neon-cyan)]"
          />
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as RequestStatus | 'all')}>
        <TabsList className="glass-effect-strong grid grid-cols-5 w-full">
          <TabsTrigger value="all" className="text-xs">
            All ({requests.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="text-xs">
            Accepted ({acceptedCount})
          </TabsTrigger>
          <TabsTrigger value="queued" className="text-xs">
            Queued ({queuedCount})
          </TabsTrigger>
          <TabsTrigger value="played" className="text-xs">
            Played ({playedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Requests List */}
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
            <p className="text-white/70">No requests found</p>
            <p className="text-white/50 text-sm mt-2">
              {statusFilter === 'pending' ? 'Waiting for guest requests...' : 
               statusFilter === 'all' ? 'No requests have been submitted yet' :
               `No ${statusFilter} requests`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {sortedRequests.map((request, index) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card className={`glass-effect-strong glass-effect-hover ${
                request.status === 'queued' ? 'border-2 border-green-500/40' : ''
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Track Info */}
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
                        
                        {/* Metadata */}
                        <div className="flex items-center gap-3 flex-wrap text-xs text-gray-400">
                          {request.durationMs && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(request.durationMs)}
                            </div>
                          )}
                          {request.requesterName && (
                            <span>Requested by {request.requesterName}</span>
                          )}
                          <span>•</span>
                          <span>{new Date(request.submittedAt).toLocaleTimeString()}</span>
                        </div>

                          {/* Votes */}
                          {requestSettings?.votingEnabled && (
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1 text-green-400">
                                <ThumbsUp className="w-4 h-4" />
                                <span className="text-xs font-semibold">{request.voteCount}</span>
                              </div>
                              <div className="flex items-center gap-1 text-red-400">
                                <ThumbsDown className="w-4 h-4" />
                                <span className="text-xs font-semibold">{request.downvoteCount}</span>
                              </div>
                              {(request.voteCount - request.downvoteCount) > 0 && (
                                <Badge className="bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border-[var(--neon-cyan)]/30 text-xs">
                                  <TrendingUp className="w-3 h-3 mr-1" />
                                  {request.voteCount - request.downvoteCount} net votes
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Track Analysis Metadata */}
                          {request.metadata && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {request.metadata.bpm && (
                                <Badge className="text-[10px] px-1.5 py-0.5 bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border-[var(--neon-cyan)]/30">
                                  🎚️ {request.metadata.bpm} BPM
                                </Badge>
                              )}
                              {request.metadata.key && (
                                <Badge className="text-[10px] px-1.5 py-0.5 bg-[var(--neon-purple)]/20 text-[var(--neon-purple)] border-[var(--neon-purple)]/30">
                                  🎹 {request.metadata.key}
                                </Badge>
                              )}
                              {request.metadata.energy !== undefined && (
                                <Badge className="text-[10px] px-1.5 py-0.5 bg-[var(--neon-yellow)]/20 text-[var(--neon-yellow)] border-[var(--neon-yellow)]/30">
                                  ⚡ {request.metadata.energy}% energy
                                </Badge>
                              )}
                              {request.metadata.danceability !== undefined && (
                                <Badge className="text-[10px] px-1.5 py-0.5 bg-[var(--neon-pink)]/20 text-[var(--neon-pink)] border-[var(--neon-pink)]/30">
                                  💃 {request.metadata.danceability}% dance
                                </Badge>
                              )}
                              {request.metadata.genre && request.metadata.genre.length > 0 && (
                                <Badge className="text-[10px] px-1.5 py-0.5 bg-white/10 text-white border-white/20">
                                  {request.metadata.genre[0]}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Paid Request Badge (Mock) */}
                          {request.tipAmount > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <Badge className="bg-gradient-to-r from-[var(--neon-yellow)] to-[var(--neon-pink)] text-white text-xs">
                                <DollarSign className="w-3 h-3 mr-1" />
                                ${request.tipAmount.toFixed(2)} tip
                              </Badge>
                            </div>
                          )}

                          {/* VIP Request Badge (Mock - based on requester name patterns) */}
                          {request.requesterName && (
                            ['host', 'bride', 'groom', 'birthday', 'dj'].some(keyword => 
                              request.requesterName?.toLowerCase().includes(keyword)
                            ) && (
                              <div className="flex items-center gap-1 mt-2">
                                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                                  <Crown className="w-3 h-3 mr-1" />
                                  VIP Request
                                </Badge>
                              </div>
                            )
                          )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {request.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRequestStatus(request.id, 'accepted')}
                            disabled={actionLoading[request.id]}
                            className="glass-effect border-green-500/40 text-green-400 hover:bg-green-500/20"
                          >
                            {actionLoading[request.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateRequestStatus(request.id, 'rejected')}
                            disabled={actionLoading[request.id]}
                            className="glass-effect border-red-500/40 text-red-400 hover:bg-red-500/20"
                          >
                            {actionLoading[request.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateRequestStatus(request.id, 'queued')}
                            disabled={actionLoading[request.id]}
                            className="bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black hover:shadow-lg hover:shadow-[var(--neon-cyan)]/30"
                          >
                            {actionLoading[request.id] ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-1" />
                                Queue
                              </>
                            )}
                          </Button>
                        </>
                      )}
                      
                      {request.status === 'accepted' && (
                        <Button
                          size="sm"
                          onClick={() => updateRequestStatus(request.id, 'queued')}
                          disabled={actionLoading[request.id]}
                          className="bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black hover:shadow-lg hover:shadow-[var(--neon-cyan)]/30"
                        >
                          {actionLoading[request.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-1" />
                              Queue
                            </>
                          )}
                        </Button>
                      )}
                      
                      {request.status === 'queued' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateRequestStatus(request.id, 'played')}
                          disabled={actionLoading[request.id]}
                          className="glass-effect border-green-500/40 text-green-400 hover:bg-green-500/20"
                        >
                          {actionLoading[request.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Mark Played'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

