import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Music, ArrowLeft, Hash, Headphones, Sparkles, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface DJLoginProps {
  onJoinEvent: (eventCode: string) => void;
  onBack: () => void;
}

export function DJLogin({ onJoinEvent, onBack }: DJLoginProps) {
  const [eventCode, setEventCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinEvent = async () => {
    if (eventCode.trim()) {
      setIsLoading(true);
      // Add a small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 400));
      onJoinEvent(eventCode.trim().toUpperCase());
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-20 right-16 w-2 h-2 bg-[var(--neon-cyan)] rounded-full animate-pulse"></div>
        <div className="absolute top-48 left-20 w-1 h-1 bg-[var(--neon-yellow)] rounded-full animate-pulse delay-700"></div>
        <div className="absolute bottom-32 right-32 w-1.5 h-1.5 bg-[var(--neon-pink)] rounded-full animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-16 w-1 h-1 bg-[var(--neon-purple)] rounded-full animate-pulse delay-300"></div>
        
        {/* Large gradient orbs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-[var(--neon-yellow)]/20 to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-gradient-to-tr from-[var(--neon-purple)]/20 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '1.8s'}}></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-lg mx-auto">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Button 
              onClick={onBack}
              className="glass-effect glass-effect-hover border border-[var(--neon-yellow)]/30 hover:border-[var(--neon-yellow)]/50 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </motion.div>

          {/* DJ Login Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="glass-effect-strong glass-effect-hover">
              <CardHeader className="text-center pb-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[var(--neon-yellow)] to-[var(--neon-yellow)]/80 flex items-center justify-center animate-float glass-effect">
                  <Headphones className="w-10 h-10 text-black" />
                </div>
                <CardTitle className="text-3xl gradient-text animate-pulse-neon mb-2">
                  DJ Access
                </CardTitle>
                <CardDescription className="text-gray-400 text-base">
                  Enter the event code to access the DJ dashboard and start mixing magic
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-8">
                {/* Event Code Input */}
                <div className="space-y-4 glass-container">
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--neon-cyan)]">
                      <Hash className="w-5 h-5" />
                    </div>
                    <Input
                      placeholder="Enter event code"
                      value={eventCode}
                      onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                      className="glass-effect-light text-white placeholder-gray-400 focus:border-[var(--neon-cyan)] focus:ring-[var(--neon-cyan)] pl-12 py-4 text-lg font-mono tracking-wider text-center transition-all duration-300"
                      onKeyDown={(e) => e.key === 'Enter' && handleJoinEvent()}
                      autoFocus
                    />
                  </div>


                  <Button
                    onClick={handleJoinEvent}
                    disabled={!eventCode.trim() || isLoading}
                    className="w-full bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] hover:from-[var(--neon-cyan)]/80 hover:to-[var(--neon-blue)]/80 text-black font-bold py-4 text-lg rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[var(--neon-cyan)]/25 disabled:opacity-50 transform hover:scale-[1.02]"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mr-3"></div>
                        Accessing Event...
                      </div>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-3" />
                        Access DJ Dashboard
                      </>
                    )}
                  </Button>
                </div>

                {/* Features Preview */}
                <div className="p-4 glass-effect-strong rounded-lg border border-[var(--neon-yellow)]/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Music className="w-4 h-4 text-[var(--neon-yellow)]" />
                    <span className="text-[var(--neon-yellow)] text-sm font-medium">DJ Dashboard Features</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-xs text-gray-400">
                    <p>• AI-powered track recommendations</p>
                    <p>• Live crowd preference analysis</p>
                    <p>• Drag & drop queue management</p>
                    <p>• Real-time event insights</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}