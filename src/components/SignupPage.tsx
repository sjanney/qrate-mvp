import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { ArrowLeft, UserPlus, Mail, Lock, User, Eye, EyeOff, Sparkles, PartyPopper } from 'lucide-react';
import { motion } from 'framer-motion';

interface SignupPageProps {
  onSignup: (username: string, password: string, email: string) => boolean;
  onBack: () => void;
  onSignIn: () => void;
}

export function SignupPage({ onSignup, onBack, onSignIn }: SignupPageProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }

    setIsLoading(true);
    
    // Add a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 600));

    const success = onSignup(username, password, email);
    if (!success) {
      setError('Username already exists. Please choose a different one.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-16 left-8 w-2 h-2 bg-[var(--neon-cyan)] rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-12 w-1 h-1 bg-[var(--neon-pink)] rounded-full animate-pulse delay-500"></div>
        <div className="absolute bottom-24 left-24 w-1.5 h-1.5 bg-[var(--neon-purple)] rounded-full animate-pulse delay-800"></div>
        <div className="absolute bottom-32 right-20 w-1 h-1 bg-[var(--neon-yellow)] rounded-full animate-pulse delay-200"></div>
        
        {/* Large gradient orbs */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-gradient-to-br from-[var(--neon-cyan)]/20 to-transparent rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-gradient-to-tr from-[var(--neon-pink)]/20 to-transparent rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-md mx-auto">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <Button 
              onClick={onBack}
              className="glass-effect glass-effect-hover glass-effect-accent-purple text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </motion.div>

          {/* Signup Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="glass-effect-strong glass-effect-hover">
              <CardHeader className="text-center pb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-blue)] flex items-center justify-center glass-effect">
                  <UserPlus className="w-8 h-8 text-black" />
                </div>
                <CardTitle className="flex items-center justify-center gap-2 animate-pulse-neon">
                  <span className="text-2xl text-white">Join</span>
                  <span 
                    className="text-2xl"
                    style={{
                      fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive",
                      background: 'linear-gradient(135deg, #ffffff, #e5e5e5, #c0c0c0, #909090)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      textShadow: '0 0 8px rgba(255, 255, 255, 0.4)',
                      filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.2))'
                    }}
                  >
                    QRate
                  </span>
                </CardTitle>
                <p className="text-gray-400 text-sm">
                  Create your account and start hosting amazing parties
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Username Field */}
                  <div className="space-y-2 glass-container">
                    <Label htmlFor="username" className="text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-[var(--neon-cyan)]" />
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="Choose a unique username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="glass-effect-light text-white placeholder-gray-400 focus:border-[var(--neon-cyan)] focus:ring-[var(--neon-cyan)] transition-all duration-300"
                      required
                    />
                  </div>

                  {/* Email Field */}
                  <div className="space-y-2 glass-container">
                    <Label htmlFor="email" className="text-white flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[var(--neon-purple)]" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-effect-light text-white placeholder-gray-400 focus:border-[var(--neon-purple)] focus:ring-[var(--neon-purple)] transition-all duration-300"
                      required
                    />
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2 glass-container">
                    <Label htmlFor="password" className="text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[var(--neon-pink)]" />
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a secure password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="glass-effect-light text-white placeholder-gray-400 focus:border-[var(--neon-pink)] focus:ring-[var(--neon-pink)] pr-12 transition-all duration-300"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[var(--neon-pink)] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2 glass-container">
                    <Label htmlFor="confirmPassword" className="text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[var(--neon-yellow)]" />
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="glass-effect-light text-white placeholder-gray-400 focus:border-[var(--neon-yellow)] focus:ring-[var(--neon-yellow)] pr-12 transition-all duration-300"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[var(--neon-yellow)] transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 glass-effect border border-red-500/30 rounded-lg"
                    >
                      <p className="text-red-400 text-sm text-center">{error}</p>
                    </motion.div>
                  )}

                  {/* Features Preview */}
                  <div className="p-3 glass-effect-strong rounded-lg border border-[var(--neon-cyan)]/30">
                    <div className="flex items-center gap-2 mb-2">
                      <PartyPopper className="w-4 h-4 text-[var(--neon-cyan)]" />
                      <span className="text-[var(--neon-cyan)] text-sm font-medium">What you get:</span>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p>• Create unlimited events</p>
                      <p>• AI-powered music recommendations</p>
                      <p>• Real-time crowd insights</p>
                      <p>• Professional DJ dashboard</p>
                    </div>
                  </div>

                  {/* Signup Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || !username || !email || !password || !confirmPassword}
                    className="w-full bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--neon-blue)] hover:from-[var(--neon-cyan)]/80 hover:to-[var(--neon-blue)]/80 text-black font-medium py-3 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-[var(--neon-cyan)]/25 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin mr-2"></div>
                        Creating Account...
                      </div>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                </form>

                {/* Sign In Link */}
                <div className="pt-4 border-t border-[var(--glass-border)] text-center">
                  <span className="text-gray-400 text-sm">Already have an account?</span>
                  <Button
                    onClick={onSignIn}
                    className="ml-2 p-0 h-auto bg-transparent hover:bg-transparent text-[var(--neon-pink)] hover:text-[var(--neon-pink)]/80 font-medium text-sm underline-offset-4 hover:underline"
                  >
                    Sign In
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}