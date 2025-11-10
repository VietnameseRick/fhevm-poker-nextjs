"use client";

/**
 * FHE Poker Game Component
 * 
 * Copyright (c) 2025 0xDRick (Tra Anh Khoi)
 * Licensed under Business Source License 1.1 (see LICENSE-BSL)
 */

import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { ethers } from "ethers";
import { useFhevm } from "@fhevm/react";
import { useFHEPoker } from "@/hooks/useFHEPoker";
import { useWinnerPolling } from "@/hooks/useWinnerPolling";
import { PokerTable } from "./PokerTable";
import { BettingControls } from "./BettingControls";
import { WalletHeader } from "./WalletHeader";
import { CyberpunkLoader } from "./CyberpunkLoader";
import { TransactionConfirmModal } from "./TransactionConfirmModal";
import { useInMemoryStorage } from "../hooks/useInMemoryStorage";
import { useSmartAccount } from "../hooks/useSmartAccount";
import { usePokerStore } from "@/stores/pokerStore";
import { useRouter } from "next/navigation";
import Image from "next/image";

const TableBrowser = lazy(() => import("./TableBrowser").then(mod => ({ default: mod.TableBrowser })));
const FundingRequiredModal = lazy(() => import("./FundingRequiredModal").then(mod => ({ default: mod.FundingRequiredModal })));
const ChipsManagementModal = lazy(() => import("./ChipsManagementModal").then(mod => ({ default: mod.ChipsManagementModal })));
// const ShuffleAnimation = lazy(() => import("./ShuffleAnimation").then(mod => ({ default: mod.ShuffleAnimation }))); // Temporarily disabled
const Showdown = lazy(() => import("./Showdown").then(mod => ({ default: mod.Showdown })));

const GAME_STATES = ["Waiting for Players", "Playing", "Finished"];
const BETTING_STREETS = ["Pre-Flop", "Flop", "Turn", "River", "Showdown"];

export function PokerGame() {
  const router = useRouter();
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

  useEffect(() => {
    if (authenticated && chainId && !isCorrectChain) {
      console.log(`⚠️ Wrong chain detected: ${chainId}, switching to Sepolia`);
      switchToSepolia();
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
    eip1193Provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider: ethersProvider,
    sameChain,
    sameSigner,
    smartAccountAddress, // Pass smart account address for FHEVM signature
    eoaAddress, // Pass EOA address for decryption
  });

  // Get cached showdown data from store (reactive)
  const cachedShowdownData = usePokerStore(state => state.cachedShowdownData);

  // Poll for winner determination at showdown
  const { isWaitingForWinner } = useWinnerPolling(
    poker.currentTableId || null,
    poker.communityCards?.currentStreet,
    poker.tableState?.state === 1 // Only poll when game is Playing
  );

  const pendingTransaction = usePokerStore(state => state.pendingTransaction);
  const storeIsLoading = usePokerStore(state => state.isLoading);

  // Smart polling during Showdown using isDecryptionPending
  useEffect(() => {
    if (!poker.currentTableId || !poker.communityCards) return;
    
    // Poll during Showdown to check decryption status and catch state transition
    if (poker.communityCards.currentStreet === 4 && poker.tableState?.state === 1) {
      const pollInterval = setInterval(async () => {
        if (!poker.currentTableId) return;
        
        // Check if FHE decryption is pending
        await poker.checkDecryptionPending();
        
        // Always refresh table state to catch when game finishes
        poker.refreshTableState(poker.currentTableId);
      }, 2000); // Poll every 2 seconds
      
      return () => clearInterval(pollInterval);
    }
  }, [poker]);

  // Track balances before showdown for winner calculation
  // NO BALANCE TRACKING - We'll use totalBet from contract instead
  // Winner gets pot, losers lost their totalBet

  // Auto-show showdown when reaching showdown street OR when game finishes OR when cached showdown data exists
  useEffect(() => {
    // Show showdown modal when:
    // 1. Reaching showdown street (street 4) - immediate feedback
    // 2. OR when game finishes (state 2) with a winner
    // 3. OR when cached showdown data exists (even if state is WaitingForPlayers)
    const isShowdownStreet = poker.communityCards?.currentStreet === 4;
    const isGameFinished = poker.tableState?.state === 2 && poker.tableState.winner;
    const hasCachedShowdown = cachedShowdownData !== null;
    
    if (isShowdownStreet || isGameFinished || hasCachedShowdown) {
      setShowShowdown(true);
    }
    
    // Hide showdown when a new round starts (back to state 0 or pre-flop) AND no cached data
    // Keep showing if cached data exists even when state is WaitingForPlayers
    if (!hasCachedShowdown && (poker.tableState?.state === 0 || (poker.tableState?.state === 1 && poker.communityCards?.currentStreet === 0))) {
      setShowShowdown(false);
    }
  }, [poker.communityCards?.currentStreet, poker.tableState?.state, poker.tableState?.winner, cachedShowdownData]);

  const [showCreateTable, setShowCreateTable] = useState(true);
  const [showJoinTable, setShowJoinTable] = useState(false);
  const [currentView, setCurrentView] = useState<"lobby" | "game">("lobby");
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

  const handleDepositToSmartAccount = () => {
    setShowFundingModal(true);
  };

  // Only auto-reconnect if explicitly navigated to a table or very recent session
  useEffect(() => {
    const checkExistingTable = async () => {
      if (!authenticated || !poker.contract) {
        console.log('⏸️ Skipping table check - not authenticated or no contract');
        return;
      }

      try {
        // Check if store already has a table ID (set by /play/[tableId] route)
        let tableId = store.currentTableId;

        // Only check localStorage if tableId was set by route navigation
        if (!tableId) {
          // Check if we have a very recent table session (within last 5 minutes)
          const savedTableId = typeof window !== 'undefined'
            ? window.localStorage.getItem('poker:lastTableId')
            : null;
          const savedTimestamp = typeof window !== 'undefined'
            ? window.localStorage.getItem('poker:lastTableTimestamp')
            : null;

          if (savedTableId && savedTimestamp) {
            const timeDiff = Date.now() - parseInt(savedTimestamp);
            const maxAge = 5 * 60 * 1000; // 5 minutes

            if (timeDiff < maxAge) {
              // Recent session, try to reconnect
              try {
                tableId = BigInt(savedTableId);
                store.setCurrentTableId(tableId);
                console.log(`📍 Found recent table session (${Math.round(timeDiff/1000)}s ago): ${tableId}`);
              } catch (e) {
                console.warn('Invalid saved table ID - error: ', e, ' clearing:', savedTableId);
                cleanupTableData();
                return;
              }
            } else {
              // Old session, clean it up
              console.log(`🧹 Cleaning up old table session (${Math.round(timeDiff/60000)}min ago)`);
              cleanupTableData();
              return;
            }
          }
        }

        if (tableId) {
          console.log(`🔍 Checking if user is seated at table ${tableId}...`);

          try {
            // Refresh table data
            await store.refreshAll(tableId);

            // Check if user is actually seated
            if (yourAddress && (store.tableState?.isSeated || store.players.some(p => p.toLowerCase() === yourAddress.toLowerCase()))) {
              console.log(`✅ User is seated at table ${tableId}, navigating to game view`);
              setCurrentView("game");
            } else {
              console.log(`ℹ️ User not seated at table ${tableId}, staying in lobby`);
              cleanupTableData();
            }
          } catch (refreshError) {
            console.error(`❌ Failed to refresh table ${tableId}:`, refreshError);
            cleanupTableData();
          }
        }
      } catch (error) {
        console.error('❌ Failed to check existing table:', error);
        cleanupTableData();
      }
    };

    const cleanupTableData = () => {
      store.setCurrentTableId(null);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem('poker:lastTableId');
        window.localStorage.removeItem('poker:lastTableTimestamp');
      }
    };

    checkExistingTable();
  }, [authenticated, poker.contract, yourAddress, store]);
  
  const [isTableBrowserOpen, setIsTableBrowserOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [tableIdInput, setTableIdInput] = useState<string>("");
  const [minBuyInInput, setMinBuyInInput] = useState<string>("0.2");
  const [maxPlayersInput, setMaxPlayersInput] = useState<string>("9");
  const [smallBlindInput, setSmallBlindInput] = useState<string>("0.005");
  const [bigBlindInput, setBigBlindInput] = useState<string>("0.01");
  const [buyInAmountInput, setBuyInAmountInput] = useState<string>("0.2");
  const [showFundingModal, setShowFundingModal] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<bigint>(0n);
  const [requiredAmount, setRequiredAmount] = useState<bigint>(0n);
  const [smartAccountBalance, setSmartAccountBalance] = useState<bigint>(0n);
  const [eoaBalance, setEoaBalance] = useState<bigint>(0n);
  const [showChipsManagementModal, setShowChipsManagementModal] = useState(false);
  const [chipsModalInitialTab, setChipsModalInitialTab] = useState<"withdraw" | "add" | "leave">("add");
  const [showShowdown, setShowShowdown] = useState(false);

  const yourAddress = address || "";

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

  useEffect(() => {
    // Only auto-switch to game view if:
    // 1. User is authenticated
    // 2. User address is available
    // 3. Table ID is set
    // 4. Table state is loaded
    // 5. User is seated or in players list
    if (!authenticated || !yourAddress || !poker.currentTableId || !poker.tableState) {
      return;
    }

    // Don't switch if already in game view
    if (currentView === "game") {
      return;
    }

    const isInPlayersList = store.players.some(
      addr => addr.toLowerCase() === yourAddress.toLowerCase()
    );

    const isSeated = poker.isSeated;
    
    // Only switch to game view if player is confirmed to be seated and table state is fully loaded
    if ((isSeated || isInPlayersList) && poker.tableState) {
      console.log('✅ Auto-switching to game view - player is seated and table state loaded');
      setCurrentView("game");
    }
  }, [
    authenticated,
    yourAddress,
    store.currentTableId,
    store.tableState,
    store.tableState?.state,
    store.tableState?.isSeated,
    store.players,
    currentView,
  ]);

  // Clear player actions only when new betting round starts (community cards dealt)
  const prevStreetRef = useRef<number | undefined>(undefined);
  
  useEffect(() => {
    const currentStreet = poker.communityCards?.currentStreet;
    
    // Clear actions only when street advances (new cards dealt)
    if (prevStreetRef.current !== undefined && currentStreet !== prevStreetRef.current) {
      usePokerStore.getState().clearPlayerActions();
    }
    
    prevStreetRef.current = currentStreet;
  }, [poker.communityCards?.currentStreet]);

  const handleCreateTable = async () => {
    await poker.createTable(minBuyInInput, parseInt(maxPlayersInput), smallBlindInput, bigBlindInput);
  };

  const handleJoinTable = async () => {
    const tableId = BigInt(tableIdInput || store.currentTableId?.toString() || "0");
    const buyInAmount = ethers.parseEther(buyInAmountInput);
    
    console.log('🎯 handleJoinTable called for table', tableId.toString(), 'with yourAddress:', yourAddress);
    
    // First, check if we're already seated at this table
    try {
      console.log('🔍 Checking if already seated at table', tableId.toString());
      
      // Set the table ID first so refreshTableState updates the correct table
      poker.setCurrentTableId(tableId);
      await poker.refreshTableState(tableId);
      
      // Check if player is already in the game by checking the store after refresh
      console.log('📊 Current players:', poker.players);
      const isAlreadySeated = yourAddress && poker.players.some(
        addr => addr.toLowerCase() === yourAddress.toLowerCase()
      );
      
      console.log('🔍 Already seated check:', {
        isAlreadySeated,
        yourAddress,
        players: poker.players,
      });
      
      if (isAlreadySeated) {
        console.log('✅ Already seated at table', tableId.toString(), '- loading game view');
        setCurrentView("game");
        return;
      }
      
      console.log('➡️ Not seated yet, proceeding with join...');
    } catch (error) {
      console.warn('Could not check if already seated:', error);
      // Continue with join attempt
    }
    
    // Not seated yet - proceed with join
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
      // Join the table (this waits for transaction confirmation)
      await poker.joinTable(tableId, buyInAmountInput);
      // Don't set view immediately - let the useEffect handle it after tableState loads
      console.log('✅ Join table completed, waiting for table state to load...');
    } catch (error) {
      console.error('❌ Failed to join table:', error);
      
      // If join fails with "SEAT" error, it means we're already seated
      // Convert the entire error object to a string to catch nested error messages
      const errorStr = JSON.stringify(error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check for "SEAT" error in multiple formats:
      // 1. Plain text: "SEAT"
      // 2. Hex encoded: 0x5345415400... (SEAT in hex is 0x53454154)
      const isSeatError = 
        errorMsg.includes('SEAT') || 
        errorMsg.includes('5345415400') || // SEAT in hex
        errorMsg.includes('0x53454154') || // SEAT prefix in hex
        errorStr.includes('SEAT') || 
        errorStr.includes('5345415400') || // Check in full error object
        errorStr.includes('0x53454154');
      
      if (isSeatError) {
        console.log('✅ Already seated (detected via SEAT error) - loading game view');
        poker.setCurrentTableId(tableId);
        await poker.refreshTableState(tableId);
        setCurrentView("game");
      }
    }
  };

  const handleAdvanceGame = async () => {
    if (store.currentTableId !== undefined) {
      await poker.advanceGame(store.currentTableId!);
      setTimeout(async () => {
        await store.refreshAll(store.currentTableId!);
        setCurrentView("game");
      }, 1000);
    }
  };

  const handleDecryptCards = async () => {
    if (store.currentTableId !== undefined) {
      setIsDecrypting(true);
      try {
        await poker.decryptCards(store.currentTableId!);
      } finally {
        setIsDecrypting(false);
      }
    }
  };

  const handleDecryptCommunityCards = async () => {
    if (store.currentTableId !== undefined) {
      setIsDecrypting(true);
      try {
        await poker.decryptCommunityCards(store.currentTableId!);
      } finally {
        setIsDecrypting(false);
      }
    }
  };

  const buttonClass =
    "inline-flex items-center justify-center rounded-xl bg-black px-4 py-4 font-semibold text-white shadow-sm " +
    "transition-colors duration-200 hover:bg-blue-700 active:bg-blue-800 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  if (!ready || isDeployingSmartAccount) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="mb-8">
            <Image src={'/logo.png'} height={240} width={240} alt="logo" className="mx-auto" />
            {isDeployingSmartAccount ? (
              <>
                <div className="flex items-center justify-center gap-3 mt-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <p className="text-xl text-purple-300">Setting up your Smart Account...</p>
                </div>
                <p className="text-sm text-gray-400 mt-3">This will only take a moment</p>
              </>
            ) : (
              <p className="text-xl text-gray-300">Loading...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="text-center">
            <div className="mb-8">
              <Image src={'/logo.png'} height={240} width={240} alt="logo" className="mx-auto" />
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
    if (!chainId) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-xl">Detecting network...</p>
          </div>
        </div>
      );
    }

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

  if (currentView === "game") {
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

    if (!store.tableState) {
      return (
        <>
          {/* Only show CyberpunkLoader when NOT waiting for transaction confirmation */}
          <CyberpunkLoader isLoading={!pendingTransaction?.isWaiting} />
          <TransactionConfirmModal 
            isOpen={pendingTransaction?.isWaiting || false}
            action={pendingTransaction?.action || ""}
          />
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-4">Table #{store.currentTableId.toString()}</p>
              <button
                onClick={() => store.fetchTableState(store.currentTableId!)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold border-2 border-green-500 shadow-lg shadow-green-500/50"
              >
                🔄 Retry
              </button>
            </div>
          </div>
        </>
      );
    }
    
    // Get winner from contract - it's determined immediately at showdown
    const isFinished = poker.tableState?.state === 2;
    const isShowdown = poker.communityCards?.currentStreet === 4;
    const calculatedWinner = poker.tableState?.winner; // Contract determines winner immediately
    
    const playerData = poker.players.map((address) => {
      const playerBettingState = poker.allPlayersBettingState[address.toLowerCase()];
      const isYou = address.toLowerCase() === yourAddress.toLowerCase();
      const revealedCards = poker.revealedCards[address.toLowerCase()];
      
      // Calculate winnings/losses from pot and bets
      const isWinner = calculatedWinner?.toLowerCase() === address.toLowerCase();
      const totalBet = playerBettingState?.totalBet || BigInt(0);
      const currentPot = poker.lastPot || poker.bettingInfo?.pot || BigInt(0);
      
      // Winner gets pot minus their own bet (net gain)
      // Loser loses their total bet
      const winnings = isWinner && (isShowdown || isFinished) && currentPot > totalBet 
        ? currentPot - totalBet 
        : BigInt(0);
      const losses = !isWinner && !playerBettingState?.hasFolded && (isShowdown || isFinished) 
        ? totalBet 
        : BigInt(0);

      return {
        address,
        chips: playerBettingState?.chips || BigInt(0),
        currentBet: playerBettingState?.currentBet || BigInt(0),
        hasFolded: playerBettingState?.hasFolded || false,
        isCurrentPlayer: store.bettingInfo
          ? store.bettingInfo.currentPlayer.toLowerCase() === address.toLowerCase()
          : false,
        cards: isYou
          ? [poker.cards[0]?.clear, poker.cards[1]?.clear]
          : isFinished && revealedCards
            ? [revealedCards.card1, revealedCards.card2]
            : undefined,
        winnings,
        losses,
      };
    });

    const isYourTurn = (store.allPlayersBettingState[yourAddress.toLowerCase()] && typeof store.allPlayersBettingState[yourAddress.toLowerCase()] === 'object' && store.allPlayersBettingState[yourAddress.toLowerCase()]?.isCurrentPlayer) || false;
    const isPlaying = store.tableState?.state === 1; // Playing state

    return (
      <div className="min-h-screen bg-black">
        {/* Global Loaders and Modals */}
        {/* Only show CyberpunkLoader when loading but NOT waiting for transaction confirmation */}
        <CyberpunkLoader isLoading={storeIsLoading && !pendingTransaction?.isWaiting} />
        <TransactionConfirmModal 
          isOpen={pendingTransaction?.isWaiting || false}
          action={pendingTransaction?.action || ""}
        />
        
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
                <Image src={'/logo.png'} height={120} width={120} alt="logo" className="mx-auto" />
                <div className="h-6 w-px bg-gray-600"></div>
                <div className="text-sm">
                  <span className="text-gray-400">Table #{store.currentTableId.toString()}</span>
                  <span className="mx-2 text-gray-600">•</span>
                  <span className="text-yellow-400 font-semibold">{GAME_STATES[store.tableState.state]}</span>
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

                {/* Manual Refresh Button */}
                <button
                  onClick={() => {
                    if (store.currentTableId !== undefined) {
                      store.refreshAll(store.currentTableId!);
                    }
                  }}
                  disabled={store.isLoading || store.currentTableId === null}
                  className="px-3 py-1 bg-gradient-to-r from-cyan-600/30 to-purple-600/30 hover:from-cyan-600/50 hover:to-purple-600/50 border border-cyan-500/50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Manually refresh game state"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-cyan-400 text-sm font-semibold mono">Refresh</span>
                  </div>
                </button>

                {/* WebSocket Connection Status */}
                {store.contractAddress ? (
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
                {store.tableState?.isSeated && (
                  <button
                    onClick={() => {
                      setChipsModalInitialTab("add");
                      setShowChipsManagementModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg flex items-center gap-2"
                  >
                    <span className="text-lg">💰</span>
                    <span>Manage Chips</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setChipsModalInitialTab("leave");
                    setShowChipsManagementModal(true);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                >
                  Leave Table
                </button>
              </div>
            </div>
          </div>

          {/* Main Game Area with right sidebar */}
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Indicators + Table + Controls + Debug */}
            <div className="lg:col-span-8 space-y-6">
              {/* Game Status Indicators */}
              <div className="flex justify-center gap-4">
                {/* Betting Street Indicator */}
                {store.communityCards && (
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-purple-600 px-6 py-3 rounded-full shadow-lg border-2 border-cyan-400/50 box-glow">
                    <span className="text-2xl">🎴</span>
                    <span className="text-white font-bold text-xl mono">{BETTING_STREETS[store.communityCards.currentStreet]}</span>
                  </div>
                )}
                {/* Turn Indicator */}
                {store.bettingInfo && (
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full shadow-lg border-2 ${store.bettingInfo?.currentPlayer.toLowerCase() === yourAddress.toLowerCase()
                    ? 'bg-gradient-to-r from-green-600 to-green-700 border-green-400 shadow-green-500/50 animate-pulse'
                    : store.pendingTransaction?.action
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 border-purple-400 shadow-purple-500/50'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-400'
                    }`}>
                    <span className="text-2xl">
                      {store.pendingTransaction?.action ? (
                        <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : store.bettingInfo?.currentPlayer.toLowerCase() === yourAddress.toLowerCase() ? '👉' : '⏳'}
                    </span>
                    <div className="text-white">
                      <div className="font-bold text-sm">
                            {store.pendingTransaction?.action
                          ? `Processing ${store.pendingTransaction?.action}...`
                          : store.bettingInfo?.currentPlayer.toLowerCase() === yourAddress.toLowerCase()
                            ? "YOUR TURN!"
                            : `Waiting for ${store.bettingInfo?.currentPlayer.substring(0, 6)}...${store.bettingInfo?.currentPlayer.substring(38)}`}
                      </div>
                      {!store.pendingTransaction?.action && (
                        <div className="text-xs opacity-90">
                          {store.bettingInfo?.currentPlayer.substring(0, 10)}...
                        </div>
                      )}
                    </div>
                    {typeof store.tableState?.turnStartTime === 'number' && store.tableState?.state === 1 && !store.pendingTransaction?.action && (
                      <div className={`ml-2 flex items-center gap-1 px-2 py-1 rounded-full border ${store.tableState?.turnStartTime <= 10
                          ? 'bg-red-500/40 border-red-400 animate-pulse'
                          : store.tableState?.turnStartTime <= 30
                            ? 'bg-yellow-500/40 border-yellow-400'
                            : 'bg-black/30 border-white/20'
                        }`}>
                        <span className="text-xs">⏱️</span>
                        <span className="text-xs text-white font-semibold">
                          {Math.floor((store.tableState?.turnStartTime || 0) / 60)}:{String(((store.tableState?.turnStartTime || 0) % 60)).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Table */}
              <PokerTable
                players={playerData}
                pot={store.lastPot || store.bettingInfo?.pot || BigInt(0)}
                currentBet={store.bettingInfo?.currentBet || BigInt(0)}
                dealerIndex={store.tableState?.dealerIndex ? Number(store.tableState.dealerIndex) : 0}
                yourAddress={yourAddress}
                showYourCards={store.revealedCards[yourAddress.toLowerCase()]?.card1 !== undefined}
                communityCards={
                  store.decryptedCommunityCards.length > 0
                    ? {
                      currentStreet: store.communityCards?.currentStreet || 0,
                      flopCard1: store.decryptedCommunityCards[0] || undefined,
                      flopCard2: store.decryptedCommunityCards[1] || undefined,
                      flopCard3: store.decryptedCommunityCards[2] || undefined,
                      turnCard: store.decryptedCommunityCards[3] || undefined,
                      riverCard: store.decryptedCommunityCards[4] || undefined,
                    }
                    : store.communityCards || undefined
                }
                currentStreet={store.communityCards?.currentStreet}
                tableState={store.tableState}
                isLoading={store.isLoading}
                onStartGame={handleAdvanceGame}
                  pendingAction={store.pendingTransaction?.action}
                isPlaying={isPlaying}
                decryptedCommunityCards={store.decryptedCommunityCards}
                isDecrypting={isDecrypting}
                handleDecryptCommunityCards={handleDecryptCommunityCards}
                isSeated={store.tableState?.isSeated}
                playerState={store.allPlayersBettingState[yourAddress.toLowerCase()]}
                clear={store.revealedCards[yourAddress.toLowerCase()]?.card1}
                handleDecryptCards={handleDecryptCards}
                timeLeft={poker.timeRemaining}
                bigBlind={bigBlindInput}
                smallBlind={smallBlindInput}
                winnerAddress={calculatedWinner}
                showdownMinimized={poker.communityCards?.currentStreet === 4 || poker.tableState.state === 2}
                revealedCards={poker.revealedCards}
              />

              {/* Controls */}
              <div className="space-y-4">

                {/* Betting Controls - Show during active play */}
                {isPlaying && (poker.isSeated || poker.playerState) && poker.playerState && poker.communityCards?.currentStreet !== 4 && (
                  <>
                    <BettingControls
                      canAct={isYourTurn && !store.allPlayersBettingState[yourAddress.toLowerCase()]?.hasFolded}
                      currentBet={store.bettingInfo?.currentBet || BigInt(0)}
                      playerBet={store.allPlayersBettingState[yourAddress.toLowerCase()]?.currentBet || BigInt(0)}
                      playerChips={store.allPlayersBettingState[yourAddress.toLowerCase()]?.chips || BigInt(0)}
                      bigBlind={bigBlindInput}
                      smallBlind={smallBlindInput}
                      minRaise={BigInt(Math.floor(Number(store.tableState?.minBuyIn) * 0.1))}
                      onFold={() => poker.fold(store.currentTableId!)}
                      onCheck={() => poker.check(store.currentTableId!)}
                      onCall={() => {
                        const currentBet = store.bettingInfo?.currentBet || 0n;
                        const myBet = (typeof store.allPlayersBettingState[yourAddress.toLowerCase()] === 'object' && store.allPlayersBettingState[yourAddress.toLowerCase()]?.currentBet) ? store.allPlayersBettingState[yourAddress.toLowerCase()]?.currentBet : 0n;
                        if (myBet >= currentBet) {
                          return poker.check(store.currentTableId!);
                        }
                        return poker.call(store.currentTableId!);
                      }}
                      onRaise={(amount) => {
                        try {
                          const targetWei = ethers.parseEther(amount);
                          const current = store.bettingInfo?.currentBet || 0n;
                          const deltaWei = targetWei > current ? targetWei - current : 0n;
                          const deltaEth = ethers.formatEther(deltaWei);
                          poker.raise(store.currentTableId!, deltaEth);
                        } catch {
                          poker.raise(store.currentTableId!, amount);
                        }
                      }}
                      isLoading={store.isLoading}
                    />
                  </>
                )}

                {isPlaying && !store.allPlayersBettingState[yourAddress.toLowerCase()] && (
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
                </div>
                <p>
                  <span className="text-gray-500">Game State:</span>{" "}
                  <span className={store.tableState?.state === 1 ? "text-green-400 font-bold" : "text-yellow-400"}>
                    {store.tableState?.state} ({GAME_STATES[store.tableState?.state || 0]})
                  </span>
                </p>
                <p>
                  <span className="text-gray-500">WebSocket:</span>{" "}
                  <span className={store.contractAddress ? "text-green-400" : "text-yellow-400"}>
                    {store.contractAddress ? "✅ Connected" : "⚠️ Polling Only"}
                  </span>
                </p>
                <p className={store.tableState?.isSeated ? "text-green-400" : "text-red-400"}>
                  <span className="text-gray-500">Is Seated (computed):</span> {store.tableState?.isSeated ? "Yes" : "No"}
                </p>
                <p className={store.tableState?.isSeated ? "text-green-400" : "text-red-400"}>
                  <span className="text-gray-500">Is Seated (contract, unreliable):</span> {store.tableState?.isSeated ? "Yes" : "No"}
                </p>
                <p className={store.players.some((p: string) => p.toLowerCase() === yourAddress.toLowerCase()) ? "text-green-400" : "text-red-400"}>
                  <span className="text-gray-500">In Players List:</span>{" "}
                  {store.players.some((p: string) => p.toLowerCase() === yourAddress.toLowerCase()) ? "Yes" : "No"}
                </p>
                <p><span className="text-gray-500">Total Players:</span> {store.players.length}</p>
                <p><span className="text-gray-500">Is Playing:</span> {isPlaying ? "Yes" : "No"}</p>
                <p><span className="text-gray-500">Player State Loaded:</span> {store.allPlayersBettingState[yourAddress.toLowerCase()] ? "Yes" : "No"}</p>
                <p><span className="text-gray-500">Cards Decrypted:</span> {store.revealedCards[yourAddress.toLowerCase()]?.card1 !== undefined ? "Yes" : "No"}</p>
                <p><span className="text-gray-500">Community Cards Decrypted:</span> <span className={store.decryptedCommunityCards.length > 0 ? "text-green-400" : "text-yellow-400"}>{store.decryptedCommunityCards.length > 0 ? "✅ Yes" : "No"}</span></p>
                {store.decryptedCommunityCards.length > 0 && (
                  <p className="text-xs text-green-400"><span className="text-gray-500">Decrypted Values:</span> [{store.decryptedCommunityCards.join(', ')}]</p>
                )}
                {store.communityCards && (
                  <>
                    <p><span className="text-gray-500">Street:</span> <span className="text-cyan-400 font-bold">{store.communityCards.currentStreet}</span> ({BETTING_STREETS[store.communityCards.currentStreet]})</p>
                    <p><span className="text-gray-500">Community Cards (Encrypted):</span></p>
                    <div className="ml-4 space-y-0.5">
                      <p className="text-xs">
                        <span className="text-gray-500">Flop:</span> {store.communityCards.flopCard1}, {store.communityCards.flopCard2}, {store.communityCards.flopCard3}
                      </p>
                      <p className="text-xs">
                        <span className="text-gray-500">Turn:</span> {store.communityCards.turnCard !== undefined ? store.communityCards.turnCard : 'Not dealt'}
                      </p>
                      <p className="text-xs">
                        <span className="text-gray-500">River:</span> {store.communityCards.riverCard !== undefined ? store.communityCards.riverCard : 'Not dealt'}
                      </p>
                    </div>
                  </>
                )}
                {store.allPlayersBettingState[yourAddress.toLowerCase()] && (
                  <>
                    <p><span className="text-gray-500">Your Turn:</span> {store.allPlayersBettingState[yourAddress.toLowerCase()]?.isCurrentPlayer ? "✅ Yes" : "No"}</p>
                    <p><span className="text-gray-500">Has Folded:</span> {store.allPlayersBettingState[yourAddress.toLowerCase()]?.hasFolded ? "Yes" : "No"}</p>
                    <p><span className="text-gray-500">Your Chips:</span> {(Number(store.allPlayersBettingState[yourAddress.toLowerCase()]?.chips) / 1e18).toFixed(4)} ETH</p>
                    <p><span className="text-gray-500">Your Bet:</span> {(Number(store.allPlayersBettingState[yourAddress.toLowerCase()]?.currentBet) / 1e18).toFixed(4)} ETH</p>
                  </>
                )}
              </div>
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

          {/* Showdown - Show when reaching showdown street or game finished */}
          {poker.contractAddress && showShowdown && (() => {
            const cachedShowdownData = usePokerStore.getState().cachedShowdownData;
            const useCachedData = cachedShowdownData !== null;
            
            // Use cached data if available, otherwise use current state
            const showdownWinner = useCachedData ? cachedShowdownData.winner : poker.tableState?.winner;
            const showdownCommunityCards = useCachedData 
              ? cachedShowdownData.decryptedCommunityCards.filter((c): c is number => c !== undefined)
              : (poker.decryptedCommunityCards.length === 5
                  ? poker.decryptedCommunityCards.filter((c): c is number => c !== undefined)
                  : []);
            const showdownPot = useCachedData ? cachedShowdownData.pot : (poker.lastPot || poker.bettingInfo?.pot || BigInt(0));
            const showdownRevealedCards = useCachedData ? cachedShowdownData.revealedCards : poker.revealedCards;
            
            return (
              <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"><CyberpunkLoader isLoading={true} /></div>}>
                <Showdown
                  winner={showdownWinner}
                  myAddress={yourAddress}
                  myCards={
                    // Use cached revealed cards if available, otherwise use decrypted cards
                    useCachedData && showdownRevealedCards[yourAddress.toLowerCase()]
                      ? [showdownRevealedCards[yourAddress.toLowerCase()].card1, showdownRevealedCards[yourAddress.toLowerCase()].card2]
                      : (poker.cards[0]?.clear !== undefined && poker.cards[1]?.clear !== undefined
                          ? [poker.cards[0].clear, poker.cards[1].clear]
                          : undefined)
                  }
                  communityCards={showdownCommunityCards}
                  pot={showdownPot}
                  allPlayers={playerData.map(p => ({
                    address: p.address,
                    chips: p.chips,
                    hasFolded: p.hasFolded,
                  }))}
                  onClose={() => {
                    setShowShowdown(false);
                    // Optionally refresh table state
                    if (poker.currentTableId) {
                      poker.refreshTableState(poker.currentTableId);
                    }
                  }}
                  tableId={poker.currentTableId!}
                  contractAddress={poker.contractAddress}
                  provider={ethersProvider}
                  isWaitingForWinner={isWaitingForWinner}
                  onStartNewRound={handleAdvanceGame}
                />
              </Suspense>
            );
          })()}

          {/* Shuffle Animation - TEMPORARILY COMMENTED OUT
          {poker.tableState.state === 2 && (
            <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"><CyberpunkLoader isLoading={true} /></div>}>
              <ShuffleAnimation />
            </Suspense>
          )}
          */}


          {/* Chips Management Modal */}
          {store.currentTableId && store.tableState && (
            <Suspense fallback={null}>
              <ChipsManagementModal
              isOpen={showChipsManagementModal}
              onClose={() => setShowChipsManagementModal(false)}
              currentChips={store.allPlayersBettingState[yourAddress.toLowerCase()]?.chips || 0n}
              minBuyIn={store.tableState.minBuyIn}
              onLeaveTable={async () => {
                if (store.currentTableId) {
                  try {
                    await poker.leaveTable(store.currentTableId);
                    setShowChipsManagementModal(false);
                    setCurrentView("lobby"); // Navigate back to lobby
                  } catch (error) {
                    console.error('❌ Failed to leave table:', error);
                  }
                }
              }}
              onWithdrawChips={async (amount: string) => {
                if (store.currentTableId) {
                  try {
                    await poker.withdrawChips(poker.currentTableId, amount);
                  } catch (error) {
                    console.error('❌ Failed to withdraw chips:', error);
                  }
                }
              }}
              onAddChips={async (amount: string) => {
                if (store.currentTableId) {
                  try {
                    await poker.addChips(poker.currentTableId, amount);
                  } catch (error) {
                    console.error('❌ Failed to add chips:', error);
                  }
                }
              }}
              isLoading={store.isLoading}
              gameState={store.tableState.state}
              initialTab={chipsModalInitialTab}
            />
            </Suspense>
          )}

        </div>
      </div>
    );
  }

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
            <Image src={'/logo.png'} height={240} width={240} alt="logo" className="mx-auto" />
            <div className="mt-4 inline-block items-center gap-2 bg-black/60 backdrop-blur-sm px-6 py-4 rounded-3xl border border-gray-700">
              <p className="text-4xl text-gray-300 mb-2">Fully Homomorphic Encrypted Poker</p>
              <p className="text-2xl text-gray-400">Your cards stay private, even on the blockchain</p>
            </div>

            {/* Network badge — cố định góc phải */}
            <div className="absolute top-24 right-4 z-50 inline-flex items-center gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700 shadow-md">
              <div
                className={`w-2 h-2 rounded-full ${chainId === 31337 ? "bg-green-400" : "bg-yellow-400"
                  } animate-pulse`}
              ></div>
              <span className="text-xl text-gray-300">
                {chainId === 31337
                  ? "Connected to Hardhat Local"
                  : `Connected to Chain ${chainId}`}
              </span>
            </div>
          </div>

          {/* Action Tabs */}
          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            <button
              onClick={() => { setShowCreateTable(true); setShowJoinTable(false); }}
              className={`px-6 py-2 bg-black/60 border border-green-500 rounded-3xl text-2xl font-bold transition-all duration-200 ${showCreateTable
                ? " text-white shadow-lg scale-105"
                : " text-gray-700 hover:bg-green-600"
                }`}
            >
              Create Table
            </button>
            <button
              onClick={() => { setShowCreateTable(false); setShowJoinTable(true); }}
              className={`px-6 py-2 bg-black/60 border border-green-500 rounded-3xl text-2xl font-bold transition-all duration-200 ${showJoinTable
                ? " text-white shadow-lg scale-105"
                : "text-gray-500 hover:bg-green-600"
                }`}
            >
              Join Table
            </button>
            <button
              onClick={() => {
                console.log('🔍 Browse Tables clicked, opening modal...');
                console.log('Contract Address:', poker.contractAddress);
                console.log('Provider:', ethersProvider ? 'Available' : 'Not available');
                setIsTableBrowserOpen(true);
              }}
              className="px-6 py-2 rounded-3xl text-2xl font-bold transition-all duration-200 bg-gradient-to-r from-green-500 to-green-700 text-white shadow-lg hover:scale-105"
            >
              Browse Tables
            </button>
          </div>

          {/* Create Table Form */}
          {showCreateTable && (
            <div className="bg-black/70 rounded-2xl p-8 shadow-2xl border border-gray-700 max-w-2xl mx-auto">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-3xl font-semibold text-white mb-2">
                      Min Buy-In (ETH)
                    </label>
                    <input
                      type="text"
                      value={minBuyInInput}
                      onChange={(e) => setMinBuyInInput(e.target.value)}
                      className="w-full px-4 py-3 text-xl bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                      placeholder="0.2"
                    />
                    <p className="text-md text-gray-400 mt-1">Must be ≥ 20× Big Blind</p>
                  </div>
                  <div>
                    <label className="block text-3xl font-semibold text-white mb-2">
                      Max Players
                    </label>
                    <input
                      type="number"
                      value={maxPlayersInput}
                      onChange={(e) => setMaxPlayersInput(e.target.value)}
                      className="w-full px-4 py-3 text-xl bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                      placeholder="9"
                      min="2"
                      max="10"
                    />
                  </div>
                  <div>
                    <label className="block text-3xl font-semibold text-white mb-2">
                      Small Blind (ETH)
                    </label>
                    <input
                      type="text"
                      value={smallBlindInput}
                      onChange={(e) => setSmallBlindInput(e.target.value)}
                      className="w-full px-4 py-3 text-xl bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                      placeholder="0.005"
                    />
                  </div>
                  <div>
                    <label className="block text-3xl font-semibold text-white mb-2">
                      Big Blind (ETH)
                    </label>
                    <input
                      type="text"
                      value={bigBlindInput}
                      onChange={(e) => setBigBlindInput(e.target.value)}
                      className="w-full px-4 py-3 text-xl bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-white font-semibold"
                      placeholder="0.01"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateTable}
                  disabled={store.isLoading || !poker.isDeployed}
                  className="w-1/2 block mx-auto hover:scale-105 text-black font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed text-3xl"
                  style={{ backgroundImage: `url(/bg-button.png)`, backgroundSize: '100% 100%' }}>
                  {store.isLoading ? "CREATING TABLE..." : "CREATE TABLE"}
                </button>
              </div>
            </div>
          )}

          {/* Join Table Form */}
          {showJoinTable && (
            <div className="bg-black/70 rounded-2xl p-8 shadow-2xl border border-gray-700 max-w-2xl mx-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-3xl font-semibold text-white mb-2">
                    Table ID
                  </label>
                  <input
                    type="text"
                    value={tableIdInput}
                    onChange={(e) => setTableIdInput(e.target.value)}
                    className="w-full px-4 py-3 text-xl bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-semibold"
                    placeholder={store.currentTableId?.toString() || "Enter table ID"}
                  />
                </div>
                <div>
                  <label className="block text-3xl font-semibold text-white mb-2">
                    Buy-In Amount (ETH)
                  </label>
                  <input
                    type="text"
                    value={buyInAmountInput}
                    onChange={(e) => setBuyInAmountInput(e.target.value)}
                    className="w-full px-4 py-3 text-xl bg-black border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white font-semibold"
                    placeholder="0.2"
                  />
                  <p className="text-md text-gray-400 mt-1">Must match or exceed table minimum</p>
                </div>
                <button
                  onClick={handleJoinTable}
                  disabled={store.isLoading || !poker.isDeployed}
                  className="w-1/2 block mx-auto hover:scale-105 text-black font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed text-3xl"
                  style={{ backgroundImage: `url(/bg-button.png)`, backgroundSize: '100% 100%' }}>
                  {store.isLoading ? "JOINING TABLE..." : "JOIN TABLE"}
                </button>
              </div>
            </div>
          )}

          {/* Message Display */}
          {poker.message && (
            <div className="mt-8 max-w-2xl mx-auto">
              <div className={`border-l-4 rounded-lg p-4 backdrop-blur-sm ${poker.message.includes("✅") || poker.message.includes("Success")
                ? "bg-green-500/20 border-green-500"
                : poker.message.includes("⚠️") || poker.message.includes("already")
                  ? "bg-yellow-500/20 border-yellow-500"
                  : poker.message.includes("❌") || poker.message.includes("Failed")
                    ? "bg-red-500/20 border-red-500"
                    : "bg-blue-500/20 border-blue-500"
                }`}>
                <p className={`font-semibold text-xl ${poker.message.includes("✅") || poker.message.includes("Success")
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
          {store.currentTableId !== null && (
            <div className="mt-8 max-w-2xl mx-auto bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/30">
              <h3 className="text-xl font-bold text-white mb-4">📍 Your Current Table</h3>
              <div className="space-y-2 text-gray-300">
                <p><span className="text-gray-400">Table ID:</span> <span className="font-bold text-white">{store.currentTableId.toString()}</span></p>
                {store.tableState && (
                  <>
                    <p><span className="text-gray-400">Status:</span> <span className="font-bold text-yellow-400">{GAME_STATES[store.tableState.state]}</span></p>
                    <p>
                      <span className="text-gray-400">Players:</span>{" "}
                      <span className="font-bold text-white text-lg">
                        {store.tableState.numPlayers.toString()}/{store.tableState.maxPlayers.toString()}
                      </span>
                      <span className="ml-2 text-xs text-gray-400">(Live: {store.players.length})</span>
                    </p>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                {/* Advance Game Button in Lobby */}
                {store.tableState && store.tableState.state === 2 && ( // Finished - ready to start new round
                  <div className="space-y-2">
                    <button
                      onClick={handleAdvanceGame}
                      disabled={store.isLoading}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      {store.isLoading ? "Processing..." : "🔄 Start New Round"}
                    </button>
                    <p className="text-center text-xs text-gray-400">
                      Will take you to the table after starting
                    </p>
                  </div>
                )}

                {/* Go to Table Button - Show if player is in game */}
                {(store.tableState?.isSeated || store.players.some((p: string) => p.toLowerCase() === yourAddress.toLowerCase())) && (
                  <button
                    onClick={() => setCurrentView("game")}
                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-2xl">🎮</span>
                      <div className="text-left">
                        <div className="font-bold">
                          {store.tableState?.state === 1 ? "Go to Table (Game In Progress!)" :
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
          <Suspense fallback={null}>
            <TableBrowser
            isOpen={isTableBrowserOpen}
            onClose={() => setIsTableBrowserOpen(false)}
            onSelect={(id) => {
              setIsTableBrowserOpen(false);
              // Navigate directly to the table page
              router.push(`/play/${id}`);
            }}
            contractAddress={poker.contractAddress}
            provider={ethersProvider}
          />
          </Suspense>

          {/* Funding Required Modal */}
          {isSmartAccount && smartAccountAddress && (
            <Suspense fallback={null}>
              <FundingRequiredModal
              isOpen={showFundingModal}
              onClose={() => setShowFundingModal(false)}
              smartAccountAddress={smartAccountAddress}
              currentBalance={currentBalance}
              requiredAmount={requiredAmount}
              eoaAddress={eoaAddress}
            />
            </Suspense>
          )}

        </div>
      </div>
    </div>
  );
}
