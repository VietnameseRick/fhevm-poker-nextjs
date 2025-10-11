"use client";

import { useEffect, useState } from "react";
import { CardHand } from "./CardDisplay";
import { detectHand, HandRankEmojis, HandRankNames } from "@/utils/handDetection";
import { ethers } from "ethers";
import { FHEPokerABI } from "@/abi/FHEPokerABI";

interface ShowdownProps {
  winner: string;
  myAddress: string;
  myCards?: number[];
  communityCards?: number[];
  pot: bigint;
  allPlayers: Array<{
    address: string;
    chips: bigint;
    hasFolded: boolean;
  }>;
  onContinue: () => void;
  tableId?: bigint;
  contractAddress?: string;
  provider?: ethers.ContractRunner | null;
}

export function Showdown({
  winner,
  myAddress,
  myCards,
  communityCards,
  pot,
  allPlayers,
  onContinue,
  tableId,
  contractAddress,
  provider,
}: ShowdownProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [winnerRank, setWinnerRank] = useState<number | null>(null);
  const [winnerCards, setWinnerCards] = useState<number[] | null>(null);

  const isWinner = winner.toLowerCase() === myAddress.toLowerCase();
  const winnerData = allPlayers.find(
    (p) => p.address.toLowerCase() === winner.toLowerCase()
  );

  // Detect hand if we have cards
  const detectedHand = myCards && communityCards && communityCards.length > 0
    ? detectHand(myCards, communityCards)
    : null;

  useEffect(() => {
    // Animation sequence
    const timers = [
      setTimeout(() => setAnimationStep(1), 300),
      setTimeout(() => setAnimationStep(2), 800),
      // Only show confetti if the user is the winner
      setTimeout(() => isWinner && setShowConfetti(true), 1200),
      setTimeout(() => setShowConfetti(false), 4000),
    ];

    return () => timers.forEach(clearTimeout);
  }, [isWinner]);

  // Fetch winner's evaluated hand and revealed hole cards from contract (game is finished)
  useEffect(() => {
    const loadWinnerData = async () => {
      try {
        if (!contractAddress || !provider || !tableId) return;
        const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
        // Evaluate winner's hand
        const evalRes = await contract.evaluateHand(tableId, winner);
        const rankNum: number = Number(evalRes[0]);
        setWinnerRank(rankNum);
        // Fetch winner's hole cards
        const cardsRes = await contract.getPlayerCards(tableId, winner);
        const c1 = Number(cardsRes[0]);
        const c2 = Number(cardsRes[1]);
        setWinnerCards([c1, c2]);
      } catch {
        // Best effort only
      }
    };
    loadWinnerData();
  }, [contractAddress, provider, tableId, winner]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      {/* Confetti effect */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: "-10px",
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div
        className={`bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 rounded-2xl shadow-2xl border-2 ${
          isWinner ? "border-yellow-500/50" : "border-slate-700"
        } p-4 sm:p-6 md:p-8 max-w-2xl w-full my-auto transform transition-all duration-500 ${
          animationStep >= 1 ? "scale-100 opacity-100" : "scale-95 opacity-0"
        } max-h-[95vh] overflow-y-auto`}
      >
        {/* Winner announcement */}
        <div className="text-center mb-4 sm:mb-6">
          <h2
            className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 transition-all duration-500 ${
              animationStep >= 1 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            } ${
              isWinner
                ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500"
                : "text-white"
            }`}
          >
            {isWinner ? "🎉 YOU WIN! 🎉" : "You Lose"}
          </h2>

          {!isWinner && winnerData && (
            <p className="text-slate-300 text-sm sm:text-base md:text-lg">
              Winner: <span className="text-green-400 font-mono">{winner.slice(0, 6)}...{winner.slice(-4)}</span>
            </p>
          )}
        </div>

        {/* Pot amount */}
        <div
          className={`bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-green-500/30 transition-all duration-500 delay-200 ${
            animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="text-center">
            <p className="text-slate-400 text-xs sm:text-sm mb-1">{isWinner ? "Pot Won" : "Final Pot"}</p>
            <p className="text-2xl sm:text-3xl font-bold text-green-400">
              {parseFloat((Number(pot) / 1e18).toFixed(4))} ETH
            </p>
          </div>
        </div>

        {/* Winning hand breakdown (from contract) */}
        {winnerRank !== null && (
          <div className={`bg-slate-800/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-slate-600 transition-all duration-500 delay-250 ${animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <h3 className="text-white text-base sm:text-lg font-semibold mb-3 text-center">Winning Hand</h3>
            <div className="text-center mb-4">
              <p className="text-xl sm:text-2xl font-bold text-yellow-300">
                {HandRankEmojis[winnerRank as keyof typeof HandRankEmojis]} {HandRankNames[winnerRank as keyof typeof HandRankNames]}
              </p>
            </div>
            <div className="space-y-4">
              {/* Winner's Cards - Above */}
              <div>
                <p className="text-slate-400 text-sm mb-2 text-center">Winner&apos;s Cards</p>
                <div className="flex justify-center">
                  <CardHand cards={winnerCards || []} />
                </div>
              </div>
              {/* Community Cards - Below */}
              <div>
                <p className="text-slate-400 text-sm mb-2 text-center">Community Cards</p>
                <div className="flex justify-center">
                  <CardHand cards={communityCards || []} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Your cards (if decrypted) */}
        {myCards && myCards.length === 2 && (
          <div
            className={`bg-slate-800/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border transition-all duration-500 delay-300 ${
              detectedHand && detectedHand.rank >= 4 
                ? "border-yellow-500 shadow-lg shadow-yellow-500/50 animate-pulse-border" 
                : "border-slate-600"
            } ${
              animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <h3 className="text-white text-base sm:text-lg font-semibold mb-3 text-center">
              Your Hand
            </h3>
            
            {/* Hand rank display */}
            {detectedHand && (
              <div className="mb-4 text-center">
                <p className={`text-xl sm:text-2xl font-bold ${
                  detectedHand.rank >= 7 ? "text-yellow-400" :
                  detectedHand.rank >= 4 ? "text-purple-400" :
                  detectedHand.rank >= 1 ? "text-blue-400" :
                  "text-slate-400"
                }`}>
                  {detectedHand.emoji} {detectedHand.name}
                </p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">{detectedHand.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Player standings */}
        <div
          className={`bg-slate-800/30 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-slate-700 transition-all duration-500 delay-400 ${
            animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <h3 className="text-white text-base sm:text-lg font-semibold mb-3 sm:mb-4">Final Standings</h3>
          <div className="space-y-3">
            {allPlayers.map((player, idx) => {
              const isThisWinner = player.address.toLowerCase() === winner.toLowerCase();
              const isMe = player.address.toLowerCase() === myAddress.toLowerCase();

              return (
                <div
                  key={player.address}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isThisWinner
                      ? "bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/50"
                      : player.hasFolded
                      ? "bg-slate-700/20 opacity-60"
                      : "bg-slate-700/30"
                  }`}
                  style={{
                    animation: `slideIn 0.3s ease-out ${idx * 0.1}s both`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    {isThisWinner && <span className="text-2xl">👑</span>}
                    <div>
                      <p className={`font-mono text-sm ${isThisWinner ? "text-yellow-400" : "text-slate-300"}`}>
                        {player.address.slice(0, 6)}...{player.address.slice(-4)}
                        {isMe && <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">YOU</span>}
                      </p>
                      {player.hasFolded && (
                        <p className="text-xs text-slate-500">Folded</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isThisWinner ? "text-green-400" : "text-slate-300"}`}>
                      {parseFloat((Number(player.chips) / 1e18).toFixed(4))} ETH
                    </p>
                    <p className="text-xs text-slate-500">Chips</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Continue button */}
        <div className="text-center">
          <button
            onClick={onContinue}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            Continue to Next Round
          </button>
          <p className="text-slate-400 text-sm mt-3">
            New round starts automatically in 15 seconds
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulseBorder {
          0%, 100% {
            border-color: rgb(234 179 8 / 0.5);
            box-shadow: 0 0 20px rgb(234 179 8 / 0.3);
          }
          50% {
            border-color: rgb(234 179 8 / 0.8);
            box-shadow: 0 0 30px rgb(234 179 8 / 0.5);
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
        .animate-pulse-border {
          animation: pulseBorder 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
