"use client";

import { useEffect, useState } from "react";
import { CardHand } from "./CardDisplay";
import { detectHand, HandRankEmojis, HandRankNames } from "@/utils/handDetection";
import { ethers } from "ethers";
import { FHEPokerABI } from "@/abi/FHEPokerABI";
import { usePokerStore } from "@/stores/pokerStore";
import { evaluateBestHand, getHandRankDisplay } from "@/utils/handEvaluator";

interface ShowdownProps {
  winner?: string; // Optional - might not be determined yet
  myAddress: string;
  myCards?: [number, number];
  communityCards: number[];
  pot: bigint;
  allPlayers: Array<{
    address: string;
    chips: bigint;
    hasFolded: boolean;
  }>;
  onClose: () => void;
  tableId: bigint;
  contractAddress: string;
  provider?: ethers.ContractRunner | null;
  isWaitingForWinner?: boolean; // True when waiting for FHE decryption callback
  onStartNewRound?: () => void; // Callback to start new round
}

export function Showdown({
  winner,
  myAddress,
  myCards,
  communityCards,
  pot,
  allPlayers,
  onClose,
  tableId,
  contractAddress,
  provider,
  isWaitingForWinner = false,
  onStartNewRound,
}: ShowdownProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);
  const [winnerRank, setWinnerRank] = useState<number | null>(null);
  const [winnerCards, setWinnerCards] = useState<number[] | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [fetchedCommunityCards, setFetchedCommunityCards] = useState<number[]>(communityCards);

  // Get revealed cards and readonly provider from Zustand store
  const revealedCards = usePokerStore(state => state.revealedCards);
  const readonlyProvider = usePokerStore(state => state.readonlyProvider);

  // Use contract winner directly
  const calculatedWinner = winner || allPlayers.find(p => !p.hasFolded)?.address || '';

  const isWinner = calculatedWinner ? calculatedWinner.toLowerCase() === myAddress.toLowerCase() : false;
  const winnerData = calculatedWinner ? allPlayers.find(
    (p) => p.address.toLowerCase() === calculatedWinner.toLowerCase()
  ) : null;

  // Detect hand if we have cards (legacy system)
  const detectedHand = myCards && fetchedCommunityCards && fetchedCommunityCards.length > 0
    ? detectHand(myCards, fetchedCommunityCards)
    : null;

  // Evaluate hands with card highlighting
  // At showdown, we should have all 5 community cards
  const myTotalCards = myCards && fetchedCommunityCards ? [...myCards, ...fetchedCommunityCards] : [];
  const winnerTotalCards = winnerCards && fetchedCommunityCards ? [...winnerCards, ...fetchedCommunityCards] : [];
  
  const myHandEval = myTotalCards.length >= 5 && myTotalCards.length <= 7
    ? evaluateBestHand(myTotalCards)
    : null;

  const winnerHandEval = winnerTotalCards.length >= 5 && winnerTotalCards.length <= 7
    ? evaluateBestHand(winnerTotalCards)
    : null;

  // Map contributing card indices to display indices
  // My cards: [hole1, hole2] + community
  // Winner cards: [hole1, hole2] + community
  const getMyCardHighlights = () => {
    if (!myHandEval) return { holeHighlights: [], communityHighlights: [] };
    const holeHighlights = myHandEval.contributingCardIndices.filter((i: number) => i < 2);
    const communityHighlights = myHandEval.contributingCardIndices.filter((i: number) => i >= 2).map((i: number) => i - 2);
    return { holeHighlights, communityHighlights };
  };

  const getWinnerCardHighlights = () => {
    if (!winnerHandEval) return { holeHighlights: [], communityHighlights: [] };
    const holeHighlights = winnerHandEval.contributingCardIndices.filter((i: number) => i < 2);
    const communityHighlights = winnerHandEval.contributingCardIndices.filter((i: number) => i >= 2).map((i: number) => i - 2);
    return { holeHighlights, communityHighlights };
  };

  const myHighlights = getMyCardHighlights();
  const winnerHighlights = getWinnerCardHighlights();

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

  // Use passed community cards directly
  useEffect(() => {
    // 1. Use passed community cards directly
    console.log('🃏 [Showdown] Community cards:', {
      passedCards: communityCards,
      passedCardsLength: communityCards.length,
    });
    
    setFetchedCommunityCards(communityCards && communityCards.length === 5 ? communityCards : []);
  }, [communityCards]);

  // Fetch winner data from contract
  useEffect(() => {
    const loadShowdownData = async () => {
      try {
        const providerToUse = readonlyProvider || provider;
        if (!providerToUse) {
          console.warn('⚠️ [Showdown] No provider available');
          return;
        }
        
        const contract = new ethers.Contract(
          contractAddress, 
          FHEPokerABI.abi, 
          providerToUse
        );

        // Skip winner data if no winner determined yet
        if (!calculatedWinner) {
          console.log('⏳ [Showdown] Waiting for winner to be determined...');
          return;
        }

        console.log('🎴 [Showdown] Loading winner data...', {
          calculatedWinner,
          tableId: tableId.toString(),
          hasRevealedCards: !!revealedCards[calculatedWinner.toLowerCase()],
        });

        // 3. Check if we already have revealed cards from store
        const revealed = revealedCards[calculatedWinner.toLowerCase()];
        if (revealed) {
          console.log('✅ [Showdown] Using revealed cards from store for winner:', calculatedWinner);
          setWinnerCards([revealed.card1, revealed.card2]);
        }
        
        // 4. Evaluate winner's hand
        console.log('🔍 [Showdown] Evaluating winner hand...');
        try {
          const evalRes = await contract.evaluateHand(tableId, calculatedWinner, { blockTag: "latest" });
          const rankNum: number = Number(evalRes[0]);
          setWinnerRank(rankNum);
          console.log('✅ [Showdown] Winner hand rank:', rankNum);
        } catch (err) {
          console.warn('⚠️ [Showdown] Could not evaluate hand:', err);
        }
        
        // 5. Fetch winner's hole cards if not already from event
        if (!revealed) {
          console.log('📥 [Showdown] Fetching winner cards from contract...');
          try {
            const cardsRes = await contract.getPlayerCards(tableId, calculatedWinner, { blockTag: "latest" });
            const c1 = Number(cardsRes[0]);
            const c2 = Number(cardsRes[1]);
            setWinnerCards([c1, c2]);
            console.log('✅ [Showdown] Winner cards fetched:', [c1, c2]);
          } catch (err) {
            console.warn('⚠️ [Showdown] Could not fetch winner cards:', err);
          }
        }
        
        console.log('✅ [Showdown] Showdown data loaded');
      } catch (err) {
        console.error('❌ [Showdown] Failed to load showdown data:', err);
      }
    };
    loadShowdownData();
  }, [contractAddress, provider, readonlyProvider, tableId, calculatedWinner, revealedCards]);

  // Minimized view
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{isWinner ? "🏆" : "😔"}</span>
            <span>Show Showdown</span>
          </div>
        </button>
      </div>
    );
  }

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
        } max-h-[95vh] overflow-y-auto relative`}
      >
        {/* Loading State - Waiting for FHE Decryption */}
        {isWaitingForWinner && (
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="inline-block relative">
                <div className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl">🔐</span>
                </div>
              </div>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-purple-400">
              Decrypting Cards...
            </h2>
            
            <div className="space-y-3 mb-8">
              <p className="text-slate-300 text-sm sm:text-base">
                🔓 Decrypting player hands using FHE
              </p>
              <p className="text-slate-400 text-xs sm:text-sm">
                ⚡ Determining winner based on hand ranks
              </p>
              <p className="text-slate-500 text-xs">
                This may take a few moments on localhost
              </p>
            </div>

            {/* Start New Round Button */}
            {onStartNewRound && (
              <div className="mt-8 p-4 bg-blue-900/20 rounded-xl border border-blue-500/30">
                <p className="text-slate-300 text-sm mb-4">
                  Don&apos;t want to wait?
                </p>
                <button
                  onClick={() => {
                    onStartNewRound();
                    setIsMinimized(true);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎮</span>
                    <span>Start New Round</span>
                  </div>
                </button>
                <p className="text-slate-500 text-xs mt-2">
                  Results will appear when ready
                </p>
              </div>
            )}
          </div>
        )}

        {/* Main Content - Only show when not waiting */}
        {!isWaitingForWinner && (
          <>
        {/* Close/Minimize buttons */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="w-8 h-8 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 flex items-center justify-center transition-colors"
            title="Minimize"
          >
            <span className="text-lg">−</span>
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-colors"
            title="Close"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
        {/* Winner announcement */}
        <div className="text-center mb-4 sm:mb-6">
          {!winner ? (
            // Waiting for winner to be determined
            <div className="animate-pulse">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 text-yellow-400">
                ⏳ Determining Winner...
              </h2>
              <p className="text-slate-400 text-sm">
                Evaluating hands on-chain
              </p>
            </div>
          ) : (
            <>
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
            </>
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
        {winnerRank !== null && winnerCards && (
          <div className={`bg-slate-800/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border border-green-500/60 shadow-lg shadow-green-500/20 transition-all duration-500 delay-250 ${animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
            <h3 className="text-white text-base sm:text-lg font-semibold mb-3 text-center">🏆 Winning Hand 🏆</h3>
            <div className="text-center mb-4">
              <p className="text-xl sm:text-2xl font-bold text-green-300">
                {winnerHandEval 
                  ? `${getHandRankDisplay(winnerHandEval.rank).emoji} ${getHandRankDisplay(winnerHandEval.rank).name}`
                  : `${HandRankEmojis[winnerRank as keyof typeof HandRankEmojis]} ${HandRankNames[winnerRank as keyof typeof HandRankNames]}`
                }
              </p>
              {winnerHandEval && (
                <p className="text-xs sm:text-sm text-slate-400 mt-1">{winnerHandEval.description}</p>
              )}
            </div>
            <div className="space-y-4">
              {/* Winner's Hole Cards - Above with highlights */}
              <div>
                <p className="text-slate-400 text-sm mb-2 text-center">Winner&apos;s Cards</p>
                <div className="flex justify-center">
                  <CardHand 
                    cards={winnerCards} 
                    highlightedIndices={winnerHighlights.holeHighlights}
                    highlightDelay={300}
                  />
                </div>
              </div>
              {/* Community Cards - Below with highlights */}
              <div>
                <p className="text-slate-400 text-sm mb-2 text-center">Community Cards</p>
                <div className="flex justify-center">
                  <CardHand 
                    cards={fetchedCommunityCards || []} 
                    highlightedIndices={winnerHighlights.communityHighlights}
                    highlightDelay={500}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Your cards (if decrypted) */}
        {myCards && myCards.length === 2 && communityCards && (
          <div
            className={`bg-slate-800/50 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 border transition-all duration-500 delay-300 ${
              (myHandEval && myHandEval.rank >= 4) || (detectedHand && detectedHand.rank >= 4)
                ? "border-green-500/60 shadow-lg shadow-green-500/30 animate-pulse-border" 
                : "border-slate-600"
            } ${
              animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <h3 className="text-white text-base sm:text-lg font-semibold mb-3 text-center">
              Your Hand
            </h3>
            
            {/* Hand rank display */}
            {(myHandEval || detectedHand) && (
              <div className="mb-4 text-center">
                <p className={`text-xl sm:text-2xl font-bold ${
                  (myHandEval?.rank || detectedHand?.rank || 0) >= 7 ? "text-green-300" :
                  (myHandEval?.rank || detectedHand?.rank || 0) >= 4 ? "text-green-400" :
                  (myHandEval?.rank || detectedHand?.rank || 0) >= 1 ? "text-emerald-400" :
                  "text-slate-400"
                }`}>
                  {myHandEval 
                    ? `${getHandRankDisplay(myHandEval.rank).emoji} ${getHandRankDisplay(myHandEval.rank).name}`
                    : `${detectedHand?.emoji} ${detectedHand?.name}`
                  }
                </p>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {myHandEval?.description || detectedHand?.description}
                </p>
              </div>
            )}
            
            {/* Your hole cards with highlights */}
            <div className="space-y-4">
              <div>
                <p className="text-slate-400 text-sm mb-2 text-center">Your Cards</p>
                <div className="flex justify-center">
                  <CardHand 
                    cards={myCards} 
                    highlightedIndices={myHighlights.holeHighlights}
                    highlightDelay={300}
                  />
                </div>
              </div>
              {/* Community cards with highlights */}
              <div>
                <p className="text-slate-400 text-sm mb-2 text-center">Community Cards</p>
                <div className="flex justify-center">
                  <CardHand 
                    cards={fetchedCommunityCards} 
                    highlightedIndices={myHighlights.communityHighlights}
                    highlightDelay={500}
                  />
                </div>
              </div>
            </div>
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
              const isThisWinner = calculatedWinner ? player.address.toLowerCase() === calculatedWinner.toLowerCase() : false;
              const isMe = player.address.toLowerCase() === myAddress.toLowerCase();
              // Don't show chip change - balances already updated by contract
              const chipChange = BigInt(0);
              const isPositive = false;

              return (
                <div
                  key={player.address}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isThisWinner
                      ? "bg-green-900/30 border border-green-500/50"
                      : player.hasFolded
                      ? "bg-slate-700/20 opacity-60"
                      : "bg-slate-900/30"
                  }`}
                  style={{
                    animation: `slideIn 0.3s ease-out ${idx * 0.1}s both`,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`font-mono text-sm ${isThisWinner ? "text-green-400 font-bold" : "text-slate-300"}`}>
                          {player.address.slice(0, 6)}...{player.address.slice(-4)}
                          {isMe && <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">YOU</span>}
                        </p>
                        {isThisWinner && (
                          <span className="text-yellow-400 text-sm">🏆 WINNER</span>
                        )}
                      </div>
                      {player.hasFolded && (
                        <p className="text-xs text-slate-500">Folded</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <p className={`font-semibold ${isThisWinner ? "text-green-400 font-bold" : "text-slate-300"}`}>
                      {parseFloat((Number(player.chips) / 1e18).toFixed(4))} ETH
                    </p>
                    {chipChange !== BigInt(0) && (
                      <span className={`text-xs ${isPositive ? "text-green-400" : "text-red-400"}`}>
                        {isPositive ? '+' : ''}{(Number(chipChange) / 1e18).toFixed(4)} ETH
                      </span>
                    )}
                    <p className="text-xs text-slate-500">Chips</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="text-center flex gap-4 justify-center">
          <button
            onClick={() => setIsMinimized(true)}
            className="px-6 py-3 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            Minimize
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            Close & Continue
          </button>
        </div>
          </>
        )}
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
