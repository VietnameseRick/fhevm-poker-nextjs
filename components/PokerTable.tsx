"use client";

import { PlayerSeat } from "./PlayerSeat";
import { Card } from "./CardDisplay";
import React, { useEffect, useState, useRef } from "react";
import { PlayerBettingState, usePokerStore } from "@/stores/pokerStore";
import { CyberpunkLoader } from "./CyberpunkLoader";
import { evaluateBestHand } from "@/utils/handEvaluator";
import { ChipFlyAnimation } from "./ChipFlyAnimation";

interface Player {
  address: string;
  chips: bigint;
  currentBet: bigint;
  hasFolded: boolean;
  isCurrentPlayer: boolean;
  cards?: Array<number | undefined>;
  winnings?: bigint;
  losses?: bigint;
}

interface CommunityCards {
  flopCard1?: number;
  flopCard2?: number;
  flopCard3?: number;
  turnCard?: number;
  riverCard?: number;
  currentStreet?: number;
}

interface PokerTableProps {
  players: Player[];
  pot: bigint;
  currentBet: bigint;
  dealerIndex?: number;
  yourAddress?: string;
  showYourCards?: boolean;
  communityCards?: CommunityCards;
  currentStreet?: number;
  isLoading?: boolean;
  tableState?: { state?: number };
  onStartGame?: () => Promise<void> | void;
  pendingAction?: string | null;
  isSeated?: boolean;
  playerState?: "" | PlayerBettingState | undefined;
  clear?: number;
  isPlaying?: boolean;
  decryptedCommunityCards?: (number | undefined)[]; // Support undefined for undealt cards (0 is valid card)
  isDecrypting?: boolean;
  handleDecryptCommunityCards?: () => void;
  handleDecryptCards?: () => void;
  timeLeft: number | null;
  bigBlind?: string;
  smallBlind?: string;
  winnerAddress?: string; // Winner address when game is finished
}

export function PokerTable({
  players,
  pot,
  currentBet,
  dealerIndex = 0,
  yourAddress,
  showYourCards = false,
  communityCards,
  currentStreet = 0,
  isLoading = false,
  tableState,
  onStartGame,
  pendingAction,
  isSeated,
  playerState,
  clear,
  isPlaying,
  decryptedCommunityCards = [],
  isDecrypting,
  handleDecryptCommunityCards,
  handleDecryptCards,
  timeLeft,
  bigBlind,
  smallBlind,
  winnerAddress,
}: PokerTableProps) {
  // Get loading state from Zustand store for cyberpunk loader
  const storeIsLoading = usePokerStore(state => state.isLoading);
  const formatEth = (wei: bigint) => (Number(wei) / 1e18).toFixed(4);

  // Chip animation state
  const [showChipAnimation, setShowChipAnimation] = useState(false);
  const [chipAnimationPositions, setChipAnimationPositions] = useState<{from: {x: number; y: number}; to: {x: number; y: number}} | null>(null);
  const potRef = useRef<HTMLDivElement>(null);
  const winnerSeatRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Trigger chip animation when showdown completes
  useEffect(() => {
    if (tableState?.state === 2 && winnerAddress && pot > BigInt(0)) {
      // Wait a moment for cards to be revealed first
      const timeout = setTimeout(() => {
        // Get pot and winner positions
        const potElement = potRef.current;
        const winnerElement = winnerSeatRefs.current.get(winnerAddress.toLowerCase());
        
        if (potElement && winnerElement) {
          const potRect = potElement.getBoundingClientRect();
          const winnerRect = winnerElement.getBoundingClientRect();
          
          setChipAnimationPositions({
            from: {
              x: potRect.left + potRect.width / 2,
              y: potRect.top + potRect.height / 2,
            },
            to: {
              x: winnerRect.left + winnerRect.width / 2,
              y: winnerRect.top + winnerRect.height / 2,
            },
          });
          setShowChipAnimation(true);
        }
      }, 800); // Delay to let cards reveal first

      return () => clearTimeout(timeout);
    } else {
      setShowChipAnimation(false);
    }
  }, [tableState?.state, winnerAddress, pot]);

  // Evaluate the player's hand to highlight community cards
  // Need at least 2 hole cards + 3 community (flop) = 5 total cards
  const yourPlayer = players.find(p => p.address.toLowerCase() === yourAddress?.toLowerCase());
  const validPlayerCards = yourPlayer?.cards?.filter((c): c is number => c !== undefined) || [];
  // Note: 0 is a valid card value (2♥), so we only filter undefined
  const validCommunity = decryptedCommunityCards.filter((c): c is number => c !== undefined);
  const totalPlayerCards = [...validPlayerCards, ...validCommunity];

  const playerHandEval =
    showYourCards &&
      validPlayerCards.length === 2 &&
      validCommunity.length >= 3 &&
      totalPlayerCards.length >= 5
      ? evaluateBestHand(totalPlayerCards)
      : null;

  // Get community card highlights (indices 0-4 for the 5 community cards)
  const communityHighlights = playerHandEval
    ? playerHandEval.contributingCardIndices
      .filter((i: number) => i >= 2)
      .map((i: number) => i - 2)
    : [];

  return (
    <>
      {/* Cyberpunk loading overlay - shows during state fetches */}
      <CyberpunkLoader isLoading={storeIsLoading || isLoading} />

      {/* Winner Banner */}
      {winnerAddress && tableState?.state === 2 && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white px-8 py-4 rounded-b-2xl shadow-2xl shadow-yellow-500/50 animate-pulse">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold">🏆 WINNER 🏆</div>
              <div className="text-lg font-semibold">
                {winnerAddress.toLowerCase() === yourAddress?.toLowerCase() 
                  ? "YOU WON!" 
                  : `${winnerAddress.slice(0, 6)}...${winnerAddress.slice(-4)}`}
              </div>
              <div className="text-xl font-bold text-yellow-100">
                💰 {formatEth(pot)} ETH
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Waiting for FHE Decryption Banner - Showdown in progress */}
      {currentStreet === 4 && tableState?.state === 1 && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-gradient-to-r from-black via-green-900 to-black text-green-300 px-8 py-4 rounded-b-2xl shadow-2xl shadow-green-500/50 border-b-2 border-green-500/30">
            <div className="text-center space-y-1">
              <div className="text-2xl font-bold flex items-center justify-center gap-3">
                <span className="animate-pulse">🔓</span>
                FHE DECRYPTION IN PROGRESS
                <span className="animate-pulse">🔓</span>
              </div>
              <div className="text-sm text-green-200">
                The contract is decrypting all cards to determine the winner...
              </div>
              <div className="text-xs text-green-400 mt-2 flex items-center justify-center gap-2">
                <span className="animate-spin inline-block">⏳</span>
                This may take 10-30 seconds on testnet
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-6xl mx-auto p-10">
        <div className="relative w-full h-[500px] mb-16 mt-10">
          <div
            className="relative flex items-center justify-center mx-auto pointer-events-none"
            style={{
              backgroundImage: "url('/bg-table.png')",
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
              minHeight: "500px",
              width: "100%",
            }}
          >
            {/* ✅ Trung tâm bàn */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {players.length === 1 ? (
                <div className="text-white text-3xl font-semibold italic opacity-80 animate-pulse z-20">
                  Waiting for other players...
                </div>
              ) : tableState?.state === 0 || tableState?.state === 2 ? (
                <div className="space-y-2 flex flex-col gap-2 z-20 relative text-center pointer-events-auto">
                  <button
                    onClick={onStartGame}
                    disabled={isLoading}
                    className="w-full text-black text-4xl font-bold py-2 px-8 
                    hover:scale-105 transition-all duration-200"
                    style={{
                      backgroundImage: `url(/bg-button.png)`,
                      backgroundSize: "100% 100%",
                    }}
                  >
                    {isLoading
                      ? "Starting..."
                      : tableState?.state === 0
                        ? "Start Game"
                        : "Start New Round"}
                  </button>
                  <span>The game starts when any player presses Start.</span>
                </div>
              ) : (
                !isLoading && (
                  <div className="relative z-20 flex flex-col items-center justify-center gap-4 transition-all duration-500 pointer-events-auto">
                    {/* Pot */}
                    <div ref={potRef} className="text-center">
                      <div className="text-white text-2xl font-semibold uppercase tracking-wider">
                        Pot: {formatEth(pot)} ETH
                      </div>
                    </div>

                    {/* 🃏 Community Cards with highlights */}
                    {communityCards && currentStreet > 0 && (
                      <div className="relative z-10 mb-4 flex justify-center">
                        <div className="flex gap-2 justify-center items-center relative">
                          {/* 🃏 Render theo currentStreet */}
                          {[
                            communityCards.flopCard1,
                            communityCards.flopCard2,
                            communityCards.flopCard3,
                            communityCards.turnCard,
                            communityCards.riverCard,
                          ]
                            .slice(0, currentStreet === 1 ? 3 : currentStreet === 2 ? 4 : 5)
                            .map((card, i) => (
                              <Card
                                key={i}
                                cardValue={card}
                                dealDelayMs={i * 120}
                                highlighted={communityHighlights.includes(i)}
                                highlightDelay={500 + i * 150}
                              />
                            ))}

                          {/* 🟦 Nút Decrypt động */}
                          {isPlaying && (() => {
                            // ✅ CRITICAL: Only show decrypt button if communityCards exists on-chain
                            // This prevents showing button for cached state from previous games
                            if (!communityCards) {
                              console.log(`🎴 [Decrypt Button] No community cards on-chain yet`);
                              return null;
                            }

                            // Check if cards are decrypted (not undefined)
                            // Note: 0 is a valid card value (2♥)
                            const decoded = [
                              decryptedCommunityCards[0] !== undefined,
                              decryptedCommunityCards[1] !== undefined,
                              decryptedCommunityCards[2] !== undefined,
                              decryptedCommunityCards[3] !== undefined,
                              decryptedCommunityCards[4] !== undefined,
                            ];

                            let coverStart = -1;
                            let coverEnd = -1;

                            if (currentStreet === 1) {
                              // ♠️ FLOP
                              if (!decoded[0] || !decoded[1] || !decoded[2]) {
                                coverStart = 0;
                                coverEnd = 2;
                              }
                            } else if (currentStreet === 2) {
                              // ♣️ TURN
                              if (!decoded[0] || !decoded[1] || !decoded[2]) {
                                // Flop chưa decrypt → phủ cả flop + turn
                                coverStart = 0;
                                coverEnd = 3;
                              } else if (!decoded[3]) {
                                // Flop decrypt rồi → phủ turn
                                coverStart = 3;
                                coverEnd = 3;
                              }
                            } else if (currentStreet === 3) {
                              // ♥️ RIVER
                              if (!decoded[0] || !decoded[1] || !decoded[2]) {
                                // Flop chưa decrypt → phủ flop + turn + river
                                coverStart = 0;
                                coverEnd = 4;
                              } else if (!decoded[3]) {
                                // Turn chưa decrypt
                                coverStart = 3;
                                coverEnd = !decoded[4] ? 4 : 3; // nếu river cũng chưa decrypt thì phủ cả 2
                              } else if (!decoded[4]) {
                                // Chỉ river chưa decrypt
                                coverStart = 4;
                                coverEnd = 4;
                              }
                            }

                            console.log(`🎴 [Decrypt Button Logic] street=${currentStreet}, communityCardsExist=${!!communityCards}, decoded=`, decoded, `cover=${coverStart}-${coverEnd}`);

                            if (coverStart === -1) return null;

                            // === Tính vị trí overlay ===
                            const cardWidth = 56; // w-14
                            const cardGap = 8; // gap-2
                            const overlayWidth =
                              (coverEnd - coverStart + 1) * cardWidth +
                              (coverEnd - coverStart) * cardGap;

                            const totalWidth =
                              (currentStreet === 1 ? 3 : currentStreet === 2 ? 4 : 5) *
                              cardWidth +
                              ((currentStreet === 1 ? 3 : currentStreet === 2 ? 4 : 5) - 1) *
                              cardGap;

                            const leftOffset =
                              -totalWidth / 2 + coverStart * (cardWidth + cardGap);
                            const left = `calc(50% + ${leftOffset}px)`;

                            const numCovered = coverEnd - coverStart + 1;
                            
                            // ✨ Better button text based on what's being decrypted
                            let buttonText = "Decrypt";
                            if (currentStreet === 1) {
                              buttonText = "🃏 Decrypt Flop";
                            } else if (currentStreet === 2) {
                              buttonText = numCovered >= 3 ? "🃏 Decrypt Cards" : "🃏 Decrypt Turn";
                            } else if (currentStreet === 3) {
                              if (numCovered >= 3) {
                                buttonText = "🃏 Decrypt Cards";
                              } else if (coverStart === 3 && coverEnd === 4) {
                                buttonText = "🃏 Decrypt Turn & River";
                              } else if (coverStart === 3) {
                                buttonText = "🃏 Decrypt Turn";
                              } else {
                                buttonText = "🃏 Decrypt River";
                              }
                            }

                            return (
                              <div
                                className="absolute top-0 flex items-center justify-center z-30"
                                style={{
                                  left,
                                  width: `${overlayWidth}px`,
                                  height: "100%",
                                }}
                              >
                                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-lg pointer-events-none" />
                                <button
                                  onClick={handleDecryptCommunityCards}
                                  disabled={isDecrypting || isLoading}
                                  className={`relative z-20 font-bold py-2 px-6 text-lg transition-all duration-200
                                  hover:scale-105 disabled:cursor-not-allowed ${
                                    isDecrypting 
                                      ? "scale-110 animate-greenBlackGlow text-green-300 border-2 border-green-400/50" 
                                      : "text-black"
                                  }`}
                                  style={isDecrypting ? {
                                    whiteSpace: "nowrap",
                                  } : {
                                    backgroundImage: `url(/bg-button.png)`,
                                    backgroundSize: "100% 100%",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {isDecrypting ? "🔓 Decrypting..." : buttonText}
                                </button>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}


                    {currentBet > BigInt(0) && (
                      <div className="text-white text-xl mt-1">
                        Current Bet: {formatEth(currentBet)} ETH
                      </div>
                    )}
                  </div>
                )
              )}
            </div>

            {/* 🧍‍♂️ 9 vị trí quanh bàn */}
            {Array(9)
              .fill(null)
              .map((_, i) => {
                const player = players[i] || null;
                const yourIndex = players.findIndex(
                  (p) => p.address.toLowerCase() === yourAddress?.toLowerCase()
                );
                const baseAngle = (i - yourIndex) * (360 / 9);
                const angleRad = (baseAngle * Math.PI) / 180;
                const radiusX = 390;
                const radiusY = 270;
                const posX = Math.sin(angleRad) * radiusX;
                const posY = Math.cos(angleRad) * radiusY;

                return (
                  <div
                    key={i}
                    ref={(el) => {
                      if (el && player) {
                        winnerSeatRefs.current.set(player.address.toLowerCase(), el as HTMLDivElement);
                      }
                    }}
                    className="absolute transition-all duration-300"
                    style={{
                      left: "50%",
                      top: "50%",
                      transform: `translate(${posX}px, ${posY}px) translate(-50%, -50%)`,
                    }}
                  >
                    {player ? (
                      <PlayerSeat
                        address={player.address}
                        chips={player.chips}
                        isDealer={i === dealerIndex}
                        isSmallBlind={i === ((dealerIndex + 1) % players.length)}
                        isBigBlind={i === ((dealerIndex + 2) % players.length)}
                        isCurrentTurn={player.isCurrentPlayer}
                        hasFolded={player.hasFolded}
                        isYou={player.address.toLowerCase() === yourAddress?.toLowerCase()}
                        cards={player.cards}
                        showCards={
                          // Show cards for: 1) your own cards, 2) all players when game finished (showdown)
                          (player.address.toLowerCase() === yourAddress?.toLowerCase() && showYourCards) ||
                          (tableState?.state === 2 && player.cards && player.cards.length > 0)
                        }
                        position="bottom"
                        pendingAction={
                          player.address.toLowerCase() === yourAddress?.toLowerCase() &&
                          !!pendingAction
                        }
                        isSeated={isSeated}
                        playerState={playerState}
                        clear={clear}
                        isLoading={isLoading}
                        isDecrypting={isDecrypting}
                        handleDecryptCards={handleDecryptCards}
                        timeLeft={timeLeft}
                        decryptedCommunityCards={decryptedCommunityCards as (number | undefined)[]}
                        tableState={tableState}
                        currentBet={currentBet}
                        playerBet={player.currentBet}
                        bigBlind={bigBlind}
                        smallBlind={smallBlind}
                        isWinner={winnerAddress?.toLowerCase() === player.address.toLowerCase()}
                        winnings={player.winnings}
                        losses={player.losses}
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-black/70 border-2 border-gray-700 flex items-center justify-center text-gray-500 text-sm">
                        Empty
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Chip Fly Animation */}
      {showChipAnimation && chipAnimationPositions && (
        <ChipFlyAnimation
          from={chipAnimationPositions.from}
          to={chipAnimationPositions.to}
          amount={pot}
          onComplete={() => setShowChipAnimation(false)}
        />
      )}
    </>
  );
}
