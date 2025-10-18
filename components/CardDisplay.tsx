"use client";

// Card encoding: value 0-51 representing (rank * 4 + suit)
// Rank: 0=2, 1=3, ..., 12=Ace
// Suit: 0=Hearts, 1=Diamonds, 2=Clubs, 3=Spades

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS = ["♥", "♦", "♣", "♠"];
const SUIT_COLORS = ["text-red-600", "text-red-600", "text-gray-900", "text-gray-900"];

export function decodeCard(cardValue: number): { rank: string; suit: string; color: string } {
  const rankIndex = Math.floor(cardValue / 4);
  const suitIndex = cardValue % 4;
  return {
    rank: RANKS[rankIndex],
    suit: SUITS[suitIndex],
    color: SUIT_COLORS[suitIndex],
  };
}

interface CardProps {
  cardValue?: number;
  hidden?: boolean;
  className?: string;
  flip?: boolean;
  dealDelayMs?: number;
  highlighted?: boolean; // New: for hand highlighting
  highlightDelay?: number; // New: stagger highlight animation
}

export function Card({ cardValue, hidden = false, className = "", flip = false, dealDelayMs = 0, highlighted = false, highlightDelay = 0 }: CardProps) {
  if (hidden || cardValue === undefined) {
    return (
      <div className={`relative w-14 h-20 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 rounded-xl border-2 border-blue-950 shadow-2xl transform hover:scale-105 transition-transform duration-200 ${className}`}
        style={{ animation: `dealIn 300ms ease-out ${dealDelayMs}ms both` }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-16 border-4 border-blue-400 rounded-lg opacity-30"></div>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-blue-300 text-2xl font-bold opacity-50">🂠</div>
        </div>
      </div>
    );
  }

  const { rank, suit, color } = decodeCard(cardValue);

  return (
    <div
      className={`relative w-14 h-20 rounded-xl border-2 shadow-2xl transform hover:scale-105 transition-all duration-200 hover:shadow-3xl ${
        highlighted 
          ? 'ring-4 ring-green-400 border-green-500 shadow-green-500/80 animate-highlight-pulse highlight-card' 
          : ''
      } ${className}`}
      style={{ 
        animation: highlighted 
          ? `dealIn 300ms ease-out ${dealDelayMs}ms both, highlightGlow 1.5s ease-in-out ${dealDelayMs + highlightDelay}ms both` 
          : `dealIn 300ms ease-out ${dealDelayMs}ms both`, 
        transformStyle: 'preserve-3d' 
      }}
    >
      {/* Front face */}
      <div className={`absolute inset-0 bg-white border-gray-300 rounded-xl backface-hidden`} style={{ transform: flip ? 'rotateY(180deg)' : 'rotateY(0deg)', transition: 'transform 400ms ease' }}>
        {/* Corner rank/suit (top-left) */}
        <div className={`absolute top-1 left-2 flex flex-col items-center leading-none ${color}`}>
          <span className="text-md">{suit}</span>
        </div>
        {/* Center large suit */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${color} text-6xl font-bold opacity-20`}>{suit}</div>
        </div>
        {/* Center rank */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${color} text-2xl font-bold`}>{rank}</div>
        </div>
        {/* Corner rank/suit (bottom-right, rotated) */}
        <div className={`absolute bottom-1 right-2 flex flex-col-reverse items-center leading-none transform rotate-180 ${color}`}>
          <span className="text-md">{suit}</span>
        </div>
      </div>
      {/* Back face */}
      <div className="absolute inset-0" style={{ transform: flip ? 'rotateY(0deg)' : 'rotateY(180deg)', transition: 'transform 400ms ease', backfaceVisibility: 'hidden' }}>
        <div className="relative w-full h-full bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 rounded-xl border-2 border-blue-950">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-16 border-4 border-blue-400 rounded-lg opacity-30"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-blue-300 text-4xl font-bold opacity-50">🂠</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CardHandProps {
  cards: Array<number | undefined>;
  hidden?: boolean;
  className?: string;
  flip?: boolean;
  staggerMs?: number;
  highlightedIndices?: number[]; // New: indices of cards to highlight
  highlightDelay?: number; // New: base delay before highlighting starts
}

export function CardHand({ 
  cards, 
  hidden = false, 
  className = "", 
  flip = false, 
  staggerMs = 80,
  highlightedIndices = [],
  highlightDelay = 0
}: CardHandProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      {cards.map((card, index) => {
        const isHighlighted = highlightedIndices.includes(index);
        const highlightIdx = highlightedIndices.indexOf(index);
        
        return (
          <Card
            key={index}
            cardValue={card}
            hidden={hidden}
            flip={flip && !hidden}
            dealDelayMs={index * staggerMs}
            highlighted={isHighlighted}
            highlightDelay={highlightDelay + (isHighlighted ? highlightIdx * 150 : 0)}
            className="will-change-transform"
          />
        );
      })}
    </div>
  );
}

// Animation keyframes
export function CardAnimations() {
  return (
    <style jsx global>{`
      @keyframes dealIn {
        from { opacity: 0; transform: translateY(-10px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      
      @keyframes highlightGlow {
        0% {
          transform: scale(1);
          box-shadow: 0 0 0 rgba(34, 197, 94, 0);
        }
        50% {
          transform: scale(1.15);
          box-shadow: 
            0 0 40px rgba(34, 197, 94, 1),
            0 0 80px rgba(34, 197, 94, 0.6),
            0 0 120px rgba(34, 197, 94, 0.3),
            inset 0 0 20px rgba(34, 197, 94, 0.4);
        }
        100% {
          transform: scale(1.08);
          box-shadow: 
            0 0 30px rgba(34, 197, 94, 0.8),
            0 0 60px rgba(34, 197, 94, 0.5),
            0 0 90px rgba(34, 197, 94, 0.2),
            inset 0 0 15px rgba(34, 197, 94, 0.3);
        }
      }
      
      .animate-highlight-pulse {
        animation: highlightPulse 1.5s ease-in-out infinite;
      }
      
      @keyframes highlightPulse {
        0%, 100% {
          box-shadow: 
            0 0 25px rgba(34, 197, 94, 0.9),
            0 0 50px rgba(34, 197, 94, 0.6),
            0 0 75px rgba(34, 197, 94, 0.3),
            inset 0 0 15px rgba(34, 197, 94, 0.2);
          filter: brightness(1.2);
        }
        50% {
          box-shadow: 
            0 0 40px rgba(34, 197, 94, 1),
            0 0 80px rgba(34, 197, 94, 0.8),
            0 0 120px rgba(34, 197, 94, 0.5),
            inset 0 0 25px rgba(34, 197, 94, 0.4);
          filter: brightness(1.4) saturate(1.3);
        }
      }
      
      /* Green neon glow effect for highlighted cards */
      .highlight-card {
        position: relative;
        filter: brightness(1.2);
      }
      
      .highlight-card::before {
        content: '';
        position: absolute;
        inset: -8px;
        border-radius: 1rem;
        background: radial-gradient(circle at center, rgba(34, 197, 94, 0.3), transparent 70%);
        animation: particles 2s ease-in-out infinite;
        pointer-events: none;
        z-index: -1;
      }
      
      @keyframes particles {
        0%, 100% {
          transform: scale(1) rotate(0deg);
          opacity: 0.6;
        }
        50% {
          transform: scale(1.2) rotate(180deg);
          opacity: 1;
        }
      }
    `}</style>
  );
}

