import { useEffect, useRef, useState, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  gradientPosition: number;
  id: number;
}

interface MercuryTitleProps {
  text: string;
  className?: string;
}

export function MercuryTitle({ text, className = "" }: MercuryTitleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const animationRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const createParticles = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerRect = container.getBoundingClientRect();
    
    // Make the font very large for better particle distribution
    const fontSize = Math.min(containerRect.width / text.length * 1.8, 160);
    
    // Set font for text sampling
    ctx.font = `bold ${fontSize}px 'Orbitron', 'Rajdhani', 'Exo 2', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Create temporary canvas for text sampling
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Size temp canvas to fit text with padding
    tempCanvas.width = containerRect.width;
    tempCanvas.height = containerRect.height;
    tempCtx.font = ctx.font;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillStyle = 'white';
    tempCtx.letterSpacing = '0.05em'; // Slight letter spacing increase

    // Draw text on temp canvas
    const centerX = tempCanvas.width / 2;
    const centerY = tempCanvas.height / 2;
    tempCtx.fillText(text.toUpperCase(), centerX, centerY);

    // Get image data for particle sampling
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const pixels = imageData.data;

    const particles: Particle[] = [];
    let particleId = 0;

    // Optimized particle sampling - much less dense for performance
    const step = 7; // Sample every 8 pixels (much less dense)
    
    for (let y = 0; y < tempCanvas.height; y += step) {
      for (let x = 0; x < tempCanvas.width; x += step) {
        const index = (y * tempCanvas.width + x) * 4;
        const alpha = pixels[index + 3]; // Alpha channel
        
        // If pixel is part of text (alpha > threshold)
        if (alpha > 100) {
          // Random chance to skip some particles for performance
          if (Math.random() > 0.7) continue;
          
          // Add some randomness for natural mercury look
          const offsetX = (Math.random() - 0.5) * 6;
          const offsetY = (Math.random() - 0.5) * 6;
          
          // Calculate gradient position (0 = start of text, 1 = end of text)
          const gradientPosition = x / tempCanvas.width;
          
          particles.push({
            x: x + offsetX + (Math.random() - 0.5) * 8,
            y: y + offsetY + (Math.random() - 0.5) * 8,
            targetX: x + offsetX,
            targetY: y + offsetY,
            vx: 0,
            vy: 0,
            size: Math.random() * 4 + 3, // Back to larger particles
            opacity: Math.random() * 0.3 + 0.7,
            gradientPosition, // Store gradient position for color calculation
            id: particleId++
          });
        }
      }
    }

    // Create border particles for letter definition
    tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.strokeStyle = 'white';
    tempCtx.lineWidth = 4;
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.font = `bold ${fontSize}px 'Orbitron', 'Rajdhani', 'Exo 2', sans-serif`;
    tempCtx.letterSpacing = '0.05em'; // Match main particle spacing
    tempCtx.strokeText(text.toUpperCase(), centerX, centerY);
    
    const borderImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const borderPixels = borderImageData.data;
    
    // Add border particles (sparser sampling for outline)
    const borderStep = 50; // Even sparser for border
    for (let y = 0; y < tempCanvas.height; y += borderStep) {
      for (let x = 0; x < tempCanvas.width; x += borderStep) {
        const index = (y * tempCanvas.width + x) * 4;
        const alpha = borderPixels[index + 3]; // Alpha channel
        
        if (alpha > 100) {
          // Random chance to create border particle
          if (Math.random() > 0.6) continue;
          
          const offsetX = (Math.random() - 0.5) * 4;
          const offsetY = (Math.random() - 0.5) * 4;
          const gradientPosition = x / tempCanvas.width;
          
          particles.push({
            x: x + offsetX + (Math.random() - 0.5) * 6,
            y: y + offsetY + (Math.random() - 0.5) * 6,
            targetX: x + offsetX,
            targetY: y + offsetY,
            vx: 0,
            vy: 0,
            size: Math.random() * 2 + 1.5, // Smaller border particles
            opacity: Math.random() * 0.4 + 0.5,
            gradientPosition,
            id: particleId++
          });
        }
      }
    }

    // Limit total particles for performance
    if (particles.length > 900) {
      particles.splice(900);
    }

    // Add fewer extra particles 
    const extraCount = Math.min(particles.length * 0.15, 80);
    for (let i = 0; i < extraCount; i++) {
      const sourceParticle = particles[Math.floor(Math.random() * particles.length)];
      if (sourceParticle) {
        particles.push({
          x: sourceParticle.targetX + (Math.random() - 0.5) * 12,
          y: sourceParticle.targetY + (Math.random() - 0.5) * 12,
          targetX: sourceParticle.targetX + (Math.random() - 0.5) * 8,
          targetY: sourceParticle.targetY + (Math.random() - 0.5) * 8,
          vx: 0,
          vy: 0,
          size: Math.random() * 3 + 2, // Back to larger extra particles
          opacity: Math.random() * 0.2 + 0.5,
          gradientPosition: sourceParticle.gradientPosition, // Inherit gradient position
          id: particleId++
        });
      }
    }

    particlesRef.current = particles;
    setIsInitialized(true);
  }, [text]);

  // Setup canvas and create particles
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      createParticles();
    };

    // Initial setup
    updateCanvasSize();
    
    // Handle resize
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(container);

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 }; // Move mouse far away
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      resizeObserver.disconnect();
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [createParticles]);

  // Animation loop
  useEffect(() => {
    if (!isInitialized) return;

    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      
      // Clear canvas completely for better performance
      ctx.clearRect(0, 0, rect.width, rect.height);

      // No static outline - we'll use border particles instead!

      // Update and draw particles
      const particles = particlesRef.current;
      const mouse = mouseRef.current;
      const repelRadius = 200;
      const repelForce = 15;
      const returnForce = .1;
      const friction = 0.92;

      particles.forEach(particle => {
        // Calculate distance to mouse
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Apply repulsion force from mouse
        if (distance < repelRadius && distance > 0) {
          const force = (repelRadius - distance) / repelRadius * repelForce;
          const angle = Math.atan2(dy, dx);
          particle.vx -= Math.cos(angle) * force;
          particle.vy -= Math.sin(angle) * force;
        }

        // Apply return force to target position
        const returnDx = particle.targetX - particle.x;
        const returnDy = particle.targetY - particle.y;
        particle.vx += returnDx * returnForce;
        particle.vy += returnDy * returnForce;

        // Apply friction
        particle.vx *= friction;
        particle.vy *= friction;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Calculate color based on gradient position (refined cyan to purple)
        const interpolateColor = (pos: number) => {
          // Cyan: #06b6d4 -> rgb(6, 182, 212)
          // Purple: #a855f7 -> rgb(168, 85, 247)
          const cyanR = 6, cyanG = 182, cyanB = 212;
          const purpleR = 168, purpleG = 85, purpleB = 247;
          
          const r = Math.round(cyanR + (purpleR - cyanR) * pos);
          const g = Math.round(cyanG + (purpleG - cyanG) * pos);
          const b = Math.round(cyanB + (purpleB - cyanB) * pos);
          
          return { r, g, b };
        };

        const color = interpolateColor(particle.gradientPosition);
        const colorStr = `rgb(${color.r}, ${color.g}, ${color.b})`;
        
        ctx.save();
        
        // Main particle body with neon gradient
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 2
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`);
        gradient.addColorStop(0.2, `rgba(${color.r + 50}, ${color.g + 50}, ${color.b}, ${particle.opacity * 0.9})`);
        gradient.addColorStop(0.6, `rgba(${color.r}, ${color.g}, ${color.b}, ${particle.opacity * 0.8})`);
        gradient.addColorStop(1, `rgba(${Math.max(0, color.r - 30)}, ${Math.max(0, color.g - 30)}, ${Math.max(0, color.b - 30)}, ${particle.opacity * 0.4})`);

        ctx.fillStyle = gradient;
        ctx.shadowColor = colorStr;
        ctx.shadowBlur = 6;
        ctx.globalAlpha = particle.opacity;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Bright white highlight for metallic effect
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.globalAlpha = particle.opacity * 0.7;
        ctx.beginPath();
        ctx.arc(
          particle.x - particle.size * 0.25, 
          particle.y - particle.size * 0.25, 
          particle.size * 0.25, 
          0, Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInitialized]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full flex items-center justify-center ${className} cursor-crosshair select-none`}
      style={{ 
        height: '200px',
        minHeight: '200px'
      }}
    >
      {/* Canvas for mercury particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ 
          filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.4))',
        }}
      />
      
      {/* Loading text with bright cyan-to-purple gradient (visible until particles load) */}
      {!isInitialized && (
        <div 
          className="absolute inset-0 flex items-center justify-center text-7xl md:text-9xl font-bold text-center px-4"
          style={{
            fontFamily: "'Orbitron', 'Rajdhani', 'Exo 2', sans-serif",
            letterSpacing: '0.05em', // Match particle spacing
            backgroundImage: 'linear-gradient(90deg, #06b6d4 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 20px rgba(6, 182, 212, 0.6)',
            filter: 'drop-shadow(0 0 25px rgba(168, 85, 247, 0.4))'
          }}
        >
          {text.toUpperCase()}
        </div>
      )}
      

    </div>
  );
}