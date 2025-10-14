"use client";

import { CardHand } from "./CardDisplay";
import { PlayerBettingState } from "@/stores/pokerStore";

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
  isSeated?: boolean;
  playerState?: "" | PlayerBettingState | undefined;
  clear?: number;
  isLoading?: boolean;
  isDecrypting?: boolean;
  isPlaying?: boolean;
  handleDecryptCards?: () => void;
  timeLeft: number | null;
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
  isSeated,
  playerState,
  clear,
  isPlaying = true,
  isLoading = false,
  isDecrypting,
  handleDecryptCards,
  timeLeft,
}: PlayerSeatProps) {
  const formatEth = (wei: bigint) => (Number(wei) / 1e18).toFixed(4);
  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const positionClasses = {
    top: "items-center",
    left: "items-start",
    right: "items-end",
    bottom: "items-center",
  };

  // ✅ Điều kiện hiển thị nút decrypt
  const shouldShowDecryptButton = isPlaying && !clear && (isSeated !== false || !!playerState);

  // ✅ Format thời gian mm:ss
  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds < 0) return "00:00";
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  // ✅ Kiểm tra hết thời gian
  const isTimeOut = timeLeft !== null && timeLeft <= 0;

  return (
    <div
      className={`flex flex-col gap-2 ${positionClasses[position]} relative items-center`}
    >
      {/* Avatar + Cards */}
      <div className="relative flex flex-col items-center">
        {/* 🔵 Avatar */}
        <div
          className={`relative w-24 h-24 rounded-full overflow-visible border-4 flex items-center justify-center bg-black ${
            pendingAction
              ? "border-purple-400 shadow-lg shadow-purple-500/50 animate-pulse"
              : isCurrentTurn
              ? "border-yellow-400 shadow-lg shadow-yellow-500/50 animate-pulse"
              : hasFolded
              ? "border-gray-500 opacity-50"
              : "border-green-500"
          }`}
        >
          <img
            src="/avatar.png"
            alt="player"
            className="object-cover w-full h-full rounded-full"
          />

          {/* 🎯 Badge D / SB / BB */}
          {(isDealer || isSmallBlind || isBigBlind) && (
            <div
              className={`absolute -left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center text-md font-bold shadow-md
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

        {/* 🂡 Player Cards + Decrypt Button */}
        {cards && cards.length > 0 && (
          <div className="absolute -top-6 right-[-120px] z-20">
            <div className="relative flex items-center justify-center">
              {/* 🃏 Bộ bài */}
              <CardHand
                cards={cards}
                hidden={!showCards || hasFolded}
                className="pointer-events-none"
              />

              {/* 🔓 Nút Decrypt Cards (overlay mờ giống PokerTable) */}
              {shouldShowDecryptButton && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-auto">
                  {/* 🌫️ Lớp phủ mờ */}
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-lg z-10 pointer-events-none" />

                  {/* 🔘 Nút decrypt */}
                  <button
                    onClick={handleDecryptCards}
                    disabled={isDecrypting || isLoading}
                    className={`relative z-20 text-black font-bold py-2 px-8 text-sm transition-all duration-200 
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
                      <span className="flex items-center justify-center gap-2 text-sm">
                        <svg
                          className="animate-spin h-4 w-4"
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
                        Decrypting...
                      </span>
                    ) : (
                      "Decrypt Cards"
                    )}

                    {isDecrypting && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 💰 Info box */}
        <div className="absolute min-w-[150px] bottom-[-60px] backdrop-blur z-10 bg-green-500/20 text-white px-4 py-2 rounded-2xl text-center backdrop-blur-sm border-2 border-green-500 shadow-md">
          <p className="text-xl font-semibold">
            {isYou ? "YOU" : formatAddress(address)}
          </p>
          <p className="text-md text-white font-medium">
            ETH: {formatEth(chips)}
          </p>
        </div>
      </div>

      {/* Indicators */}
      {pendingAction && (
        <div className="absolute min-w-[80px] text-center -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 justify-center">
            <svg
              className="animate-spin h-3 w-3"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 
                  5.291A7.962 7.962 0 014 12H0c0 3.042 
                  1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            ACTING.....
          </div>
        </div>
      )}

      {!pendingAction && isCurrentTurn && (
        <div className="absolute min-w-[80px] text-center -top-4 left-1/2 transform -translate-x-1/2">
          <div
            className={`${
              isTimeOut
                ? "bg-red-600 text-white animate-pulse"
                : pendingAction
                ? "bg-purple-500 text-white"
                : "bg-yellow-400 text-yellow-900 animate-pulse"
            } text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center justify-center gap-1`}
          >
            <svg
              className="h-3 w-3"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path d="M12 6v6l3 3" strokeWidth="2" />
            </svg>
            {formatTime(timeLeft)}
          </div>
        </div>
      )}
    </div>
  );
}
