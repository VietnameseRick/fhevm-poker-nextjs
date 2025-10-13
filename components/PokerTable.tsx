"use client";

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

  const formatEth = (wei: bigint) => (Number(wei) / 1e18).toFixed(4);
  
  // Map player vào 9 vị trí, nếu thiếu thì thêm slot trống
  const tableSeats = Array(9)
    .fill(null)
    .map((_, i) => players[i] || null);

  return (
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
          {/* ✅ Trung tâm bàn: Pot, Cards, Current Bet */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            {(tableState?.state === 1 || tableState?.state === 3) ? (
              <div className="space-y-2 z-20 relative text-center pointer-events-auto">
                <button
                  onClick={onStartGame}
                  disabled={isLoading}
                  className="w-full
                           text-white font-bold py-4 px-8 rounded-xl
                           hover:scale-105 transition-all duration-200"
                  style={{
                    backgroundImage: `url(/bg-button.png)`,
                    backgroundSize: "100% 100%",
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
              <div className="relative z-20 flex flex-col items-center justify-center gap-4 transition-all duration-500 pointer-events-auto">
                {/* Pot */}
                <div className="text-center">
                  <div className="text-white text-2xl font-semibold uppercase tracking-wider">
                    Pot: {formatEth(pot)} ETH
                  </div>
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
                      {currentStreet >= 2 && (
                        <Card cardValue={communityCards.turnCard} dealDelayMs={360} />
                      )}
                      {currentStreet >= 3 && (
                        <Card cardValue={communityCards.riverCard} dealDelayMs={480} />
                      )}
                    </div>
                  </div>
                )}

                {currentBet > BigInt(0) && (
                  <div className="text-white text-xl mt-1">
                    Current Bet: {formatEth(currentBet)} ETH
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 🧍‍♂️ 9 vị trí quanh bàn (giãn đều, YOU luôn ở dưới giữa) */}
          {tableSeats.map((player, index) => {
            // Xác định tổng số ghế thực có
            const totalSeats = tableSeats.length;

            // Player chính (YOU) luôn ở giữa dưới
            const yourIndex = players.findIndex(
              (p) => p.address.toLowerCase() === yourAddress?.toLowerCase()
            );

            // Tính góc đều cho các vị trí (YOU ở 270 độ - dưới)
            const baseAngle = (index - yourIndex) * (360 / totalSeats);
            const angleRad = (baseAngle * Math.PI) / 180;

            // Bán kính elip (giãn hơn trước)
            const radiusX = 390; // ngang
            const radiusY = 270; // dọc

            // Tọa độ tương đối (tâm bàn là 50%/50%)
            const posX = Math.sin(angleRad) * radiusX;
            const posY = Math.cos(angleRad) * radiusY;

            return (
              <div
                key={index}
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
                    isDealer={index === dealerIndex}
                    isSmallBlind={index === ((dealerIndex + 1) % players.length)}
                    isBigBlind={index === ((dealerIndex + 2) % players.length)}
                    isCurrentTurn={player.isCurrentPlayer}
                    hasFolded={player.hasFolded}
                    isYou={player.address.toLowerCase() === yourAddress?.toLowerCase()}
                    cards={player.cards}
                    showCards={
                      player.address.toLowerCase() === yourAddress?.toLowerCase() && showYourCards
                    }
                    position="bottom"
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
  );
}
