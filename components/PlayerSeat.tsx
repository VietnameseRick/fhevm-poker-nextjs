"use client";

import { CardHand } from "./CardDisplay";

interface PlayerSeatProps {
  address: string;
  chips: bigint;
  currentBet: bigint;
  isDealer?: boolean;
  isCurrentTurn?: boolean;
  hasFolded?: boolean;
  isYou?: boolean;
  cards?: Array<number | undefined>;
  showCards?: boolean;
  position: "top" | "left" | "right" | "bottom";
}

export function PlayerSeat({
  address,
  chips,
  currentBet,
  isDealer = false,
  isCurrentTurn = false,
  hasFolded = false,
  isYou = false,
  cards,
  showCards = false,
  position,
}: PlayerSeatProps) {
  const formatEth = (wei: bigint) => {
    const eth = Number(wei) / 1e18;
    return eth.toFixed(4);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const positionClasses = {
    top: "items-center",
    left: "items-start",
    right: "items-end",
    bottom: "items-center",
  };

  return (
    <div className={`flex flex-col gap-2 ${positionClasses[position]} relative`}>
      {/* Dealer Button */}
      {isDealer && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full border-2 border-yellow-600 flex items-center justify-center text-xs font-bold shadow-lg z-10">
          D
        </div>
      )}

      {/* Player Card */}
      <div
        className={`
          relative min-w-[200px] rounded-xl p-4 shadow-lg border-4 transition-all duration-300
          ${isCurrentTurn ? "border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-100 shadow-yellow-400/50 shadow-2xl scale-105" : "border-gray-300 bg-white"}
          ${hasFolded ? "opacity-50 grayscale" : ""}
          ${isYou ? "ring-4 ring-blue-500" : ""}
        `}
      >
        {/* Current Turn Indicator */}
        {isCurrentTurn && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <div className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
              YOUR TURN
            </div>
          </div>
        )}

        {/* Player Info */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isYou ? "bg-blue-600" : "bg-gray-600"}`}>
              {isYou ? "YOU" : address.slice(2, 4).toUpperCase()}
            </div>
            <div>
              <p className={`font-bold ${isYou ? "text-blue-600" : "text-gray-900"}`}>
                {isYou ? "You" : formatAddress(address)}
              </p>
              <p className="text-xs text-gray-500">
                {hasFolded ? "Folded" : "Active"}
              </p>
            </div>
          </div>
        </div>

        {/* Chips */}
        <div className="flex items-center justify-between bg-gray-100 rounded-lg p-2 mb-2">
          <span className="text-sm font-semibold text-gray-600">Chips:</span>
          <span className="text-sm font-bold text-green-600">
            {formatEth(chips)} ETH
          </span>
        </div>

        {/* Current Bet */}
        {currentBet > 0n && (
          <div className="flex items-center justify-between bg-blue-50 rounded-lg p-2">
            <span className="text-sm font-semibold text-blue-600">Bet:</span>
            <span className="text-sm font-bold text-blue-700">
              {formatEth(currentBet)} ETH
            </span>
          </div>
        )}

        {/* Folded Overlay */}
        {hasFolded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
            <span className="text-3xl font-bold text-white transform -rotate-12">
              FOLDED
            </span>
          </div>
        )}
      </div>

      {/* Player Cards */}
      {cards && cards.length > 0 && (
        <div className="flex justify-center">
          <CardHand cards={cards} hidden={!showCards || hasFolded} />
        </div>
      )}
    </div>
  );
}

