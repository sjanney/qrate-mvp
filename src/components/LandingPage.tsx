import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Music, Sparkles, Users, Zap, ArrowRight, Volume2, Play, LogIn, UserPlus, Eye, EyeOff, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { MercuryTitle } from './MercuryTitle';
import { InteractiveHands } from './InteractiveHands';

interface LandingPageProps {
  onCreateEvent: () => void;
  onJoinEvent: (eventCode: string) => void;
  onLogin?: (username: string, password: string) => boolean;
  onSignUp?: () => void;
}

export function LandingPage({ onCreateEvent, onJoinEvent, onLogin, onSignUp }: LandingPageProps) {
  const [eventCode, setEventCode] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinEvent = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (eventCode.trim()) {
      setIsAnimating(true);
      setTimeout(() => {
        onJoinEvent(eventCode.trim());
      }, 300);
    }
  };

  const handleJoinParty = () => {
    setShowJoinInput(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onLogin) {
      onCreateEvent(); // Fallback to host login page
      return;
    }
    
    setLoginError('');
    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const success = onLogin(loginUsername, loginPassword);
    if (!success) {
      setLoginError('Invalid credentials. Try demo/demo');
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Smart Crowd Analysis",
      description: "AI analyzes guest preferences in real-time to create the perfect vibe",
      color: "text-[var(--neon-cyan)]"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Instant Playlist Magic",
      description: "Generate perfect playlists that keep everyone dancing",
      color: "text-[var(--neon-pink)]"
    },
    {
      icon: <Music className="w-6 h-6" />,
      title: "Live DJ Dashboard",
      description: "Professional tools for seamless event management",
      color: "text-[var(--neon-purple)]"
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-black via-gray-950 to-black">
      {/* Dynamic Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Animated Grid Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(168, 85, 247, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(168, 85, 247, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '100px 100px',
          animation: 'gridMove 20s linear infinite'
        }}></div>
        
        {/* Floating Particles */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-[var(--neon-pink)] rounded-full animate-pulse shadow-lg shadow-[var(--neon-pink)]/50"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-[var(--neon-cyan)] rounded-full animate-pulse shadow-lg shadow-[var(--neon-cyan)]/50" style={{animationDelay: '0.5s'}}></div>
        <div className="absolute bottom-32 left-16 w-1.5 h-1.5 bg-[var(--neon-yellow)] rounded-full animate-pulse shadow-lg shadow-[var(--neon-yellow)]/50" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 right-32 w-1 h-1 bg-[var(--neon-purple)] rounded-full animate-pulse shadow-lg shadow-[var(--neon-purple)]/50" style={{animationDelay: '0.7s'}}></div>
        
        {/* Enhanced Gradient Orbs */}
        <div className="absolute -top-60 -right-60 w-[1000px] h-[1000px] bg-gradient-to-br from-[var(--neon-purple)]/30 via-[var(--neon-pink)]/20 to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-60 -left-60 w-[900px] h-[900px] bg-gradient-to-tr from-[var(--neon-cyan)]/30 via-[var(--neon-blue)]/20 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '3s'}}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[var(--neon-yellow)]/15 via-transparent to-transparent rounded-full blur-3xl animate-pulse" style={{animationDuration: '4s'}}></div>
      </div>

      <div className="relative z-10 container mx-auto px-6 py-8">
        {/* Sleek Navigation Bar */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-between items-center mb-20"
        >
          <motion.div 
            className="flex items-center gap-3 cursor-pointer group"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-cyan)] rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-cyan)] flex items-center justify-center shadow-2xl shadow-[var(--neon-purple)]/30">
                <Music className="w-7 h-7 text-white" />
              </div>
            </div>
          </motion.div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowLogin(!showLogin)}
              className="relative overflow-hidden glass-effect text-white/90 !border-white/20 hover:border-[var(--neon-cyan)]/50 transition-all duration-300 px-6 py-2 backdrop-blur-xl"
              variant="outline"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {showLogin ? 'Hide' : 'Login'}
            </Button>
            {onSignUp && (
              <Button
                onClick={onSignUp}
                className="relative overflow-hidden glass-effect text-white bg-gradient-to-r from-[var(--neon-purple)]/90 to-[var(--neon-pink)]/90 hover:from-[var(--neon-purple)] hover:to-[var(--neon-pink)] transition-all duration-300 px-6 py-2 shadow-lg shadow-[var(--neon-purple)]/20"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Sign Up
              </Button>
            )}
          </div>
        </motion.div>

        {/* Modern Login Form */}
        {showLogin && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-12 max-w-lg mx-auto"
          >
            <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent !border-white/20 shadow-2xl">
              <CardContent className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-[var(--neon-cyan)]/20 to-[var(--neon-purple)]/20 rounded-lg">
                      <LogIn className="w-5 h-5 text-[var(--neon-cyan)]" />
                    </div>
                    Host Login
                  </h3>
                  <button
                    onClick={() => setShowLogin(false)}
                    className="text-gray-400 hover:text-white transition-all hover:rotate-90 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="landing-username" className="text-white/90 flex items-center gap-2 text-sm font-medium">
                      <User className="w-4 h-4 text-[var(--neon-cyan)]" />
                      Username
                    </Label>
                    <Input
                      id="landing-username"
                      type="text"
                      placeholder="Enter your username"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="backdrop-blur-xl !bg-white/5 !border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--neon-cyan)] focus:ring-2 focus:ring-[var(--neon-cyan)]/20 rounded-xl transition-all duration-300"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="landing-password" className="text-white/90 flex items-center gap-2 text-sm font-medium">
                      <Lock className="w-4 h-4 text-[var(--neon-pink)]" />
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="landing-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="backdrop-blur-xl !bg-white/5 !border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--neon-pink)] focus:ring-2 focus:ring-[var(--neon-pink)]/20 pr-12 rounded-xl transition-all duration-300"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[var(--neon-pink)] transition-colors p-1 rounded-lg hover:bg-white/10"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  {loginError && (
                    <div className="p-4 backdrop-blur-xl bg-red-500/10 border border-red-500/30 rounded-xl">
                      <p className="text-red-400 text-sm text-center">{loginError}</p>
                    </div>
                  )}
                  <div className="p-4 backdrop-blur-xl bg-gradient-to-r from-[var(--neon-yellow)]/10 to-[var(--neon-yellow)]/5 rounded-xl border border-[var(--neon-yellow)]/30">
                    <div className="flex items-center gap-2 justify-center">
                      <Sparkles className="w-5 h-5 text-[var(--neon-yellow)]" />
                      <span className="text-[var(--neon-yellow)] text-sm font-semibold">Demo: demo/demo</span>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={isLoading || !loginUsername || !loginPassword}
                    className="w-full bg-gradient-to-r from-[var(--neon-pink)] to-[var(--neon-purple)] hover:from-[var(--neon-pink)]/90 hover:to-[var(--neon-purple)]/90 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--neon-pink)]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                        Signing In...
                      </div>
                    ) : (
                      <>
                        <Music className="w-5 h-5 mr-2" />
                        Sign In
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-24"
        >
          {/* Premium Badge */}
          <motion.div 
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full mb-12 backdrop-blur-2xl bg-gradient-to-r from-white/10 via-white/5 to-transparent border border-white/20 cursor-pointer group transition-all duration-300 hover:border-[var(--neon-cyan)]/50"
            whileHover={{ scale: 1.05, y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative">
              <Sparkles className="w-5 h-5 text-[var(--neon-cyan)] animate-pulse relative z-10" />
              <div className="absolute inset-0 blur-md bg-[var(--neon-cyan)]/30 group-hover:bg-[var(--neon-cyan)]/50 transition-all"></div>
            </div>
            <span className="text-sm font-semibold text-white/90">The Future of Party Music</span>
          </motion.div>
          
          {/* Main Title */}
          <motion.div 
            className="mb-12 relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <MercuryTitle 
              text="QRate"
              className="mb-8"
            />
            
            <p className="text-2xl md:text-3xl lg:text-4xl text-white/90 max-w-4xl mx-auto leading-relaxed font-light tracking-wide">
              Create <span className="relative inline-block font-semibold text-[var(--neon-pink)]">
                <span className="relative z-10">personalized playlists</span>
                <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--neon-pink)]/60 to-transparent blur-sm"></div>
              </span> that unite your crowd through 
              <span className="relative inline-block font-semibold text-[var(--neon-cyan)]">
                <span className="relative z-10">AI-powered music intelligence</span>
                <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--neon-cyan)]/60 to-transparent blur-sm"></div>
              </span>
            </p>
          </motion.div>

        </motion.div>

        {/* Interactive Hands */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-24"
        >
          <div className="backdrop-blur-3xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 rounded-3xl overflow-hidden shadow-2xl">
            <InteractiveHands 
              onHostParty={onCreateEvent}
              onJoinParty={handleJoinParty}
            />
          </div>
        </motion.div>

        {/* Join Party Input */}
        {showJoinInput && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-lg mx-auto mb-16"
          >
            <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent !border-white/20 shadow-2xl">
              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-6 text-white flex items-center justify-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-[var(--neon-pink)]/20 to-[var(--neon-purple)]/20 rounded-lg">
                    <Music className="w-6 h-6 text-[var(--neon-pink)]" />
                  </div>
                  Enter Party Code
                </h3>
                <div className="space-y-4">
                  <Input
                    placeholder="Enter party code"
                    value={eventCode}
                    onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                    className="backdrop-blur-xl !bg-white/5 !border-white/20 text-white placeholder:text-gray-500 focus:border-[var(--neon-cyan)] focus:ring-2 focus:ring-[var(--neon-cyan)]/20 rounded-xl text-center text-2xl font-bold tracking-widest py-6"
                    onKeyDown={(e) => { if (e.key === 'Enter') { handleJoinEvent(e); } }}
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      onClick={(e) => handleJoinEvent(e)}
                      disabled={!eventCode.trim() || isAnimating}
                      className="flex-1 bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] hover:from-[var(--neon-cyan)]/90 hover:to-[var(--neon-blue)]/90 text-black font-semibold py-6 rounded-xl transition-all duration-300 hover:shadow-2xl hover:shadow-[var(--neon-cyan)]/25 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                      {isAnimating ? (
                        <div className="flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2"></div>
                          Joining...
                        </div>
                      ) : (
                        <>
                          Join the Vibe
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </>
                      )}
                    </Button>
                    <Button 
                      type="button"
                      onClick={() => { setShowJoinInput(false); setEventCode(''); }}
                      variant="outline"
                      className="px-6 py-6 !border-white/20 hover:border-[var(--neon-pink)]/50 text-white/70 hover:text-white rounded-xl transition-all duration-300 backdrop-blur-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="max-w-7xl mx-auto mb-24"
        >
          <div className="text-center mb-16 relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
            <div className="relative z-10">
              <motion.h2 
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-white"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                How <span className="bg-gradient-to-r from-[var(--neon-purple)] via-[var(--neon-cyan)] to-[var(--neon-pink)] bg-clip-text text-transparent">QRate</span> Works
              </motion.h2>
              <p className="text-white/70 text-xl lg:text-2xl font-light">
                Advanced AI meets intuitive design for unforgettable experiences
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 + index * 0.15 }}
                whileHover={{ y: -10, scale: 1.02 }}
                className="h-full"
              >
                <Card className="backdrop-blur-2xl bg-gradient-to-br from-white/10 via-white/5 to-transparent !border-white/20 group h-full relative overflow-hidden transition-all duration-300 hover:border-[var(--neon-purple)]/50 hover:shadow-2xl">
                  <CardContent className="p-10 text-center relative z-10">
                    <motion.div 
                      className="inline-flex p-5 rounded-2xl mb-6 relative group/icon"
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      transition={{ duration: 0.3 }}
                      style={{
                        background: feature.color.includes('cyan') 
                          ? 'linear-gradient(135deg, rgba(6,182,212,0.2), rgba(6,182,212,0.05))'
                          : feature.color.includes('pink')
                          ? 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(236,72,153,0.05))'
                          : 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(168,85,247,0.05))'
                      }}
                    >
                      <div className={`relative ${feature.color}`}>
                        {feature.icon}
                      </div>
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-4 text-white">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 leading-relaxed text-lg">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="max-w-5xl mx-auto mb-16"
        >
          <div className="backdrop-blur-3xl bg-gradient-to-br from-white/10 via-white/5 to-transparent border border-white/20 relative overflow-hidden rounded-3xl shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--neon-purple)]/5 via-[var(--neon-cyan)]/5 to-[var(--neon-pink)]/5 animate-pulse"></div>
            <div className="text-center relative z-10 py-16 px-8">
              <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-white">
                Ready to Transform Your Next Event?
              </h2>
              <p className="text-xl lg:text-2xl text-white/70 mb-10 font-light max-w-3xl mx-auto">
                Join thousands of hosts creating unforgettable party experiences
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button
                  onClick={onCreateEvent}
                  size="lg"
                  className="relative overflow-hidden text-white bg-gradient-to-r from-[var(--neon-purple)] to-[var(--neon-pink)] hover:from-[var(--neon-purple)]/90 hover:to-[var(--neon-pink)]/90 transition-all duration-300 px-10 py-7 text-lg font-bold shadow-2xl hover:shadow-[var(--neon-purple)]/30 hover:scale-105 rounded-xl"
                >
                  <Sparkles className="w-6 h-6 mr-2" />
                  Start Creating
                </Button>
                <Button
                  onClick={handleJoinParty}
                  size="lg"
                  variant="outline"
                  className="backdrop-blur-xl text-white border-2 border-[var(--neon-cyan)]/50 hover:border-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 hover:bg-[var(--neon-cyan)]/20 transition-all duration-300 px-10 py-7 text-lg font-bold hover:scale-105 rounded-xl"
                >
                  Join a Party
                  <Music className="w-6 h-6 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}