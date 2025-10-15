"use client";

import { useEffect, useRef, useState } from 'react';
import anime from 'animejs';

interface CyberpunkLoaderProps {
  isLoading: boolean;
}

const LOADING_MESSAGES = [
  "SYNCING BLOCKCHAIN STATE...",
  "QUERYING SMART CONTRACT...",
  "VERIFYING CRYPTOGRAPHIC PROOF...",
  "DECRYPTING GAME STATE...",
  "FETCHING LATEST BLOCK...",
];

export function CyberpunkLoader({ isLoading }: CyberpunkLoaderProps) {
  const hexagonRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const bracketsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const [message, setMessage] = useState(LOADING_MESSAGES[0]);

  // Randomize loading message
  useEffect(() => {
    if (!isLoading) return;
    
    const interval = setInterval(() => {
      setMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isLoading]);

  // Hexagon rotation animation
  useEffect(() => {
    if (!isLoading || !hexagonRef.current) return;

    const animation = anime({
      targets: hexagonRef.current,
      rotate: '360deg',
      duration: 2000,
      easing: 'linear',
      loop: true,
    });

    return () => animation.pause();
  }, [isLoading]);

  // Pulsing glow effect
  useEffect(() => {
    if (!isLoading || !hexagonRef.current) return;

    const animation = anime({
      targets: hexagonRef.current,
      scale: [1, 1.1, 1],
      opacity: [0.8, 1, 0.8],
      duration: 1500,
      easing: 'easeInOutQuad',
      loop: true,
    });

    return () => animation.pause();
  }, [isLoading]);

  // Text glitch effect
  useEffect(() => {
    if (!isLoading || !textRef.current) return;

    const glitch = () => {
      if (!textRef.current) return;
      
      const original = textRef.current.style.transform;
      
      anime.timeline()
        .add({
          targets: textRef.current,
          translateX: [0, -3, 2, -2, 1, 0],
          translateY: [0, 2, -1, 2, -1, 0],
          duration: 200,
          easing: 'easeInOutQuad',
        })
        .add({
          targets: textRef.current,
          transform: original,
          duration: 0,
        });
    };

    const interval = setInterval(glitch, 3000);
    
    return () => clearInterval(interval);
  }, [isLoading]);

  // Corner brackets animation
  useEffect(() => {
    if (!isLoading || !bracketsRef.current) return;

    anime({
      targets: bracketsRef.current.querySelectorAll('.bracket'),
      scale: [1, 0.95, 1],
      opacity: [0.7, 1, 0.7],
      duration: 2000,
      easing: 'easeInOutQuad',
      loop: true,
      delay: anime.stagger(100),
    });
  }, [isLoading]);

  // Animated grid background
  useEffect(() => {
    if (!isLoading || !gridRef.current) return;
    
    const canvas = gridRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let offset = 0;

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
      ctx.lineWidth = 1;

      const gridSize = 40;
      
      // Vertical lines
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x + offset, 0);
        ctx.lineTo(x + offset, canvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y + offset);
        ctx.lineTo(canvas.width, y + offset);
        ctx.stroke();
      }

      offset = (offset + 0.5) % gridSize;
      requestAnimationFrame(drawGrid);
    };

    const animationId = requestAnimationFrame(drawGrid);
    
    return () => cancelAnimationFrame(animationId);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Animated grid background */}
      <canvas
        ref={gridRef}
        className="absolute inset-0 opacity-50"
        style={{ mixBlendMode: 'screen' }}
      />
      
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-black/90 via-blue-950/80 to-purple-950/90 backdrop-blur-sm" />
      
      {/* Corner brackets */}
      <div ref={bracketsRef} className="absolute inset-0 pointer-events-none">
        <div className="bracket absolute top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-cyan-400"></div>
        <div className="bracket absolute top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-cyan-400"></div>
        <div className="bracket absolute bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-cyan-400"></div>
        <div className="bracket absolute bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-cyan-400"></div>
      </div>
      
      {/* Main loader content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Hexagon spinner */}
        <div ref={hexagonRef} className="relative w-24 h-24">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Outer hexagon with glow */}
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f3ff" />
                <stop offset="50%" stopColor="#b026ff" />
                <stop offset="100%" stopColor="#ff006e" />
              </linearGradient>
            </defs>
            
            <polygon
              points="50,5 90,25 90,75 50,95 10,75 10,25"
              fill="none"
              stroke="url(#hexGradient)"
              strokeWidth="2"
              filter="url(#glow)"
              className="animate-pulse"
            />
            
            {/* Inner hexagon */}
            <polygon
              points="50,15 80,30 80,70 50,85 20,70 20,30"
              fill="none"
              stroke="#00f3ff"
              strokeWidth="1"
              opacity="0.5"
            />
          </svg>
          
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50 animate-ping"></div>
          </div>
        </div>
        
        {/* Loading text with glitch effect */}
        <div ref={textRef} className="relative">
          <div className="text-cyan-400 text-xl font-mono font-bold tracking-wider text-center">
            {message}
          </div>
          
          {/* Scan line effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-scan-line"></div>
        </div>
        
        {/* Progress dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-cyan-400"
              style={{
                animation: `pulse 1.5s ease-in-out ${i * 0.2}s infinite`,
                boxShadow: '0 0 10px rgba(0, 243, 255, 0.8)'
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Scan lines overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div className="h-full bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent animate-scan-lines"></div>
      </div>
      
      <style jsx>{`
        @keyframes scan-line {
          0%, 100% { transform: translateY(-100%); }
          50% { transform: translateY(100%); }
        }
        
        @keyframes scan-lines {
          0% { background-position: 0 0; }
          100% { background-position: 0 100%; }
        }
        
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
        
        .animate-scan-lines {
          animation: scan-lines 8s linear infinite;
          background-size: 100% 20px;
          background-image: repeating-linear-gradient(
            0deg,
            rgba(0, 243, 255, 0.03) 0px,
            transparent 1px,
            transparent 2px,
            rgba(0, 243, 255, 0.03) 3px
          );
        }
      `}</style>
    </div>
  );
}

