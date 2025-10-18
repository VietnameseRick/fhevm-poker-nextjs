"use client";

import { useEffect, useRef } from "react";
import anime from "animejs";

export function ShuffleAnimation() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create card shuffle animation
    const cards = containerRef.current.querySelectorAll(".shuffle-card");
    
    // Animate cards shuffling
    anime({
      targets: cards,
      translateX: () => anime.random(-100, 100),
      translateY: () => anime.random(-50, 50),
      rotate: () => anime.random(-15, 15),
      opacity: [0.3, 1, 0.3],
      scale: [0.8, 1, 0.8],
      duration: 2000,
      easing: "easeInOutQuad",
      loop: true,
      delay: anime.stagger(200),
    });

    // Cleanup
    return () => {
      anime.remove(cards);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center">
        {/* Cards container */}
        <div ref={containerRef} className="relative h-64 w-64 mx-auto mb-8">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="shuffle-card absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: "80px",
                height: "120px",
                zIndex: i,
              }}
            >
              <div className="w-full h-full rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg border-2 border-cyan-300/50 flex items-center justify-center">
                <div className="text-white text-4xl">♠</div>
              </div>
            </div>
          ))}
        </div>

        {/* Text */}
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-cyan-400 animate-pulse">
            Shuffling Deck
          </h2>
          <p className="text-gray-300 text-lg">
            Securing shuffle with FHE encryption...
          </p>
          <div className="flex justify-center gap-2 mt-6">
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

