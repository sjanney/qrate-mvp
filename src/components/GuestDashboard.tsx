import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { 
  Music, Plus, Clock, CheckCircle, XCircle, Play, 
  DollarSign, CreditCard, RefreshCw, Search, Loader2,
  TrendingUp, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { apiCall } from '../utils/supabase/client';
import { motion } from 'framer-motion';
import { RequestSubmission } from './RequestSubmission';
import { RequestList } from './RequestList';
import type { SongRequest } from '../types';

interface GuestDashboardProps {
  event: { code: string; name: string };
  guestId: string;
  spotifyAccessToken?: string;
}

export function GuestDashboard({ event, guestId, spotifyAccessToken }: GuestDashboardProps) {
  const [myRequests, setMyRequests] = useState<SongRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'submit' | 'my-requests' | 'queue'>('submit');
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(5);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Safety check - must come after hooks
  if (!event || !guestId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black flex items-center justify-center">
        <div className="text-white text-center">
          <p>Missing event or guest information. Please try again.</p>
        </div>
      </div>
    );
  }

  // Fetch my requests - only update if data actually changed
  const fetchMyRequests = async () => {
    if (!event?.code || !guestId) return;
    
    try {
      const response = await apiCall(`/events/${event?.code}/requests?guestId=${guestId}`, {
        method: 'GET'
      });
      if (response.success && response.requests) {
        const filtered = response.requests.filter((r: SongRequest) => r.guestId === guestId);
        
        // Only update state if data actually changed (prevent unnecessary re-renders)
        setMyRequests(prev => {
          const prevIds = prev.map(r => `${r.id}-${r.status}-${r.voteCount}-${r.downvoteCount}`).join(',');
          const newIds = filtered.map(r => `${r.id}-${r.status}-${r.voteCount}-${r.downvoteCount}`).join(',');
          
          if (prevIds === newIds && prev.length === filtered.length) {
            return prev; // No changes, return previous state to prevent re-render
          }
          return filtered;
        });
      }
    } catch (err) {
      console.error('Failed to fetch my requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (event?.code && guestId) {
      setIsLoading(true);
      fetchMyRequests();
      
      // Only poll when on the my-requests tab to reduce unnecessary updates
      if (activeTab === 'my-requests') {
        const interval = setInterval(() => {
          setIsLoading(false); // Don't show loading spinner on background updates
          fetchMyRequests();
        }, 3000); // Poll every 3 seconds
        return () => clearInterval(interval);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.code, guestId, activeTab]);

  // Handle payment (mock Apple Pay)
  const handlePayment = async (requestId: string) => {
    if (!event?.code) return;
    setIsProcessingPayment(true);
    try {
      // Mock Apple Pay flow
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update request with tip amount
      const response = await apiCall(`/events/${event?.code}/requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify({
          tipAmount: paymentAmount
        })
      });
      
      if (response.success) {
        setIsLoading(true); // Show loading when refreshing after payment
        await fetchMyRequests();
        setShowPayment(null);
        // Show success message
        alert(`Payment of $${paymentAmount} processed successfully! Your request has been boosted.`);
      }
    } catch (err) {
      console.error('Payment failed:', err);
      alert('Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string; icon: any }> = {
      pending: { label: 'Pending', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
      accepted: { label: 'Accepted', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle },
      queued: { label: 'Queued', className: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Play },
      played: { label: 'Played', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: Play },
      rejected: { label: 'Rejected', className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle }
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
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-black p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">{event?.name || 'Event'}</h1>
          <p className="text-gray-400">Event Code: <span className="font-mono text-[var(--neon-cyan)]">{event?.code || 'N/A'}</span></p>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="glass-effect-strong grid w-full grid-cols-3 mb-6">
            <TabsTrigger 
              value="submit"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--neon-pink)] data-[state=active]:to-[var(--neon-purple)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit Request
            </TabsTrigger>
            <TabsTrigger 
              value="my-requests"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--neon-cyan)] data-[state=active]:to-[var(--neon-blue)]"
            >
              <Music className="w-4 h-4 mr-2" />
              My Requests ({myRequests.length})
            </TabsTrigger>
            <TabsTrigger 
              value="queue"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--neon-yellow)] data-[state=active]:to-[var(--neon-pink)]"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              View Queue
            </TabsTrigger>
          </TabsList>

          {/* Submit Request Tab */}
          <TabsContent value="submit" className="space-y-4">
            {event && (
              <RequestSubmission
                event={event}
                guestId={guestId}
                spotifyAccessToken={spotifyAccessToken || null}
                onRequestSubmitted={(request) => {
                  fetchMyRequests();
                  setActiveTab('my-requests');
                }}
              />
            )}
          </TabsContent>

          {/* My Requests Tab */}
          <TabsContent value="my-requests" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Music className="w-6 h-6 text-[var(--neon-cyan)]" />
                My Song Requests
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMyRequests}
                disabled={isLoading}
                className="glass-effect border-[var(--glass-border)] text-white"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {isLoading && myRequests.length === 0 ? (
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
            ) : myRequests.length === 0 ? (
              <Card className="glass-effect-strong">
                <CardContent className="p-12 text-center">
                  <Music className="w-12 h-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/70 text-lg">No requests yet</p>
                  <p className="text-white/50 text-sm mt-2">Submit your first song request!</p>
                  <Button
                    className="mt-4 bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] text-white"
                    onClick={() => setActiveTab('submit')}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Submit Request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card className={`glass-effect-strong glass-effect-hover ${
                      request.status === 'queued' ? 'border-2 border-green-500/40' :
                      request.status === 'played' ? 'border-2 border-purple-500/40' : ''
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2 mb-2 flex-wrap">
                              <h4 className="font-bold text-white truncate">{request.trackName}</h4>
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
                                  {Math.floor(request.durationMs / 60000)}:{(Math.floor((request.durationMs % 60000) / 1000)).toString().padStart(2, '0')}
                                </div>
                              )}
                              <span>•</span>
                              <span>{new Date(request.submittedAt).toLocaleTimeString()}</span>
                            </div>

                            {/* Votes Display */}
                            {(request.voteCount > 0 || request.downvoteCount > 0) && (
                              <div className="flex items-center gap-3 mt-3">
                                <div className="flex items-center gap-1 text-green-400">
                                  <ThumbsUp className="w-4 h-4" />
                                  <span className="text-sm font-semibold">{request.voteCount}</span>
                                </div>
                                <div className="flex items-center gap-1 text-red-400">
                                  <ThumbsDown className="w-4 h-4" />
                                  <span className="text-sm font-semibold">{request.downvoteCount}</span>
                                </div>
                              </div>
                            )}

                            {/* Track Analysis Metadata */}
                            {request.metadata && (
                              <div className="flex items-center gap-2 mt-3 flex-wrap">
                                {request.metadata.bpm && (
                                  <Badge className="text-[10px] px-1.5 py-0.5 bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)] border-[var(--neon-cyan)]/30">
                                    {request.metadata.bpm} BPM
                                  </Badge>
                                )}
                                {request.metadata.key && (
                                  <Badge className="text-[10px] px-1.5 py-0.5 bg-[var(--neon-purple)]/20 text-[var(--neon-purple)] border-[var(--neon-purple)]/30">
                                    {request.metadata.key}
                                  </Badge>
                                )}
                                {request.metadata.energy !== undefined && (
                                  <Badge className="text-[10px] px-1.5 py-0.5 bg-[var(--neon-yellow)]/20 text-[var(--neon-yellow)] border-[var(--neon-yellow)]/30">
                                    {request.metadata.energy}% energy
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {request.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowPayment(request.id)}
                                className="glass-effect border-[var(--neon-yellow)]/40 text-[var(--neon-yellow)] hover:bg-[var(--neon-yellow)]/20"
                              >
                                <CreditCard className="w-4 h-4 mr-1" />
                                Boost
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Payment Modal */}
                        {showPayment === request.id && (
                          <div className="mt-4 p-4 glass-effect rounded-lg border-2 border-[var(--neon-yellow)]/30">
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm text-gray-300 mb-2 block">Boost Amount</label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={paymentAmount}
                                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                  className="glass-effect border-[var(--glass-border)] text-white"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handlePayment(request.id)}
                                  disabled={isProcessingPayment || paymentAmount <= 0}
                                  className="flex-1 bg-gradient-to-r from-[var(--neon-yellow)] to-[var(--neon-pink)] text-black hover:shadow-lg"
                                >
                                  {isProcessingPayment ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      <DollarSign className="w-4 h-4 mr-2" />
                                      Pay with Apple Pay
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setShowPayment(null)}
                                  className="glass-effect border-[var(--glass-border)] text-white"
                                >
                                  Cancel
                                </Button>
                              </div>
                              <p className="text-xs text-gray-400 italic">
                                💳 This is a mock payment. Your request will be prioritized with a tip boost.
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* View Queue Tab */}
          <TabsContent value="queue" className="space-y-4">
            <RequestList
              eventCode={event?.code || ''}
              guestId={guestId}
              spotifyAccessToken={spotifyAccessToken}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

