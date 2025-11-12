"use client";

import { useEffect, useState, useMemo } from "react";
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

  // Get revealed cards, decrypted community cards, and readonly provider from Zustand store
  const revealedCards = usePokerStore(state => state.revealedCards);
  const cachedShowdownData = usePokerStore(state => state.cachedShowdownData);
  const storeDecryptedCommunityCards = usePokerStore(state => state.decryptedCommunityCards);
  const readonlyProvider = usePokerStore(state => state.readonlyProvider);
  
  // Use cached revealed cards if available, otherwise use current revealed cards
  const effectiveRevealedCards = cachedShowdownData?.revealedCards || revealedCards;
  
  // Create stable dependency values
  const communityCardsStr = useMemo(() => JSON.stringify(communityCards), [communityCards]);
  const storeCardsStr = useMemo(() => JSON.stringify(storeDecryptedCommunityCards), [storeDecryptedCommunityCards]);

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

  // Use passed community cards, fallback to store, refresh store if needed
  useEffect(() => {
    // Ensure required dependencies are defined before proceeding
    if (!contractAddress || !tableId) {
      return;
    }

    console.log('🃏 [Showdown] Community cards:', {
      passedCards: communityCards,
      passedCardsLength: communityCards.length,
      cachedCards: cachedShowdownData?.decryptedCommunityCards,
      cachedCardsLength: cachedShowdownData?.decryptedCommunityCards.length,
      storeCards: storeDecryptedCommunityCards,
      storeCardsLength: storeDecryptedCommunityCards.length,
    });
    
    // Priority 1: Use passed community cards if available and complete
    if (communityCards && communityCards.length === 5) {
      console.log('✅ [Showdown] Using passed community cards');
      setFetchedCommunityCards(communityCards);
      return;
    }
    
    // Priority 2: Use cached showdown data community cards if available
    const cachedCardsFiltered = cachedShowdownData?.decryptedCommunityCards?.filter((c): c is number => c !== undefined);
    if (cachedCardsFiltered && cachedCardsFiltered.length === 5) {
      console.log('✅ [Showdown] Using cached community cards from showdown data');
      setFetchedCommunityCards(cachedCardsFiltered);
      return;
    }
    
    // Priority 3: Use store's decrypted community cards if available
    const storeCardsFiltered = storeDecryptedCommunityCards.filter((c): c is number => c !== undefined);
    if (storeCardsFiltered.length === 5) {
      console.log('✅ [Showdown] Using decrypted community cards from store');
      setFetchedCommunityCards(storeCardsFiltered);
      return;
    }
    
    // Priority 3: Fetch decrypted community cards directly from contract
    // At showdown, community cards are already decrypted on-chain
    const fetchDecryptedCommunityCards = async () => {
      try {
        const providerToUse = readonlyProvider || provider;
        if (!providerToUse) {
          console.warn('⚠️ [Showdown] No provider available for fetching decrypted community cards');
          return;
        }
        
        const contract = new ethers.Contract(
          contractAddress, 
          FHEPokerABI.abi, 
          providerToUse
        );
        
        console.log('📥 [Showdown] Fetching decrypted community cards from contract...');
        const cardsRes = await contract.getDecryptedCommunityCards(tableId, { blockTag: "latest" });
        
        const decryptedCards: number[] = [];
        if (Number(cardsRes[0]) > 0) decryptedCards.push(Number(cardsRes[0])); // flopCard1
        if (Number(cardsRes[1]) > 0) decryptedCards.push(Number(cardsRes[1])); // flopCard2
        if (Number(cardsRes[2]) > 0) decryptedCards.push(Number(cardsRes[2])); // flopCard3
        if (Number(cardsRes[3]) > 0) decryptedCards.push(Number(cardsRes[3])); // turnCard
        if (Number(cardsRes[4]) > 0) decryptedCards.push(Number(cardsRes[4])); // riverCard
        
        if (decryptedCards.length === 5) {
          console.log('✅ [Showdown] Fetched decrypted community cards from contract:', decryptedCards);
          setFetchedCommunityCards(decryptedCards);
        } else {
          console.warn('⚠️ [Showdown] Incomplete decrypted community cards from contract:', decryptedCards);
          setFetchedCommunityCards([]);
        }
      } catch (err) {
        console.error('❌ [Showdown] Failed to fetch decrypted community cards:', err);
        setFetchedCommunityCards([]);
      }
    };
    
    fetchDecryptedCommunityCards();
  }, [
    // Use stable primitive values for dependencies - always same size (6 items)
    communityCards.length,
    cachedShowdownData?.decryptedCommunityCards?.length || 0,
    storeDecryptedCommunityCards.length,
    contractAddress || '',
    tableId?.toString() || '',
    // Use memoized stringified arrays to detect content changes
    communityCardsStr,
    storeCardsStr,
    cachedShowdownData?.round?.toString() || '', // Include cached round to detect changes
  ]);

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
          hasRevealedCards: !!effectiveRevealedCards[calculatedWinner.toLowerCase()],
          hasCachedData: !!cachedShowdownData,
        });

        // Check if we already have revealed cards from store or cache
        const revealed = effectiveRevealedCards[calculatedWinner.toLowerCase()];
        if (revealed) {
          console.log('✅ [Showdown] Using revealed cards from store/cache for winner:', calculatedWinner);
          setWinnerCards([revealed.card1, revealed.card2]);
        }
        
        // Only try to evaluate hand from contract if state is GameOver
        // If we have cached data, skip contract calls since state might be reset
        if (cachedShowdownData) {
          console.log('✅ [Showdown] Using cached showdown data, skipping contract calls');
          // We already have winner cards from cache, so we can skip contract evaluation
          // The hand evaluation will be done client-side if needed
          return;
        }
        
        // 4. Evaluate winner's hand (only if not using cached data)
        console.log('🔍 [Showdown] Evaluating winner hand from contract...');
        try {
          const evalRes = await contract.evaluateHand(tableId, calculatedWinner, { blockTag: "latest" });
          const rankNum: number = Number(evalRes[0]);
          setWinnerRank(rankNum);
          console.log('✅ [Showdown] Winner hand rank:', rankNum);
        } catch (err) {
          console.warn('⚠️ [Showdown] Could not evaluate hand:', err);
          // If contract call fails, it's likely because state was reset - that's okay, we'll use cached data
        }
        
        // 5. Fetch winner's hole cards if not already from event (only if not using cached data)
        if (!revealed && !cachedShowdownData) {
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
  }, [contractAddress, provider, readonlyProvider, tableId, calculatedWinner, effectiveRevealedCards, cachedShowdownData]);

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden">
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
        } p-4 sm:p-6 md:p-8 w-full h-full max-w-[95vw] max-h-[95vh] my-auto transform transition-all duration-500 ${
          animationStep >= 1 ? "scale-100 opacity-100" : "scale-95 opacity-0"
        } relative flex flex-col`}
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
        <div className="absolute top-4 right-4 flex gap-2 z-10">
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

        {/* Header with Winner announcement and Pot */}
        <div className="flex-shrink-0 mb-4">
          {!winner ? (
            <div className="text-center animate-pulse">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-yellow-400">
                ⏳ Determining Winner...
              </h2>
              <p className="text-slate-400 text-sm">Evaluating hands on-chain</p>
            </div>
          ) : (
            <div className="text-center">
              <h2
                className={`text-2xl sm:text-3xl font-bold mb-2 transition-all duration-500 ${
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
                <p className="text-slate-300 text-sm mb-3">
                  Winner: <span className="text-green-400 font-mono">{winner.slice(0, 6)}...{winner.slice(-4)}</span>
                </p>
              )}
              <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-3 border border-green-500/30 inline-block">
                <p className="text-slate-400 text-xs mb-1">{isWinner ? "Pot Won" : "Final Pot"}</p>
                <p className="text-xl font-bold text-green-400">
                  {parseFloat((Number(pot) / 1e18).toFixed(4))} ETH
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Grid Layout: Left (40%) - Community Cards + Final Standings | Right (60%) - Winner Hand (top) + Player Hand (bottom) */}
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
          {/* Left Side: Community Cards + Final Standings (40%) - Single tall box */}
          {fetchedCommunityCards && fetchedCommunityCards.length > 0 && (
            <div className={`w-[40%] bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-5 border-2 border-purple-500/40 transition-all duration-500 delay-500 flex flex-col overflow-hidden shadow-xl items-center justify-center ${
              animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}>
              {/* Community Cards Section - Vertically Centered */}
              <div className="flex-shrink-0 mb-6 w-full">
                <h3 className="text-white text-xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  🎴 Community Cards
                </h3>
                
                {/* Community Cards Display - Centered & Larger */}
                <div className="flex justify-center items-center w-full overflow-visible px-2">
                  <div className="scale-[0.95] origin-center flex justify-center">
                    <CardHand 
                      cards={fetchedCommunityCards} 
                      highlightedIndices={[]}
                      highlightDelay={0}
                    />
                  </div>
                </div>
              </div>

              {/* Decorative Separator */}
              <div className="flex-shrink-0 my-6 w-full">
                <div className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
              </div>

              {/* Final Standings Section */}
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 w-full">
                <h3 className="text-white text-xl font-bold mb-4 flex-shrink-0 text-center bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  💰 Final Standings
                </h3>
                <div className="flex-1 overflow-y-auto min-h-0 space-y-2.5 pr-2 custom-scrollbar w-full">
                  {allPlayers.map((player, idx) => {
                    const isThisWinner = calculatedWinner ? player.address.toLowerCase() === calculatedWinner.toLowerCase() : false;
                    const isMe = player.address.toLowerCase() === myAddress.toLowerCase();

                    return (
                      <div
                        key={player.address}
                        className={`relative flex items-center justify-between p-3.5 rounded-lg text-sm transition-all duration-300 hover:scale-[1.02] ${
                          isThisWinner
                            ? "bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-400/60 shadow-lg shadow-green-500/30"
                            : player.hasFolded
                            ? "bg-slate-800/30 opacity-50 border border-slate-700/50"
                            : "bg-slate-800/40 border border-slate-600/50"
                        }`}
                        style={{
                          animation: `slideIn 0.4s ease-out ${idx * 0.1}s both`,
                        }}
                      >
                        {/* Winner glow effect */}
                        {isThisWinner && (
                          <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-emerald-400/10 rounded-lg animate-pulse-slow"></div>
                        )}
                        
                        <div className="relative flex items-center gap-2.5 min-w-0 flex-1">
                          {isThisWinner && (
                            <span className="text-2xl flex-shrink-0 animate-bounce-slow">🏆</span>
                          )}
                          <div className="flex flex-col min-w-0">
                            <p className={`font-mono truncate text-sm ${
                              isThisWinner ? "text-green-300 font-bold" : "text-slate-200"
                            }`}>
                              {player.address.slice(0, 8)}...{player.address.slice(-6)}
                            </p>
                            {isMe && (
                              <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full w-fit mt-1">
                                YOU
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="relative text-right flex-shrink-0 ml-3">
                          <p className={`font-bold text-base ${
                            isThisWinner ? "text-green-300 text-lg" : "text-slate-200"
                          }`}>
                            {parseFloat((Number(player.chips) / 1e18).toFixed(4))} ETH
                          </p>
                          {player.hasFolded && (
                            <p className="text-xs text-red-400 mt-0.5">Folded</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Right Side: Winner Hand (top) + Player Hand (bottom) (60%) */}
          <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-0">
            {/* Top Box: Winner Hand & Rank - ONLY HOLE CARDS */}
            {winnerRank !== null && winnerCards && (
              <div className={`flex-1 bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-5 border-2 border-green-500/60 shadow-xl shadow-green-500/20 transition-all duration-500 delay-250 flex flex-col overflow-hidden min-h-0 ${
                animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}>
                <h3 className="text-white text-lg font-bold mb-3 text-center flex-shrink-0 bg-gradient-to-r from-green-300 to-emerald-300 bg-clip-text text-transparent">
                  🏆 Winner&apos;s Hand
                </h3>
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="text-center mb-3 flex-shrink-0 bg-green-500/10 rounded-lg p-3 border border-green-500/30">
                    <p className="text-2xl font-extrabold text-green-300">
                      {winnerHandEval 
                        ? `${getHandRankDisplay(winnerHandEval.rank).emoji} ${getHandRankDisplay(winnerHandEval.rank).name}`
                        : `${HandRankEmojis[winnerRank as keyof typeof HandRankEmojis]} ${HandRankNames[winnerRank as keyof typeof HandRankNames]}`
                      }
                    </p>
                    {winnerHandEval && (
                      <p className="text-sm text-slate-300 mt-2">{winnerHandEval.description}</p>
                    )}
                  </div>
                  {/* Winner's Hole Cards ONLY (2 cards) */}
                  <div className="flex-1 flex flex-col justify-center items-center min-h-0 overflow-visible">
                    <p className="text-slate-300 text-base mb-4 text-center font-semibold">Hole Cards</p>
                    <div className="flex justify-center items-center w-full overflow-visible px-2">
                      <div className="scale-[1.1] origin-center flex justify-center">
                        <CardHand 
                          cards={winnerCards} 
                          highlightedIndices={winnerHighlights.holeHighlights}
                          highlightDelay={300}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Box: Your Hand & Rank - ONLY HOLE CARDS */}
            {myCards && myCards.length === 2 && communityCards && (
              <div
                className={`flex-1 bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl p-5 border-2 transition-all duration-500 delay-300 flex flex-col overflow-hidden min-h-0 shadow-xl ${
                  (myHandEval && myHandEval.rank >= 4) || (detectedHand && detectedHand.rank >= 4)
                    ? "border-yellow-500/60 shadow-yellow-500/30 animate-pulse-border" 
                    : "border-slate-600/60"
                } ${
                  animationStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
              >
                <h3 className="text-white text-lg font-bold mb-3 text-center flex-shrink-0 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  🎯 Your Hand
                </h3>
                <div className="flex-1 flex flex-col min-h-0">
                  {(myHandEval || detectedHand) && (
                    <div className="text-center mb-3 flex-shrink-0 bg-blue-500/10 rounded-lg p-3 border border-blue-500/30">
                      <p className={`text-2xl font-extrabold ${
                        (myHandEval?.rank || detectedHand?.rank || 0) >= 7 ? "text-green-300" :
                        (myHandEval?.rank || detectedHand?.rank || 0) >= 4 ? "text-yellow-300" :
                        (myHandEval?.rank || detectedHand?.rank || 0) >= 1 ? "text-blue-300" :
                        "text-slate-300"
                      }`}>
                        {myHandEval 
                          ? `${getHandRankDisplay(myHandEval.rank).emoji} ${getHandRankDisplay(myHandEval.rank).name}`
                          : `${detectedHand?.emoji} ${detectedHand?.name}`
                        }
                      </p>
                      <p className="text-sm text-slate-300 mt-2">
                        {myHandEval?.description || detectedHand?.description}
                      </p>
                    </div>
                  )}
                  {/* Your Hole Cards ONLY (2 cards) */}
                  <div className="flex-1 flex flex-col justify-center items-center min-h-0 overflow-visible">
                    <p className="text-slate-300 text-base mb-4 text-center font-semibold">Your Hole Cards</p>
                    <div className="flex justify-center items-center w-full overflow-visible px-2">
                      <div className="scale-[1.1] origin-center flex justify-center">
                        <CardHand 
                          cards={myCards} 
                          highlightedIndices={myHighlights.holeHighlights}
                          highlightDelay={300}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex-shrink-0 text-center flex gap-4 justify-center mt-4 pt-4 border-t border-slate-700">
          <button
            onClick={() => setIsMinimized(true)}
            className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 text-sm"
          >
            Minimize
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105 active:scale-95 text-sm"
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
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.8;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
        .animate-pulse-border {
          animation: pulseBorder 2s ease-in-out infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
        /* Custom Scrollbar Styles */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, rgb(139, 92, 246), rgb(59, 130, 246));
          border-radius: 4px;
          border: 2px solid rgba(15, 23, 42, 0.5);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, rgb(167, 139, 250), rgb(96, 165, 250));
        }
      `}</style>
    </div>
  );
}
