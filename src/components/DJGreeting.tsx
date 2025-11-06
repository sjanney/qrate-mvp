import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Music, Timer, Users, ArrowRight } from 'lucide-react';

interface DJGreetingProps {
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
  onContinue: () => void;
  onBack: () => void;
}

export function DJGreeting({ event, onContinue, onBack }: DJGreetingProps) {
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="backdrop-blur-sm bg-white/10 border-white/20">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
              <Music className="w-8 h-8 text-white" />
            </div>
            
            <div>
              <CardTitle className="text-3xl text-white mb-2">
                Welcome to the Booth, DJ!
              </CardTitle>
              <CardDescription className="text-xl text-blue-100">
                Get ready to rock {event.name}
                {event.location && (
                  <>
                    <br />
                    <span className="text-lg text-blue-200">
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
                Theme: {event.theme}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {timeToParty.isLive ? (
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">🎉 IT'S PARTY TIME! 🎉</div>
                <p className="text-xl text-white">The crowd is ready - let's make some magic!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Timer className="w-5 h-5 text-blue-300" />
                    <h3 className="text-xl text-white">Time Until Party Starts</h3>
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
              <h4 className="text-lg font-semibold text-white">Quick Tips for Tonight:</h4>
              <ul className="space-y-2 text-blue-100">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-300 rounded-full mt-2 flex-shrink-0"></div>
                  Connect your playlist to add your favorite tracks to the queue
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-300 rounded-full mt-2 flex-shrink-0"></div>
                  AI suggestions will adapt based on guest preferences
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-300 rounded-full mt-2 flex-shrink-0"></div>
                  Show the QR code to let guests share their music taste
                </li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={onBack}
                className="flex-1 bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Back
              </Button>
              <Button 
                onClick={onContinue}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
              >
                Start Mixing
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}