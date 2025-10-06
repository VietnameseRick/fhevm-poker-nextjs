"use client";

import { useState, useEffect } from "react";
import { useFhevm } from "@fhevm/react";
import { useFHEPoker } from "@/hooks/useFHEPoker";
import { PokerTable } from "./PokerTable";
import { BettingControls } from "./BettingControls";
import { Showdown } from "./Showdown";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner";

const GAME_STATES = ["Waiting for Players", "Countdown", "Playing", "Finished"];
const BETTING_STREETS = ["Pre-Flop", "Flop", "Turn", "River", "Showdown"];

export function PokerGame() {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const poker = useFHEPoker({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  // UI States
  const [showCreateTable, setShowCreateTable] = useState(true);
  const [showJoinTable, setShowJoinTable] = useState(false);
  const [currentView, setCurrentView] = useState<"lobby" | "game">("lobby");

  // Form states
  const [tableIdInput, setTableIdInput] = useState<string>("");
  const [minBuyInInput, setMinBuyInInput] = useState<string>("0.2");
  const [maxPlayersInput, setMaxPlayersInput] = useState<string>("6");
  const [smallBlindInput, setSmallBlindInput] = useState<string>("0.005");
  const [bigBlindInput, setBigBlindInput] = useState<string>("0.01");
  const [buyInAmountInput, setBuyInAmountInput] = useState<string>("0.2");

  const [yourAddress, setYourAddress] = useState<string>("");

  useEffect(() => {
    if (ethersSigner) {
      ethersSigner.getAddress().then(setYourAddress);
    }
  }, [ethersSigner]);

  // Auto-navigate to game view when game state changes
  useEffect(() => {
    if (poker.currentTableId === undefined || !poker.tableState || !yourAddress) return;

    // Check if user is actually in the players list (more reliable than isSeated)
    const isInGame = poker.players.some(
      addr => addr.toLowerCase() === yourAddress.toLowerCase()
    );

    if (isInGame && currentView === "lobby") {
      // Auto-navigate to game view when:
      // 1. Game is playing (state 2)
      // 2. Game is in countdown (state 1) - so player can see the table
      const gameState = poker.tableState?.state;
      if (gameState === 2 || gameState === 1) {
        setCurrentView("game");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poker.currentTableId, poker.tableState?.state, poker.players, yourAddress, currentView]);

  const handleCreateTable = async () => {
    await poker.createTable(minBuyInInput, parseInt(maxPlayersInput), smallBlindInput, bigBlindInput);
    // After creating, refresh multiple times to ensure update
    setTimeout(() => {
      if (poker.currentTableId) {
        poker.refreshTableState(poker.currentTableId);
      }
    }, 500);
    setTimeout(() => {
      if (poker.currentTableId) {
        poker.refreshTableState(poker.currentTableId);
      }
    }, 2000);
  };

  const handleJoinTable = async () => {
    const tableId = BigInt(tableIdInput || poker.currentTableId?.toString() || "0");
    await poker.joinTable(tableId, buyInAmountInput);
    // After joining, refresh multiple times to ensure update
    setTimeout(() => poker.refreshTableState(tableId), 500);
    setTimeout(() => poker.refreshTableState(tableId), 1500);
    setTimeout(() => poker.refreshTableState(tableId), 3000);
  };

  const handleAdvanceGame = async () => {
    if (poker.currentTableId !== undefined) {
      await poker.advanceGame(poker.currentTableId);
      // Refresh and navigate after a short delay
      setTimeout(async () => {
        await poker.refreshTableState(poker.currentTableId!);
        // Force navigate to game view
        setCurrentView("game");
      }, 1000);
    }
  };

  const handleDecryptCards = async () => {
    if (poker.currentTableId !== undefined) {
      await poker.decryptCards(poker.currentTableId);
    }
  };

  const buttonClass =
    "inline-flex items-center justify-center rounded-xl bg-black px-4 py-4 font-semibold text-white shadow-sm " +
    "transition-colors duration-200 hover:bg-blue-700 active:bg-blue-800 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold text-white mb-4">🎰</h1>
            <h1 className="text-5xl font-bold text-white mb-2">FHE Poker</h1>
            <p className="text-xl text-gray-300">Fully Homomorphic Encrypted Poker</p>
          </div>
          <button
            className={buttonClass}
            disabled={isConnected}
            onClick={connect}
          >
            <span className="text-2xl px-8 py-4">Connect to MetaMask</span>
          </button>
        </div>
      </div>
    );
  }

  if (poker.isDeployed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <div className="max-w-4xl bg-white rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Contract Not Deployed</h2>
            <p className="text-lg text-gray-600">
              FHEPoker.sol is not deployed on Chain ID: {chainId}
              {chainId === 11155111 && " (Sepolia)"}
              {chainId === 31337 && " (Hardhat Local)"}
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <p className="text-gray-700 mb-4">
              To deploy the contract, run the following command:
            </p>
            <div className="bg-black rounded-lg p-4 font-mono text-sm">
              <p className="text-gray-400 italic mb-2"># from packages/fhevm-poker</p>
              <p className="text-green-400">
                npx hardhat deploy --network {chainId === 11155111 ? "sepolia" : chainId === 31337 ? "localhost" : "your-network"}
              </p>
            </div>
          </div>

          <p className="text-center text-gray-600">
            Or switch to a network where the contract is already deployed using MetaMask.
          </p>
        </div>
      </div>
    );
  }

  // Game View
  if (currentView === "game") {
    // Show loading or error if data not ready
    if (poker.currentTableId === undefined) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="text-center">
            <p className="text-white text-xl mb-4">⚠️ No table selected</p>
            <button
              onClick={() => setCurrentView("lobby")}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      );
    }

    if (!poker.tableState) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-white text-xl mb-4">Loading table state...</p>
            <p className="text-gray-400 text-sm mb-4">Table #{poker.currentTableId.toString()}</p>
            <button
              onClick={() => poker.refreshTableState(poker.currentTableId!)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              🔄 Retry
            </button>
          </div>
        </div>
      );
    }
    const playerData = poker.players.map((address) => {
      // Get betting state for this specific player from allPlayersBettingState
      const playerBettingState = poker.allPlayersBettingState[address.toLowerCase()];
      
      return {
        address,
        chips: playerBettingState?.chips || BigInt(0),
        currentBet: playerBettingState?.currentBet || BigInt(0),
        hasFolded: playerBettingState?.hasFolded || false,
        isCurrentPlayer: poker.bettingInfo
          ? poker.bettingInfo.currentPlayer.toLowerCase() === address.toLowerCase()
          : false,
        cards: address.toLowerCase() === yourAddress.toLowerCase()
          ? [poker.cards[0]?.clear, poker.cards[1]?.clear]
          : undefined,
      };
    });

    const isYourTurn = (poker.playerState && typeof poker.playerState === 'object' && poker.playerState.isCurrentPlayer) || false;
    const isPlaying = poker.tableState?.state === 2;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        {/* Top Bar */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between border border-gray-700">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-white">🎰 FHE Poker</h1>
              <div className="h-6 w-px bg-gray-600"></div>
              <div className="text-sm">
                <span className="text-gray-400">Table #{poker.currentTableId.toString()}</span>
                <span className="mx-2 text-gray-600">•</span>
                <span className="text-yellow-400 font-semibold">{GAME_STATES[poker.tableState.state]}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* WebSocket Connection Status */}
              {poker.isConnected ? (
                <div className="px-3 py-1 bg-green-500/20 border border-green-500 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm font-semibold">Live</span>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-1 bg-yellow-500/20 border border-yellow-500 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-yellow-400 text-sm font-semibold">Polling</span>
                  </div>
                </div>
              )}
              
              {chainId === 31337 && (
                <div className="px-3 py-1 bg-blue-500/20 border border-blue-500 rounded-lg">
                  <span className="text-blue-400 text-sm font-semibold">Hardhat Local</span>
                </div>
              )}
              {chainId === 11155111 && (
                <div className="px-3 py-1 bg-purple-500/20 border border-purple-500 rounded-lg">
                  <span className="text-purple-400 text-sm font-semibold">Sepolia Testnet</span>
                </div>
              )}
              <button
                onClick={() => setCurrentView("lobby")}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                Leave Table
              </button>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {poker.message && (
          <div className="max-w-7xl mx-auto mb-6">
            <div className={`border-l-4 rounded-lg p-4 backdrop-blur-sm ${
              poker.message.includes("✅") || poker.message.includes("Success") || poker.message.includes("advanced")
                ? "bg-green-500/20 border-green-500"
                : poker.message.includes("⚠️") || poker.message.includes("already")
                ? "bg-yellow-500/20 border-yellow-500"
                : poker.message.includes("❌") || poker.message.includes("Failed")
                ? "bg-red-500/20 border-red-500"
                : "bg-blue-500/20 border-blue-500"
            }`}>
              <p className={`text-sm font-semibold ${
                poker.message.includes("✅") || poker.message.includes("Success") || poker.message.includes("advanced")
                  ? "text-green-200"
                  : poker.message.includes("⚠️") || poker.message.includes("already")
                  ? "text-yellow-200"
                  : poker.message.includes("❌") || poker.message.includes("Failed")
                  ? "text-red-200"
                  : "text-blue-200"
              }`}>{poker.message}</p>
            </div>
          </div>
        )}

        {/* Main Game Area */}
        <div className="max-w-7xl mx-auto">
          {/* Game Status Indicators */}
          <div className="mb-6 flex justify-center gap-4">
            {/* Betting Street Indicator */}
            {poker.communityCards && (
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 rounded-full shadow-lg border-2 border-white/20">
                <span className="text-2xl">🎴</span>
                <span className="text-white font-bold text-xl">{BETTING_STREETS[poker.communityCards.currentStreet]}</span>
              </div>
            )}
            
            {/* Turn Indicator */}
            {poker.bettingInfo && (
              <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full shadow-lg border-2 ${
                poker.bettingInfo.currentPlayer.toLowerCase() === yourAddress.toLowerCase()
                  ? 'bg-gradient-to-r from-green-600 to-green-700 border-green-400 animate-pulse'
                  : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-400'
              }`}>
                <span className="text-2xl">
                  {poker.bettingInfo.currentPlayer.toLowerCase() === yourAddress.toLowerCase() ? '👉' : '⏳'}
                </span>
                <div className="text-white">
                  <div className="font-bold text-sm">
                    {poker.bettingInfo.currentPlayer.toLowerCase() === yourAddress.toLowerCase() 
                      ? "YOUR TURN!" 
                      : "Waiting..."}
                  </div>
                  <div className="text-xs opacity-90">
                    {poker.bettingInfo.currentPlayer.substring(0, 10)}...
                  </div>
                </div>
              </div>
            )}
          </div>

          <PokerTable
            players={playerData}
            pot={poker.bettingInfo?.pot || BigInt(0)}
            currentBet={poker.bettingInfo?.currentBet || BigInt(0)}
            dealerIndex={0}
            yourAddress={yourAddress}
            showYourCards={poker.cards[0]?.clear !== undefined}
            communityCards={poker.communityCards}
            currentStreet={poker.communityCards?.currentStreet}
          />

          {/* Debug Info */}
          <div className="mt-4 max-w-2xl mx-auto bg-gray-800/50 rounded-lg p-4 text-xs text-gray-300 space-y-1">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
              <p className="font-bold text-white">Debug Info</p>
              <button
                onClick={() => poker.refreshTableState(poker.currentTableId!)}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs"
              >
                🔄 Force Refresh
              </button>
            </div>
            <p>
              <span className="text-gray-500">Game State:</span>{" "}
              <span className={poker.tableState.state === 2 ? "text-green-400 font-bold" : "text-yellow-400"}>
                {poker.tableState.state} ({GAME_STATES[poker.tableState.state]})
              </span>
            </p>
            <p>
              <span className="text-gray-500">WebSocket:</span>{" "}
              <span className={poker.isConnected ? "text-green-400" : "text-yellow-400"}>
                {poker.isConnected ? "✅ Connected" : "⚠️ Polling Only"}
              </span>
            </p>
            <p className={poker.tableState.isSeated ? "text-green-400" : "text-red-400"}>
              <span className="text-gray-500">Is Seated (contract):</span> {poker.tableState.isSeated ? "Yes" : "No"}
            </p>
            <p className={poker.players.some(p => p.toLowerCase() === yourAddress.toLowerCase()) ? "text-green-400" : "text-red-400"}>
              <span className="text-gray-500">In Players List:</span>{" "}
              {poker.players.some(p => p.toLowerCase() === yourAddress.toLowerCase()) ? "Yes" : "No"}
            </p>
            <p><span className="text-gray-500">Total Players:</span> {poker.players.length}</p>
            <p><span className="text-gray-500">Is Playing:</span> {isPlaying ? "Yes" : "No"}</p>
            <p><span className="text-gray-500">Player State Loaded:</span> {poker.playerState ? "Yes" : "No"}</p>
            <p><span className="text-gray-500">Cards Decrypted:</span> {poker.cards[0]?.clear !== undefined ? "Yes" : "No"}</p>
            {poker.communityCards && (
              <>
                <p><span className="text-gray-500">Street:</span> <span className="text-cyan-400 font-bold">{poker.communityCards.currentStreet}</span> ({BETTING_STREETS[poker.communityCards.currentStreet]})</p>
                <p><span className="text-gray-500">Community Cards:</span></p>
                <div className="ml-4 space-y-0.5">
                  <p className="text-xs">
                    <span className="text-gray-500">Flop:</span> {poker.communityCards.flopCard1}, {poker.communityCards.flopCard2}, {poker.communityCards.flopCard3}
                  </p>
                  <p className="text-xs">
                    <span className="text-gray-500">Turn:</span> {poker.communityCards.turnCard !== undefined ? poker.communityCards.turnCard : 'Not dealt'}
                  </p>
                  <p className="text-xs">
                    <span className="text-gray-500">River:</span> {poker.communityCards.riverCard !== undefined ? poker.communityCards.riverCard : 'Not dealt'}
                  </p>
                </div>
              </>
            )}
            {poker.playerState && (
              <>
                <p><span className="text-gray-500">Your Turn:</span> {poker.playerState.isCurrentPlayer ? "✅ Yes" : "No"}</p>
                <p><span className="text-gray-500">Has Folded:</span> {poker.playerState.hasFolded ? "Yes" : "No"}</p>
                <p><span className="text-gray-500">Your Chips:</span> {(Number(poker.playerState.chips) / 1e18).toFixed(4)} ETH</p>
                <p><span className="text-gray-500">Your Bet:</span> {(Number(poker.playerState.currentBet) / 1e18).toFixed(4)} ETH</p>
              </>
            )}
          </div>

          {/* Game Controls */}
          <div className="mt-8 max-w-2xl mx-auto space-y-4">
            {/* Decrypt Cards Button - Use playerState as proof of being seated */}
            {isPlaying && (poker.tableState.isSeated || poker.playerState) && !poker.cards[0]?.clear && (
              <button
                onClick={handleDecryptCards}
                disabled={poker.isDecrypting || poker.isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed"
              >
                {poker.isDecrypting ? "🔓 Decrypting Your Cards..." : "🔓 Decrypt Your Cards"}
              </button>
            )}

            {/* Advance Game Button */}
            {(poker.tableState.state === 1 || poker.tableState.state === 3) && (
              <div className="space-y-2">
                <button
                  onClick={handleAdvanceGame}
                  disabled={poker.isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed"
                >
                  {poker.isLoading ? "Processing..." : poker.tableState.state === 1 ? "🚀 Start Game" : "🔄 Start New Round"}
                </button>
                <p className="text-center text-sm text-gray-400">
                  Game will take you to the table automatically
                </p>
              </div>
            )}

            {/* Betting Controls - Use playerState as proof of being seated */}
            {isPlaying && (poker.tableState.isSeated || poker.playerState) && poker.playerState && (
              <BettingControls
                canAct={isYourTurn && !poker.playerState.hasFolded}
                currentBet={poker.bettingInfo?.currentBet || BigInt(0)}
                playerBet={poker.playerState.currentBet}
                playerChips={poker.playerState.chips}
                minRaise={BigInt(Math.floor(Number(poker.tableState.minBuyIn) * 0.1))}
                onFold={() => poker.fold(poker.currentTableId!)}
                onCheck={() => poker.check(poker.currentTableId!)}
                onCall={() => poker.call(poker.currentTableId!)}
                onRaise={(amount) => poker.raise(poker.currentTableId!, amount)}
                isLoading={poker.isLoading}
              />
            )}

            {/* No Controls Message */}
            {isPlaying && !poker.playerState && (
              <div className="bg-yellow-500/20 border-l-4 border-yellow-500 rounded-lg p-4">
                <p className="text-yellow-200 text-sm font-semibold">
                  ⏳ Loading player state...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Showdown Overlay - Show when game is finished */}
        {poker.tableState.state === 3 && poker.tableState.winner && (
          <Showdown
            winner={poker.tableState.winner}
            myAddress={yourAddress}
            myCards={
              poker.cards[0]?.clear !== undefined && poker.cards[1]?.clear !== undefined
                ? [poker.cards[0].clear, poker.cards[1].clear]
                : undefined
            }
            pot={poker.bettingInfo.pot}
            allPlayers={playerData}
            onContinue={handleAdvanceGame}
          />
        )}
      </div>
    );
  }

  // Lobby View
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block bg-gradient-to-br from-purple-600 to-blue-600 rounded-full p-6 mb-6 shadow-2xl">
            <span className="text-6xl">🎰</span>
          </div>
          <h1 className="text-6xl font-bold text-white mb-4">FHE Poker</h1>
          <p className="text-2xl text-gray-300 mb-2">Fully Homomorphic Encrypted Poker</p>
          <p className="text-gray-400">Your cards stay private, even on the blockchain</p>
          
          {/* Network Badge */}
          <div className="mt-4 inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700">
            <div className={`w-2 h-2 rounded-full ${chainId === 31337 ? "bg-green-400" : "bg-yellow-400"} animate-pulse`}></div>
            <span className="text-sm text-gray-300">
              {chainId === 31337 ? "Connected to Hardhat Local" : `Connected to Chain ${chainId}`}
            </span>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => { setShowCreateTable(true); setShowJoinTable(false); }}
            className={`px-8 py-3 rounded-xl font-bold transition-all duration-200 ${
              showCreateTable
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg scale-105"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Create Table
          </button>
          <button
            onClick={() => { setShowCreateTable(false); setShowJoinTable(true); }}
            className={`px-8 py-3 rounded-xl font-bold transition-all duration-200 ${
              showJoinTable
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg scale-105"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Join Table
          </button>
        </div>

        {/* Create Table Form */}
        {showCreateTable && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-700 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Create New Table</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Min Buy-In (ETH)
                  </label>
                  <input
                    type="text"
                    value={minBuyInInput}
                    onChange={(e) => setMinBuyInInput(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                    placeholder="0.2"
                  />
                  <p className="text-xs text-gray-400 mt-1">Must be ≥ 20× Big Blind</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Max Players
                  </label>
                  <input
                    type="number"
                    value={maxPlayersInput}
                    onChange={(e) => setMaxPlayersInput(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                    placeholder="6"
                    min="2"
                    max="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Small Blind (ETH)
                  </label>
                  <input
                    type="text"
                    value={smallBlindInput}
                    onChange={(e) => setSmallBlindInput(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                    placeholder="0.005"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Big Blind (ETH)
                  </label>
                  <input
                    type="text"
                    value={bigBlindInput}
                    onChange={(e) => setBigBlindInput(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                    placeholder="0.01"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateTable}
                disabled={poker.isLoading || !poker.isDeployed}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed text-lg"
              >
                {poker.isLoading ? "Creating Table..." : "🎲 Create Table"}
              </button>
            </div>
          </div>
        )}

        {/* Join Table Form */}
        {showJoinTable && (
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 shadow-2xl border border-gray-700 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Join Existing Table</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Table ID
                </label>
                <input
                  type="text"
                  value={tableIdInput}
                  onChange={(e) => setTableIdInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-semibold"
                  placeholder={poker.currentTableId?.toString() || "Enter table ID"}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Buy-In Amount (ETH)
                </label>
                <input
                  type="text"
                  value={buyInAmountInput}
                  onChange={(e) => setBuyInAmountInput(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-semibold"
                  placeholder="0.2"
                />
                <p className="text-xs text-gray-400 mt-1">Must match or exceed table minimum</p>
              </div>
              <button
                onClick={handleJoinTable}
                disabled={poker.isLoading || !poker.isDeployed}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed text-lg"
              >
                {poker.isLoading ? "Joining Table..." : "🚪 Join Table"}
              </button>
            </div>
          </div>
        )}

        {/* Message Display */}
        {poker.message && (
          <div className="mt-8 max-w-2xl mx-auto">
            <div className={`border-l-4 rounded-lg p-4 backdrop-blur-sm ${
              poker.message.includes("✅") || poker.message.includes("Success") 
                ? "bg-green-500/20 border-green-500"
                : poker.message.includes("⚠️") || poker.message.includes("already")
                ? "bg-yellow-500/20 border-yellow-500"
                : poker.message.includes("❌") || poker.message.includes("Failed")
                ? "bg-red-500/20 border-red-500"
                : "bg-blue-500/20 border-blue-500"
            }`}>
              <p className={`font-semibold ${
                poker.message.includes("✅") || poker.message.includes("Success")
                  ? "text-green-200"
                  : poker.message.includes("⚠️") || poker.message.includes("already")
                  ? "text-yellow-200"
                  : poker.message.includes("❌") || poker.message.includes("Failed")
                  ? "text-red-200"
                  : "text-blue-200"
              }`}>{poker.message}</p>
            </div>
          </div>
        )}

        {/* Current Table Info (if any) */}
        {poker.currentTableId !== undefined && (
          <div className="mt-8 max-w-2xl mx-auto bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
            <h3 className="text-xl font-bold text-white mb-4">📍 Your Current Table</h3>
            <div className="space-y-2 text-gray-300">
              <p><span className="text-gray-400">Table ID:</span> <span className="font-bold text-white">{poker.currentTableId.toString()}</span></p>
              {poker.tableState && (
                <>
                  <p><span className="text-gray-400">Status:</span> <span className="font-bold text-yellow-400">{GAME_STATES[poker.tableState.state]}</span></p>
                  <p>
                    <span className="text-gray-400">Players:</span>{" "}
                    <span className="font-bold text-white text-lg">
                      {poker.tableState.numPlayers.toString()}/{poker.tableState.maxPlayers.toString()}
                    </span>
                    <span className="ml-2 text-xs text-gray-400">(Live: {poker.players.length})</span>
                  </p>
                  {poker.tableState.state === 1 && (
                    <div className="mt-3 pt-3 border-t border-purple-500/30">
                      <p className="text-yellow-300 text-sm font-semibold">⏱️ Countdown in progress...</p>
                      <p className="text-gray-400 text-xs mt-1">Game will start automatically or you can advance it manually</p>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
              {/* Advance Game Button in Lobby */}
              {poker.tableState && (poker.tableState.state === 1 || poker.tableState.state === 3) && (
                <div className="space-y-2">
                  <button
                    onClick={handleAdvanceGame}
                    disabled={poker.isLoading}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    {poker.isLoading ? "Processing..." : poker.tableState.state === 1 ? "🚀 Start Game Now" : "🔄 Start New Round"}
                  </button>
                  <p className="text-center text-xs text-gray-400">
                    Will take you to the table after starting
                  </p>
                </div>
              )}
              
              {/* Go to Table Button - Show if player is in game */}
              {(poker.tableState?.isSeated || poker.players.some(p => p.toLowerCase() === yourAddress.toLowerCase())) && (
                <button
                  onClick={() => setCurrentView("game")}
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg"
                >
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl">🎮</span>
                    <div className="text-left">
                      <div className="font-bold">
                        {poker.tableState?.state === 2 ? "Join Table (Game In Progress!)" : 
                         poker.tableState?.state === 1 ? "View Table (Countdown)" : 
                         "Go to Table"}
                      </div>
                      <div className="text-xs opacity-90">Click if stuck in lobby</div>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
