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
            isSmallBlind={players.length >= 2 && index === ((dealerIndex + 1) % players.length)}
            isBigBlind={players.length >= 2 && index === ((dealerIndex + 2) % players.length)}
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
              isSmallBlind={players.length >= 2 && index === ((dealerIndex + 1) % players.length)}
              isBigBlind={players.length >= 2 && index === ((dealerIndex + 2) % players.length)}
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
          <div className="relative bg-gradient-to-br from-gray-800 via-gray-900 to-black rounded-full border-4 border-cyan-500/50 shadow-2xl p-12 min-h-[300px] flex flex-col items-center justify-center overflow-hidden">
            {/* Futuristic grid texture */}
            <div className="absolute inset-0 rounded-full opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: `
                  linear-gradient(to right, cyan 1px, transparent 1px),
                  linear-gradient(to bottom, cyan 1px, transparent 1px)
                `,
                backgroundSize: '30px 30px',
              }}></div>
            </div>

            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10"></div>
            
            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-cyan-500/50"></div>
            <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-cyan-500/50"></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-purple-500/50"></div>
            <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-purple-500/50"></div>
            
            {/* Community Cards */}
            {communityCards && currentStreet > 0 && (
              <div className="relative z-10 mb-4">
                <div className="flex gap-2 justify-center items-center">
                  {/* Flop (3 cards) - shown from street 1 (Flop) onwards */}
                  {currentStreet >= 1 && (
                    <>
                      <Card cardValue={communityCards.flopCard1} dealDelayMs={0} />
                      <Card cardValue={communityCards.flopCard2} dealDelayMs={120} />
                      <Card cardValue={communityCards.flopCard3} dealDelayMs={240} />
                    </>
                  )}
                  {/* Turn (4th card) - shown from street 2 (Turn) onwards */}
                  {currentStreet >= 2 && (
                    <Card cardValue={communityCards.turnCard} dealDelayMs={360} />
                  )}
                  {/* River (5th card) - shown from street 3 (River) onwards */}
                  {currentStreet >= 3 && (
                    <Card cardValue={communityCards.riverCard} dealDelayMs={480} />
                  )}
                </div>
              </div>
            )}
            
            {/* Pot display */}
            <div className="relative z-10 text-center">
              <div className="glass-card rounded-2xl px-8 py-6 border-2 border-cyan-500/50 shadow-xl box-glow">
                <div className="text-cyan-400 text-sm font-bold mb-2 uppercase tracking-wider mono">
                  Pot
                </div>
                <div className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 text-4xl font-bold mb-2 mono">
                  {formatEth(pot)} ETH
                </div>
                {currentBet > BigInt(0) && (
                  <div className="text-purple-300 text-sm mono">
                    Current Bet: {formatEth(currentBet)} ETH
                  </div>
                )}
                
                {/* Chip stack animation with futuristic glow */}
                <div className="flex justify-center gap-1 mt-4">
                  {[...Array(Math.min(5, Math.floor(Number(pot) / 1e17) + 1))].map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 border-2 border-cyan-500 shadow-lg shadow-cyan-500/50"
                      style={{
                        transform: `translateY(${-i * 4}px)`,
                        zIndex: i,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Table edge highlight with neon effect */}
            <div className="absolute inset-0 rounded-full ring-2 ring-inset ring-cyan-500/30 animate-pulse"></div>
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
              isSmallBlind={players.length >= 2 && index === ((dealerIndex + 1) % players.length)}
              isBigBlind={players.length >= 2 && index === ((dealerIndex + 2) % players.length)}
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
            isSmallBlind={players.length >= 2 && index === ((dealerIndex + 1) % players.length)}
            isBigBlind={players.length >= 2 && index === ((dealerIndex + 2) % players.length)}
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

