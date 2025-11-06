import { useState } from 'react';
import handsImage from '../assets/handpic.png';

interface InteractiveHandsProps {
  onHostParty: () => void;
  onJoinParty: () => void;
}

export function InteractiveHands({ onHostParty, onJoinParty }: InteractiveHandsProps) {
  const [hoveredSide, setHoveredSide] = useState<'left' | 'right' | null>(null);

  return (
    <>
      <div className="relative z-0 w-full h-[600px] flex items-center justify-center">
      {/* Main hands image */}
      <div className="relative w-screen h-full" style={{ maxWidth: '100vw' }}>
        {/* Overlay for left hand (guaranteed visible) */}
        {hoveredSide === 'left' && (
          <div
            className="absolute left-0 top-0 w-1/2 h-full z-[9999] pointer-events-none transition-all duration-300"
            style={{
              background: 'linear-gradient(to top, rgba(6,182,212,0.4) 0%, rgba(6,182,212,0.0) 100%)'
            }}
          />
        )}
        {/* Overlay for right hand (guaranteed visible) */}
        {hoveredSide === 'right' && (
          <div
            className="absolute right-0 top-0 w-1/2 h-full z-[9999] pointer-events-none transition-all duration-300"
            style={{
              background: 'linear-gradient(to top, rgba(168,85,247,0.4) 0%, rgba(168,85,247,0.0) 100%)'
            }}
          />
        )}
        <img 
          src={handsImage} 
          alt="Interactive hands - Host or Join" 
          className="w-full h-full object-contain"
        />
        {/* Left hand clickable area (Host a Party) */}
        <button
          onClick={onHostParty}
          onMouseEnter={() => { console.log('Hover left'); setHoveredSide('left'); }}
          onMouseLeave={() => { console.log('Leave left'); setHoveredSide(null); }}
          className="absolute left-0 top-0 w-1/2 h-full group transition-all duration-300 hover:scale-105"
          aria-label="Host a Party"
        >
          {/* Action indicator for left hand (moved to top right) */}
          <div className={`absolute top-4 right-8 transition-all duration-300 ${
            hoveredSide === 'left' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
            <div className="glass-effect px-6 py-3 rounded-lg border border-cyan-500/30">
              <p className="text-cyan-400 font-semibold text-lg neon-text">HOST A PARTY</p>
              <p className="text-cyan-300/80 text-sm mt-1">Create and manage events</p>
            </div>
          </div>
        </button>
        {/* Right hand clickable area (Join a Party) */}
        <button
          onClick={onJoinParty}
          onMouseEnter={() => { console.log('Hover right'); setHoveredSide('right'); }}
          onMouseLeave={() => { console.log('Leave right'); setHoveredSide(null); }}
          className="absolute right-0 top-0 w-1/2 h-full group transition-all duration-300 hover:scale-105"
          aria-label="Join a Party"
        >
          {/* Action indicator for right hand (moved to top left) */}
          <div className={`absolute top-4 left-8 transition-all duration-300 ${
            hoveredSide === 'right' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}>
            <div className="glass-effect px-6 py-3 rounded-lg border border-purple-400/30">
              <p className="text-purple-400 font-semibold text-lg neon-text">JOIN A PARTY</p>
              <p className="text-purple-300/80 text-sm mt-1">Enter with event code</p>
            </div>
          </div>
        </button>
      </div>

      {/* Floating particles for ambiance (optional) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-1 h-1 rounded-full animate-float ${
              i % 3 === 0 ? 'bg-cyan-400' : i % 3 === 1 ? 'bg-purple-400' : 'bg-indigo-400'
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
              opacity: 0.3 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>

      {/* Instructions at bottom */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <p className="text-sm text-gray-400 text-center opacity-70">
          Click on a hand to get started
        </p>
      </div>
    </div>
    </>
  );
}