"use client";

// Card encoding: value 0-51 representing (rank * 4 + suit)
// Rank: 0=2, 1=3, ..., 12=Ace
// Suit: 0=Hearts, 1=Diamonds, 2=Clubs, 3=Spades
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const SUITS = ["H", "D", "C", "S"]; // H=Hearts, D=Diamonds, C=Clubs, S=Spades

export function decodeCard(cardValue: number | undefined, hidden: boolean): { imageSrc: string; isBack: boolean } {
  // Nếu hidden là true hoặc cardValue là undefined, luôn trả về mặt sau
  if (hidden || cardValue === undefined) {
    return { imageSrc: '/back.png', isBack: true };
  }
  // Kiểm tra phạm vi hợp lệ cho cardValue
  if (cardValue < 0 || cardValue > 51) {
    return { imageSrc: '/back.png', isBack: true };
  }
  const rankIndex = Math.floor(cardValue / 4); // Match contract: rank from 0-12
  const suitIndex = cardValue % 4; // Match contract: suit from 0-3
  const rank = RANKS[rankIndex];
  const suit = SUITS[suitIndex];
  return { imageSrc: `/${rank}${suit}.png`, isBack: false };
}

interface CardProps {
  cardValue?: number; // Được truyền từ component cha, khớp với contract (0-51)
  hidden?: boolean;
  className?: string;
  flip?: boolean;
  dealDelayMs?: number;
  highlighted?: boolean;
  highlightDelay?: number;
}

export function Card({ cardValue, hidden = false, className = "", flip = false, dealDelayMs = 0, highlighted = false, highlightDelay = 0 }: CardProps) {
  const { imageSrc, isBack } = decodeCard(cardValue, hidden); // Sử dụng hidden làm điều kiện

  return (
    <div
      className={`relative w-14 h-20 shadow-2xl transform hover:scale-105 transition-all duration-200 hover:shadow-3xl ${
        highlighted ? 'ring-4 ring-green-400 border-green-500 shadow-green-500/80 animate-highlight-pulse highlight-card' : ''
      } ${className}`}
      style={{
        animation: highlighted
          ? `dealIn 300ms ease-out ${dealDelayMs}ms both, highlightGlow 1.5s ease-in-out ${dealDelayMs + highlightDelay}ms both`
          : `dealIn 300ms ease-out ${dealDelayMs}ms both`,
        transformStyle: 'preserve-3d',
        imageRendering: 'crisp-edges',
      }}
    >
      {/* Front face with image */}
      <div
        className="absolute inset-0 backface-hidden overflow-hidden"
        style={{
          transform: flip ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transition: 'transform 400ms ease',
          backgroundImage: `url(${imageSrc})`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          imageRendering: 'crisp-edges',
          WebkitFontSmoothing: 'antialiased',
          filter: 'none',
        }}
      ></div>
      {/* Back face */}
      <div
        className="absolute inset-0"
        style={{
          transform: isBack || flip ? 'rotateY(0deg)' : 'rotateY(180deg)', 
          transition: 'transform 400ms ease',
          backfaceVisibility: 'hidden',
          backgroundImage: `url('/back.png')`,
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          imageRendering: 'crisp-edges',
          WebkitFontSmoothing: 'antialiased',
          filter: 'none',
        }}
      ></div>
    </div>
  );
}

interface CardHandProps {
  cards: Array<number | undefined>; // Được truyền từ component cha, khớp với contract (0-51)
  hidden?: boolean;
  className?: string;
  flip?: boolean;
  staggerMs?: number;
  highlightedIndices?: number[];
  highlightDelay?: number;
}

export function CardHand({
  cards,
  hidden = false,
  className = "",
  flip = false,
  staggerMs = 80,
  highlightedIndices = [],
  highlightDelay = 0,
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
            hidden={hidden} // Áp dụng hidden cho toàn bộ hand
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
      @keyframes dealIn { from { opacity: 0; transform: translateY(-10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes highlightGlow { 0% { transform: scale(1); box-shadow: 0 0 0 rgba(34, 197, 94, 0); } 50% { transform: scale(1.15); box-shadow: 0 0 40px rgba(34, 197, 94, 1), 0 0 80px rgba(34, 197, 94, 0.6), 0 0 120px rgba(34, 197, 94, 0.3), inset 0 0 20px rgba(34, 197, 94, 0.4); } 100% { transform: scale(1.08); box-shadow: 0 0 30px rgba(34, 197, 94, 0.8), 0 0 60px rgba(34, 197, 94, 0.5), 0 0 90px rgba(34, 197, 94, 0.2), inset 0 0 15px rgba(34, 197, 94, 0.3); } }
      .animate-highlight-pulse { animation: highlightPulse 1.5s ease-in-out infinite; }
      @keyframes highlightPulse { 0%, 100% { box-shadow: 0 0 25px rgba(34, 197, 94, 0.9), 0 0 50px rgba(34, 197, 94, 0.6), 0 0 75px rgba(34, 197, 94, 0.3), inset 0 0 15px rgba(34, 197, 94, 0.2); } 50% { box-shadow: 0 0 40px rgba(34, 197, 94, 1), 0 0 80px rgba(34, 197, 94, 0.8), 0 0 120px rgba(34, 197, 94, 0.5), inset 0 0 25px rgba(34, 197, 94, 0.4); } }
      .highlight-card { position: relative; }
      .highlight-card::before { content: ''; position: absolute; inset: -8px; border-radius: 1rem; background: radial-gradient(circle at center, rgba(34, 197, 94, 0.3), transparent 70%); animation: particles 2s ease-in-out infinite; pointer-events: none; z-index: -1; }
      @keyframes particles { 0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.6; } 50% { transform: scale(1.2) rotate(180deg); opacity: 1; } }
    `}</style>
  );
}