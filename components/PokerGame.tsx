"use client";

import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { useFhevm } from "@fhevm/react";
import { useFHEPoker } from "@/hooks/useFHEPoker";
import { PokerTable } from "./PokerTable";
import { CardHand } from "./CardDisplay";
import { BettingControls } from "./BettingControls";
import { Showdown } from "./Showdown";
import { TransactionFlow } from "./TransactionFlow";
import { TableBrowser } from "./TableBrowser";
import { WalletHeader } from "./WalletHeader";
import { FundingRequiredModal } from "./FundingRequiredModal";
import { ChipsManagementModal } from "./ChipsManagementModal";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useSmartAccount } from "../hooks/useSmartAccount";
import Image from "next/image";

const GAME_STATES = ["Waiting for Players", "Countdown", "Playing", "Finished"];
const BETTING_STREETS = ["Pre-Flop", "Flop", "Turn", "River", "Showdown"];

export function PokerGame() {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    ready,
    authenticated,
    login,
    logout,
    ethersSigner,
    ethersProvider,
    eip1193Provider,
    address,
    eoaAddress,
    smartAccountAddress,
    chainId,
    isCorrectChain,
    switchToSepolia,
    isSmartAccount,
    isDeployingSmartAccount,
    checkBalance,
  } = useSmartAccount();

  // Auto-switch to Sepolia on first connection
  useEffect(() => {
    console.log('Chain status:', { authenticated, chainId, isCorrectChain });

    if (authenticated && chainId && !isCorrectChain) {
      console.log(`⚠️ Wrong chain detected: ${chainId}, switching to Sepolia (11155111)...`);
      switchToSepolia();
    } else if (authenticated && chainId && isCorrectChain) {
      console.log(`✅ Already on correct chain: ${chainId}`);
    } else if (authenticated && !chainId) {
      console.log('⏳ Waiting for chain ID...');
    }
  }, [authenticated, chainId, isCorrectChain, switchToSepolia]);

  // Refs for sameChain and sameSigner checks (required by useFHEPoker)
  const sameChain = useRef((chain: number | undefined) => chain === chainId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sameSigner = useRef((signer: any) => signer === ethersSigner);

  const {
    instance: fhevmInstance,
  } = useFhevm({
    provider: eip1193Provider,
    chainId,
    initialMockChains: {}, // No mock chains for production
    enabled: authenticated,
  });

  const poker = useFHEPoker({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider: ethersProvider,
    sameChain,
    sameSigner,
  });

  useEffect(() => {
    console.log('🔍 DEBUG - Poker Contract Info:', {
      isDeployed: poker.isDeployed,
      contractAddress: poker.contractAddress,
      chainId: chainId,
    });
  }, [poker.isDeployed, poker.contractAddress, chainId]);


  // UI States
  const [showCreateTable, setShowCreateTable] = useState(true);
  const [showJoinTable, setShowJoinTable] = useState(false);
  const [currentView, setCurrentView] = useState<"lobby" | "game">("lobby");

  // Auto-switch to game view if user is already seated at a table
  useEffect(() => {
    if (poker.currentTableId && poker.tableState?.isSeated && currentView === "lobby") {
      console.log('User is already seated at table, switching to game view');
      setCurrentView("game");
    }
  }, [poker.currentTableId, poker.tableState?.isSeated, currentView]);

  // Update balances periodically
  useEffect(() => {
    const updateBalances = async () => {
      if (smartAccountAddress && checkBalance) {
        try {
          const balance = await checkBalance();
          setSmartAccountBalance(balance);
        } catch (error) {
          console.error('Failed to get smart account balance:', error);
        }
      }

      if (eoaAddress && ethersProvider) {
        try {
          const balance = await ethersProvider.getBalance(eoaAddress);
          setEoaBalance(balance);
        } catch (error) {
          console.error('Failed to get EOA balance:', error);
        }
      }
    };

    updateBalances();
    const interval = setInterval(updateBalances, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [smartAccountAddress, eoaAddress, checkBalance, ethersProvider]);

  // Deposit function
  const handleDepositToSmartAccount = () => {
    setShowFundingModal(true);
  };
  const [isTableBrowserOpen, setIsTableBrowserOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  // Form states
  const [tableIdInput, setTableIdInput] = useState<string>("");
  const [minBuyInInput, setMinBuyInInput] = useState<string>("0.2");
  const [maxPlayersInput, setMaxPlayersInput] = useState<string>("6");
  const [smallBlindInput, setSmallBlindInput] = useState<string>("0.005");
  const [bigBlindInput, setBigBlindInput] = useState<string>("0.01");
  const [buyInAmountInput, setBuyInAmountInput] = useState<string>("0.2");

  // Funding modal states
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<bigint>(0n);
  const [requiredAmount, setRequiredAmount] = useState<bigint>(0n);

  // Balance states
  const [smartAccountBalance, setSmartAccountBalance] = useState<bigint>(0n);
  const [eoaBalance, setEoaBalance] = useState<bigint>(0n);

  // Chips management modal state
  const [showChipsManagementModal, setShowChipsManagementModal] = useState(false);

  // Use Privy address directly
  const yourAddress = address || "";

  // Debug: Log addresses
  useEffect(() => {
    if (yourAddress) {
      console.log('🔍 Address Debug:', {
        yourAddress,
        smartAccountAddress,
        eoaAddress,
        isSmartAccount,
        players: poker.players,
        playersCount: poker.players.length,
      });
    }
  }, [yourAddress, smartAccountAddress, eoaAddress, isSmartAccount, poker.players]);

  // Responsive detection (mobile + orientation)
  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === "undefined") return;
      setIsMobile(window.innerWidth < 1024);
      const portrait = window.matchMedia && window.matchMedia("(orientation: portrait)").matches;
      setIsPortrait(portrait);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

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
    // Create the table - this waits for the transaction and sets currentTableId
    await poker.createTable(minBuyInInput, parseInt(maxPlayersInput), smallBlindInput, bigBlindInput);
    // WebSocket will automatically refresh when TableCreated event is detected
    console.log('✅ Table created, WebSocket will handle state updates');
  };

  const handleJoinTable = async () => {
    const tableId = BigInt(tableIdInput || poker.currentTableId?.toString() || "0");
    const buyInAmount = ethers.parseEther(buyInAmountInput);

    // Check balance if using smart account
    if (isSmartAccount && smartAccountAddress && checkBalance) {
      const balance = await checkBalance();
      setCurrentBalance(balance);
      setRequiredAmount(buyInAmount);

      if (balance < buyInAmount) {
        console.warn('Insufficient balance for buy-in');
        setShowFundingModal(true);
        return;
      }
    }

    try {
      // Join the table - this waits for the transaction to succeed
      await poker.joinTable(tableId, buyInAmountInput);

      // Transaction succeeded! Switch to game view immediately
      // The WebSocket will refresh the table state automatically
      console.log('✅ Join successful, switching to game view');
      setCurrentView("game");
    } catch (error) {
      console.error('❌ Failed to join table:', error);
      // Don't switch view if join failed
    }
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

  const handleDecryptCommunityCards = async () => {
    if (poker.currentTableId !== undefined) {
      await poker.decryptCommunityCards(poker.currentTableId);
    }
  };

  const buttonClass =
    "inline-flex items-center justify-center rounded-xl bg-black px-4 py-4 font-semibold text-white shadow-sm " +
    "transition-colors duration-200 hover:bg-blue-700 active:bg-blue-800 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  if (!ready || isDeployingSmartAccount) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="mb-8">
            <Image src={'/logo.png'} width={240} height={240} alt="logo" className="mx-auto"/>
            {isDeployingSmartAccount ? (
              <>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <p className="text-xl text-purple-300">Setting up your Smart Account...</p>
                </div>
                <p className="text-sm text-gray-400 mt-3">This will only take a moment</p>
              </>
            ) : (
              <p className="mt-10 text-xl text-gray-300">Loading...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <>
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="text-center">
            <div className="mb-8">
              <Image src={'/logo.png'} width={240} height={240} alt="logo" className="mx-auto"/>
              <p className="text-xl text-gray-300">Fully Homomorphic Encrypted Poker</p>
              {!isCorrectChain && address && (
                <p className="text-sm text-yellow-400 mt-2">⚠️ Please switch to Sepolia network</p>
              )}
            </div>
            <button
              className={buttonClass}
              onClick={login}
            >
              <span className="text-2xl px-8 py-4">Connect Wallet</span>
            </button>
          </div>
        </div>
      </>
    );
  }

  if (poker.isDeployed === false) {
    // Show loading if chainId is not yet available
    if (!chainId) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-xl">Detecting network...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
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

          {!isCorrectChain && (
            <div className="mb-6">
              <button
                onClick={switchToSepolia}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg"
              >
                🔄 Switch to Sepolia Network
              </button>
              <p className="text-sm text-gray-500 mt-2 text-center">Contract is deployed on Sepolia (Chain ID: 11155111)</p>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <p className="text-gray-700 mb-4">
              To deploy the contract on a new network, run:
            </p>
            <div className="bg-black rounded-lg p-4 font-mono text-sm">
              <p className="text-gray-400 italic mb-2"># from packages/fhevm-poker</p>
              <p className="text-green-400">
                npx hardhat deploy --network {chainId === 11155111 ? "sepolia" : chainId === 31337 ? "localhost" : "your-network"}
              </p>
            </div>
          </div>

          <p className="text-center text-gray-600">
            Currently deployed on: <strong>Sepolia (11155111)</strong> and <strong>Local Hardhat (31337)</strong>
          </p>
        </div>
      </div>
    );
  }

  // Game View
  if (currentView === "game") {
    // Show loading or error if data not ready
    if (poker.currentTableId === undefined) {
      console.log('Game view: currentTableId is undefined', {
        currentTableId: poker.currentTableId,
        tableState: poker.tableState,
        message: poker.message
      });
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
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
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
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
      <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        {/* Wallet Header */}
        <WalletHeader
          address={address}
          smartAccountAddress={smartAccountAddress}
          eoaAddress={eoaAddress}
          isSmartAccount={isSmartAccount}
          onLogout={logout}
          chainId={chainId}
          smartAccountBalance={smartAccountBalance}
          eoaBalance={eoaBalance}
          onDepositToSmartAccount={handleDepositToSmartAccount}
        />

        <div className="p-6">
          {/* Top Bar */}
          <div className="max-w-7xl mx-auto mb-6">
            <div className="bg-black/50 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between border border-gray-700">
              <div className="flex items-center gap-4">
                <Image src={'/logo.png'} width={120} height={120} alt="logo"/>
                <div className="h-6 w-px bg-gray-600"></div>
                <div className="text-sm">
                  <span className="text-gray-400">Table #{poker.currentTableId.toString()}</span>
                  <span className="mx-2 text-gray-600">•</span>
                  <span className="text-yellow-400 font-semibold">{GAME_STATES[poker.tableState.state]}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Smart Account Badge */}
                {isSmartAccount && smartAccountAddress && (
                  <div className="px-3 py-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">✨</span>
                      <div>
                        <div className="text-purple-300 text-xs font-semibold">Smart Account</div>
                        <div className="text-purple-400 text-[10px]">{smartAccountAddress.substring(0, 8)}...{smartAccountAddress.substring(38)}</div>
                      </div>
                    </div>
                  </div>
                )}

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

                {/* Chips Management Button */}
                {poker.tableState.isSeated && (
                  <button
                    onClick={() => setShowChipsManagementModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg flex items-center gap-2"
                  >
                    <span className="text-lg">💰</span>
                    <span>Manage Chips</span>
                  </button>
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
          {/* {poker.message && (
            <div className="max-w-7xl mx-auto mb-6">
              <div className={`border-l-4 rounded-lg p-4 backdrop-blur-sm ${poker.message.includes("✅") || poker.message.includes("Success") || poker.message.includes("advanced")
                  ? "bg-green-500/20 border-green-500"
                  : poker.message.includes("⚠️") || poker.message.includes("already")
                    ? "bg-yellow-500/20 border-yellow-500"
                    : poker.message.includes("❌") || poker.message.includes("Failed")
                      ? "bg-red-500/20 border-red-500"
                      : "bg-blue-500/20 border-blue-500"
                }`}>
                <p className={`text-sm font-semibold ${poker.message.includes("✅") || poker.message.includes("Success") || poker.message.includes("advanced")
                    ? "text-green-200"
                    : poker.message.includes("⚠️") || poker.message.includes("already")
                      ? "text-yellow-200"
                      : poker.message.includes("❌") || poker.message.includes("Failed")
                        ? "text-red-200"
                        : "text-blue-200"
                  }`}>{poker.message}</p>
              </div>
            </div>
          )} */}

          {/* Main Game Area with right sidebar */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Indicators + Table + Controls + Debug */}
            <div className="lg:col-span-8 space-y-6">
              {/* Game Status Indicators */}
              <div className="flex justify-center gap-4 mb-10">
                {/* Betting Street Indicator */}
                {poker.communityCards && (
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 rounded-full shadow-lg border-2 border-white/20">
                    <span className="text-2xl">🎴</span>
                    <span className="text-white font-bold text-xl">{BETTING_STREETS[poker.communityCards.currentStreet]}</span>
                  </div>
                )}
                {/* Turn Indicator */}
                {poker.bettingInfo && (
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full shadow-lg border-2 ${poker.bettingInfo.currentPlayer.toLowerCase() === yourAddress.toLowerCase()
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
                    {typeof poker.timeRemaining === 'number' && poker.tableState?.state === 2 && (
                      <div className="ml-2 flex items-center gap-1 bg-black/30 px-2 py-1 rounded-full border border-white/20">
                        <span className="text-xs">⏱️</span>
                        <span className="text-xs text-white font-semibold">
                          {Math.floor((poker.timeRemaining || 0) / 60)}:{String(((poker.timeRemaining || 0) % 60)).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Table */}
              <PokerTable
                players={playerData}
                pot={poker.lastPot || poker.bettingInfo?.pot || BigInt(0)}
                currentBet={poker.bettingInfo?.currentBet || BigInt(0)}
                dealerIndex={poker.tableState?.dealerIndex ? Number(poker.tableState.dealerIndex) : 0}
                yourAddress={yourAddress}
                showYourCards={poker.cards[0]?.clear !== undefined}
                communityCards={
                  poker.decryptedCommunityCards.length > 0
                    ? {
                      currentStreet: poker.communityCards?.currentStreet || 0,
                      flopCard1: poker.decryptedCommunityCards[0] || undefined,
                      flopCard2: poker.decryptedCommunityCards[1] || undefined,
                      flopCard3: poker.decryptedCommunityCards[2] || undefined,
                      turnCard: poker.decryptedCommunityCards[3] || undefined,
                      riverCard: poker.decryptedCommunityCards[4] || undefined,
                    }
                    : poker.communityCards || undefined
                }
                currentStreet={poker.communityCards?.currentStreet}
                onStartGame={handleAdvanceGame}
                isLoading={poker.isLoading}
                tableState={poker.tableState}
              />

              {/* Controls */}
              <div className="space-y-4">
                {isPlaying && (poker.tableState.isSeated || poker.playerState) && !poker.cards[0]?.clear && (
                  <button
                    onClick={handleDecryptCards}
                    disabled={poker.isDecrypting || poker.isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed relative overflow-hidden"
                  >
                    {poker.isDecrypting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Decrypting Your Cards...
                      </span>
                    ) : (
                      "🔓 Decrypt Your Cards"
                    )}
                    {poker.isDecrypting && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                    )}
                  </button>
                )}

                {isPlaying && poker.communityCards && poker.communityCards.currentStreet >= 1 && (
                  (() => {
                    const currentStreet = poker.communityCards.currentStreet;
                    const expectedCards = currentStreet >= 3 ? 5 : currentStreet >= 2 ? 4 : currentStreet >= 1 ? 3 : 0;
                    const decryptedCount = poker.decryptedCommunityCards.filter(c => c !== 0).length;
                    const needsDecryption = decryptedCount < expectedCards;

                    if (!needsDecryption) return null;

                    const streetName = currentStreet === 1 ? "Flop" : currentStreet === 2 ? "Turn" : currentStreet === 3 ? "River" : "Cards";

                    return (
                      <button
                        onClick={handleDecryptCommunityCards}
                        disabled={poker.isDecrypting || poker.isLoading}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed relative overflow-hidden"
                      >
                        {poker.isDecrypting ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Decrypting {streetName}...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            🔓 Decrypt {streetName} ({expectedCards - decryptedCount} new card{expectedCards - decryptedCount > 1 ? 's' : ''})
                          </span>
                        )}
                        {poker.isDecrypting && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                        )}
                      </button>
                    );
                  })()
                )}

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

                {isPlaying && (poker.tableState.isSeated || poker.playerState) && poker.playerState && (
                  <>
                    <div className="bg-black/30 backdrop-blur-sm rounded-xl border border-gray-700 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-white font-semibold">Your Cards</p>
                        {!(poker.cards[0]?.clear !== undefined) && (
                          <span className="text-xs text-yellow-300">🔓 Decrypt to reveal</span>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <CardHand
                          cards={[
                            poker.cards[0]?.clear as number | undefined,
                            poker.cards[1]?.clear as number | undefined,
                          ]}
                          hidden={!(poker.cards[0]?.clear !== undefined)}
                          flip={poker.cards[0]?.clear !== undefined}
                          staggerMs={120}
                        />
                      </div>
                    </div>

                    <BettingControls
                      canAct={isYourTurn && !poker.playerState.hasFolded}
                      currentBet={poker.bettingInfo?.currentBet || BigInt(0)}
                      playerBet={poker.playerState.currentBet}
                      playerChips={poker.playerState.chips}
                      minRaise={BigInt(Math.floor(Number(poker.tableState.minBuyIn) * 0.1))}
                      onFold={() => poker.fold(poker.currentTableId!)}
                      onCheck={() => poker.check(poker.currentTableId!)}
                      onCall={() => {
                        const currentBet = poker.bettingInfo?.currentBet || 0n;
                        const myBet = (typeof poker.playerState === 'object' && poker.playerState?.currentBet) ? poker.playerState.currentBet : 0n;
                        if (myBet >= currentBet) {
                          // Up-to-date state says no bet to call → check instead
                          return poker.check(poker.currentTableId!);
                        }
                        return poker.call(poker.currentTableId!);
                      }}
                      onRaise={(amount) => {
                        // Interpret input as "raise to" total; convert to delta for the contract
                        try {
                          const targetWei = ethers.parseEther(amount);
                          const current = poker.bettingInfo?.currentBet || 0n;
                          const deltaWei = targetWei > current ? targetWei - current : 0n;
                          const deltaEth = ethers.formatEther(deltaWei);
                          poker.raise(poker.currentTableId!, deltaEth);
                        } catch {
                          // Fallback: pass through
                          poker.raise(poker.currentTableId!, amount);
                        }
                      }}
                      isLoading={poker.isLoading}
                    />
                  </>
                )}

                {isPlaying && !poker.playerState && (
                  <div className="bg-yellow-500/20 border-l-4 border-yellow-500 rounded-lg p-4">
                    <p className="text-yellow-200 text-sm font-semibold">
                      ⏳ Loading player state...
                    </p>
                  </div>
                )}
              </div>

              {/* Debug Info */}
              <div className="bg-gray-800/50 rounded-lg p-4 text-xs text-gray-300 space-y-1">
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
                <p><span className="text-gray-500">Community Cards Decrypted:</span> <span className={poker.decryptedCommunityCards.length > 0 ? "text-green-400" : "text-yellow-400"}>{poker.decryptedCommunityCards.length > 0 ? "✅ Yes" : "No"}</span></p>
                {poker.decryptedCommunityCards.length > 0 && (
                  <p className="text-xs text-green-400"><span className="text-gray-500">Decrypted Values:</span> [{poker.decryptedCommunityCards.join(', ')}]</p>
                )}
                {poker.communityCards && (
                  <>
                    <p><span className="text-gray-500">Street:</span> <span className="text-cyan-400 font-bold">{poker.communityCards.currentStreet}</span> ({BETTING_STREETS[poker.communityCards.currentStreet]})</p>
                    <p><span className="text-gray-500">Community Cards (Encrypted):</span></p>
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

              {/* Mobile TransactionFlow */}
              <div className="lg:hidden">
                <TransactionFlow
                  currentAction={poker.currentAction}
                  isLoading={poker.isLoading || poker.isDecrypting}
                  message={poker.message}
                />
              </div>
            </div>

            {/* Right sidebar: Transaction flow */}
            <div className="lg:col-span-4 hidden lg:block">
              <TransactionFlow
                currentAction={poker.currentAction}
                isLoading={poker.isLoading || poker.isDecrypting}
                message={poker.message}
              />
            </div>
          </div>

          {/* Mobile portrait rotate overlay */}
          {isMobile && isPortrait && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8 lg:hidden">
              <div className="text-center text-white">
                <div className="text-6xl mb-4">📱↩️</div>
                <p className="text-xl font-bold">Rotate your phone</p>
                <p className="text-sm text-gray-300 mt-2">For the best experience, view the table in landscape.</p>
              </div>
            </div>
          )}

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
              communityCards={
                poker.decryptedCommunityCards.length > 0
                  ? poker.decryptedCommunityCards.filter(c => c !== 0)
                  : poker.communityCards
                    ? [
                      poker.communityCards.flopCard1,
                      poker.communityCards.flopCard2,
                      poker.communityCards.flopCard3,
                      poker.communityCards.turnCard,
                      poker.communityCards.riverCard,
                    ].filter((c): c is number => c !== undefined && c !== 0)
                    : undefined
              }
              pot={poker.lastPot || poker.bettingInfo?.pot || BigInt(0)}
              allPlayers={playerData}
              onContinue={handleAdvanceGame}
              tableId={poker.currentTableId}
              contractAddress={poker.contractAddress}
              provider={ethersProvider}
            />
          )}
        </div>
      </div>
    );
  }

  // Lobby View
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Wallet Header */}
      <WalletHeader
        address={address}
        smartAccountAddress={smartAccountAddress}
        eoaAddress={eoaAddress}
        isSmartAccount={isSmartAccount}
        onLogout={logout}
        chainId={chainId}
        smartAccountBalance={smartAccountBalance}
        eoaBalance={eoaBalance}
        onDepositToSmartAccount={handleDepositToSmartAccount}
      />

      <div className="p-6 min-h-screen" style={{ backgroundImage: `url(/bg-start.png)`, backgroundSize: '100% 100%' }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <Image src={'/logo.png'} alt="logo" width={240} height={240} className="mx-auto" />
            <div className="mt-6 inline-block items-center gap-2 bg-black/50 backdrop-blur-sm px-6 py-4 rounded-3xl border border-gray-700">
              <p className="text-2xl text-gray-300 mb-2">Fully Homomorphic Encrypted Poker</p>
              <p className="text-gray-400">Your cards stay private, even on the blockchain</p>
            </div>

            {/* Network badge — cố định góc phải */}
            <div className="fixed top-6 right-4 z-50 inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700 shadow-md">
              <div
                className={`w-2 h-2 rounded-full ${chainId === 31337 ? "bg-green-400" : "bg-yellow-400"
                  } animate-pulse`}
              ></div>
              <span className="text-sm text-gray-300">
                {chainId === 31337
                  ? "Connected to Hardhat Local"
                  : `Connected to Chain ${chainId}`}
              </span>
            </div>
          </div>

          {/* Action Tabs */}
          <div className="flex justify-center gap-10 mb-8 flex-wrap">
            <button
              onClick={() => { setShowCreateTable(true); setShowJoinTable(false); }}
              className={`px-8 py-3 bg-black/70 rounded-xl border border-green-500 font-bold transition-all duration-200 ${showCreateTable
                  ? " text-white shadow-lg scale-105"
                  : " text-gray-600 hover:bg-green-600"
                }`}
            >
              Create Table
            </button>
            <button
              onClick={() => { setShowCreateTable(false); setShowJoinTable(true); }}
              className={`px-8 py-3 bg-black/70 rounded-xl border border-green-500 font-bold transition-all duration-200 ${showJoinTable
                  ? " text-white shadow-lg scale-105"
                  : " text-gray-600 hover:bg-green-700"
                }`}
            >
              Join Table
            </button>
            <button
              onClick={() => setIsTableBrowserOpen(true)}
              className="px-8 py-3 rounded-xl border border-green-500 font-bold transition-all duration-200 bg-gradient-to-r from-green-500 to-green-800 text-white shadow-lg hover:scale-105"
            >
              Browse Tables
            </button>
          </div>

          {/* Create Table Form */}
          {showCreateTable && (
            <div className="bg-black/70 rounded-2xl p-8 shadow-2xl max-w-2xl mx-auto">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xl font-semibold text-white mb-2">
                      Min Buy-In (ETH)
                    </label>
                    <input
                      type="text"
                      value={minBuyInInput}
                      onChange={(e) => setMinBuyInInput(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                      placeholder="0.2"
                    />
                    <p className="text-sm text-gray-400 mt-1">Must be ≥ 20× Big Blind</p>
                  </div>
                  <div>
                    <label className="block text-xl font-semibold text-white mb-2">
                      Max Players
                    </label>
                    <input
                      type="number"
                      value={maxPlayersInput}
                      onChange={(e) => setMaxPlayersInput(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                      placeholder="6"
                      min="2"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="block text-xl font-semibold text-white mb-2">
                      Small Blind (ETH)
                    </label>
                    <input
                      type="text"
                      value={smallBlindInput}
                      onChange={(e) => setSmallBlindInput(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                      placeholder="0.005"
                    />
                  </div>
                  <div>
                    <label className="block text-xl font-semibold text-white mb-2">
                      Big Blind (ETH)
                    </label>
                    <input
                      type="text"
                      value={bigBlindInput}
                      onChange={(e) => setBigBlindInput(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                      placeholder="0.01"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateTable}
                  disabled={poker.isLoading || !poker.isDeployed}
                  className="w-1/2 mx-auto block hover:scale-105 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed text-lg"
                  style={{ backgroundImage: `url(/bg-button.png)`, backgroundSize: '100% 100%' }}>
                  {poker.isLoading ? "Creating Table..." : "🎲 Create Table"}
                </button>
              </div>
            </div>
          )}

          {/* Join Table Form */}
          {showJoinTable && (
            <div className="bg-black/70 rounded-2xl p-8 shadow-2xl max-w-2xl mx-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-xl font-semibold text-white mb-2">
                    Table ID
                  </label>
                  <input
                    type="text"
                    value={tableIdInput}
                    onChange={(e) => setTableIdInput(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-semibold"
                    placeholder={poker.currentTableId?.toString() || "Enter table ID"}
                  />
                </div>
                <div>
                  <label className="block text-xl font-semibold text-white mb-2">
                    Buy-In Amount (ETH)
                  </label>
                  <input
                    type="text"
                    value={buyInAmountInput}
                    onChange={(e) => setBuyInAmountInput(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-semibold"
                    placeholder="0.2"
                  />
                  <p className="text-sm text-gray-400 mt-1">Must match or exceed table minimum</p>
                </div>
                <button
                  onClick={handleJoinTable}
                  disabled={poker.isLoading || !poker.isDeployed}
                  className="w-1/2 mx-auto block hover:scale-105 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed text-lg"
                  style={{ backgroundImage: `url(/bg-button.png)`, backgroundSize: '100% 100%' }}>
                  {poker.isLoading ? "Joining Table..." : "🚪 Join Table"}
                </button>
              </div>
            </div>
          )}

          {/* Message Display */}
          {poker.message && (
            <div className="mt-8 max-w-2xl mx-auto">
              <div className={`border-l-4 rounded-lg p-4 backdrop-blur-sm ${poker.message.includes("✅") || poker.message.includes("Success")
                  ? "bg-green-500/50 border-green-500"
                  : poker.message.includes("⚠️") || poker.message.includes("already")
                    ? "bg-yellow-500/50 border-yellow-500"
                    : poker.message.includes("❌") || poker.message.includes("Failed")
                      ? "bg-red-500/50 border-red-500"
                      : "bg-blue-500/50 border-blue-500"
                }`}>
                <p className={`font-semibold ${poker.message.includes("✅") || poker.message.includes("Success")
                    ? "text-white"
                    : poker.message.includes("⚠️") || poker.message.includes("already")
                      ? "text-white"
                      : poker.message.includes("❌") || poker.message.includes("Failed")
                        ? "text-white"
                        : "text-white"
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
          {/* Table Browser Modal */}
          <TableBrowser
            isOpen={isTableBrowserOpen}
            onClose={() => setIsTableBrowserOpen(false)}
            onSelect={(id, minBuyIn) => {
              setShowCreateTable(false);
              setShowJoinTable(true);
              setIsTableBrowserOpen(false);
              setTableIdInput(id.toString());
              // Auto-fill the buy-in amount with the table's minimum buy-in
              setBuyInAmountInput(ethers.formatEther(minBuyIn));
            }}
            contractAddress={poker.contractAddress}
            provider={ethersProvider}
          />

          {/* Funding Required Modal */}
          {isSmartAccount && smartAccountAddress && (
            <FundingRequiredModal
              isOpen={showFundingModal}
              onClose={() => setShowFundingModal(false)}
              smartAccountAddress={smartAccountAddress}
              currentBalance={currentBalance}
              requiredAmount={requiredAmount}
              eoaAddress={eoaAddress}
            />
          )}

          {/* Chips Management Modal */}
          {poker.currentTableId && poker.tableState && (
            <ChipsManagementModal
              isOpen={showChipsManagementModal}
              onClose={() => setShowChipsManagementModal(false)}
              currentChips={typeof poker.playerState === 'object' && poker.playerState?.chips ? poker.playerState.chips : 0n}
              minBuyIn={poker.tableState.minBuyIn}
              onLeaveTable={async () => {
                if (poker.currentTableId) {
                  await poker.leaveTable(poker.currentTableId);
                  setShowChipsManagementModal(false);
                }
              }}
              onWithdrawChips={async (amount: string) => {
                if (poker.currentTableId) {
                  await poker.withdrawChips(poker.currentTableId, amount);
                }
              }}
              onAddChips={async (amount: string) => {
                if (poker.currentTableId) {
                  await poker.addChips(poker.currentTableId, amount);
                }
              }}
              isLoading={poker.isLoading}
              gameState={poker.tableState.state}
            />
          )}
        </div>
      </div>
    </div>
  );
}
