import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Crown, Timer, Users, ArrowRight, QrCode, Music } from 'lucide-react';

interface HostGreetingProps {
  event: {
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
  };
  currentUser: string;
  onContinue: () => void;
  onBack: () => void;
}

export function HostGreeting({ event, currentUser, onContinue, onBack }: HostGreetingProps) {
  const [timeToParty, setTimeToParty] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLive: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: false });

  useEffect(() => {
    const calculateTimeToParty = () => {
      // Create event datetime from event date and time
      const eventDateTime = new Date(`${event.date}T${event.time}`);
      const now = new Date().getTime();
      const partyTime = eventDateTime.getTime();
      const difference = partyTime - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeToParty({ days, hours, minutes, seconds, isLive: false });
      } else {
        setTimeToParty({ days: 0, hours: 0, minutes: 0, seconds: 0, isLive: true });
      }
    };

    calculateTimeToParty();
    const timer = setInterval(calculateTimeToParty, 1000);

    return () => clearInterval(timer);
  }, [event.date, event.time]);

  const CountdownCard = ({ label, value }: { label: string; value: number }) => (
    <Card className="text-center">
      <CardContent className="p-4">
        <div className="text-2xl font-bold text-primary">{value.toString().padStart(2, '0')}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="backdrop-blur-sm bg-white/10 border-white/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full flex items-center justify-center">
              <Crown className="w-8 h-8 text-white" />
            </div>
            
            <div>
              <CardTitle className="text-3xl text-white mb-2">
                Welcome back, {currentUser}!
              </CardTitle>
              <CardDescription className="text-xl text-emerald-100">
                Your event "{event.name}" is ready to go
                {event.location && (
                  <>
                    <br />
                    <span className="text-lg text-emerald-200">
                      📍 {event.location}
                    </span>
                  </>
                )}
              </CardDescription>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Users className="w-4 h-4 mr-1" />
                {event.preferences?.length || 0} guests checked in
              </Badge>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Code: {event.code}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {timeToParty.isLive ? (
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">🎉 YOUR EVENT IS LIVE! 🎉</div>
                <p className="text-xl text-white">Time to host the perfect party!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Timer className="w-5 h-5 text-teal-300" />
                    <h3 className="text-xl text-white">Event Starts In</h3>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3 max-w-sm mx-auto">
                    <CountdownCard label="Days" value={timeToParty.days} />
                    <CountdownCard label="Hours" value={timeToParty.hours} />
                    <CountdownCard label="Minutes" value={timeToParty.minutes} />
                    <CountdownCard label="Seconds" value={timeToParty.seconds} />
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white/10 rounded-lg p-4 space-y-3">
              <h4 className="text-lg font-semibold text-white">Host Checklist:</h4>
              <ul className="space-y-2 text-emerald-100">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full mt-2 flex-shrink-0"></div>
                  Share your event QR code for guest check-ins
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full mt-2 flex-shrink-0"></div>
                  Monitor real-time playlist recommendations
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full mt-2 flex-shrink-0"></div>
                  Connect your music streaming service for custom tracks
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-300 rounded-full mt-2 flex-shrink-0"></div>
                  Use AI insights to keep the crowd engaged
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <QrCode className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                <div className="text-white font-medium">Event Code</div>
                <div className="text-2xl font-bold text-emerald-300">{event.code}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 text-center">
                <Music className="w-8 h-8 text-teal-300 mx-auto mb-2" />
                <div className="text-white font-medium">Theme</div>
                <div className="text-emerald-300 font-medium">{event.theme}</div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={onBack}
                className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Back to Dashboard
              </Button>
              <Button 
                onClick={onContinue}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0"
              >
                Enter DJ Mode
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}