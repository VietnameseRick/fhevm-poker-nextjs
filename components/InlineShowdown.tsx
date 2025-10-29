"use client";

import { useEffect, useState } from "react";
import { Card } from "./CardDisplay";
import { HandRankNames } from "@/utils/handDetection";
import { ethers } from "ethers";
import { FHEPokerABI } from "@/abi/FHEPokerABI";
import { usePokerStore } from "@/stores/pokerStore";
import { evaluateBestHand } from "@/utils/handEvaluator";

interface InlineShowdownProps {
  winner: string;
  allPlayers: Array<{
    address: string;
    chips: bigint;
    hasFolded: boolean;
  }>;
  communityCards?: number[];
  tableId?: bigint;
  contractAddress?: string;
  provider?: ethers.ContractRunner | null;
  pot: bigint;
}

interface PlayerShowdownData {
  address: string;
  cards: number[];
  handRank: number;
  handName: string;
  isWinner: boolean;
  contributingCardIndices: number[];
}

export function InlineShowdown({
  winner,
  allPlayers,
  communityCards,
  tableId,
  contractAddress,
  provider,
  pot,
}: InlineShowdownProps) {
  const [playersData, setPlayersData] = useState<PlayerShowdownData[]>([]);
  const [loading, setLoading] = useState(true);

  const revealedCards = usePokerStore(state => state.revealedCards);
  const readonlyProvider = usePokerStore(state => state.readonlyProvider);

  useEffect(() => {
    const loadShowdownData = async () => {
      try {
        if (!contractAddress || tableId === undefined || !communityCards) return;

        const providerToUse = readonlyProvider || provider;
        if (!providerToUse) return;

        const contract = new ethers.Contract(
          contractAddress,
          FHEPokerABI.abi,
          providerToUse
        );

        const showdownPlayers: PlayerShowdownData[] = [];

        for (const player of allPlayers) {
          if (player.hasFolded) continue;

          try {
            // Get cards from revealed cards or contract
            let card1 = 0, card2 = 0;
            const revealed = revealedCards[player.address.toLowerCase()];
            if (revealed) {
              card1 = revealed.card1;
              card2 = revealed.card2;
            } else {
              const cardsRes = await contract.getPlayerCards(tableId, player.address, { blockTag: "latest" });
              card1 = Number(cardsRes[0]);
              card2 = Number(cardsRes[1]);
            }

            if (card1 === 0 && card2 === 0) continue;

            // Evaluate hand
            const totalCards = [card1, card2, ...communityCards];
            const handEval = evaluateBestHand(totalCards);

            showdownPlayers.push({
              address: player.address,
              cards: [card1, card2],
              handRank: handEval.rank,
              handName: HandRankNames[handEval.rank] || "Unknown",
              isWinner: player.address.toLowerCase() === winner.toLowerCase(),
              contributingCardIndices: handEval.contributingCardIndices,
            });
          } catch (err) {
            console.warn(`Could not fetch cards for ${player.address}:`, err);
          }
        }

        setPlayersData(showdownPlayers);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load showdown data:', err);
        setLoading(false);
      }
    };

    loadShowdownData();
  }, [contractAddress, tableId, winner, revealedCards, allPlayers, communityCards, provider, readonlyProvider]);

  if (loading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl z-10">
        <div className="text-cyan-400 text-xl font-bold animate-pulse">Loading Showdown...</div>
      </div>
    );
  }

  const formatEth = (wei: bigint) => (Number(wei) / 1e18).toFixed(4);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/60 via-purple-900/30 to-black/60 backdrop-blur-sm rounded-xl z-10 p-4">
      <div className="w-full max-w-5xl">
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 animate-pulse mb-2">
            🏆 SHOWDOWN 🏆
          </h2>
          <p className="text-cyan-400 text-xl">
            Pot: {formatEth(pot)} ETH
          </p>
        </div>

        {/* Players Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {playersData.map((player) => {
            const isWinner = player.isWinner;
            const holeHighlights = player.contributingCardIndices.filter(i => i < 2);

            return (
              <div
                key={player.address}
                className={`relative p-4 rounded-xl border-2 transition-all duration-500 ${
                  isWinner
                    ? 'bg-gradient-to-br from-yellow-500/20 via-orange-500/20 to-pink-500/20 border-yellow-400 shadow-lg shadow-yellow-500/50 animate-pulse'
                    : 'bg-gradient-to-br from-purple-900/30 to-blue-900/30 border-cyan-500/50'
                }`}
              >
                {/* Winner Badge */}
                {isWinner && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold shadow-lg z-10">
                    👑 WINNER 👑
                  </div>
                )}

                {/* Player Address */}
                <div className="text-center mb-3">
                  <p className={`text-sm font-mono truncate ${isWinner ? 'text-yellow-300' : 'text-gray-300'}`}>
                    {player.address.slice(0, 6)}...{player.address.slice(-4)}
                  </p>
                </div>

                {/* Cards */}
                <div className="flex justify-center gap-2 mb-3">
                  {player.cards.map((cardValue, idx) => (
                    <div
                      key={idx}
                      className={`transform transition-all duration-300 ${
                        holeHighlights.includes(idx)
                          ? 'scale-110 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)]'
                          : ''
                      } ${isWinner ? 'animate-bounce' : ''}`}
                    >
                      <Card cardValue={cardValue} hidden={false} />
                    </div>
                  ))}
                </div>

                {/* Hand Rank */}
                <div className="text-center">
                  <div className={`inline-block px-3 py-1 rounded-lg font-bold text-sm ${
                    isWinner
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                  }`}>
                    {player.handName}
                  </div>
                </div>

                {/* Winner Sparkles */}
                {isWinner && (
                  <>
                    <div className="absolute -top-2 -left-2 text-2xl animate-spin-slow">✨</div>
                    <div className="absolute -top-2 -right-2 text-2xl animate-spin-slow delay-500">✨</div>
                    <div className="absolute -bottom-2 -left-2 text-2xl animate-spin-slow delay-1000">✨</div>
                    <div className="absolute -bottom-2 -right-2 text-2xl animate-spin-slow delay-1500">✨</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        .delay-500 {
          animation-delay: 0.5s;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
        .delay-1500 {
          animation-delay: 1.5s;
        }
      `}</style>
    </div>
  );
}

