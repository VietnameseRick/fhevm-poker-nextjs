"use client";

import { useState } from "react";
import { PlayerSeat } from "./PlayerSeat";
import { Card } from "./CardDisplay";

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
}: PokerTableProps) {
  const [gameStarted, setGameStarted] = useState(false);

  const formatEth = (wei: bigint) => (Number(wei) / 1e18).toFixed(4);

  // Xác định vị trí hiển thị của từng người chơi
  const getPlayerPosition = (index: number, total: number): "top" | "left" | "right" | "bottom" => {
    const yourIndex = players.findIndex(p => p.address.toLowerCase() === yourAddress?.toLowerCase());
    const relativeIndex = (index - yourIndex + total) % total;

    if (total <= 2) return relativeIndex === 0 ? "bottom" : "top";
    if (total <= 4) {
      const positions: Array<"top" | "left" | "right" | "bottom"> = ["bottom", "right", "top", "left"];
      return positions[relativeIndex] || "top";
    }
    const positions: Array<"top" | "left" | "right" | "bottom"> = [
      "bottom", "right", "top", "top", "left", "left",
    ];
    return positions[relativeIndex] || "top";
  };

  // Gom nhóm người chơi theo vị trí
  const groupedPlayers = {
    top: [] as any[],
    left: [] as any[],
    right: [] as any[],
    bottom: [] as any[],
  };

  players.forEach((player, index) => {
    const pos = getPlayerPosition(index, players.length);
    groupedPlayers[pos].push({ player, index });
  });

  // ================== GIAO DIỆN ==================
  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* ===== TOP PLAYERS ===== */}
      <div className="flex justify-center">
        {groupedPlayers.top.map(({ player, index }) => (
          <PlayerSeat
            key={player.address}
            address={player.address}
            chips={player.chips}
            currentBet={player.currentBet}
            isDealer={index === dealerIndex}
            isSmallBlind={players.length >= 2 && index === ((dealerIndex + 1) % players.length)}
            isBigBlind={players.length >= 2 && index === ((dealerIndex + 2) % players.length)}
            isCurrentTurn={player.isCurrentPlayer}
            hasFolded={player.hasFolded}
            isYou={player.address.toLowerCase() === yourAddress?.toLowerCase()}
            cards={player.cards}
            showCards={player.address.toLowerCase() === yourAddress?.toLowerCase() && showYourCards && gameStarted}
            position="top"
          />
        ))}
      </div>

      {/* ===== MIDDLE SECTION ===== */}
      <div className="flex justify-between items-center">
        {/* LEFT PLAYERS */}
        <div className="flex flex-col gap-6">
          {groupedPlayers.left.map(({ player, index }) => (
            <PlayerSeat
              key={player.address}
              address={player.address}
              chips={player.chips}
              currentBet={player.currentBet}
              isDealer={index === dealerIndex}
              isSmallBlind={index === ((dealerIndex + 1) % players.length)}
              isBigBlind={index === ((dealerIndex + 2) % players.length)}
              isCurrentTurn={player.isCurrentPlayer}
              hasFolded={player.hasFolded}
              isYou={player.address.toLowerCase() === yourAddress?.toLowerCase()}
              cards={player.cards}
              showCards={player.address.toLowerCase() === yourAddress?.toLowerCase() && showYourCards && gameStarted}
              position="left"
            />
          ))}
        </div>

        {/* ===== POKER TABLE CENTER ===== */}
        <div className="relative flex-1 min-w-[400px] flex items-center justify-center">
          <div
            className="w-full relative p-12 min-h-[500px] flex flex-col items-center justify-center"
            style={{
              backgroundImage: "url('/bg-table.png')",
              backgroundSize: "100% 100%",
              backgroundRepeat: "no-repeat",
            }}
          >
            {/* ========== START BUTTON / POT / CARDS ========== */}
            {(tableState?.state === 1 || tableState?.state === 3) ? (
              <div className="space-y-2 z-20 relative text-center">
                <button
                  onClick={onStartGame}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 
                             hover:from-orange-600 hover:to-orange-700 
                             disabled:from-gray-600 disabled:to-gray-700 
                             text-white font-bold py-4 px-8 rounded-xl shadow-lg 
                             hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed"
                  style={{
                    backgroundImage: `url(/bg-button.png)`,
                    backgroundSize: "100% 100%",
                    backgroundBlendMode: "overlay",
                  }}
                >
                  {isLoading
                    ? "Processing..."
                    : tableState?.state === 1
                    ? "🚀 Start Game"
                    : "🔄 Start New Round"}
                </button>
              </div>
            ) : (
              // ✅ Chỉ hiển thị pot / cards / bet khi không còn loading
              <div className="relative z-20 flex flex-col items-center justify-center gap-4 transition-all duration-500">
                {/* Pot */}
                <div className="flex gap-2">
                  <div className="text-blue-400 text-xl font-semibold uppercase tracking-wider">
                    Pot: 
                  </div>
                  <div className="text-white text-xl font-bold">{formatEth(pot)} ETH</div>
                </div>

                {/* Community Cards */}
                {communityCards && currentStreet > 0 && (
                  <div className="relative z-10 mb-4">
                    <div className="flex gap-2 justify-center items-center">
                      {currentStreet >= 1 && (
                        <>
                          <Card cardValue={communityCards.flopCard1} dealDelayMs={0} />
                          <Card cardValue={communityCards.flopCard2} dealDelayMs={120} />
                          <Card cardValue={communityCards.flopCard3} dealDelayMs={240} />
                        </>
                      )}
                      {currentStreet >= 2 && <Card cardValue={communityCards.turnCard} dealDelayMs={360} />}
                      {currentStreet >= 3 && <Card cardValue={communityCards.riverCard} dealDelayMs={480} />}
                    </div>
                  </div>
                )}

                {/* Current Bet */}
                {currentBet > BigInt(0) && (
                  <div className="text-white text-xl mt-1">
                    Current Bet: {formatEth(currentBet)} ETH
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PLAYERS */}
        <div className="flex flex-col gap-6">
          {groupedPlayers.right.map(({ player, index }) => (
            <PlayerSeat
              key={player.address}
              address={player.address}
              chips={player.chips}
              currentBet={player.currentBet}
              isDealer={index === dealerIndex}
              isSmallBlind={index === ((dealerIndex + 1) % players.length)}
              isBigBlind={index === ((dealerIndex + 2) % players.length)}
              isCurrentTurn={player.isCurrentPlayer}
              hasFolded={player.hasFolded}
              isYou={player.address.toLowerCase() === yourAddress?.toLowerCase()}
              cards={player.cards}
              showCards={player.address.toLowerCase() === yourAddress?.toLowerCase() && showYourCards && gameStarted}
              position="right"
            />
          ))}
        </div>
      </div>

      {/* ===== BOTTOM PLAYERS ===== */}
      <div className="flex justify-center gap-6">
        {groupedPlayers.bottom.map(({ player, index }) => (
          <PlayerSeat
            key={player.address}
            address={player.address}
            chips={player.chips}
            currentBet={player.currentBet}
            isDealer={index === dealerIndex}
            isSmallBlind={index === ((dealerIndex + 1) % players.length)}
            isBigBlind={index === ((dealerIndex + 2) % players.length)}
            isCurrentTurn={player.isCurrentPlayer}
            hasFolded={player.hasFolded}
            isYou={player.address.toLowerCase() === yourAddress?.toLowerCase()}
            cards={player.cards}
            showCards={player.address.toLowerCase() === yourAddress?.toLowerCase() && showYourCards && gameStarted}
            position="bottom"
          />
        ))}
      </div>
    </div>
  );
}
