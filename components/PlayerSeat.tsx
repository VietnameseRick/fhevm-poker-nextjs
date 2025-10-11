"use client";

import { CardHand } from "./CardDisplay";

interface PlayerSeatProps {
  address: string;
  chips: bigint;
  currentBet: bigint;
  isDealer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
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
  isSmallBlind = false,
  isBigBlind = false,
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
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full border-2 border-cyan-500 flex items-center justify-center text-xs font-bold shadow-lg shadow-cyan-500/50 z-10">
          D
        </div>
      )}
      {isSmallBlind && !isDealer && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full border-2 border-cyan-500 flex items-center justify-center text-[10px] font-bold shadow-lg shadow-cyan-500/50 z-10">
          SB
        </div>
      )}
      {isBigBlind && !isDealer && (
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full border-2 border-purple-500 flex items-center justify-center text-[10px] font-bold shadow-lg shadow-purple-500/50 z-10">
          BB
        </div>
      )}

      {/* Player Card */}
      <div
        className={`
          relative min-w-[200px] rounded-xl p-4 shadow-lg border-2 transition-all duration-300 glass-card
          ${isCurrentTurn ? "border-cyan-400 box-glow shadow-cyan-400/50 shadow-2xl scale-105" : "border-gray-600"}
          ${hasFolded ? "opacity-50 grayscale" : ""}
          ${isYou ? "ring-2 ring-cyan-500" : ""}
        `}
      >
        {/* Corner brackets for current player */}
        {isCurrentTurn && (
          <>
            <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
            <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
            <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
            <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
          </>
        )}

        {/* Current Turn Indicator */}
        {isCurrentTurn && (
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <div className="bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg shadow-cyan-500/50 animate-pulse mono">
              YOUR TURN
            </div>
          </div>
        )}

        {/* Player Info */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs border-2 ${
              isYou 
                ? "bg-gradient-to-br from-cyan-600 to-purple-600 border-cyan-500 shadow-lg shadow-cyan-500/50" 
                : "bg-gradient-to-br from-gray-700 to-gray-800 border-gray-600"
            }`}>
              {isYou ? "YOU" : address.slice(2, 4).toUpperCase()}
            </div>
            <div>
              <p className={`font-bold text-sm ${isYou ? "text-cyan-400" : "text-gray-200"} mono`}>
                {isYou ? "You" : formatAddress(address)}
              </p>
              <p className={`text-xs ${hasFolded ? "text-red-400" : "text-green-400"} mono`}>
                {hasFolded ? "Folded" : "Active"}
              </p>
            </div>
          </div>
        </div>

        {/* Chips */}
        <div className="flex items-center justify-between bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-2 mb-2 border border-cyan-500/30">
          <span className="text-xs font-semibold text-gray-400 mono">Chips:</span>
          <span className="text-sm font-bold text-cyan-400 mono">
            {formatEth(chips)} ETH
          </span>
        </div>

        {/* Current Bet */}
        {currentBet > 0n && (
          <div className="flex items-center justify-between bg-gradient-to-br from-purple-900/30 to-purple-800/30 rounded-lg p-2 border border-purple-500/30">
            <span className="text-xs font-semibold text-gray-400 mono">Bet:</span>
            <span className="text-sm font-bold text-purple-400 mono">
              {formatEth(currentBet)} ETH
            </span>
          </div>
        )}

        {/* Folded Overlay */}
        {hasFolded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl backdrop-blur-sm">
            <span className="text-3xl font-bold text-red-400 transform -rotate-12 mono">
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

