"use client";

/**
 * FHE Poker React Hook
 * 
 * Copyright (c) 2025 0xDRick (Tra Anh Khoi)
 * Licensed under Business Source License 1.1 (see LICENSE-BSL)
 */

import { ethers } from "ethers";
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FhevmDecryptionSignature,
  type FhevmInstance,
  type GenericStringStorage,
} from "@fhevm/react";

import { FHEPokerABI } from "@/abi/FHEPokerABI";
import { FHEPokerAddresses } from "@/abi/FHEPokerAddresses";
import { usePokerStore } from "@/stores/pokerStore";
import { usePokerWagmi } from "./usePokerWagmi";

interface PokerTableInfo {
  abi: typeof FHEPokerABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
}

interface Card {
  handle: string;
  clear?: number;
}

/**
 * Resolves FHEPoker contract metadata for the given EVM chainId
 */
function getFHEPokerByChainId(chainId: number | undefined): PokerTableInfo {
  if (!chainId) {
    return { abi: FHEPokerABI.abi };
  }

  const entry =
    FHEPokerAddresses[chainId.toString() as keyof typeof FHEPokerAddresses];

  // Check if entry exists and has a valid address
  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: FHEPokerABI.abi, chainId };
  }

  return {
    address: entry.address as `0x${string}` | undefined,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: FHEPokerABI.abi,
  };
}

/**
 * Hook for interacting with FHEPoker contract
 */
export const useFHEPoker = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
  smartAccountAddress?: string; // For ERC-4337 smart accounts
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    smartAccountAddress,
  } = parameters;

  // State - MUST be declared before any memoized values that use setState
  const [currentTableId, setCurrentTableId] = useState<bigint | undefined>(undefined);
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentAction, setCurrentAction] = useState<string | undefined>(undefined);
  const [cards, setCards] = useState<[Card | undefined, Card | undefined]>([undefined, undefined]);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [userAddress, setUserAddress] = useState<string | undefined>(undefined);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Refs
  const pokerContractRef = useRef<PokerTableInfo | undefined>(undefined);
  const isLoadingRef = useRef<boolean>(false);
  const isDecryptingRef = useRef<boolean>(false);
  const previousRoundRef = useRef<string | undefined>(undefined);
  const previousGameStateRef = useRef<number | undefined>(undefined);
  const timeoutHandledRef = useRef<boolean>(false);

  // Contract metadata
  const pokerContract = useMemo(() => {
    const c = getFHEPokerByChainId(chainId);
    pokerContractRef.current = c;

    if (!c.address) {
      setMessage(`FHEPoker deployment not found for chainId=${chainId}.`);
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!pokerContract) {
      return undefined;
    }
    return Boolean(pokerContract.address) && pokerContract.address !== ethers.ZeroAddress;
  }, [pokerContract]);

  // Get user address
  useEffect(() => {
    if (ethersSigner) {
      ethersSigner.getAddress().then(setUserAddress);
    }
  }, [ethersSigner]);

  // Use signer if available, otherwise readonly provider
  const provider = ethersSigner || ethersReadonlyProvider;

  // Zustand store - subscribe to state
  const tableState = usePokerStore(state => state.tableState);
  const bettingInfo = usePokerStore(state => state.bettingInfo);
  const players = usePokerStore(state => state.players);
  const allPlayersBettingState = usePokerStore(state => state.allPlayersBettingState);
  const communityCards = usePokerStore(state => state.communityCards);
  const decryptedCommunityCards = usePokerStore(state => state.decryptedCommunityCards);
  const revealedCards = usePokerStore(state => state.revealedCards);
  const lastPot = usePokerStore(state => state.lastPot);
  const lastUpdate = usePokerStore(state => state.lastUpdate); // Subscribe to force re-renders
  const refreshAll = usePokerStore(state => state.refreshAll);
  const clearTable = usePokerStore(state => state.clearTable);
  const setStoreTableId = usePokerStore(state => state.setCurrentTableId);
  const setContractInfo = usePokerStore(state => state.setContractInfo);
  const setDecryptedCommunityCards = usePokerStore(state => state.setDecryptedCommunityCards);
  
  // Derived state - use useMemo to ensure recalculation on store updates
  const playerState = useMemo(() => {
    const state = userAddress ? allPlayersBettingState[userAddress.toLowerCase()] : undefined;
    return state;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userAddress, allPlayersBettingState, bettingInfo, lastUpdate]); // lastUpdate intentionally included to force recalc
  
  const isSeated = useMemo(() => {
    if (!userAddress) return false;
    return players.some(p => p.toLowerCase() === userAddress.toLowerCase());
  }, [userAddress, players]);
  
  // Store state tracking

  // Setup contract info in store
  useEffect(() => {
    if (pokerContract.address && provider) {
      setContractInfo(pokerContract.address, provider);
    }
  }, [pokerContract.address, provider, setContractInfo]);

  // Sync currentTableId to store
  useEffect(() => {
    setStoreTableId(currentTableId ?? null);
  }, [currentTableId, setStoreTableId]);

  // Persist currentTableId to localStorage whenever it changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (currentTableId !== undefined) {
        window.localStorage.setItem('poker:lastTableId', currentTableId.toString());
      } else {
        window.localStorage.removeItem('poker:lastTableId');
      }
    } catch {
      // ignore storage errors
    }
  }, [currentTableId]);

  // Hydrate currentTableId on client boot for seated users after refresh
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentTableId !== undefined) return; // already set
    try {
      const last = window.localStorage.getItem('poker:lastTableId');
      if (last) {
        const hydratedId = BigInt(last);
        setCurrentTableId(hydratedId);
        // Trigger immediate refresh to sync UI and start listeners
        refreshAll(hydratedId);
      }
    } catch {
      // ignore parse/storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset local decrypted data when switching tables
  useEffect(() => {
    // Clear decrypted state when table changes
    setCards([undefined, undefined]);
    setDecryptedCommunityCards([]);
    // Also clear store's cached decrypted cards
    usePokerStore.getState().setDecryptedCommunityCards([]);
  }, [currentTableId, setDecryptedCommunityCards]);

  // Reset local decrypted data at the start of a new round
  useEffect(() => {
    const round = tableState?.currentRound;
    const roundStr = typeof round === 'bigint' || typeof round === 'number' ? round.toString() : undefined;
    if (roundStr !== undefined) {
      if (previousRoundRef.current !== undefined && roundStr !== previousRoundRef.current) {
        console.log(`🔄 New round detected: ${previousRoundRef.current} -> ${roundStr}, clearing cards`);
        setCards([undefined, undefined]);
        setDecryptedCommunityCards([]);
        setIsDecrypting(false);
        isDecryptingRef.current = false;
        // Clear both local and store cached data
        usePokerStore.getState().setDecryptedCommunityCards([]);
        usePokerStore.getState().clearDealtCardsTracking(); // Clear dealt cards tracking
        // Gentle prompt for users to decrypt again
        setMessage("New round started. 🔓 Decrypt your cards to view them.");
      }
      previousRoundRef.current = roundStr;
    }
  }, [tableState?.currentRound, setDecryptedCommunityCards]);

  // Check if stored cards are from a different round (page refresh scenario)
  useEffect(() => {
    const currentRound = tableState?.currentRound;
    const storedRound = usePokerStore.getState().storedRound;
    
    if (currentRound !== undefined && storedRound !== null && currentRound !== storedRound) {
      console.log(`🔄 Round mismatch detected (current: ${currentRound.toString()}, stored: ${storedRound.toString()}), clearing old cards`);
      setCards([undefined, undefined]);
      setDecryptedCommunityCards([]);
      setIsDecrypting(false);
      isDecryptingRef.current = false;
      usePokerStore.getState().setDecryptedCommunityCards([]);
      usePokerStore.getState().clearRevealedCards();
      usePokerStore.getState().clearDealtCardsTracking();
    }
    
    // Update stored round
    if (currentRound !== undefined) {
      usePokerStore.getState().setStoredRound(currentRound);
    }
  }, [tableState?.currentRound, setDecryptedCommunityCards]);

  // Clear cards when game state transitions (especially from Finished to Waiting/Playing)
  useEffect(() => {
    const gameState = tableState?.state;
    if (gameState !== undefined && previousGameStateRef.current !== undefined) {
      // Clear cards when transitioning from Finished (2) to Waiting (0) or Playing (1)
      if (previousGameStateRef.current === 2 && (gameState === 0 || gameState === 1)) {
        console.log(`🔄 Game state transition: Finished -> ${gameState === 0 ? 'Waiting' : 'Playing'}, clearing cards`);
        setCards([undefined, undefined]);
        setDecryptedCommunityCards([]);
        setIsDecrypting(false);
        isDecryptingRef.current = false;
        // Clear both local and store cached data
        usePokerStore.getState().setDecryptedCommunityCards([]);
        usePokerStore.getState().clearDealtCardsTracking(); // Clear dealt cards tracking
        usePokerStore.getState().clearRevealedCards(); // Clear revealed cards from previous round
      }
      
      // Fetch revealed cards when transitioning to Finished state (showdown)
      if (previousGameStateRef.current === 1 && gameState === 2 && currentTableId) {
        console.log(`🎴 Game state transition: Playing -> Finished, fetching revealed cards for all players`);
        // Fetch revealed cards for all players
        players.forEach((playerAddr) => {
          usePokerStore.getState().fetchRevealedCards(currentTableId, playerAddr);
        });
      }
    }
    previousGameStateRef.current = gameState;
  }, [tableState?.state, currentTableId, players, setDecryptedCommunityCards]);

  // Client-side countdown using turnStartTime and playerActionTimeout
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (tableState?.state === 1 && tableState.turnStartTime && tableState.playerActionTimeout) {
      const startMs = Number(tableState.turnStartTime) * 1000;
      const timeoutSec = Number(tableState.playerActionTimeout);
      const tick = () => {
        const now = Date.now();
        const elapsedSec = Math.floor((now - startMs) / 1000);
        const remaining = Math.max(0, timeoutSec - elapsedSec);
        setTimeRemaining(remaining);
      };
      tick();
      interval = setInterval(tick, 1000);
    } else {
      setTimeRemaining(null);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tableState?.state, tableState?.turnStartTime, tableState?.playerActionTimeout]);

  // Auto-skip timed-out player (anyone can call this once time is up)
  useEffect(() => {
    if (
      timeRemaining === 0 &&
      pokerContract.address &&
      currentTableId &&
      ethersSigner &&
      !timeoutHandledRef.current
    ) {
      timeoutHandledRef.current = true;
      (async () => {
        try {
          const address = pokerContract.address as string;
          const contract = new ethers.Contract(address, pokerContract.abi, ethersSigner);
          await contract.skipTimedOutPlayer(currentTableId);
          setMessage("⏱️ Player timed out. Auto-folded and advanced to next player.");
          refreshAll(currentTableId);
        } catch {
          // ignore failures (another client may have called it)
        } finally {
          setTimeout(() => {
            timeoutHandledRef.current = false;
          }, 2000);
        }
      })();
    }
  }, [timeRemaining, pokerContract.address, pokerContract.abi, currentTableId, ethersSigner, refreshAll]);

  // Wagmi event listeners - auto-refreshes store when events fire
  // Relies on WebSocket for real-time updates (with 10s backup polling when WS disconnected)
  usePokerWagmi(
    pokerContract.address,
    currentTableId ?? null,
    true // enabled
  );

  // Create a new poker table
  const createTable = useCallback(
    async (minBuyIn: string, maxPlayers: number, smallBlind: string, bigBlind: string) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) {
        setMessage("Contract not deployed or signer not available");
        return;
      }

      try {
        isLoadingRef.current = true;
        setCurrentAction("Creating");

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        setMessage("Creating poker table...");

        // Now show loading state for processing
        setIsLoading(true);

        // Show transaction confirmation modal BEFORE calling contract (wallet will popup now)
        usePokerStore.getState().setPendingTransaction("Creating Table");
        
        const tx = await contract.createTable(
          ethers.parseEther(minBuyIn),
          maxPlayers,
          ethers.parseEther(smallBlind),
          ethers.parseEther(bigBlind)
        );

        setMessage(`Waiting for transaction: ${tx.hash}`);
        
        const receipt = await tx.wait();
        usePokerStore.getState().setPendingTransaction(null);

        // Parse the TableCreated event to get the table ID
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const event = receipt?.logs.find((log: any) => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed?.name === "TableCreated";
          } catch {
            return false;
          }
        });

        if (event) {
          const parsed = contract.interface.parseLog(event);
          const newTableId = parsed?.args.tableId;
          setCurrentTableId(newTableId);
          setMessage(`Table created! ID: ${newTableId.toString()}`);
        }
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Provide helpful error messages
        if (errorMessage.includes("BUY_IN_TOO_LOW")) {
          setMessage("❌ Min Buy-In must be at least 20× the Big Blind!");
        } else if (errorMessage.includes("INVALID_BLINDS")) {
          setMessage("❌ Big Blind must be larger than Small Blind!");
        } else if (errorMessage.includes("INVALID_MAX_PLAYERS")) {
          setMessage("❌ Max players must be between 2 and 10!");
        } else if (errorMessage.includes("INVALID_BUY_IN")) {
          setMessage("❌ Buy-In amount must be greater than 0!");
        } else {
          setMessage(`❌ Failed to create table: ${errorMessage}`);
        }
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner]
  );

  // Join a table
  const joinTable = useCallback(
    async (tableId: bigint, buyInAmount: string) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) {
        setMessage("Contract not deployed or signer not available");
        return;
      }

      try {
        isLoadingRef.current = true;
        setCurrentAction("Joining");

        // ⚡ CRITICAL: Set tableId BEFORE transaction to start event listeners early
        console.log('🎯 Setting currentTableId BEFORE transaction to start event listeners');
        setCurrentTableId(tableId);

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        setMessage("Joining table...");

        // Now show loading state for data refresh
        setIsLoading(true);

        // Show transaction confirmation modal BEFORE calling contract (wallet will popup now)
        usePokerStore.getState().setPendingTransaction("Joining Table");
        
        const tx = await contract.joinTable(tableId, {
          value: ethers.parseEther(buyInAmount),
        });

        setMessage(`Waiting for transaction: ${tx.hash}`);
        
        try {
          await tx.wait();
          usePokerStore.getState().setPendingTransaction(null);
          console.log('✅ Join transaction confirmed');
        } catch (waitError) {
          usePokerStore.getState().setPendingTransaction(null);
          console.warn('Transaction wait error (non-critical):', waitError);
          // Continue even if wait fails - the transaction might still be successful
        }

        setMessage(`✅ Successfully joined table ${tableId.toString()}!`);

        // ⚡ Hard refresh: clear store then force immediate refresh to get latest state
        try { clearTable(); } catch {}
        console.log('🔄 Force refreshing table state after join');
        await refreshAll(tableId);
        
        console.log('🎰 Event listeners now active and state refreshed');
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Check for specific error messages - player is already seated at this table
        if (errorMessage.includes("SEATED") || errorMessage.includes("ALREADY_SEATED") || errorMessage.includes("GAME_IN_PROGRESS")) {
          console.log('⚠️ Player already seated at table, setting ID and refreshing state');
          setCurrentTableId(tableId); // Set it anyway so they can see the table
          setMessage("⚠️ You are already seated at this table!");

          // ⚡ Hard refresh: clear store then refresh state to show current game
          try { clearTable(); } catch {}
          await refreshAll(tableId);
          
          // Don't throw error - allow the view to switch to game
          return;
        } else if (errorMessage.includes("TABLE_FULL")) {
          setMessage("❌ This table is full. Try another table.");
          setCurrentTableId(undefined); // Clear since we're not joining
        } else if (errorMessage.includes("INSUFFICIENT_BUY_IN")) {
          setMessage("❌ Buy-in amount is too low for this table.");
          setCurrentTableId(undefined); // Clear since we're not joining
        } else {
          setMessage(`❌ Failed to join table: ${errorMessage}`);
          setCurrentTableId(undefined); // Clear on unknown error
        }
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner, refreshAll, clearTable]
  );

  // Advance game (from countdown to playing)
  const advanceGame = useCallback(
    async (tableId: bigint) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) {
        return;
      }

      try {
        isLoadingRef.current = true;
        setCurrentAction("Advancing");

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        setMessage("Advancing game...");

        // Show transaction confirmation modal BEFORE calling contract (wallet will popup now)
        usePokerStore.getState().setPendingTransaction("Starting Game");
        
        const tx = await contract.advanceGame(tableId);

        setMessage(`Waiting for transaction: ${tx.hash}`);
        await tx.wait();
        usePokerStore.getState().setPendingTransaction(null);
        
        // Now show loading state for data refresh
        setIsLoading(true);
        setMessage("✅ Game advanced! Loading table...");
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage(`Failed to advance game: ${errorMessage}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner]
  );

  // Poker actions
  const fold = useCallback(
    async (tableId: bigint) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setCurrentAction("Folding");
        setPendingAction("fold"); // Optimistic update
        const contract = new ethers.Contract(pokerContract.address, pokerContract.abi, ethersSigner);
        setMessage("Folding...");
        
        // Show transaction confirmation modal BEFORE calling contract (wallet will popup now)
        usePokerStore.getState().setPendingTransaction("Folding");
        const tx = await contract.fold(tableId);
        await tx.wait();
        usePokerStore.getState().setPendingTransaction(null);
        
        // Now show loading state for data refresh
        setIsLoading(true);
        setMessage("✅ Folded!");
        setPendingAction(null);
        
        // Track action in store
        if (userAddress) {
          usePokerStore.getState().setPlayerAction(userAddress, 'Fold');
        }
        
        // ⚡ Force immediate refresh after action
        await refreshAll(tableId);
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage(`❌ Failed to fold: ${errorMessage}`);
        setPendingAction(null);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner, userAddress, refreshAll]
  );

  const check = useCallback(
    async (tableId: bigint) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setCurrentAction("Checking");
        setPendingAction("check"); // Optimistic update
        const contract = new ethers.Contract(pokerContract.address, pokerContract.abi, ethersSigner);
        setMessage("Checking...");
        
        // Show transaction confirmation modal BEFORE calling contract (wallet will popup now)
        usePokerStore.getState().setPendingTransaction("Checking");
        const tx = await contract.check(tableId);
        await tx.wait();
        usePokerStore.getState().setPendingTransaction(null);
        
        // Now show loading state for data refresh
        setIsLoading(true);
        setMessage("✅ Checked!");
        setPendingAction(null);
        
        // Track action in store
        if (userAddress) {
          usePokerStore.getState().setPlayerAction(userAddress, 'Check');
        }
        
        // ⚡ Force immediate refresh after action
        await refreshAll(tableId);
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage(`❌ Failed to check: ${errorMessage}`);
        setPendingAction(null);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner, userAddress, refreshAll]
  );

  const call = useCallback(
    async (tableId: bigint) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setCurrentAction("Calling");
        setPendingAction("call"); // Optimistic update
        const address = pokerContract.address as string;
        const contract = new ethers.Contract(address, pokerContract.abi, ethersSigner);

        // Pre-check to avoid overflow/underflow when computing amountToCall on-chain
        try {
          const [betting, myState] = await Promise.all([
            contract.getBettingInfo(tableId),
            userAddress ? contract.getPlayerBettingState(tableId, userAddress) : Promise.resolve(null),
          ]);
          if (betting && myState) {
            const currentBetOnChain: bigint = betting[1];
            const myCurrentBet: bigint = myState[1];
            if (myCurrentBet >= currentBetOnChain) {
              setMessage("⚠️ No bet to call. You are already matched.");
              setPendingAction(null);
              return;
            }
          }
        } catch {
          // ignore read errors
        }

        setMessage("Calling...");
        
        // Show transaction confirmation modal BEFORE calling contract (wallet will popup now)
        usePokerStore.getState().setPendingTransaction("Calling");
        const tx = await contract.call(tableId);
        await tx.wait();
        usePokerStore.getState().setPendingTransaction(null);
        
        // Now show loading state for data refresh
        setIsLoading(true);
        setMessage("✅ Called!");
        setPendingAction(null);
        
        // Track action in store
        if (userAddress) {
          usePokerStore.getState().setPlayerAction(userAddress, 'Call');
        }
        
        // ⚡ Force immediate refresh after action
        await refreshAll(tableId);
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage(`❌ Failed to call: ${errorMessage}`);
        setPendingAction(null);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner, userAddress, refreshAll]
  );

  const raise = useCallback(
    async (tableId: bigint, raiseAmount: string) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setCurrentAction("Raising");
        setPendingAction("raise"); // Optimistic update
        const contract = new ethers.Contract(pokerContract.address, pokerContract.abi, ethersSigner);
        setMessage("Raising...");
        
        // Show transaction confirmation modal BEFORE calling contract (wallet will popup now)
        usePokerStore.getState().setPendingTransaction(`Raising ${raiseAmount} ETH`);
        const tx = await contract.raise(tableId, ethers.parseEther(raiseAmount));
        await tx.wait();
        usePokerStore.getState().setPendingTransaction(null);
        
        // Now show loading state for data refresh
        setIsLoading(true);
        setMessage(`✅ Raised ${raiseAmount} ETH!`);
        setPendingAction(null);
        
        // Track action in store
        if (userAddress) {
          usePokerStore.getState().setPlayerAction(userAddress, 'Raise', ethers.parseEther(raiseAmount));
        }
        
        // ⚡ Force immediate refresh after action
        await refreshAll(tableId);
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage(`❌ Failed to raise: ${errorMessage}`);
        setPendingAction(null);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner, userAddress, refreshAll]
  );

  // Refresh table state
  const refreshTableState = useCallback(
    (tableId: bigint) => {
      refreshAll(tableId);
    },
    [refreshAll]
  );

  // Decrypt hole cards with retry logic (same as community cards)
  const decryptCards = useCallback(
    async (tableId: bigint, retryCount = 0): Promise<boolean> => {
      if (
        !pokerContract.address ||
        !instance ||
        !ethersSigner
      ) {
        return false;
      }

      // Only block on first attempt, allow retries to proceed
      if (isDecryptingRef.current && retryCount === 0) {
        return false;
      }

      try {
        if (retryCount === 0) {
          isDecryptingRef.current = true;
          setIsDecrypting(true);
        }
        
        setCurrentAction("Decrypting Your Cards");
        setMessage("Decrypting your cards...");

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        console.log('🔍 Calling getMyHoleCards...', {
          tableId: tableId.toString(),
          contractAddress: pokerContract.address,
          signerAddress: await ethersSigner.getAddress(),
          retryCount,
        });

        const [card1Handle, card2Handle] = await contract.getMyHoleCards(tableId);
        console.log('✅ Got card handles:', { card1Handle, card2Handle });

        setMessage("Decrypting cards...");

        // Show transaction confirmation modal for signature (only on first attempt)
        if (retryCount === 0) {
          usePokerStore.getState().setPendingTransaction("Decrypting Your Cards");
        }

        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [pokerContract.address as `0x${string}`],
          ethersSigner,
          fhevmDecryptionSignatureStorage,
          undefined, // keyPair
          smartAccountAddress // Use smart account address if available
        );

        if (!sig) {
          usePokerStore.getState().setPendingTransaction(null);
          setMessage("Unable to build FHEVM decryption signature");
          isDecryptingRef.current = false;
          setIsDecrypting(false);
          return false;
        }

        const res = await instance.userDecrypt(
          [
            { handle: card1Handle, contractAddress: pokerContract.address },
            { handle: card2Handle, contractAddress: pokerContract.address },
          ],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        usePokerStore.getState().setPendingTransaction(null);

        const card1Value = Number(res[card1Handle]);
        const card2Value = Number(res[card2Handle]);

        setCards([
          { handle: card1Handle, clear: card1Value },
          { handle: card2Handle, clear: card2Value },
        ]);

        setMessage("✅ Cards decrypted!");
        setCurrentAction(undefined);
        
        // Success - clear decrypting state
        isDecryptingRef.current = false;
        setIsDecrypting(false);
        return true;
        
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        console.error('❌ Decrypt cards error:', error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        const isNotDealtError = errorMessage.includes("CARDS_NOT_DEALT");
        const isRelayerError = errorMessage.includes('520') || errorMessage.includes('relayer') || errorMessage.includes('network');
        
        // Retry logic: max 10 attempts (30 seconds total)
        if ((isNotDealtError || isRelayerError) && retryCount < 10) {
          const reason = isRelayerError ? 'Relayer error' : 'Cards not dealt yet';
          console.log(`⏳ ${reason}, retrying in 3s... (${retryCount + 1}/10)`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          return decryptCards(tableId, retryCount + 1);
        }
        
        // Max retries reached or different error
        let userMessage = '❌ Failed to decrypt hole cards';
        if (isRelayerError) {
          userMessage = '⚠️ Zama relayer is unavailable. Please try again later or contact support.';
        } else if (isNotDealtError) {
          userMessage = '⏳ Cards are being dealt... Please wait a moment and try again.';
        } else if (errorMessage.includes("NOT_SEATED")) {
          userMessage = "You are not seated at this table";
        } else if (errorMessage.includes("TABLE_NOT_FOUND")) {
          userMessage = "Table not found";
        } else {
          userMessage = `❌ Failed to decrypt: ${errorMessage}`;
        }
        
        setMessage(userMessage);
        setCurrentAction(undefined);
        
        isDecryptingRef.current = false;
        setIsDecrypting(false);
        return false;
      }
    },
    [pokerContract, instance, ethersSigner, fhevmDecryptionSignatureStorage, smartAccountAddress]
  );

  // Decrypt community cards with retry logic
  const decryptCommunityCards = useCallback(
    async (tableId: bigint, retryCount = 0): Promise<boolean> => {
      if (
        !pokerContract.address ||
        !instance ||
        !ethersSigner
      ) {
        return false;
      }

      // Only block on first attempt, allow retries to proceed
      if (isDecryptingRef.current && retryCount === 0) {
        return false;
      }

      try {
        if (retryCount === 0) {
          isDecryptingRef.current = true;
          setIsDecrypting(true);
        }
        
        // Set action label based on current street
        let actionLabel = "Decrypting";
        const street = communityCards?.currentStreet;
        if (street === 1) actionLabel = "Decrypting Flop";
        else if (street === 2) actionLabel = "Decrypting Turn";
        else if (street === 3) actionLabel = "Decrypting River";
        setCurrentAction(actionLabel);
        setMessage("Decrypting community cards...");

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        const communityCardsData = await contract.getCommunityCards(tableId);
        
        // communityCardsData = [currentStreet, flopCard1, flopCard2, flopCard3, turnCard, riverCard]
        const currentStreet = Number(communityCardsData[0]);
        const handles = [
          communityCardsData[1], // flopCard1
          communityCardsData[2], // flopCard2
          communityCardsData[3], // flopCard3
          communityCardsData[4], // turnCard
          communityCardsData[5], // riverCard
        ];

        // Filter out zero handles (undealt cards) and only decrypt based on current street
        const validHandles = [];
        if (currentStreet >= 1) {
          // Flop cards (3 cards)
          validHandles.push(handles[0], handles[1], handles[2]);
        }
        if (currentStreet >= 2) {
          // Turn card
          validHandles.push(handles[3]);
        }
        if (currentStreet >= 3) {
          // River card
          validHandles.push(handles[4]);
        }

        // Check if we have any valid handles to decrypt
        const hasValidHandles = validHandles.some(
          (h) => h && h !== "0x0000000000000000000000000000000000000000000000000000000000000000"
        );

        if (!hasValidHandles) {
          setMessage("⚠️ No community cards to decrypt yet");
          isDecryptingRef.current = false;
          setIsDecrypting(false);
          return false;
        }

        setMessage("Decrypting community cards...");

        // Show transaction confirmation modal for signature
        usePokerStore.getState().setPendingTransaction(actionLabel);

        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [pokerContract.address as `0x${string}`],
          ethersSigner,
          fhevmDecryptionSignatureStorage,
          undefined, // keyPair
          smartAccountAddress // Use smart account address if available
        );

        if (!sig) {
          usePokerStore.getState().setPendingTransaction(null);
          setMessage("Unable to build FHEVM decryption signature");
          isDecryptingRef.current = false;
          setIsDecrypting(false);
          return false;
        }

        const decryptRequests = validHandles.map((handle) => ({
          handle,
          contractAddress: pokerContract.address as string,
        }));

        const res = await instance.userDecrypt(
          decryptRequests,
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        usePokerStore.getState().setPendingTransaction(null);

        // ✅ PRESERVE previously decrypted cards and merge with new ones
        // Get current decrypted cards from store
        const existingDecrypted = usePokerStore.getState().decryptedCommunityCards || [];
        
        // Start with existing decrypted cards (or empty array)
        const decryptedValues: (number | undefined)[] = [...existingDecrypted];
        // Ensure array has 5 slots
        while (decryptedValues.length < 5) {
          decryptedValues.push(undefined);
        }
        
        let validIndex = 0;
        
        console.log(`🎴 Decrypting community cards for street ${currentStreet}, validHandles:`, validHandles.length);
        console.log(`🔄 Existing decrypted cards:`, existingDecrypted);
        
        // Only update the cards that we just decrypted
        if (currentStreet >= 1) {
          decryptedValues[0] = Number(res[validHandles[validIndex++]]);
          decryptedValues[1] = Number(res[validHandles[validIndex++]]);
          decryptedValues[2] = Number(res[validHandles[validIndex++]]);
        }
        if (currentStreet >= 2) {
          decryptedValues[3] = Number(res[validHandles[validIndex++]]);
        }
        if (currentStreet >= 3) {
          decryptedValues[4] = Number(res[validHandles[validIndex++]]);
        }

        console.log(`✅ Decrypted community cards (merged):`, decryptedValues);
        console.log(`📦 Storing in Zustand store...`);
        
        // Store decrypted community cards in Zustand (survives refreshes)
        setDecryptedCommunityCards(decryptedValues);
        
        // Verify storage
        const stored = usePokerStore.getState().decryptedCommunityCards;
        console.log(`🔍 Verified stored community cards:`, stored);
        
        setMessage("✅ Community cards decrypted!");
        
        // Success - clear decrypting state
        isDecryptingRef.current = false;
        setIsDecrypting(false);
        setCurrentAction(undefined);
        return true;
        
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isNotDealtError = errorMessage.includes('COMMUNITY_CARDS_NOT_DEALT');
        const isRelayerError = errorMessage.includes('520') || errorMessage.includes('relayer') || errorMessage.includes('network');
        
        // Retry logic: max 10 attempts (30 seconds total)
        if ((isNotDealtError || isRelayerError) && retryCount < 10) {
          const reason = isRelayerError ? 'Relayer error' : 'Cards not dealt yet';
          console.log(`⏳ ${reason}, retrying in 3s... (${retryCount + 1}/10)`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          return decryptCommunityCards(tableId, retryCount + 1);
        }
        
        // Max retries reached or different error
        console.error('❌ Decrypt community cards error:', error);
        
        let userMessage = '❌ Failed to decrypt community cards';
        if (isRelayerError) {
          userMessage = '⚠️ Zama relayer is unavailable. Please try again later or contact support.';
        } else if (isNotDealtError) {
          userMessage = '⚠️ Cards not available yet. Please wait for the next street.';
        } else {
          userMessage = `❌ Failed to decrypt: ${errorMessage}`;
        }
        
        setMessage(userMessage);
        
        isDecryptingRef.current = false;
        setIsDecrypting(false);
        setCurrentAction(undefined);
        return false;
      }
    },
    [pokerContract, instance, ethersSigner, fhevmDecryptionSignatureStorage, communityCards?.currentStreet, smartAccountAddress, setDecryptedCommunityCards]
  );

  // Leave table and withdraw all chips
  const leaveTable = useCallback(
    async (tableId: bigint) => {
      console.log('🚪 leaveTable called for tableId:', tableId.toString());
      
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) {
        const msg = "Contract not deployed or signer not available";
        console.error('❌ leaveTable failed:', msg);
        setMessage(msg);
        return;
      }

      try {
        isLoadingRef.current = true;
        setCurrentAction("Leaving");

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        console.log('📝 Calling contract.leaveTable...');
        setMessage("Leaving table...");

        // Show transaction confirmation modal BEFORE calling contract (wallet will popup now)
        usePokerStore.getState().setPendingTransaction("Leaving Table");
        
        const tx = await contract.leaveTable(tableId);
        console.log('✅ Transaction sent:', tx.hash);

        setMessage(`Waiting for transaction: ${tx.hash}`);
        
        try {
          await tx.wait();
          usePokerStore.getState().setPendingTransaction(null);
          console.log('✅ Transaction confirmed');
        } catch (waitError) {
          usePokerStore.getState().setPendingTransaction(null);
          console.warn('Transaction wait error (non-critical):', waitError);
          // Continue even if wait fails - the transaction might still be successful
        }
        
        // Now show loading state for processing
        setIsLoading(true);

        setMessage(`✅ Successfully left table ${tableId.toString()} and withdrew all chips!`);
        
        // Clear current table if leaving the active table
        if (currentTableId === tableId) {
          setCurrentTableId(undefined);
        }
      } catch (error) {
        console.error('❌ leaveTable error:', error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage.includes("NOT_SEATED")) {
          setMessage("⚠️ You are not seated at this table.");
          throw new Error("You are not seated at this table");
        } else if (errorMessage.includes("CANNOT_LEAVE_DURING_GAME")) {
          setMessage("❌ Cannot leave table during an active game. Wait for the game to finish.");
          throw new Error("Cannot leave table during an active game");
        } else if (errorMessage.includes("NO_CHIPS_TO_WITHDRAW")) {
          setMessage("❌ No chips to withdraw.");
          throw new Error("No chips to withdraw");
        } else if (errorMessage.includes("user rejected")) {
          setMessage("❌ Transaction rejected by user.");
          throw new Error("Transaction rejected by user");
        } else {
          setMessage(`❌ Failed to leave table: ${errorMessage}`);
          throw error;
        }
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner, currentTableId]
  );

  // Withdraw chips from table while staying seated
  const withdrawChips = useCallback(
    async (tableId: bigint, amount: string) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) {
        setMessage("Contract not deployed or signer not available");
        return;
      }

      try {
        isLoadingRef.current = true;
        setCurrentAction("Withdrawing");

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        setMessage("Withdrawing chips...");

        // Show transaction confirmation modal BEFORE calling contract (wallet will popup now)
        usePokerStore.getState().setPendingTransaction(`Withdrawing ${amount} ETH`);
        
        const tx = await contract.withdrawChips(tableId, ethers.parseEther(amount));

        setMessage(`Waiting for transaction: ${tx.hash}`);
        await tx.wait();
        usePokerStore.getState().setPendingTransaction(null);
        
        // Now show loading state for data refresh
        setIsLoading(true);
        setMessage(`✅ Successfully withdrew ${amount} ETH!`);
        
        // Refresh table state to show updated balance
        refreshAll(tableId);
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage.includes("NOT_SEATED")) {
          setMessage("⚠️ You are not seated at this table.");
          throw new Error("You are not seated at this table");
        } else if (errorMessage.includes("CANNOT_WITHDRAW_DURING_GAME")) {
          setMessage("❌ Cannot withdraw chips during an active game. Wait for the game to finish.");
          throw new Error("Cannot withdraw chips during an active game");
        } else if (errorMessage.includes("INSUFFICIENT_CHIPS")) {
          setMessage("❌ You don't have enough chips to withdraw that amount.");
          throw new Error("Insufficient chips");
        } else if (errorMessage.includes("MUST_LEAVE_MIN_BUYIN_OR_WITHDRAW_ALL")) {
          setMessage("❌ You must leave at least the minimum buy-in amount or withdraw all chips.");
          throw new Error("Must leave minimum buy-in or withdraw all");
        } else {
          setMessage(`❌ Failed to withdraw chips: ${errorMessage}`);
          throw error;
        }
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner, refreshAll]
  );

  // Add chips to your stack (top up / rebuy)
  const addChips = useCallback(
    async (tableId: bigint, amount: string) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) {
        setMessage("Contract not deployed or signer not available");
        return;
      }

      try {
        isLoadingRef.current = true;
        setCurrentAction("Adding");

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        setMessage("Adding chips to your stack...");

        // Show transaction confirmation modal BEFORE calling contract (wallet will popup now)
        usePokerStore.getState().setPendingTransaction(`Adding ${amount} ETH`);
        
        const tx = await contract.addChips(tableId, {
          value: ethers.parseEther(amount),
        });

        setMessage(`Waiting for transaction: ${tx.hash}`);
        await tx.wait();
        usePokerStore.getState().setPendingTransaction(null);
        
        // Now show loading state for data refresh
        setIsLoading(true);
        setMessage(`✅ Successfully added ${amount} ETH to your stack!`);
        
        // Refresh table state to show updated balance
        refreshAll(tableId);
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        if (errorMessage.includes("NOT_SEATED")) {
          setMessage("⚠️ You are not seated at this table.");
          throw new Error("You are not seated at this table");
        } else if (errorMessage.includes("CANNOT_ADD_CHIPS_DURING_GAME")) {
          setMessage("❌ Cannot add chips during an active game. Wait for the game to finish.");
          throw new Error("Cannot add chips during an active game");
        } else if (errorMessage.includes("MUST_SEND_ETH")) {
          setMessage("❌ You must send ETH to add chips.");
          throw new Error("Must send ETH to add chips");
        } else {
          setMessage(`❌ Failed to add chips: ${errorMessage}`);
          throw error;
        }
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner, refreshAll]
  );

  // Check if FHE decryption is pending during showdown
  const checkDecryptionPending = useCallback(
    async (tableId: bigint): Promise<{ isPending: boolean; requestId: bigint } | null> => {
      if (!pokerContract.address || !provider) return null;

      try {
        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          provider
        );

        // Check if function exists (might be old contract)
        if (typeof contract.isDecryptionPending !== 'function') {
          console.warn('⚠️ [Showdown] isDecryptionPending not available (old contract?)');
          return null;
        }

        const [isPending, requestId] = await contract.isDecryptionPending(tableId);
        console.log(`🔍 [Showdown] Decryption pending status:`, { isPending, requestId: requestId.toString() });
        
        return { isPending, requestId };
      } catch (error) {
        console.warn('⚠️ [Showdown] Failed to check decryption pending:', error);
        return null;
      }
    },
    [pokerContract, provider]
  );

  // Track WebSocket connection status
  useEffect(() => {
    // Simple connection tracking based on WebSocket hook
    if (currentTableId && pokerContract.address && provider) {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, [currentTableId, pokerContract.address, provider]);

  return {
    contractAddress: pokerContract.address,
    isDeployed,
    currentTableId,
    tableState,
    bettingInfo,
    playerState,
    allPlayersBettingState,
    players,
    cards,
    communityCards,
    decryptedCommunityCards, // From Zustand store (survives refreshes)
    revealedCards, // Player revealed cards at showdown
    lastPot,
    message,
    isLoading,
    currentAction,
    isDecrypting,
    isConnected,
    timeRemaining,
    pendingAction,
    isSeated, // Computed from players list (more reliable than contract)
    createTable,
    joinTable,
    leaveTable,
    withdrawChips,
    addChips,
    advanceGame,
    fold,
    check,
    call,
    raise,
    refreshTableState,
    decryptCards,
    decryptCommunityCards,
    checkDecryptionPending,
    setCurrentTableId,
  };
};

