"use client";

import { useEffect, useState } from "react";
import { CardHand } from "./CardDisplay";

interface ShowdownProps {
  winner: string;
  myAddress: string;
  myCards?: number[];
  pot: bigint;
  allPlayers: Array<{
    address: string;
    chips: bigint;
    hasFolded: boolean;
  }>;
  onContinue: () => void;
}

export function Showdown({
  winner,
  myAddress,
  myCards,
  pot,
  allPlayers,
  onContinue,
}: ShowdownProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  const isWinner = winner.toLowerCase() === myAddress.toLowerCase();
  const winnerData = allPlayers.find(
    (p) => p.address.toLowerCase() === winner.toLowerCase()
  );

  useEffect(() => {
    // Animation sequence
    const timers = [
      setTimeout(() => setAnimationStep(1), 300),
      setTimeout(() => setAnimationStep(2), 800),
      setTimeout(() => setShowConfetti(true), 1200),
      setTimeout(() => setShowConfetti(false), 4000),
    ];

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
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
        } p-8 max-w-2xl w-full transform transition-all duration-500 ${
          animationStep >= 1 ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        {/* Winner announcement */}
        <div className="text-center mb-8">
          <h2
            className={`text-4xl font-bold mb-4 transition-all duration-500 ${
              animationStep >= 1 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            } ${
              isWinner
                ? "text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-500 to-orange-500"
                : "text-white"
            }`}
          >
            {isWinner ? "🎉 YOU WIN! 🎉" : "Hand Complete"}
          </h2>

          {!isWinner && winnerData && (
            <p className="text-slate-300 text-lg">
              Winner: <span className="text-green-400 font-mono">{winner.slice(0, 6)}...{winner.slice(-4)}</span>
            </p>
          )}
        </div>

        {/* Pot amount */}
        <div
          className={`bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-6 mb-6 border border-green-500/30 transition-all duration-500 delay-200 ${
            animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-1">Pot Won</p>
            <p className="text-3xl font-bold text-green-400">
              {parseFloat((Number(pot) / 1e18).toFixed(4))} ETH
            </p>
          </div>
        </div>

        {/* Your cards (if decrypted) */}
        {myCards && myCards.length === 2 && (
          <div
            className={`bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-600 transition-all duration-500 delay-300 ${
              animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <h3 className="text-white text-lg font-semibold mb-3 text-center">
              Your Hand
            </h3>
            <div className="flex justify-center">
              <CardHand cards={myCards} />
            </div>
          </div>
        )}

        {/* Player standings */}
        <div
          className={`bg-slate-800/30 rounded-xl p-6 mb-6 border border-slate-700 transition-all duration-500 delay-400 ${
            animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <h3 className="text-white text-lg font-semibold mb-4">Final Standings</h3>
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
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
