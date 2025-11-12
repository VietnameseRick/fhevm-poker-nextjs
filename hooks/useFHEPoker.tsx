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
  eoaAddress?: string; // EOA address for FHEVM decryption signatures
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    smartAccountAddress,
    eoaAddress,
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
        console.log(`🔄 New round detected: ${previousRoundRef.current} -> ${roundStr}, clearing all card data and refreshing state`);
        
        // Clear decryption signature cache for fresh signatures in new round
        console.log('🧹 Clearing decryption signature cache for new round...');
        try {
          fhevmDecryptionSignatureStorage.removeItem('fhevmDecryptionSignatures');
          console.log('✅ Decryption signature cache cleared for new round');
        } catch (cacheError) {
          console.warn('⚠️ Failed to clear signature cache:', cacheError);
        }
        
        // Clear all card-related data (local and store)
        usePokerStore.getState().clearAllCardData();
        setCards([undefined, undefined]);
        setDecryptedCommunityCards([]);
        setIsDecrypting(false);
        isDecryptingRef.current = false;
        
        // Refresh all data to get latest state (new cards, new round, etc.)
        if (currentTableId) {
          console.log(`🔄 Refreshing all table data for new round...`);
          usePokerStore.getState().refreshAll(currentTableId);
        }
        
        // Gentle prompt for users to decrypt again
        setMessage("New round started. 🔓 Decrypt your cards to view them.");
      }
      previousRoundRef.current = roundStr;
    }
  }, [tableState?.currentRound, currentTableId, setDecryptedCommunityCards, fhevmDecryptionSignatureStorage]);

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
      // Cache showdown data when game finishes
      if (previousGameStateRef.current === 1 && gameState === 2 && currentTableId) {
        console.log(`🎴 Game state transition: Playing -> Finished, caching showdown data`);
        // Fetch revealed cards for all players first
        players.forEach((playerAddr) => {
          usePokerStore.getState().fetchRevealedCards(currentTableId, playerAddr);
        });
        // Cache showdown data after a short delay to ensure revealed cards are fetched
        setTimeout(() => {
          usePokerStore.getState().cacheShowdownData();
        }, 1000);
      }
      
      // Clear cached showdown data when transitioning from Finished (2) to Playing (1) - new game started
      // Also clear when transitioning from Waiting (0) to Playing (1) - new game starting
      if ((previousGameStateRef.current === 2 || previousGameStateRef.current === 0) && gameState === 1) {
        console.log(`🔄 Game state transition: ${previousGameStateRef.current === 2 ? 'Finished' : 'Waiting'} -> Playing, clearing all card data and refreshing state`);
        
        // Clear all card-related data (local and store)
        usePokerStore.getState().clearAllCardData();
        setCards([undefined, undefined]);
        setDecryptedCommunityCards([]);
        setIsDecrypting(false);
        isDecryptingRef.current = false;
        
        // Refresh all data to get latest state (new cards, new round, etc.)
        if (currentTableId) {
          console.log(`🔄 Refreshing all table data for new game...`);
          usePokerStore.getState().refreshAll(currentTableId);
        }
      }
      
      // When transitioning from Finished to Waiting, keep cached showdown data
      // Don't clear anything - just let the cached data persist
      if (previousGameStateRef.current === 2 && gameState === 0) {
        console.log(`🔄 Game state transition: Finished -> Waiting, keeping cached showdown data`);
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
        
        // Provide helpful error messages (matching contract error codes)
        if (errorMessage.includes("BLW")) {
          setMessage("❌ Min Buy-In must be at least 20× the Big Blind!");
        } else if (errorMessage.includes("BL")) {
          setMessage("❌ Big Blind must be larger than Small Blind!");
        } else if (errorMessage.includes("MP")) {
          setMessage("❌ Max players must be between 2 and 10!");
        } else if (errorMessage.includes("BI")) {
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
          
          // Clear decryption signature cache for fresh signatures in this game
          console.log('🧹 Clearing decryption signature cache for new game...');
          try {
            fhevmDecryptionSignatureStorage.removeItem('fhevmDecryptionSignatures');
            console.log('✅ Decryption signature cache cleared');
          } catch (cacheError) {
            console.warn('⚠️ Failed to clear signature cache:', cacheError);
          }
          
          // Get the EOA address for decryption permission
          const signerAddress = await ethersSigner.getAddress();
          const decryptionUserAddress = eoaAddress || signerAddress;
          
          if (smartAccountAddress && smartAccountAddress.toLowerCase() !== decryptionUserAddress.toLowerCase()) {
            console.log('🔐 Smart account detected - granting EOA decryption permission...');
            console.log('🔐 EOA address for decryption:', decryptionUserAddress);
            
            usePokerStore.getState().setPendingTransaction("Granting Decryption Permission");
            setMessage("Granting EOA decryption permission...");
            
            try {
              const allowTx = await contract.allowEOADecryption(tableId, decryptionUserAddress);
              console.log('📝 allowEOADecryption tx sent:', allowTx.hash);
              
              setMessage(`Waiting for permission tx: ${allowTx.hash}`);
              await allowTx.wait();
              
              usePokerStore.getState().setPendingTransaction(null);
              console.log('✅ EOA decryption permission granted automatically after join');
            } catch (allowError) {
              usePokerStore.getState().setPendingTransaction(null);
              console.warn('⚠️ Failed to grant EOA permission (may already be granted):', allowError);
            }
          }
        } catch (waitError) {
          usePokerStore.getState().setPendingTransaction(null);
          console.warn('Transaction wait error (non-critical):', waitError);
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
        
        // Check for specific error messages (matching contract error codes)
        // "SEAT" = Already seated, "BM" = Buy-in minimum not met, "FULL" = Table full
        if (errorMessage.includes("SEAT")) {
          console.log('⚠️ Player already seated at table, setting ID and refreshing state');
          setCurrentTableId(tableId); // Set it anyway so they can see the table
          setMessage("⚠️ You are already seated at this table!");

          // ⚡ Hard refresh: clear store then refresh state to show current game
          try { clearTable(); } catch {}
          await refreshAll(tableId);
          
          // Don't throw error - allow the view to switch to game
          return;
        } else if (errorMessage.includes("FULL")) {
          setMessage("❌ This table is full. Try another table.");
          setCurrentTableId(undefined); // Clear since we're not joining
        } else if (errorMessage.includes("BM")) {
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
    [pokerContract, ethersSigner, refreshAll, clearTable, smartAccountAddress, eoaAddress, fhevmDecryptionSignatureStorage]
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
        
        // Try to decode the error if it's a revert with data
        let decodedError = errorMessage;
        try {
          // Check if error has data field (from MetaMask/ethers)
          if (error && typeof error === 'object' && 'data' in error) {
            const errorData = (error as { data?: string }).data;
            if (errorData && errorData.startsWith('0x')) {
              // Try to decode using contract interface
              const contract = new ethers.Contract(
                pokerContract.address!,
                pokerContract.abi,
                ethersSigner
              );
              try {
                const decoded = contract.interface.parseError(errorData);
                decodedError = decoded?.name || errorMessage;
                console.log('Decoded error:', decoded?.name, 'from data:', errorData);
              } catch {
                // If decoding fails, try to extract error message from the error object
                if (error && typeof error === 'object' && 'reason' in error) {
                  decodedError = (error as { reason?: string }).reason || errorMessage;
                }
              }
            }
          }
          // Also check for error.reason (ethers v6 format)
          if (error && typeof error === 'object' && 'reason' in error) {
            decodedError = (error as { reason?: string }).reason || decodedError;
          }
        } catch {
          // Ignore decoding errors
        }
        
        // Contract error codes for advanceGame:
        // "NF" = Table not found
        // "NP" = Not enough players (need at least 2)
        // "SB" = Small blind player doesn't have enough chips
        // "BB" = Big blind player doesn't have enough chips
        if (errorMessage.includes("NF") || decodedError.includes("NF")) {
          setMessage("❌ Table not found. Please check the table ID.");
        } else if (errorMessage.includes("NP") || decodedError.includes("NP")) {
          setMessage("❌ Not enough players. Need at least 2 players to start the game.");
        } else if (errorMessage.includes("SB") || decodedError.includes("SB")) {
          setMessage("❌ Small blind player doesn't have enough chips. They need to add more chips.");
        } else if (errorMessage.includes("BB") || decodedError.includes("BB")) {
          setMessage("❌ Big blind player doesn't have enough chips. They need to add more chips.");
        } else {
          // Show the error data if available for debugging
          const errorData = error && typeof error === 'object' && 'data' in error 
            ? (error as { data?: string }).data 
            : null;
          const debugInfo = errorData ? ` (Error data: ${errorData})` : '';
          setMessage(`❌ Failed to advance game: ${errorMessage}${debugInfo}`);
          console.error('Advance game error:', error);
        }
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

        // ==========================================
        // 🔐 FHEVM DECRYPTION - SMART ACCOUNT SUPPORT
        // ==========================================
        // When using smart accounts, cards are encrypted FOR the smart account address.
        // The EOA needs permission to decrypt them for client-side decryption.
        // 
        // Permission is automatically granted when joining a table (see joinTable function).
        // However, we check and grant again here as a fallback in case it wasn't done yet.
        // ==========================================
        
        // Get the actual signer address (could be EOA or smart account)
        const signerAddress = await ethersSigner.getAddress();
        
        // For decryption, we ALWAYS use the EOA address, not the smart account address
        // The FHEVM relayer expects the signature to be verifiable by the userAddress
        const decryptionUserAddress = eoaAddress || signerAddress;
        
        console.log('🔐 Decryption addresses:', {
          signerAddress,
          eoaAddress,
          smartAccountAddress,
          decryptionUserAddress,
        });
        
        if (smartAccountAddress && smartAccountAddress.toLowerCase() !== decryptionUserAddress.toLowerCase()) {
          console.log('🔐 Smart account detected - ensuring EOA has decryption permission...');
          
          try {
            const tx = await contract.allowEOADecryption(tableId, decryptionUserAddress);
            console.log('📝 allowEOADecryption tx sent:', tx.hash);
            await tx.wait();
            console.log('✅ EOA decryption permission granted');
          } catch (error) {
            console.warn('⚠️ Failed to grant EOA permission (likely already granted from joinTable):', error);
          }
        }
        
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [pokerContract.address as `0x${string}`],
          ethersSigner,
          fhevmDecryptionSignatureStorage,
          undefined, // keyPair - generated automatically if not provided
          decryptionUserAddress // CRITICAL: Use EOA address for signature - the address that will sign and decrypt
        );

        if (!sig) {
          usePokerStore.getState().setPendingTransaction(null);
          setMessage("Unable to build FHEVM decryption signature");
          isDecryptingRef.current = false;
          setIsDecrypting(false);
          return false;
        }

        console.log('🔓 Calling userDecrypt with:', {
          handles: [card1Handle, card2Handle],
          contractAddress: pokerContract.address,
          signerAddress,
          eoaAddress,
          decryptionUserAddress,
          smartAccountAddress,
          signatureUserAddress: sig.userAddress,
          note: smartAccountAddress ? 'Using EOA with permission from smart account' : 'Using EOA directly',
        });
        
        // Verify that the signature was created for the correct address
        if (decryptionUserAddress.toLowerCase() !== sig.userAddress.toLowerCase()) {
          console.error('❌ Signature address mismatch!', {
            expected: decryptionUserAddress,
            got: sig.userAddress,
          });
          throw new Error('Signature address mismatch. Please clear your decryption cache and try again.');
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
          decryptionUserAddress, // CRITICAL: Use EOA address - must match signature creator
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
        
        // Contract error codes: "CND" = Cards not dealt, "NS" = Not seated, "NF" = Table not found
        const isNotDealtError = errorMessage.includes("CND");
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
        } else if (errorMessage.includes("NS")) {
          userMessage = "You are not seated at this table";
        } else if (errorMessage.includes("NF")) {
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
    [pokerContract, instance, ethersSigner, fhevmDecryptionSignatureStorage, smartAccountAddress, eoaAddress]
  );

  // Decrypt community cards with retry logic
  const decryptCommunityCards = useCallback(
    async (tableId: bigint, retryCount = 0): Promise<boolean> => {
      if (
        !pokerContract.address ||
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

        // ==========================================
        // 🎯 COMMUNITY CARDS - USE ON-CHAIN DECRYPTED VALUES
        // ==========================================
        // Community cards are automatically decrypted on-chain via FHEVM callbacks
        // when they're dealt (flop, turn, river). We don't need client-side decryption!
        // Just read the decrypted values directly from the contract.
        // ==========================================
        
        console.log('📥 Fetching decrypted community cards from contract...');
        
        const decryptedCardsData = await contract.getDecryptedCommunityCards(tableId);
        
        // decryptedCardsData = [flopCard1, flopCard2, flopCard3, turnCard, riverCard]
        const decryptedValues: (number | undefined)[] = [
          Number(decryptedCardsData[0]) || undefined, // flopCard1
          Number(decryptedCardsData[1]) || undefined, // flopCard2
          Number(decryptedCardsData[2]) || undefined, // flopCard3
          Number(decryptedCardsData[3]) || undefined, // turnCard
          Number(decryptedCardsData[4]) || undefined, // riverCard
        ];
        
        console.log('✅ Got decrypted community cards from contract:', decryptedValues);
        
        // Store decrypted community cards in Zustand (survives refreshes)
        setDecryptedCommunityCards(decryptedValues);
        
        setMessage("✅ Community cards loaded!");
        
        // Success - clear decrypting state
        isDecryptingRef.current = false;
        setIsDecrypting(false);
        setCurrentAction(undefined);
        return true;
        
      } catch (error) {
        usePokerStore.getState().setPendingTransaction(null);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        // Contract error codes: "CCND" = Community cards not dealt
        const isNotDealtError = errorMessage.includes('CCND');
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
    [pokerContract, ethersSigner, communityCards?.currentStreet, setDecryptedCommunityCards]
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
        
        // Contract error codes: "NS" = Not seated, "NCW" = No chips to withdraw
        if (errorMessage.includes("NS")) {
          setMessage("⚠️ You are not seated at this table.");
          throw new Error("You are not seated at this table");
        } else if (errorMessage.includes("NCW")) {
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
        
        // Contract error codes: "NS" = Not seated, "IC" = Insufficient chips
        // "MMB" = Must leave min buy-in or withdraw all
        // "CWYT" = Cannot withdraw on your turn
        // "M10BB" = Must leave 10x big blind or withdraw all
        if (errorMessage.includes("NS")) {
          setMessage("⚠️ You are not seated at this table.");
          throw new Error("You are not seated at this table");
        } else if (errorMessage.includes("CWYT")) {
          setMessage("❌ Cannot withdraw chips during your turn. Wait for your turn to end or fold first.");
          throw new Error("Cannot withdraw on your turn");
        } else if (errorMessage.includes("IC")) {
          setMessage("❌ You don't have enough chips to withdraw that amount.");
          throw new Error("Insufficient chips");
        } else if (errorMessage.includes("MMB")) {
          setMessage("❌ You must leave at least the minimum buy-in amount or withdraw all chips.");
          throw new Error("Must leave minimum buy-in or withdraw all");
        } else if (errorMessage.includes("M10BB")) {
          setMessage("❌ You must leave at least 10× the Big Blind or withdraw all chips.");
          throw new Error("Must leave 10x big blind or withdraw all");
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

  // Add chips to stack while staying seated
  const addChips = useCallback(
    async (tableId: bigint, amount: string) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) {
        setMessage("Contract not deployed or signer not available");
        return;
      }

      try {
        isLoadingRef.current = true;
        setCurrentAction("Adding Chips");

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        setMessage("Adding chips...");

        // Show transaction confirmation modal BEFORE calling contract (wallet will popup now)
        usePokerStore.getState().setPendingTransaction(`Adding ${amount} ETH`);
        
        const tx = await contract.addChips(tableId, { value: ethers.parseEther(amount) });

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
        
        // Contract error codes: "NS" = Not seated, "MSE" = Must send ETH
        if (errorMessage.includes("NS")) {
          setMessage("⚠️ You are not seated at this table.");
          throw new Error("You are not seated at this table");
        } else if (errorMessage.includes("MSE")) {
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
  // Note: The contract doesn't expose isDecryptionPending as a public function
  // This function is kept for API compatibility but always returns null
  const checkDecryptionPending = useCallback(
    async (): Promise<{ isPending: boolean; requestId: bigint } | null> => {
      // Contract doesn't expose isDecryptionPending - decryption status is handled internally
      // We can infer decryption status from game state transitions instead
      return null;
    },
    []
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

