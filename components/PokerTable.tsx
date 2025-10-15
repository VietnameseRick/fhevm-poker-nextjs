"use client";

import { PlayerSeat } from "./PlayerSeat";
import { Card } from "./CardDisplay";
import React from "react";
import { PlayerBettingState, usePokerStore } from "@/stores/pokerStore";
import { CyberpunkLoader } from "./CyberpunkLoader";
import { evaluateBestHand } from "@/utils/handEvaluator";

interface Player {
  address: string;
  chips: bigint;
  currentBet: bigint;
  hasFolded: boolean;
  isCurrentPlayer: boolean;
  cards?: Array<number | undefined>;
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
  decryptedCommunityCards?: number[];
  isDecrypting?: boolean;
  handleDecryptCommunityCards?: () => void;
  handleDecryptCards?: () => void;
  timeLeft: number | null;
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
}: PokerTableProps) {
  // Get loading state from Zustand store for cyberpunk loader
  const storeIsLoading = usePokerStore(state => state.isLoading);
  const formatEth = (wei: bigint) => (Number(wei) / 1e18).toFixed(4);

  // Evaluate the player's hand to highlight community cards
  // Need at least 2 hole cards + 3 community (flop) = 5 total cards
  const yourPlayer = players.find(p => p.address.toLowerCase() === yourAddress?.toLowerCase());
  const validPlayerCards = yourPlayer?.cards?.filter((c): c is number => c !== undefined) || [];
  const validCommunity = decryptedCommunityCards.filter((c): c is number => c !== undefined && c !== 0);
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

  const renderDecryptButton = () => {
    if (!isPlaying || !communityCards || currentStreet < 1) return null;

    const expectedCards =
      currentStreet >= 3 ? 5 : currentStreet >= 2 ? 4 : currentStreet >= 1 ? 3 : 0;
    const decryptedCount = decryptedCommunityCards.filter((c) => c !== 0).length;
    const needsDecryption = decryptedCount < expectedCards;

    if (!needsDecryption) return null;

    return (
      <div className="absolute inset-0 flex items-center justify-center z-30">
        {/* 🌫️ Lớp phủ làm mờ bài */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-lg z-10 pointer-events-none" />

        {/* 🔓 Nút decrypt */}
        <button
          onClick={handleDecryptCommunityCards}
          disabled={isDecrypting || isLoading}
          className={`relative z-20 text-black font-bold py-2 px-10 text-xl transition-all duration-200 
          hover:scale-105 disabled:cursor-not-allowed 
          ${isDecrypting ? "scale-110" : ""}
        `}
          style={{
            backgroundImage: `url(/bg-button.png)`,
            backgroundSize: "100% 100%",
            whiteSpace: "nowrap",
          }}
        >
          {isDecrypting ? (
            <span className="flex items-center justify-center gap-3 text-xl">
              <svg
                className="animate-spin h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 
                5.373 0 12h4zm2 5.291A7.962 7.962 0 
                014 12H0c0 3.042 1.135 5.824 3 
                7.938l3-2.647z"
                ></path>
              </svg>
              Decrypting Cards...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-3 text-xl">
              Decrypt Cards
            </span>
          )}

          {isDecrypting && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
          )}
        </button>
      </div>
    );
  };


  return (
    <>
      {/* Cyberpunk loading overlay - shows during state fetches */}
      <CyberpunkLoader isLoading={storeIsLoading || isLoading} />
      
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
            ) : tableState?.state === 1 || tableState?.state === 3 ? (
              <div className="space-y-2 z-20 relative text-center pointer-events-auto">
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
                    ? "Processing..."
                    : tableState?.state === 1
                      ? "Start Game"
                      : "Start New Round"}
                </button>
              </div>
            ) : (
              !isLoading && (
                <div className="relative z-20 flex flex-col items-center justify-center gap-4 transition-all duration-500 pointer-events-auto">
                  {/* Pot */}
                  <div className="text-center">
                    <div className="text-white text-2xl font-semibold uppercase tracking-wider">
                      Pot: {formatEth(pot)} ETH
                    </div>
                  </div>

                  {/* 🃏 Community Cards with highlights */}
                  {communityCards && currentStreet > 0 && (
                    <div className="relative z-10 mb-4 flex justify-center">
                      <div className="flex gap-2 justify-center items-center relative">
                        {currentStreet >= 1 && (
                          <>
                            <Card 
                              cardValue={communityCards.flopCard1} 
                              dealDelayMs={0}
                              highlighted={communityHighlights.includes(0)}
                              highlightDelay={500}
                            />
                            <Card 
                              cardValue={communityCards.flopCard2} 
                              dealDelayMs={120}
                              highlighted={communityHighlights.includes(1)}
                              highlightDelay={650}
                            />
                            <Card 
                              cardValue={communityCards.flopCard3} 
                              dealDelayMs={240}
                              highlighted={communityHighlights.includes(2)}
                              highlightDelay={800}
                            />
                          </>
                        )}
                        {currentStreet >= 2 && (
                          <Card 
                            cardValue={communityCards.turnCard} 
                            dealDelayMs={360}
                            highlighted={communityHighlights.includes(3)}
                            highlightDelay={950}
                          />
                        )}
                        {currentStreet >= 3 && (
                          <Card 
                            cardValue={communityCards.riverCard} 
                            dealDelayMs={480}
                            highlighted={communityHighlights.includes(4)}
                            highlightDelay={1100}
                          />
                        )}

                        {/* 🔓 Nút decrypt đè lên bài */}
                        {renderDecryptButton()}
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
                        player.address.toLowerCase() === yourAddress?.toLowerCase() && showYourCards
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
                      decryptedCommunityCards={decryptedCommunityCards}
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
    </>
  );
}
