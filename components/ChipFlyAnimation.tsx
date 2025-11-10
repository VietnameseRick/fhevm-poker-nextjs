"use client";

import { useEffect, useState } from "react";

interface ChipFlyAnimationProps {
  from: { x: number; y: number }; // Start position
  to: { x: number; y: number };   // End position (winner)
  amount: bigint;
  onComplete?: () => void;
}

interface Chip {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  delay: number;
}

export function ChipFlyAnimation({
  from,
  to,
  amount,
  onComplete
}: ChipFlyAnimationProps) {
  const [chips, setChips] = useState<Chip[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    // Generate 15-20 chips with random trajectories
    const chipCount = Math.min(20, Math.max(10, Number(amount) / 1e16)); // Scale with pot size
    const newChips: Chip[] = [];

    for (let i = 0; i < chipCount; i++) {
      newChips.push({
        id: i,
        startX: from.x,
        startY: from.y,
        endX: to.x + (Math.random() - 0.5) * 40, // Add some randomness to landing position
        endY: to.y + (Math.random() - 0.5) * 40,
        delay: i * 50, // Stagger the chip animations
      });
    }

    setChips(newChips);

    // Mark animation as complete after all chips have flown
    const animationDuration = 1000 + (chipCount * 50);
    const timeout = setTimeout(() => {
      setIsAnimating(false);
      onComplete?.();
    }, animationDuration);

    return () => clearTimeout(timeout);
  }, [from, to, amount, onComplete]);

  if (!isAnimating) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]">
      {chips.map((chip) => (
        <div
          key={chip.id}
          className="absolute w-8 h-8 bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500 rounded-full shadow-lg shadow-orange-500/50 border-2 border-yellow-300"
          style={{
            left: `${chip.startX}px`,
            top: `${chip.startY}px`,
            animation: `chipFly 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${chip.delay}ms forwards`,
            '--chip-tx': `${chip.endX - chip.startX}px`,
            '--chip-ty': `${chip.endY - chip.startY}px`,
          } as React.CSSProperties}
        >
          {/* Chip design */}
          <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
            💰
          </div>
        </div>
      ))}
    </div>
  );
}

