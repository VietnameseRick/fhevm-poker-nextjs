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

export interface HandValue {
  rank: HandRank;
  tiebreakers: number[];
  contributingCards: number[];
}

export interface EvaluatedHand {
  rank: HandRank;
  rankName: string;
  description: string;
  contributingCardIndices: number[];
  contributingCards: number[];
}

const RANK_NAMES: Record<number, string> = {
  0: 'High Card',
  1: 'One Pair',
  2: 'Two Pair',
  3: 'Three of a Kind',
  4: 'Straight',
  5: 'Flush',
  6: 'Full House',
  7: 'Four of a Kind',
  8: 'Straight Flush',
  9: 'Royal Flush',
};

const CARD_NAMES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const SUIT_NAMES = ['♥', '♦', '♣', '♠'];

function cardToRankSuit(card: number): { rank: number; suit: number } {
  return {
    rank: Math.floor(card / 4),
    suit: card % 4,
  };
}

export function getCardName(card: number): string {
  const { rank, suit } = cardToRankSuit(card);
  return `${CARD_NAMES[rank]}${SUIT_NAMES[suit]}`;
}

export function getRankDisplayName(rank: number): string {
  return CARD_NAMES[rank];
}

export function evaluateBestHand(cards: number[]): EvaluatedHand {
  if (cards.length < 5 || cards.length > 7) {
    throw new Error('Must provide 5-7 cards (flop, turn, or river)');
  }

  let bestHand: HandValue | null = null;

  // If exactly 5 cards, evaluate directly
  if (cards.length === 5) {
    const indices = [0, 1, 2, 3, 4];
    bestHand = evaluate5CardHand(cards, indices);
  } else {
    // Try all combinations of 5 cards from available cards
    const n = cards.length;
    for (let i1 = 0; i1 < n; i1++) {
      for (let i2 = i1 + 1; i2 < n; i2++) {
        for (let i3 = i2 + 1; i3 < n; i3++) {
          for (let i4 = i3 + 1; i4 < n; i4++) {
            for (let i5 = i4 + 1; i5 < n; i5++) {
              const indices = [i1, i2, i3, i4, i5];
              const fiveCards = indices.map(i => cards[i]);
              const hand = evaluate5CardHand(fiveCards, indices);

              if (!bestHand || compareHands(hand, bestHand) > 0) {
                bestHand = hand;
              }
            }
          }
        }
      }
    }
  }

  if (!bestHand) {
    throw new Error('Failed to evaluate hand');
  }

  // Get contributing cards - filter to only the KEY cards that make the hand (not kickers)
  const keyCardIndices = getKeyCardIndices(bestHand, cards);
  const contributingCards = keyCardIndices.map(idx => cards[idx]);
  
  return {
    rank: bestHand.rank,
    rankName: RANK_NAMES[bestHand.rank],
    description: getHandDescription(bestHand.rank, contributingCards),
    contributingCardIndices: keyCardIndices,
    contributingCards,
  };
}

/**
 * Get only the "key" cards that make the hand (excluding kickers)
 * For visual highlighting purposes
 */
function getKeyCardIndices(hand: HandValue, sevenCards: number[]): number[] {
  const allIndices = hand.contributingCards;
  const cards = allIndices.map(idx => sevenCards[idx]);
  const ranksAndSuits = cards.map(cardToRankSuit);
  const ranks = ranksAndSuits.map(rs => rs.rank);
  
  // Count rank occurrences
  const rankCounts = new Map<number, number>();
  ranks.forEach(r => rankCounts.set(r, (rankCounts.get(r) || 0) + 1));
  
  switch (hand.rank) {
    case HandRank.RoyalFlush:
    case HandRank.StraightFlush:
    case HandRank.Straight:
    case HandRank.Flush:
      // All cards contribute
      return allIndices;
      
    case HandRank.FourOfAKind: {
      // Only highlight the 4 cards
      const quadRank = Array.from(rankCounts.entries()).find(([_, count]) => count === 4)?.[0];
      return allIndices.filter((idx, i) => ranks[i] === quadRank);
    }
      
    case HandRank.FullHouse: {
      // Highlight all (3 + 2)
      return allIndices;
    }
      
    case HandRank.ThreeOfAKind: {
      // Only highlight the 3 cards
      const tripRank = Array.from(rankCounts.entries()).find(([_, count]) => count === 3)?.[0];
      return allIndices.filter((idx, i) => ranks[i] === tripRank);
    }
      
    case HandRank.TwoPair: {
      // Highlight both pairs (4 cards total)
      const pairRanks = Array.from(rankCounts.entries())
        .filter(([_, count]) => count === 2)
        .map(([rank]) => rank);
      return allIndices.filter((idx, i) => pairRanks.includes(ranks[i]));
    }
      
    case HandRank.OnePair: {
      // Only highlight the 2 cards that make the pair
      const pairRank = Array.from(rankCounts.entries()).find(([_, count]) => count === 2)?.[0];
      return allIndices.filter((idx, i) => ranks[i] === pairRank);
    }
      
    case HandRank.HighCard:
      // Just highlight the high card
      const highRank = Math.max(...ranks);
      const highCardIdx = allIndices.find((idx, i) => ranks[i] === highRank);
      return highCardIdx !== undefined ? [highCardIdx] : [];
      
    default:
      return allIndices;
  }
}

/**
 * Get human-readable description of hand
 */
function getHandDescription(rank: HandRank, cards: number[]): string {
  const ranks = cards.map(c => cardToRankSuit(c).rank).sort((a, b) => b - a);
  const uniqueRanks = [...new Set(ranks)];

  switch (rank) {
    case HandRank.RoyalFlush:
      return 'Royal Flush';
    case HandRank.StraightFlush:
      return `Straight Flush, ${getRankDisplayName(ranks[0])} high`;
    case HandRank.FourOfAKind:
      return `Four of a Kind, ${getRankDisplayName(uniqueRanks[0])}s`;
    case HandRank.FullHouse:
      return `Full House, ${getRankDisplayName(uniqueRanks[0])}s full of ${getRankDisplayName(uniqueRanks[1])}s`;
    case HandRank.Flush:
      return `Flush, ${getRankDisplayName(ranks[0])} high`;
    case HandRank.Straight:
      // Check for wheel (A-2-3-4-5)
      if (ranks[0] === 12 && ranks[4] === 0) {
        return 'Straight, Five high';
      }
      return `Straight, ${getRankDisplayName(ranks[0])} high`;
    case HandRank.ThreeOfAKind:
      return `Three of a Kind, ${getRankDisplayName(uniqueRanks[0])}s`;
    case HandRank.TwoPair:
      return `Two Pair, ${getRankDisplayName(uniqueRanks[0])}s and ${getRankDisplayName(uniqueRanks[1])}s`;
    case HandRank.OnePair:
      return `Pair of ${getRankDisplayName(uniqueRanks[0])}s`;
    case HandRank.HighCard:
      return `${getRankDisplayName(ranks[0])} high`;
    default:
      return 'Unknown hand';
  }
}

/**
 * Evaluate a specific 5-card hand
 */
function evaluate5CardHand(cards: number[], originalIndices: number[]): HandValue {
  const ranksAndSuits = cards.map(cardToRankSuit);
  const ranks = ranksAndSuits.map(rs => rs.rank);
  const suits = ranksAndSuits.map(rs => rs.suit);

  // Sort ranks descending
  const sortedRanks = [...ranks].sort((a, b) => b - a);

  // Count rank occurrences
  const rankCounts = new Array(13).fill(0);
  ranks.forEach(r => rankCounts[r]++);

  // Check for flush
  const isFlush = suits.every(s => s === suits[0]);

  // Check for straight
  let isStraight = false;
  let straightHigh = 0;
  
  // Normal straight
  if (sortedRanks[0] === sortedRanks[1] + 1 &&
      sortedRanks[1] === sortedRanks[2] + 1 &&
      sortedRanks[2] === sortedRanks[3] + 1 &&
      sortedRanks[3] === sortedRanks[4] + 1) {
    isStraight = true;
    straightHigh = sortedRanks[0];
  }
  // Wheel (A-2-3-4-5)
  else if (sortedRanks[0] === 12 && sortedRanks[1] === 3 && sortedRanks[2] === 2 && sortedRanks[3] === 1 && sortedRanks[4] === 0) {
    isStraight = true;
    straightHigh = 3; // 5 is high in a wheel
  }

  // Determine hand rank
  let rank: HandRank;
  let tiebreakers: number[] = [];

  if (isFlush && isStraight && sortedRanks[0] === 12 && sortedRanks[4] === 8) {
    rank = HandRank.RoyalFlush;
    tiebreakers = sortedRanks;
  } else if (isFlush && isStraight) {
    rank = HandRank.StraightFlush;
    tiebreakers = [straightHigh];
  } else if (hasNOfAKind(rankCounts, 4)) {
    rank = HandRank.FourOfAKind;
    tiebreakers = getTiebreakersFourOfAKind(rankCounts);
  } else if (hasNOfAKind(rankCounts, 3) && hasNOfAKind(rankCounts, 2)) {
    rank = HandRank.FullHouse;
    tiebreakers = getTiebreakersFullHouse(rankCounts);
  } else if (isFlush) {
    rank = HandRank.Flush;
    tiebreakers = sortedRanks;
  } else if (isStraight) {
    rank = HandRank.Straight;
    tiebreakers = [straightHigh];
  } else if (hasNOfAKind(rankCounts, 3)) {
    rank = HandRank.ThreeOfAKind;
    tiebreakers = getTiebreakersThreeOfAKind(rankCounts);
  } else if (countPairs(rankCounts) === 2) {
    rank = HandRank.TwoPair;
    tiebreakers = getTiebreakersTwoPair(rankCounts);
  } else if (countPairs(rankCounts) === 1) {
    rank = HandRank.OnePair;
    tiebreakers = getTiebreakersOnePair(rankCounts);
  } else {
    rank = HandRank.HighCard;
    tiebreakers = sortedRanks;
  }

  return {
    rank,
    tiebreakers,
    contributingCards: originalIndices,
  };
}

function hasNOfAKind(counts: number[], n: number): boolean {
  return counts.some(c => c === n);
}

function countPairs(counts: number[]): number {
  return counts.filter(c => c === 2).length;
}

function getTiebreakersFourOfAKind(counts: number[]): number[] {
  const result: number[] = [];
  // Find the quad
  for (let i = 12; i >= 0; i--) {
    if (counts[i] === 4) {
      result.push(i);
      break;
    }
  }
  // Find the kicker
  for (let i = 12; i >= 0; i--) {
    if (counts[i] === 1) {
      result.push(i);
      break;
    }
  }
  return result;
}

function getTiebreakersFullHouse(counts: number[]): number[] {
  const result: number[] = [];
  // Find the trip
  for (let i = 12; i >= 0; i--) {
    if (counts[i] === 3) {
      result.push(i);
      break;
    }
  }
  // Find the pair
  for (let i = 12; i >= 0; i--) {
    if (counts[i] === 2) {
      result.push(i);
      break;
    }
  }
  return result;
}

function getTiebreakersThreeOfAKind(counts: number[]): number[] {
  const result: number[] = [];
  // Find the trip
  for (let i = 12; i >= 0; i--) {
    if (counts[i] === 3) {
      result.push(i);
      break;
    }
  }
  // Find kickers
  for (let i = 12; i >= 0; i--) {
    if (counts[i] === 1) {
      result.push(i);
    }
  }
  return result;
}

function getTiebreakersTwoPair(counts: number[]): number[] {
  const result: number[] = [];
  // Find both pairs
  for (let i = 12; i >= 0; i--) {
    if (counts[i] === 2) {
      result.push(i);
    }
  }
  // Find the kicker
  for (let i = 12; i >= 0; i--) {
    if (counts[i] === 1) {
      result.push(i);
      break;
    }
  }
  return result;
}

function getTiebreakersOnePair(counts: number[]): number[] {
  const result: number[] = [];
  // Find the pair
  for (let i = 12; i >= 0; i--) {
    if (counts[i] === 2) {
      result.push(i);
      break;
    }
  }
  // Find kickers
  for (let i = 12; i >= 0; i--) {
    if (counts[i] === 1) {
      result.push(i);
    }
  }
  return result;
}

function compareHands(hand1: HandValue, hand2: HandValue): number {
  if (hand1.rank > hand2.rank) return 1;
  if (hand1.rank < hand2.rank) return -1;

  for (let i = 0; i < Math.max(hand1.tiebreakers.length, hand2.tiebreakers.length); i++) {
    const t1 = hand1.tiebreakers[i] || 0;
    const t2 = hand2.tiebreakers[i] || 0;
    if (t1 > t2) return 1;
    if (t1 < t2) return -1;
  }

  return 0;
}

/**
 * Get display information for a hand rank (emoji + name)
 */
export function getHandRankDisplay(rank: HandRank): { emoji: string; name: string } {
  const emojiMap: Record<HandRank, string> = {
    [HandRank.HighCard]: '🎴',
    [HandRank.OnePair]: '🎴',
    [HandRank.TwoPair]: '🎴🎴',
    [HandRank.ThreeOfAKind]: '🎴🎴🎴',
    [HandRank.Straight]: '➡️',
    [HandRank.Flush]: '💎',
    [HandRank.FullHouse]: '🏠',
    [HandRank.FourOfAKind]: '🎴🎴🎴🎴',
    [HandRank.StraightFlush]: '🌟',
    [HandRank.RoyalFlush]: '👑',
  };

  return {
    emoji: emojiMap[rank] || '🎴',
    name: RANK_NAMES[rank] || 'Unknown',
  };
}

