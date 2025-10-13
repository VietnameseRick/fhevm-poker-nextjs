"use client";

import { CardHand } from "./CardDisplay";

interface PlayerSeatProps {
  address: string;
  chips: bigint;
  isDealer?: boolean;
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  isCurrentTurn?: boolean;
  hasFolded?: boolean;
  isYou?: boolean;
  cards?: Array<number | undefined>;
  showCards?: boolean;
  position: "top" | "left" | "right" | "bottom";
  pendingAction?: boolean;
}

export function PlayerSeat({
  address,
  chips,
  isDealer = false,
  isSmallBlind = false,
  isBigBlind = false,
  isCurrentTurn = false,
  hasFolded = false,
  isYou = false,
  cards,
  showCards = false,
  position,
  pendingAction = false,
}: PlayerSeatProps) {
  const formatEth = (wei: bigint) => {
    const eth = Number(wei) / 1e18;
    return eth.toFixed(4);
  };

  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const positionClasses = {
    top: "items-center",
    left: "items-start",
    right: "items-end",
    bottom: "items-center",
  };

  return (
    <div className={`flex flex-col gap-2 ${positionClasses[position]} relative items-center`}>
      {/* Avatar + Cards */}
      <div className="relative flex flex-col items-center">
        {/* 🔵 Avatar */}
        <div className={`relative w-24 h-24 rounded-full overflow-visible border-4 flex items-center justify-center bg-black ${
          pendingAction 
            ? 'border-purple-400 shadow-lg shadow-purple-500/50 animate-pulse'
            : isCurrentTurn 
            ? 'border-yellow-400 shadow-lg shadow-yellow-500/50 animate-pulse' 
            : hasFolded
            ? 'border-gray-500 opacity-50'
            : 'border-green-500'
        }`}>
          <img
            src="/avatar.png"
            alt="player"
            className="object-cover w-full h-full rounded-full"
          />

          {/* 🎯 Badge D / SB / BB — nằm giữa bên trái avatar */}
          {(isDealer || isSmallBlind || isBigBlind) && (
            <div
              className={`absolute -left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold shadow-md
              ${
                isDealer
                  ? "bg-yellow-400 border-yellow-600 text-yellow-900"
                  : isSmallBlind
                  ? "bg-blue-400 border-blue-600 text-white"
                  : "bg-green-500 border-green-700 text-white"
              }`}
            >
              {isDealer ? "D" : isSmallBlind ? "SB" : "BB"}
            </div>
          )}
        </div>

        {/* Player Cards */}
        {cards && cards.length > 0 && (
          <div className="absolute -top-6 right-[-120px] flex">
            <CardHand cards={cards} hidden={!showCards || hasFolded} />
          </div>
        )}

        {/* 💰 Info box — đè lên avatar */}
        <div className="absolute min-w-[150px] bottom-[-40px] backdrop-blur z-10 bg-green-700/80 text-white px-4 py-2 rounded-2xl text-center backdrop-blur-sm border border-green-700 shadow-md">
          <p className="text-sm font-semibold">
            {isYou ? "YOU" : formatAddress(address)}
          </p>
          <p className="text-xs text-white font-medium">
            ETH: {formatEth(chips)}
          </p>
        </div>
      </div>

      {/* Current turn / pending action indicator */}
      {pendingAction && (
        <div className="absolute min-w-[100px] text-center -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 justify-center">
            <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            PROCESSING
          </div>
        </div>
      )}
      {!pendingAction && isCurrentTurn && (
        <div className="absolute min-w-[100px] text-center -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
            {isYou ? "YOUR TURN" : "ACTING"}
          </div>
        </div>
      )}
    </div>
  );
}
