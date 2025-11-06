import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { ArrowLeft, QrCode, Calendar, Clock, MapPin, Loader2, ThumbsUp } from 'lucide-react';
import { apiCall } from '../utils/supabase/client';

interface EventCreationProps {
  onEventCreated: (event: { name: string; theme: string; description: string; date: string; time: string; location?: string }) => void;
  onBack: () => void;
}

export function EventCreation({ onEventCreated, onBack }: EventCreationProps) {
  const [eventName, setEventName] = useState('');
  const [eventTheme, setEventTheme] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [votingEnabled, setVotingEnabled] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Set default date and time
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);
    setEventDate(today);
    setEventTime(currentTime);
  }, []);

  const handleCreateEvent = async () => {
    if (!eventName.trim() || !eventTheme || !eventDate || !eventTime) return;

    setIsCreating(true);
    
    try {
      // Create event in Supabase
      const response = await apiCall('/events', {
        method: 'POST',
        body: JSON.stringify({
          name: eventName.trim(),
          theme: eventTheme,
          description: description.trim(),
          date: eventDate,
          time: eventTime,
          location: eventLocation.trim() || undefined
        }),
      });

      if (response.success && response.event) {
        // Set request settings for the event
        try {
          await apiCall(`/events/${response.event.code}/request-settings`, {
            method: 'PUT',
            body: JSON.stringify({
              votingEnabled: votingEnabled,
              requestsEnabled: true
            })
          });
        } catch (settingsError) {
          console.error('Failed to set request settings:', settingsError);
          // Continue anyway - settings will default
        }
        
        // Call parent callback with event data including code
        const eventData = {
          name: response.event.name,
          theme: response.event.theme,
          description: response.event.description || description.trim(),
          date: eventDate,
          time: eventTime,
          location: eventLocation.trim() || undefined,
          code: response.event.code // Include the generated event code
        };
        
        onEventCreated(eventData);
      } else {
        throw new Error(response.error || 'Failed to create event');
      }
    } catch (error: any) {
      console.error('Error creating event:', error);
      alert(`Failed to create event: ${error.message || 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const themeOptions = [
    { value: 'high-energy-dance', label: 'High Energy Dance' },
    { value: 'chill-lounge', label: 'Chill Lounge' },
    { value: 'hip-hop-rap', label: 'Hip Hop & Rap' },
    { value: 'rock-alternative', label: 'Rock & Alternative' },
    { value: 'pop-hits', label: 'Pop Hits' },
    { value: '80s-90s-throwback', label: '80s/90s Throwback' },
    { value: 'latin-reggaeton', label: 'Latin & Reggaeton' },
    { value: 'electronic-edm', label: 'Electronic & EDM' },
    { value: 'r&b-soul', label: 'R&B & Soul' },
    { value: 'indie-alternative', label: 'Indie & Alternative' },
    { value: 'mixed-variety', label: 'Mixed Variety' }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-2 h-2 bg-[var(--neon-pink)] rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-16 w-1 h-1 bg-[var(--neon-cyan)] rounded-full animate-pulse delay-700"></div>
        <div className="absolute bottom-20 left-20 w-1.5 h-1.5 bg-[var(--neon-yellow)] rounded-full animate-pulse delay-1000"></div>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-[var(--neon-purple)]/20 to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-[var(--neon-cyan)]/20 to-transparent rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl relative z-10">
        <Button variant="ghost" onClick={onBack} className="mb-6 glass-effect glass-effect-hover text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <Card className="glass-effect-strong">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-blue)] flex items-center justify-center glass-effect">
              <QrCode className="w-8 h-8 text-black" />
            </div>
            <CardTitle className="text-3xl gradient-text">Create Your Event</CardTitle>
            <CardDescription>
              Set up your event to start collecting music preferences from your guests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="event-name" className="text-white">Event Name</Label>
            <Input
              id="event-name"
              placeholder="Friday Night Party"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="glass-effect-light text-white placeholder-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-theme" className="text-white">Music Theme/Vibe</Label>
            <Select value={eventTheme} onValueChange={setEventTheme}>
              <SelectTrigger className="glass-effect-light text-white">
                <SelectValue placeholder="Select the vibe for your event" />
              </SelectTrigger>
              <SelectContent className="glass-effect-strong">
                {themeOptions.map((theme) => (
                  <SelectItem key={theme.value} value={theme.value}>
                    {theme.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-date" className="flex items-center gap-2 text-white">
                <Calendar className="w-4 h-4" />
                Event Date
              </Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="glass-effect-light text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time" className="flex items-center gap-2 text-white">
                <Clock className="w-4 h-4" />
                Event Time
              </Label>
              <Input
                id="event-time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="glass-effect-light text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-location" className="flex items-center gap-2 text-white">
              <MapPin className="w-4 h-4" />
              Location (Optional)
            </Label>
            <Input
              id="event-location"
              placeholder="Enter venue or location..."
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              className="glass-effect-light text-white placeholder-gray-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Tell your guests about the event..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="glass-effect-light text-white placeholder-gray-400"
            />
          </div>

          {/* Request Settings */}
          <div className="glass-effect-strong rounded-xl p-4 space-y-4 border-2 border-[var(--glass-border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-[var(--neon-pink)]/20 to-[var(--neon-purple)]/20 rounded-lg">
                  <ThumbsUp className="w-5 h-5 text-[var(--neon-pink)]" />
                </div>
                <div>
                  <Label htmlFor="voting-enabled" className="text-white font-semibold cursor-pointer">
                    Enable Voting
                  </Label>
                  <p className="text-xs text-gray-400 mt-1">
                    Allow guests to upvote/downvote song requests
                  </p>
                </div>
              </div>
              <Switch
                id="voting-enabled"
                checked={votingEnabled}
                onCheckedChange={setVotingEnabled}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleCreateEvent} 
              className="w-full bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] hover:shadow-lg hover:shadow-[var(--neon-cyan)]/25 text-black font-medium" 
              size="lg"
              disabled={!eventName.trim() || !eventTheme || !eventDate || !eventTime || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Event...
                </>
              ) : (
                'Create Event & Generate QR Code'
              )}
            </Button>
          </div>

          <div className="text-center text-sm text-gray-400">
            Once created, you'll get a QR code and event code for guests to join
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}