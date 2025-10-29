"use client";

import { memo, useMemo } from "react";
import Image from "next/image";
import { CardHand } from "./CardDisplay";
import { PlayerBettingState, usePokerStore } from "@/stores/pokerStore";
import { evaluateBestHand, getHandRankDisplay } from "@/utils/handEvaluator";

export interface PlayerSeatProps {
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
  handleDecryptCards?: () => void;
  timeLeft: number | null;
  decryptedCommunityCards?: (number | undefined)[]; // Support undefined for undealt cards (0 is valid card)
  tableState?: { state?: number };
  isWinner?: boolean; // Highlight winner at showdown
  winnings?: bigint; // Amount won at showdown
  losses?: bigint; // Amount lost at showdown
  // Props để infer action từ logic BettingControls
  currentBet?: bigint;
  playerBet?: bigint;
  bigBlind?: string;
  smallBlind?: string;
}

export const PlayerSeat = memo(function PlayerSeat({
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
  isLoading = false,
  isDecrypting,
  handleDecryptCards,
  timeLeft,
  decryptedCommunityCards = [],
  tableState,
  isWinner = false,
  winnings,
  losses,
  // Props để infer action
  currentBet,
  playerBet,
  bigBlind,
  smallBlind,
}: PlayerSeatProps) {
  // Get player action from global store
  const playerActions = usePokerStore(state => state.playerActions);
  const playerAction = playerActions[address.toLowerCase()];

  // Debug showdown display
  if (tableState?.state === 2 && !isYou) {
    console.log(`🎴 [Showdown Debug] Player ${address.slice(0, 6)}:`, {
      hasCards: !!cards && cards.length > 0,
      cardsLength: cards?.length,
      cards: cards,
      showCards,
      tableState: tableState?.state,
      isYou,
      hasFolded
    });
  }

  const formatEth = (wei: bigint) => (Number(wei) / 1e18).toFixed(4);
  const formatAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  // Helper to safely access playerState as PlayerBettingState | undefined
  const safePlayerState = playerState && typeof playerState !== "string" ? playerState : undefined;

  // Evaluate hand in real-time during gameplay
  // Need at least 2 hole cards + 3 community (flop) = 5 total cards
  const validCards = cards?.filter((c): c is number => c !== undefined) || [];
  // Note: 0 is a valid card value (2♥), so we only filter undefined
  const validCommunity = decryptedCommunityCards.filter((c): c is number => c !== undefined);
  const totalCards = [...validCards, ...validCommunity];

  const handEval =
    showCards &&
      validCards.length === 2 &&
      validCommunity.length >= 3 &&
      totalCards.length >= 5
      ? evaluateBestHand(totalCards)
      : null;

  // Map contributing card indices: [hole1, hole2, ...community]
  const getCardHighlights = () => {
    if (!handEval) return { holeHighlights: [], communityHighlights: [] };
    const holeHighlights = handEval.contributingCardIndices.filter((i: number) => i < 2);
    const communityHighlights = handEval.contributingCardIndices
      .filter((i: number) => i >= 2)
      .map((i: number) => i - 2);
    return { holeHighlights, communityHighlights };
  };

  const cardHighlights = getCardHighlights();

  const positionClasses = {
    top: "items-center",
    left: "items-start",
    right: "items-end",
    bottom: "items-center",
  };

  // Get table state to check if game has started  
  const gameTableState = usePokerStore(state => state.tableState);
  const isGamePlaying = gameTableState?.state === 1; // 1 = Playing state
  
  // Check if this player's cards have been dealt (via CardsDealt event)
  const playersWithDealtCards = usePokerStore(state => state.playersWithDealtCards);
  const hasCardsDealt = playersWithDealtCards.has(address.toLowerCase());

  // ✅ ON-CHAIN STATE: Show decrypt button based on CONTRACT state + event tracking
  // Show decrypt button if:
  // 1. Game is in Playing state (on-chain) AND
  // 2. Cards not yet decrypted (local) AND
  // 3. Player is seated/has state (on-chain) AND
  // 4. Player hasn't folded (on-chain) AND
  // 5. CardsDealt event has fired for this player (prevents "CARDS_NOT_DEALT" error)
  const shouldShowDecryptButton = 
    isGamePlaying && 
    clear === undefined && 
    (isSeated !== false || !!playerState) && 
    !hasFolded &&
    hasCardsDealt;

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

  // ✅ Tính toán betting status cho currentTurn (logic giống BettingControls)
  const bettingStatus = useMemo(() => {
    const bigBlindEth = bigBlind ? parseFloat(bigBlind) : 0.01;
    const bigBlindValue = BigInt(bigBlindEth * 1e18);
    const smallBlindEth = smallBlind ? parseFloat(smallBlind) : 0.005;
    const smallBlindValue = BigInt(smallBlindEth * 1e18);

    const amountToCall = (currentBet ?? 0n) - (playerBet ?? 0n);
    const canCheck = (currentBet ?? 0n) === (playerBet ?? 0n);
    const canCall = amountToCall > 0n && amountToCall <= chips;
    const canRaise = chips > amountToCall;

    let actionText = "";
    if (canCheck) {
      actionText = "Check";
    } else if (canCall) {
      actionText = `Call`;
    } else if (canRaise) {
      const isBet = (currentBet ?? 0n) <= bigBlindValue && (playerBet ?? 0n) <= smallBlindValue;
      actionText = isBet ? `Bet` : `Raise`;
    } else {
      actionText = "Fold?";
    }

    return { actionText, canCheck, canCall, canRaise, amountToCall };
  }, [currentBet, playerBet, chips, bigBlind, smallBlind]);

  const { actionText } = bettingStatus;

  // canAct - Use safePlayerState
  const canAct = isCurrentTurn && !hasFolded && !(safePlayerState?.hasFolded ?? false);

  // Format action display text
  const getActionDisplay = () => {
    if (!playerAction) return null;
    
    const { action, amount } = playerAction;
    
    if (action === 'Raise' && amount) {
      return `Raised ${formatEth(amount)} ETH`;
    } else if (action === 'Call' || action === 'Bet') {
      return action === 'Call' ? 'Called' : 'Bet';
    }
    
    return action === 'Fold' ? 'Folded' : action === 'Check' ? 'Checked' : action;
  };

  const lastActionDisplay = getActionDisplay();

  return (
    <div
      className={`flex flex-col gap-2 ${positionClasses[position]} relative items-center`}
    >
      {/* 🏆 Winner/Loser Dialog at Showdown */}
      {tableState?.state === 2 && (isSeated || !!playerState) && !hasFolded && (winnings || losses) && (
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
          {isWinner && winnings && winnings > BigInt(0) ? (
            <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 text-white px-4 py-2 rounded-full shadow-2xl shadow-yellow-500/50 animate-bounce">
              <div className="text-center font-bold">
                <div className="text-sm">🏆 WINNER!</div>
                <div className="text-lg">+{formatEth(winnings)} ETH</div>
              </div>
            </div>
          ) : losses && losses > BigInt(0) ? (
            <div className="bg-gray-800/90 border border-gray-600 text-gray-300 px-3 py-1 rounded-full shadow-lg">
              <div className="text-xs font-semibold">Lost -{formatEth(losses)} ETH</div>
            </div>
          ) : null}
        </div>
      )}
      
      {/* Avatar + Cards */}
      <div className="relative flex flex-col items-center">
        {/* 🔵 Avatar */}
        <div
          className={`relative w-24 h-24 rounded-full overflow-visible border-4 flex items-center justify-center bg-black ${
            isWinner
              ? "border-yellow-400 shadow-2xl shadow-yellow-500/80 animate-pulse ring-4 ring-yellow-300/50"
              : pendingAction
                ? "border-purple-400 shadow-lg shadow-purple-500/50 animate-pulse"
                : isCurrentTurn
                  ? "border-yellow-400 shadow-lg shadow-yellow-500/50 animate-pulse"
                  : "border-green-500"
            }`}
        >
          <Image
            src="/avatar.png"
            alt="player"
            width={96}
            height={96}
            className="object-cover w-full h-full rounded-full"
            priority
          />

          {hasFolded && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-white font-extrabold text-xl uppercase rounded-full z-10">
              FOLD
            </div>
          )}

          {/* 🎯 Badge D / SB / BB */}
          {(isDealer || isSmallBlind || isBigBlind) && hasFolded === false && !isWinner && (
            <div
              className={`absolute -left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center text-md font-bold shadow-md
              ${isDealer
                  ? "bg-yellow-400 border-yellow-600 text-yellow-900"
                  : isSmallBlind
                    ? "bg-blue-400 border-blue-600 text-white"
                    : "bg-green-500 border-green-700 text-white"
                }`}
            >
              {isDealer ? "D" : isSmallBlind ? "SB" : "BB"}
            </div>
          )}
          
          {/* 👑 Winner Crown */}
          {isWinner && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-4xl animate-bounce">
              👑
            </div>
          )}
        </div>

        {/* 🂡 Player Cards + Decrypt Button + Hand Display */}
        {cards && cards.length > 0 && tableState?.state === 1 && (
          <div className="absolute -top-6 right-[-120px] z-20">
            <div className="relative flex flex-col items-center gap-2">
              {/* 🃏 Bộ bài với highlights */}
              <CardHand
                cards={cards}
                hidden={!showCards || hasFolded}
                className="pointer-events-none"
                highlightedIndices={showCards ? cardHighlights.holeHighlights : []}
                highlightDelay={300}
              />

              {/* 💎 Hand rank display during gameplay */}
              {handEval && showCards && !hasFolded && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-50">
                  <div className={`px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-sm border shadow-lg ${handEval.rank >= 7 ? "bg-green-900/90 border-green-400 text-green-200 shadow-green-500/50 animate-pulse" :
                      handEval.rank >= 4 ? "bg-green-800/80 border-green-500 text-green-100 shadow-green-600/40" :
                        handEval.rank >= 1 ? "bg-emerald-900/70 border-emerald-600 text-emerald-200" :
                          "bg-slate-800/80 border-slate-600 text-slate-300"
                    }`}>
                    {getHandRankDisplay(handEval.rank).emoji} {getHandRankDisplay(handEval.rank).name}
                  </div>
                </div>
              )}

              {/* 🔓 Nút Decrypt Cards (overlay mờ giống PokerTable) */}
              {shouldShowDecryptButton && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-auto">
                  {/* 🌫️ Lớp phủ mờ */}
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-lg z-10 pointer-events-none" />

                  {/* 🔘 Nút decrypt with green/black glow when decrypting */}
                  <button
                    onClick={handleDecryptCards}
                    disabled={isDecrypting || isLoading}
                    className={`relative z-20 font-bold py-2 px-8 text-sm transition-all duration-200 
                      hover:scale-105 disabled:cursor-not-allowed 
                      ${isDecrypting 
                        ? "scale-110 animate-greenBlackGlow text-green-300 border-2 border-green-400/50" 
                        : "text-black"
                      }
                    `}
                    style={isDecrypting ? {
                      whiteSpace: "nowrap",
                    } : {
                      backgroundImage: `url(/bg-button.png)`,
                      backgroundSize: "100% 100%",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isDecrypting ? "🔓 Decrypting..." : "🔓 Decrypt"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 🎴 Player Cards at Showdown (Finished State) */}
        {cards && cards.length > 0 && tableState?.state === 2 && showCards && (
          <div className="absolute -top-6 right-[-120px] z-20">
            <div className="relative flex flex-col items-center gap-2">
              {/* 🃏 Cards */}
              <CardHand
                cards={cards}
                hidden={false}
                className="pointer-events-none"
                highlightedIndices={handEval ? cardHighlights.holeHighlights : []}
                highlightDelay={0}
              />

              {/* 💎 Hand rank display at showdown */}
              {handEval && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-50">
                  <div className={`px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-sm border shadow-lg ${
                    isWinner
                      ? "bg-yellow-500/90 border-yellow-300 text-yellow-900 shadow-yellow-500/50 animate-pulse"
                      : handEval.rank >= 7 
                        ? "bg-green-900/90 border-green-400 text-green-200 shadow-green-500/50" 
                        : handEval.rank >= 4 
                          ? "bg-green-800/80 border-green-500 text-green-100 shadow-green-600/40" 
                          : handEval.rank >= 1 
                            ? "bg-emerald-900/70 border-emerald-600 text-emerald-200" 
                            : "bg-slate-800/80 border-slate-600 text-slate-300"
                    }`}>
                    {getHandRankDisplay(handEval.rank).emoji} {getHandRankDisplay(handEval.rank).name}
                  </div>
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
          <div className="bg-black/70 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 justify-center">
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
            {pendingAction}
          </div>
        </div>
      )}

      {/* Nếu currentTurn: Show betting status + time (logic từ BettingControls) */}
      {!pendingAction && isCurrentTurn && tableState?.state === 1 && canAct && (
        <div className="absolute min-w-[120px] text-center -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className={`bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 justify-center animate-pulse whitespace-nowrap`}>
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
            {actionText}
            {timeLeft !== null && <span className="ml-1">({formatTime(timeLeft)})</span>}
          </div>
        </div>
      )}

      {/* Nếu KHÔNG currentTurn nhưng có lastActionDisplay: Show player's last action */}
      {!pendingAction && !isCurrentTurn && lastActionDisplay && tableState?.state === 1 && (
        <div className="absolute min-w-[100px] text-center -top-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className={`text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center justify-center whitespace-nowrap ${
            playerAction?.action === 'Fold' ? 'bg-red-500' :
            playerAction?.action === 'Raise' || playerAction?.action === 'Bet' ? 'bg-orange-500' :
            playerAction?.action === 'Call' ? 'bg-green-500' :
            playerAction?.action === 'Check' ? 'bg-blue-500' :
            'bg-purple-500'
          }`}>
            {lastActionDisplay}
          </div>
        </div>
      )}

      {/* Fallback time nếu currentTurn nhưng !canAct */}
      {!pendingAction && isCurrentTurn && tableState?.state === 1 && !canAct && (
        <div className="absolute min-w-[80px] text-center -top-4 left-1/2 transform -translate-x-1/2">
          <div
            className={`${isTimeOut
                ? "bg-red-600 text-white animate-pulse"
                : "bg-yellow-400 text-yellow-900 animate-pulse"
              } text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 justify-center`}
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
});