import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { ArrowLeft, Plus, QrCode, Users, Music, Calendar, TrendingUp, Sparkles, Zap, Clock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

interface Event {
  id: string;
  name: string;
  theme: string;
  code: string;
  date: string;
  time: string;
  location?: string;
  status: 'past' | 'live' | 'upcoming';
  guestCount: number;
  preferences: Array<{
    userId: string;
    artists: string[];
    genres: string[];
    recentTracks: string[];
  }>;
}

interface HostDashboardProps {
  currentUser: string;
  userEvents: Event[];
  onLogout: () => void;
  onCreateEvent: () => void;
  onViewEvent: (event: Event) => void;
}

export function HostDashboard({ currentUser, userEvents, onLogout, onCreateEvent, onViewEvent }: HostDashboardProps) {
  const events = userEvents;

  const pastEvents = events.filter(e => e.status === 'past');
  const liveEvents = events.filter(e => e.status === 'live');
  const upcomingEvents = events.filter(e => e.status === 'upcoming');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-green-500';
      case 'upcoming': return 'bg-blue-500';
      case 'past': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'live': return 'Live Now';
      case 'upcoming': return 'Upcoming';
      case 'past': return 'Past Event';
      default: return 'Unknown';
    }
  };

  const EventCard = ({ event }: { event: Event }) => {
    const statusConfig = {
      live: { 
        color: 'text-green-400', 
        bg: 'bg-green-500/20', 
        border: 'border-green-500/40', 
        icon: <Zap className="w-4 h-4" />,
        gradient: 'from-green-500/30 to-emerald-500/30',
        pulse: true
      },
      upcoming: { 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/20', 
        border: 'border-blue-500/40', 
        icon: <Calendar className="w-4 h-4" />,
        gradient: 'from-blue-500/30 to-cyan-400/30',
        pulse: false
      },
      past: { 
        color: 'text-gray-400', 
        bg: 'bg-gray-500/20', 
        border: 'border-gray-500/40', 
        icon: <TrendingUp className="w-4 h-4" />,
        gradient: 'from-gray-500/30 to-gray-400/30',
        pulse: false
      }
    };
    const config = statusConfig[event.status] || statusConfig.past;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card 
          className="cursor-pointer glass-effect-strong glass-effect-hover group overflow-hidden border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[var(--neon-purple)]/20" 
          onClick={() => onViewEvent(event)}
        >
          {event.status === 'live' && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl animate-pulse pointer-events-none"></div>
          )}
          
          <CardHeader className="pb-4 relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${config.gradient} border-2 ${config.border} flex items-center justify-center flex-shrink-0 shadow-lg ${config.pulse ? 'animate-pulse' : ''}`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-2xl mb-3 text-white group-hover:text-[var(--neon-cyan)] transition-colors font-bold">
                      {event.name}
                    </CardTitle>
                    <div className="flex items-center gap-3 flex-wrap mb-4">
                      <Badge className={`${config.bg} ${config.color} border-2 ${config.border} text-xs font-bold px-3 py-1 ${config.pulse ? 'animate-pulse' : ''}`}>
                        {config.pulse && <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping mr-1.5"></div>}
                        {getStatusText(event.status)}
                      </Badge>
                      <div className="flex items-center gap-2 px-3 py-1 glass-effect rounded-lg">
                        <Music className="w-3 h-3 text-[var(--neon-purple)]" />
                        <span className="text-xs text-white/80 font-medium">{event.theme}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 glass-effect px-3 py-2 rounded-lg">
                        <Calendar className="w-4 h-4 text-[var(--neon-cyan)]" />
                        <span className="text-white/90 font-medium">{new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2 glass-effect px-3 py-2 rounded-lg">
                        <Clock className="w-4 h-4 text-[var(--neon-pink)]" />
                        <span className="text-white/90 font-medium">{event.time}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2 glass-effect px-3 py-2 rounded-lg">
                          <MapPin className="w-4 h-4 text-[var(--neon-yellow)]" />
                          <span className="text-white/90 font-medium truncate max-w-[200px]">{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-right flex-shrink-0">
                <div className="glass-effect-strong px-4 py-3 rounded-xl mb-2 border-2 border-[var(--neon-cyan)]/30">
                  <div className="text-xs text-gray-400 mb-1 font-medium">Event Code</div>
                  <div className="font-mono font-bold text-xl text-[var(--neon-cyan)]">{event.code}</div>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0 relative z-10">
            <div className="flex items-center justify-between pt-4 border-t-2 border-white/10">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 glass-effect px-4 py-2 rounded-lg border border-[var(--neon-cyan)]/30">
                  <Users className="w-5 h-5 text-[var(--neon-cyan)]" />
                  <span className="text-base font-bold text-white">{event.guestCount}</span>
                  <span className="text-xs text-gray-400 font-medium">guests</span>
                </div>
                <div className="flex items-center gap-2 glass-effect px-4 py-2 rounded-lg border border-[var(--neon-pink)]/30">
                  <Music className="w-5 h-5 text-[var(--neon-pink)]" />
                  <span className="text-base font-bold text-white">{event.preferences.length}</span>
                  <span className="text-xs text-gray-400 font-medium">preferences</span>
                </div>
              </div>
              {event.status === 'live' && (
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-green-500 to-emerald-400 text-white hover:shadow-lg hover:shadow-green-500/30 font-semibold transition-all duration-300 hover:scale-105"
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  QR Code
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-2 h-2 bg-[var(--neon-pink)] rounded-full animate-pulse"></div>
        <div className="absolute bottom-32 left-16 w-1.5 h-1.5 bg-[var(--neon-cyan)] rounded-full animate-pulse delay-500"></div>
        <div className="absolute top-40 left-20 w-1 h-1 bg-[var(--neon-purple)] rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 right-32 w-1 h-1 bg-[var(--neon-yellow)] rounded-full animate-pulse delay-700"></div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[var(--neon-pink)]/20 to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-[var(--neon-cyan)]/20 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-[var(--neon-purple)]/15 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass-effect-strong relative z-10 border-b border-white/10"
      >
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={onLogout}
                className="glass-effect glass-effect-hover text-white hover:text-[var(--neon-cyan)] border-[var(--glass-border)] hover:border-[var(--neon-cyan)]"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
              <div className="border-l border-white/20 pl-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--neon-pink)] to-[var(--neon-purple)] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold gradient-text">Host Dashboard</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-300 text-sm">Welcome back, <span className="text-[var(--neon-pink)] font-semibold">{currentUser}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button 
              onClick={onCreateEvent} 
              className="glass-effect-accent-cyan glass-effect-hover bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black hover:shadow-lg hover:shadow-[var(--neon-cyan)]/25 font-semibold transition-all duration-300 hover:scale-105"
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              <span className="hidden sm:inline">Create New Event</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 relative z-10">
        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="glass-effect-strong glass-effect-hover glass-effect-accent-purple border-2 border-[var(--neon-purple)]/30 hover:border-[var(--neon-purple)]/50 transition-all duration-300 hover:scale-105">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm text-gray-300 font-medium">Total Events</CardTitle>
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--neon-purple)]/30 to-[var(--neon-pink)]/30 border border-[var(--neon-purple)]/40 shadow-lg shadow-[var(--neon-purple)]/20">
                    <Sparkles className="w-5 h-5 text-[var(--neon-purple)]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--neon-purple)] to-[var(--neon-pink)] bg-clip-text text-transparent mb-2">{events.length}</div>
                <p className="text-xs text-gray-400 font-medium">All time events</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="glass-effect-strong glass-effect-hover border-2 border-green-500/40 hover:border-green-500/60 transition-all duration-300 hover:scale-105 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl animate-pulse"></div>
              <CardHeader className="pb-3 relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm text-gray-300 font-medium">Live Events</CardTitle>
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/30 to-emerald-400/30 border border-green-500/40 shadow-lg shadow-green-500/20">
                    <Zap className="w-5 h-5 text-green-400 animate-pulse" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl md:text-5xl font-bold text-green-400 mb-2">{liveEvents.length}</div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <p className="text-xs text-gray-400 font-medium">Currently active</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="glass-effect-strong glass-effect-hover glass-effect-accent-cyan border-2 border-[var(--neon-cyan)]/30 hover:border-[var(--neon-cyan)]/50 transition-all duration-300 hover:scale-105">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm text-gray-300 font-medium">Total Guests</CardTitle>
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--neon-cyan)]/30 to-[var(--neon-blue)]/30 border border-[var(--neon-cyan)]/40 shadow-lg shadow-[var(--neon-cyan)]/20">
                    <Users className="w-5 h-5 text-[var(--neon-cyan)]" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl md:text-5xl font-bold text-[var(--neon-cyan)] mb-2">
                  {events.reduce((sum, e) => sum + e.guestCount, 0)}
                </div>
                <p className="text-xs text-gray-400 font-medium">All events</p>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Card className="glass-effect-strong glass-effect-hover border-2 border-blue-500/30 hover:border-blue-500/50 transition-all duration-300 hover:scale-105">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm text-gray-300 font-medium">Upcoming</CardTitle>
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/30 to-blue-400/30 border border-blue-500/40 shadow-lg shadow-blue-500/20">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-4xl md:text-5xl font-bold text-blue-400 mb-2">{upcomingEvents.length}</div>
                <p className="text-xs text-gray-400 font-medium">Scheduled</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Events Tabs */}
        <Tabs defaultValue="live" className="space-y-8 mt-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 glass-effect-strong p-2 h-auto gap-2 border-2 border-white/10">
            <TabsTrigger 
              value="live" 
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-400 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/30 transition-all duration-300 rounded-xl py-4 font-semibold relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-green-500/10 group-data-[state=active]:opacity-0 transition-opacity"></div>
              <div className="relative flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse"></div>
                <span className="hidden sm:inline font-medium">Live</span>
                <Badge className="bg-green-500/30 text-green-100 border-green-400/50 text-xs px-2 py-0.5 font-bold">{liveEvents.length}</Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="upcoming" 
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-cyan-400 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 transition-all duration-300 rounded-xl py-4 font-semibold relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-blue-500/10 group-data-[state=active]:opacity-0 transition-opacity"></div>
              <div className="relative flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Upcoming</span>
                <Badge className="bg-blue-500/30 text-blue-100 border-blue-400/50 text-xs px-2 py-0.5 font-bold">{upcomingEvents.length}</Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="past" 
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-600 data-[state=active]:to-gray-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-gray-500/30 transition-all duration-300 rounded-xl py-4 font-semibold relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gray-500/10 group-data-[state=active]:opacity-0 transition-opacity"></div>
              <div className="relative flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">Past</span>
                <Badge className="bg-gray-500/30 text-gray-100 border-gray-400/50 text-xs px-2 py-0.5 font-bold">{pastEvents.length}</Badge>
              </div>
            </TabsTrigger>
            <TabsTrigger 
              value="all" 
              className="flex items-center justify-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[var(--neon-purple)] data-[state=active]:to-[var(--neon-pink)] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[var(--neon-purple)]/30 transition-all duration-300 rounded-xl py-4 font-semibold relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-[var(--neon-purple)]/10 group-data-[state=active]:opacity-0 transition-opacity"></div>
              <div className="relative flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline font-medium">All Events</span>
                <span className="sm:hidden font-medium">All</span>
                <Badge className="bg-[var(--neon-purple)]/30 text-white border-[var(--neon-purple)]/50 text-xs px-2 py-0.5 font-bold">{events.length}</Badge>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-4">
            {liveEvents.length > 0 ? (
              liveEvents.map(event => <EventCard key={event.id} event={event} />)
            ) : (
              <Card className="glass-effect-strong">
                <CardContent className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-green-400/20 flex items-center justify-center border border-green-500/30">
                    <Zap className="w-10 h-10 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Live Events</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">Start creating events to see them appear here when they go live!</p>
                  <Button 
                    onClick={onCreateEvent}
                    className="bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black hover:shadow-lg hover:shadow-[var(--neon-cyan)]/25"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Event
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map(event => <EventCard key={event.id} event={event} />)
            ) : (
              <Card className="glass-effect-strong">
                <CardContent className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-400/20 flex items-center justify-center border border-blue-500/30">
                    <Calendar className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Upcoming Events</h3>
                  <p className="text-gray-400 mb-6">Schedule events to see them here</p>
                  <Button 
                    onClick={onCreateEvent}
                    className="bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black hover:shadow-lg hover:shadow-[var(--neon-cyan)]/25"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Event
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4">
            {pastEvents.length > 0 ? (
              pastEvents.map(event => <EventCard key={event.id} event={event} />)
            ) : (
              <Card className="glass-effect-strong">
                <CardContent className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-gray-500/20 to-gray-400/20 flex items-center justify-center border border-gray-500/30">
                    <TrendingUp className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Past Events</h3>
                  <p className="text-gray-400">Your completed events will appear here</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {events.length > 0 ? (
              events.map(event => <EventCard key={event.id} event={event} />)
            ) : (
              <Card className="glass-effect-strong">
                <CardContent className="text-center py-16">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--neon-purple)]/20 to-[var(--neon-pink)]/20 flex items-center justify-center border border-[var(--neon-purple)]/30">
                    <Sparkles className="w-10 h-10 text-[var(--neon-purple)]" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No Events Yet</h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">Get started by creating your first event and inviting guests to join!</p>
                  <Button 
                    onClick={onCreateEvent}
                    className="bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] text-black hover:shadow-lg hover:shadow-[var(--neon-cyan)]/25"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Event
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}