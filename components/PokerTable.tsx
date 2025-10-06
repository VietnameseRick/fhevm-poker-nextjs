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
  currentStreet: number; // 0=Preflop, 1=Flop, 2=Turn, 3=River, 4=Showdown
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
}: PokerTableProps) {
  const formatEth = (wei: bigint) => {
    const eth = Number(wei) / 1e18;
    return eth.toFixed(4);
  };


  // Position players around the table (max 6 players for good UX)
  const getPlayerPosition = (index: number, total: number): "top" | "left" | "right" | "bottom" => {
    // Find your position and make it bottom
    const yourIndex = players.findIndex(p => p.address.toLowerCase() === yourAddress?.toLowerCase());
    const relativeIndex = (index - yourIndex + total) % total;
    
    if (total <= 2) {
      return relativeIndex === 0 ? "bottom" : "top";
    } else if (total <= 4) {
      const positions: Array<"top" | "left" | "right" | "bottom"> = ["bottom", "right", "top", "left"];
      return positions[relativeIndex] || "top";
    } else {
      const positions: Array<"top" | "left" | "right" | "bottom"> = ["bottom", "right", "top", "top", "left", "left"];
      return positions[relativeIndex] || "top";
    }
  };

  // Group players by position for layout
  const playersByPosition = {
    top: [] as Array<{ player: Player; index: number }>,
    left: [] as Array<{ player: Player; index: number }>,
    right: [] as Array<{ player: Player; index: number }>,
    bottom: [] as Array<{ player: Player; index: number }>,
  };

  players.forEach((player, index) => {
    const position = getPlayerPosition(index, players.length);
    playersByPosition[position].push({ player, index });
  });

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      {/* Top Players */}
      <div className="flex justify-center gap-4 mb-8">
        {playersByPosition.top.map(({ player, index }) => (
          <PlayerSeat
            key={player.address}
            address={player.address}
            chips={player.chips}
            currentBet={player.currentBet}
            isDealer={index === dealerIndex}
            isCurrentTurn={player.isCurrentPlayer}
            hasFolded={player.hasFolded}
            isYou={player.address.toLowerCase() === yourAddress?.toLowerCase()}
            cards={player.cards}
            showCards={player.address.toLowerCase() === yourAddress?.toLowerCase() && showYourCards}
            position="top"
          />
        ))}
      </div>

      {/* Middle Section: Left Players, Table, Right Players */}
      <div className="flex items-center justify-between gap-4 mb-8">
        {/* Left Players */}
        <div className="flex flex-col gap-4">
          {playersByPosition.left.map(({ player, index }) => (
            <PlayerSeat
              key={player.address}
              address={player.address}
              chips={player.chips}
              currentBet={player.currentBet}
              isDealer={index === dealerIndex}
              isCurrentTurn={player.isCurrentPlayer}
              hasFolded={player.hasFolded}
              isYou={player.address.toLowerCase() === yourAddress?.toLowerCase()}
              cards={player.cards}
              showCards={player.address.toLowerCase() === yourAddress?.toLowerCase() && showYourCards}
              position="left"
            />
          ))}
        </div>

        {/* Poker Table (Center) */}
        <div className="flex-1 min-w-[400px]">
          <div className="relative bg-gradient-to-br from-green-700 via-green-800 to-green-900 rounded-full border-8 border-amber-900 shadow-2xl p-12 min-h-[300px] flex flex-col items-center justify-center">
            {/* Table felt texture */}
            <div className="absolute inset-0 rounded-full opacity-10 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent)]"></div>
            
            {/* Community Cards */}
            {communityCards && currentStreet > 0 && (
              <div className="relative z-10 mb-4">
                <div className="flex gap-2 justify-center items-center">
                  {/* Flop (3 cards) - shown from street 1 (Flop) onwards */}
                  {currentStreet >= 1 && (
                    <>
                      <Card cardValue={communityCards.flopCard1} className="animate-in fade-in slide-in-from-top-4 duration-300" />
                      <Card cardValue={communityCards.flopCard2} className="animate-in fade-in slide-in-from-top-4 duration-300 delay-100" />
                      <Card cardValue={communityCards.flopCard3} className="animate-in fade-in slide-in-from-top-4 duration-300 delay-200" />
                    </>
                  )}
                  {/* Turn (4th card) - shown from street 2 (Turn) onwards */}
                  {currentStreet >= 2 && (
                    <Card cardValue={communityCards.turnCard} className="animate-in fade-in slide-in-from-top-4 duration-300 delay-300" />
                  )}
                  {/* River (5th card) - shown from street 3 (River) onwards */}
                  {currentStreet >= 3 && (
                    <Card cardValue={communityCards.riverCard} className="animate-in fade-in slide-in-from-top-4 duration-300 delay-400" />
                  )}
                </div>
              </div>
            )}
            
            {/* Pot display */}
            <div className="relative z-10 text-center">
              <div className="bg-black/40 backdrop-blur-sm rounded-2xl px-8 py-6 border-2 border-yellow-400 shadow-xl">
                <div className="text-yellow-400 text-sm font-semibold mb-2 uppercase tracking-wider">
                  Pot
                </div>
                <div className="text-white text-4xl font-bold mb-2">
                  {formatEth(pot)} ETH
                </div>
                {currentBet > BigInt(0) && (
                  <div className="text-yellow-300 text-sm">
                    Current Bet: {formatEth(currentBet)} ETH
                  </div>
                )}
                
                {/* Chip stack animation */}
                <div className="flex justify-center gap-1 mt-4">
                  {[...Array(Math.min(5, Math.floor(Number(pot) / 1e17) + 1))].map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border-2 border-yellow-700 shadow-lg"
                      style={{
                        transform: `translateY(${-i * 4}px)`,
                        zIndex: i,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Table edge highlight */}
            <div className="absolute inset-0 rounded-full ring-2 ring-inset ring-green-600/50"></div>
          </div>
        </div>

        {/* Right Players */}
        <div className="flex flex-col gap-4">
          {playersByPosition.right.map(({ player, index }) => (
            <PlayerSeat
              key={player.address}
              address={player.address}
              chips={player.chips}
              currentBet={player.currentBet}
              isDealer={index === dealerIndex}
              isCurrentTurn={player.isCurrentPlayer}
              hasFolded={player.hasFolded}
              isYou={player.address.toLowerCase() === yourAddress?.toLowerCase()}
              cards={player.cards}
              showCards={player.address.toLowerCase() === yourAddress?.toLowerCase() && showYourCards}
              position="right"
            />
          ))}
        </div>
      </div>

      {/* Bottom Players (You) */}
      <div className="flex justify-center gap-4">
        {playersByPosition.bottom.map(({ player, index }) => (
          <PlayerSeat
            key={player.address}
            address={player.address}
            chips={player.chips}
            currentBet={player.currentBet}
            isDealer={index === dealerIndex}
            isCurrentTurn={player.isCurrentPlayer}
            hasFolded={player.hasFolded}
            isYou={player.address.toLowerCase() === yourAddress?.toLowerCase()}
            cards={player.cards}
            showCards={player.address.toLowerCase() === yourAddress?.toLowerCase() && showYourCards}
            position="bottom"
          />
        ))}
      </div>
    </div>
  );
}

