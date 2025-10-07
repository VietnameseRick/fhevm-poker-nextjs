// Hand detection utilities for poker
// Card encoding: value 0-51 representing (rank * 4 + suit)
// Rank: 0=2, 1=3, ..., 12=Ace
// Suit: 0=Hearts, 1=Diamonds, 2=Clubs, 3=Spades

export enum HandRank {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
  RoyalFlush = 9,
}

export const HandRankNames: Record<HandRank, string> = {
  [HandRank.HighCard]: "High Card",
  [HandRank.OnePair]: "One Pair",
  [HandRank.TwoPair]: "Two Pair",
  [HandRank.ThreeOfAKind]: "Three of a Kind",
  [HandRank.Straight]: "Straight",
  [HandRank.Flush]: "Flush",
  [HandRank.FullHouse]: "Full House",
  [HandRank.FourOfAKind]: "Four of a Kind",
  [HandRank.StraightFlush]: "Straight Flush",
  [HandRank.RoyalFlush]: "Royal Flush",
};

export const HandRankEmojis: Record<HandRank, string> = {
  [HandRank.HighCard]: "🃏",
  [HandRank.OnePair]: "🎴",
  [HandRank.TwoPair]: "🎴🎴",
  [HandRank.ThreeOfAKind]: "🃏🃏🃏",
  [HandRank.Straight]: "📊",
  [HandRank.Flush]: "💎",
  [HandRank.FullHouse]: "🏠",
  [HandRank.FourOfAKind]: "🃏🃏🃏🃏",
  [HandRank.StraightFlush]: "💎📊",
  [HandRank.RoyalFlush]: "👑💎",
};

interface HandResult {
  rank: HandRank;
  name: string;
  emoji: string;
  description: string;
}

function getRank(cardValue: number): number {
  return Math.floor(cardValue / 4);
}

function getSuit(cardValue: number): number {
  return cardValue % 4;
}

export function detectHand(holeCards: number[], communityCards: number[]): HandResult | null {
  if (holeCards.length !== 2 || communityCards.length === 0) {
    return null;
  }

  const allCards = [...holeCards, ...communityCards];
  const ranks = allCards.map(getRank);
  const suits = allCards.map(getSuit);

  // Count ranks
  const rankCounts: Record<number, number> = {};
  ranks.forEach((rank) => {
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  });

  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const uniqueRanks = Object.keys(rankCounts).map(Number).sort((a, b) => b - a);

  // Count suits
  const suitCounts: Record<number, number> = {};
  suits.forEach((suit) => {
    suitCounts[suit] = (suitCounts[suit] || 0) + 1;
  });
  const isFlush = Object.values(suitCounts).some((count) => count >= 5);

  // Check for straight
  let isStraight = false;
  let straightHigh = 0;
  
  // Sort unique ranks
  const sortedRanks = [...new Set(ranks)].sort((a, b) => b - a);
  
  // Check normal straight
  for (let i = 0; i <= sortedRanks.length - 5; i++) {
    if (
      sortedRanks[i] - sortedRanks[i + 1] === 1 &&
      sortedRanks[i + 1] - sortedRanks[i + 2] === 1 &&
      sortedRanks[i + 2] - sortedRanks[i + 3] === 1 &&
      sortedRanks[i + 3] - sortedRanks[i + 4] === 1
    ) {
      isStraight = true;
      straightHigh = sortedRanks[i];
      break;
    }
  }

  // Check wheel (A-2-3-4-5)
  if (!isStraight && sortedRanks.includes(12) && sortedRanks.includes(3) && sortedRanks.includes(2) && sortedRanks.includes(1) && sortedRanks.includes(0)) {
    isStraight = true;
    straightHigh = 3; // 5 high
  }

  // Determine hand rank
  const holeRanks = holeCards.map(getRank);
  
  // Four of a kind
  if (counts[0] === 4) {
    const quadRank = Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 4);
    const hasHoleCard = holeRanks.some(r => r === Number(quadRank));
    return {
      rank: HandRank.FourOfAKind,
      name: HandRankNames[HandRank.FourOfAKind],
      emoji: HandRankEmojis[HandRank.FourOfAKind],
      description: hasHoleCard ? `Four ${getRankName(Number(quadRank))}s` : `Four of a Kind`,
    };
  }

  // Full house
  if (counts[0] === 3 && counts[1] === 2) {
    const tripRank = Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 3);
    const hasHoleCard = holeRanks.some(r => r === Number(tripRank));
    return {
      rank: HandRank.FullHouse,
      name: HandRankNames[HandRank.FullHouse],
      emoji: HandRankEmojis[HandRank.FullHouse],
      description: hasHoleCard ? `Full House, ${getRankName(Number(tripRank))}s full` : `Full House`,
    };
  }

  // Royal flush
  if (isFlush && isStraight && straightHigh === 12) {
    return {
      rank: HandRank.RoyalFlush,
      name: HandRankNames[HandRank.RoyalFlush],
      emoji: HandRankEmojis[HandRank.RoyalFlush],
      description: "Royal Flush!",
    };
  }

  // Straight flush
  if (isFlush && isStraight) {
    return {
      rank: HandRank.StraightFlush,
      name: HandRankNames[HandRank.StraightFlush],
      emoji: HandRankEmojis[HandRank.StraightFlush],
      description: `Straight Flush, ${getRankName(straightHigh)} high`,
    };
  }

  // Flush
  if (isFlush) {
    return {
      rank: HandRank.Flush,
      name: HandRankNames[HandRank.Flush],
      emoji: HandRankEmojis[HandRank.Flush],
      description: "Flush",
    };
  }

  // Straight
  if (isStraight) {
    return {
      rank: HandRank.Straight,
      name: HandRankNames[HandRank.Straight],
      emoji: HandRankEmojis[HandRank.Straight],
      description: `Straight, ${getRankName(straightHigh)} high`,
    };
  }

  // Three of a kind
  if (counts[0] === 3) {
    const tripRank = Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 3);
    const hasHoleCard = holeRanks.some(r => r === Number(tripRank));
    return {
      rank: HandRank.ThreeOfAKind,
      name: HandRankNames[HandRank.ThreeOfAKind],
      emoji: HandRankEmojis[HandRank.ThreeOfAKind],
      description: hasHoleCard ? `Three ${getRankName(Number(tripRank))}s` : `Three of a Kind`,
    };
  }

  // Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    const pairs = Object.keys(rankCounts).filter(k => rankCounts[Number(k)] === 2).map(Number).sort((a, b) => b - a);
    const hasHolePair = pairs.some(pairRank => holeRanks.filter(r => r === pairRank).length === 2);
    if (hasHolePair) {
      return {
        rank: HandRank.TwoPair,
        name: HandRankNames[HandRank.TwoPair],
        emoji: HandRankEmojis[HandRank.TwoPair],
        description: `Two Pair, Pocket ${getRankName(pairs.find(p => holeRanks.filter(r => r === p).length === 2)!)}s`,
      };
    }
    return {
      rank: HandRank.TwoPair,
      name: HandRankNames[HandRank.TwoPair],
      emoji: HandRankEmojis[HandRank.TwoPair],
      description: `Two Pair, ${getRankName(pairs[0])}s and ${getRankName(pairs[1])}s`,
    };
  }

  // One pair
  if (counts[0] === 2) {
    const pairRank = Object.keys(rankCounts).find(k => rankCounts[Number(k)] === 2);
    const isPocketPair = holeRanks[0] === holeRanks[1] && holeRanks[0] === Number(pairRank);
    if (isPocketPair) {
      return {
        rank: HandRank.OnePair,
        name: HandRankNames[HandRank.OnePair],
        emoji: HandRankEmojis[HandRank.OnePair],
        description: `Pocket ${getRankName(Number(pairRank))}s`,
      };
    }
    return {
      rank: HandRank.OnePair,
      name: HandRankNames[HandRank.OnePair],
      emoji: HandRankEmojis[HandRank.OnePair],
      description: `Pair of ${getRankName(Number(pairRank))}s`,
    };
  }

  // High card
  const highCard = Math.max(...ranks);
  return {
    rank: HandRank.HighCard,
    name: HandRankNames[HandRank.HighCard],
    emoji: HandRankEmojis[HandRank.HighCard],
    description: `${getRankName(highCard)} high`,
  };
}

function getRankName(rank: number): string {
  const names = ["Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Jack", "Queen", "King", "Ace"];
  return names[rank] || "Unknown";
}

