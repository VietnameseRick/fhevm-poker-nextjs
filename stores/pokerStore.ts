/**
 * FHE Poker Zustand Store
 * 
 * Copyright (c) 2025 0xDRick (Tra Anh Khoi)
 * Licensed under Business Source License 1.1 (see LICENSE-BSL)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ethers } from 'ethers';
import { FHEPokerABI } from '@/abi/FHEPokerABI';
import config from '@/utils/config';

// Types
export interface TableState {
  state: number;
  numPlayers: bigint;
  maxPlayers: bigint;
  minBuyIn: bigint;
  currentRound: bigint;
  isSeated: boolean;
  winner?: string;
  dealerIndex?: bigint;
  smallBlind?: bigint;
  bigBlind?: bigint;
  turnStartTime?: bigint;
  playerActionTimeout?: bigint;
}

export interface BettingInfo {
  pot: bigint;
  currentBet: bigint;
  currentPlayer: string;
  currentPlayerIndex: bigint;
  winner: string | undefined;
}

export interface PlayerBettingState {
  chips: bigint;
  currentBet: bigint;
  totalBet: bigint;
  hasFolded: boolean;
  hasActed: boolean;
  isCurrentPlayer: boolean;
}

export interface CommunityCards {
  currentStreet: number;
  flopCard1?: number;
  flopCard2?: number;
  flopCard3?: number;
  turnCard?: number;
  riverCard?: number;
}

export interface RevealedCards {
  card1: number;
  card2: number;
}

export interface PlayerAction {
  action: 'Fold' | 'Check' | 'Call' | 'Raise' | 'Bet' | 'All-In';
  amount?: bigint;
  timestamp: number;
}

interface PokerStore {
  // State
  currentTableId: bigint | null;
  tableState: TableState | null;
  bettingInfo: BettingInfo | null;
  players: string[];
  allPlayersBettingState: Record<string, PlayerBettingState>;
  communityCards: CommunityCards | null;
  decryptedCommunityCards: (number | undefined)[]; // Support undefined for undealt cards (0 is valid card value)
  revealedCards: Record<string, RevealedCards>;
  playerActions: Record<string, PlayerAction>; // Track last action per player
  playersWithDealtCards: Set<string>; // Track players who have cards dealt (for decrypt button)
  isLoading: boolean;
  message: string;
  lastPot: bigint;
  lastUpdate: number;
  storedRound: bigint | null; // Track which round the stored cards belong to
  isWaitingForDecryption: boolean; // True when at showdown waiting for winner determination
  
  // Transaction state
  pendingTransaction: {
    isWaiting: boolean;
    action: string;
  } | null;
  
  // Contract info
  contractAddress: string | null;
  provider: ethers.ContractRunner | null;
  readonlyProvider: ethers.JsonRpcProvider | null;
  
  // Setters
  setCurrentTableId: (id: bigint | null) => void;
  setContractInfo: (address: string, provider: ethers.ContractRunner) => void;
  setMessage: (msg: string) => void;
  setLoading: (loading: boolean) => void;
  setDecryptedCommunityCards: (cards: (number | undefined)[]) => void;
  addRevealedCards: (playerAddress: string, card1: number, card2: number) => void;
  setPendingTransaction: (action: string | null) => void;
  setPlayerAction: (playerAddress: string, action: PlayerAction['action'], amount?: bigint) => void;
  clearPlayerActions: () => void;
  setPlayerCardsDealt: (playerAddress: string) => void;
  clearDealtCardsTracking: () => void;
  clearRevealedCards: () => void;
  setStoredRound: (round: bigint | null) => void;
  setWaitingForDecryption: (waiting: boolean) => void;
  
  // Fetch actions - these update the store directly
  fetchTableState: (tableId: bigint) => Promise<void>;
  fetchRevealedCards: (tableId: bigint, playerAddress: string) => Promise<void>;
  fetchBettingInfo: (tableId: bigint) => Promise<void>;
  fetchPlayers: (tableId: bigint) => Promise<void>;
  fetchPlayerState: (tableId: bigint, address: string) => Promise<void>;
  fetchAllPlayerStates: (tableId: bigint) => Promise<void>;
  fetchCommunityCards: (tableId: bigint) => Promise<void>;
  
  // Fetch all data at once
  refreshAll: (tableId: bigint) => Promise<void>;
  
  // Clear state
  clearTable: () => void;
  clearTableData: () => void;
}

export const usePokerStore = create<PokerStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentTableId: null,
      tableState: null,
      bettingInfo: null,
      players: [],
      allPlayersBettingState: {},
      communityCards: null,
      decryptedCommunityCards: [],
      revealedCards: {},
      playerActions: {},
      playersWithDealtCards: new Set(),
      isLoading: false,
      message: '',
      lastPot: BigInt(0),
      lastUpdate: Date.now(),
      storedRound: null,
      isWaitingForDecryption: false,
      contractAddress: null,
      provider: null,
      readonlyProvider: null,
      pendingTransaction: null,
      
      // Simple setters
      setCurrentTableId: (id) => set({ currentTableId: id }),
      
      setContractInfo: (address, provider) => {
        // ✅ Create a dedicated JsonRpcProvider for queries to avoid BrowserProvider caching
        // BrowserProvider aggressively caches view function calls, even with blockTag: "latest"
        // This ensures we ALWAYS get fresh on-chain data
        const freshProvider = new ethers.JsonRpcProvider(config.rpcUrl, undefined, {
          staticNetwork: true, // Disable network auto-detection for performance
          batchMaxCount: 1, // Disable batching to get immediate results
        });
        
        console.log('🔧 Created fresh JsonRpcProvider for on-chain queries (no cache):', config.rpcUrl);
        
        set({ 
          contractAddress: address, 
          provider,
          readonlyProvider: freshProvider 
        });
      },
      
      setMessage: (msg) => set({ message: msg }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setDecryptedCommunityCards: (cards) => set({ 
        decryptedCommunityCards: cards,
        lastUpdate: Date.now()
      }),
      
      addRevealedCards: (playerAddress, card1, card2) => set((state) => ({
        revealedCards: {
          ...state.revealedCards,
          [playerAddress.toLowerCase()]: { card1, card2 }
        },
        lastUpdate: Date.now()
      })),
      
      setPendingTransaction: (action) => set({ 
        pendingTransaction: action ? { isWaiting: true, action } : null 
      }),
      
      setPlayerAction: (playerAddress, action, amount) => set((state) => ({
        playerActions: {
          ...state.playerActions,
          [playerAddress.toLowerCase()]: {
            action,
            amount,
            timestamp: Date.now(),
          }
        },
        lastUpdate: Date.now()
      })),
      
      clearPlayerActions: () => set({
        playerActions: {},
        lastUpdate: Date.now()
      }),
      
      setPlayerCardsDealt: (playerAddress) => set((state) => ({
        playersWithDealtCards: new Set([...state.playersWithDealtCards, playerAddress.toLowerCase()]),
        lastUpdate: Date.now()
      })),
      
      clearDealtCardsTracking: () => set({
        playersWithDealtCards: new Set(),
        lastUpdate: Date.now()
      }),
      
      clearRevealedCards: () => set({
        revealedCards: {},
        lastUpdate: Date.now()
      }),
      
      setStoredRound: (round) => set({
        storedRound: round,
        lastUpdate: Date.now()
      }),
      
      setWaitingForDecryption: (waiting) => set({
        isWaitingForDecryption: waiting,
        lastUpdate: Date.now()
      }),
      
      // Fetch table state
      fetchTableState: async (tableId) => {
        const { contractAddress, readonlyProvider: provider } = get();
        if (!contractAddress || !provider) return;
        
        console.log('📊 Fetching FRESH table state for tableId:', tableId.toString(), '(cache bypassed)');
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          
          try {
            const nextTableId = await contract.nextTableId();
            console.log('Next table ID:', nextTableId.toString(), 'Requested:', tableId.toString());
            if (tableId >= nextTableId) {
              console.warn(`⚠️ Table ${tableId} doesn't exist yet. Next available ID: ${nextTableId}`);
              return;
            }
          } catch (err) {
            console.warn('Failed to check nextTableId:', err);
          }
          
          // Get current block to verify we're querying fresh data
          const blockNumber = await provider.getBlockNumber();
          
          const state = await contract.getTableState(tableId, { blockTag: "latest" });
          console.log(`✅ Got FRESH table state from block ${blockNumber}:`, state);
          let tableStruct: {
            dealerIndex: bigint;
            smallBlind: bigint;
            bigBlind: bigint;
          } | null = null;
          try {
            tableStruct = await contract.tables(tableId, { blockTag: "latest" });
          } catch {}
          
          let winner: string | undefined = undefined;
          if (Number(state[0]) === 2) {
            try {
              const tables = await contract.tables(tableId, { blockTag: "latest" });
              winner = tables.winner;
            } catch (error) {
              console.error('Failed to fetch winner:', error);
            }
          }
          
          set({
            tableState: {
              state: Number(state[0]),
              numPlayers: state[1],
              maxPlayers: state[2],
              minBuyIn: state[3],
              currentRound: state[4],
              isSeated: state[5],
              winner,
              dealerIndex: tableStruct ? (tableStruct.dealerIndex as bigint) : undefined,
              smallBlind: tableStruct ? (tableStruct.smallBlind as bigint) : undefined,
              bigBlind: tableStruct ? (tableStruct.bigBlind as bigint) : undefined,
              turnStartTime: state[6],
              playerActionTimeout: state[7],
            },
            lastUpdate: Date.now(),
          });
        } catch (error) {
          console.error('Failed to fetch table state:', error);
        }
      },
      
      // Fetch betting info
      fetchBettingInfo: async (tableId) => {
        const { contractAddress, readonlyProvider: provider, tableState } = get();
        if (!contractAddress || !provider) return;
        
        // Skip if table doesn't exist
        if (!tableState) {
          console.log('⏭️ Skipping betting info fetch - no table state');
          return;
        }
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          const betting = await contract.getBettingInfo(tableId, { blockTag: "latest" });
          
          const potAmount = betting[0];
          
          // If game is about to finish or is Playing with a pot, save the pot amount
          if (tableState && (tableState.state === 1 || tableState.state === 2) && potAmount > BigInt(0)) {
            set({ lastPot: potAmount });
          }
          
          set({
            bettingInfo: {
              pot: potAmount,
              currentBet: betting[1],
              currentPlayer: betting[2] as string,
              currentPlayerIndex: betting[3],
              winner: undefined,
            },
            lastUpdate: Date.now(), // Force React re-render
          });
        } catch (error) {
          console.error('Failed to fetch betting info:', error);
        }
      },
      
      // Fetch players
      fetchPlayers: async (tableId) => {
        const { contractAddress, readonlyProvider: provider, tableState } = get();
        if (!contractAddress || !provider) return;
        
        // Skip if table doesn't exist
        if (!tableState) {
          console.log('⏭️ Skipping players fetch - no table state');
          return;
        }
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          const players = await contract.getPlayers(tableId, { blockTag: "latest" });
          
          console.log('👥 Fetched players from contract:', {
            players,
            count: players.length,
            addresses: players.map((p: string) => p)
          });
          set({ 
            players: players as string[],
            lastUpdate: Date.now(), // Force React re-render
          });
          console.log('✅ Players set in store:', get().players);
        } catch (error) {
          console.error('Failed to fetch players:', error);
        }
      },
      
      // Fetch single player state
      fetchPlayerState: async (tableId, address) => {
        const { contractAddress, readonlyProvider: provider } = get();
        if (!contractAddress || !provider) return;
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          const pState = await contract.getPlayerBettingState(tableId, address, { blockTag: "latest" });
          
          set((state) => ({
            allPlayersBettingState: {
              ...state.allPlayersBettingState,
              [address.toLowerCase()]: {
                chips: pState[0],
                currentBet: pState[1],
                totalBet: pState[2],
                hasFolded: pState[3],
                hasActed: pState[4],
                isCurrentPlayer: pState[5],
              },
            },
            lastUpdate: Date.now(), // Force React re-render
          }));
        } catch (error) {
          console.error(`Failed to fetch state for player ${address}:`, error);
        }
      },
      
      // Fetch all player states
      fetchAllPlayerStates: async (tableId) => {
        const { contractAddress, readonlyProvider: provider, players } = get();
        if (!contractAddress || !provider || players.length === 0) return;
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          
          const allStates: Record<string, PlayerBettingState> = {};
          
          await Promise.all(
            players.map(async (address) => {
              try {
                const pState = await contract.getPlayerBettingState(tableId, address, { blockTag: "latest" });
                allStates[address.toLowerCase()] = {
                  chips: pState[0],
                  currentBet: pState[1],
                  totalBet: pState[2],
                  hasFolded: pState[3],
                  hasActed: pState[4],
                  isCurrentPlayer: pState[5],
                };
              } catch (error) {
                console.error(`Failed to fetch state for ${address}:`, error);
              }
            })
          );
          
          set({ 
            allPlayersBettingState: allStates,
            lastUpdate: Date.now(), // Force React re-render
          });
        } catch (error) {
          console.error('Failed to fetch all player states:', error);
        }
      },
      
      // Fetch community cards
      fetchCommunityCards: async (tableId) => {
        const { contractAddress, readonlyProvider: provider } = get();
        if (!contractAddress || !provider) return;
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          
          try {
            const cards = await contract.getCommunityCards(tableId, { blockTag: "latest" });
            set({
              communityCards: {
                currentStreet: Number(cards[0]),
                flopCard1: Number(cards[1]),
                flopCard2: Number(cards[2]),
                flopCard3: Number(cards[3]),
                turnCard: Number(cards[4]),
                riverCard: Number(cards[5]),
              },
              lastUpdate: Date.now(), // Force React re-render
            });
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('COMMUNITY_CARDS_NOT_DEALT')) {
              // Preflop - cards not dealt yet
              set({
                communityCards: {
                  currentStreet: 0,
                  flopCard1: 0,
                  flopCard2: 0,
                  flopCard3: 0,
                  turnCard: 0,
                  riverCard: 0,
                },
                lastUpdate: Date.now(), // Force React re-render
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch community cards:', error);
        }
      },
      
      // Fetch revealed cards for a specific player (after showdown)
      fetchRevealedCards: async (tableId, playerAddress) => {
        const { contractAddress, readonlyProvider: provider } = get();
        if (!contractAddress || !provider) return;
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          const [card1, card2] = await contract.getPlayerCards(tableId, playerAddress, { blockTag: "latest" });
          
          console.log(`🃏 Fetched revealed cards for ${playerAddress}:`, { card1, card2 });
          
          get().addRevealedCards(playerAddress, Number(card1), Number(card2));
        } catch (error) {
          console.error(`Failed to fetch revealed cards for ${playerAddress}:`, error);
        }
      },
      
      // Refresh all data at once (called by WebSocket events)
      refreshAll: async (tableId) => {
        console.log('🔄 refreshAll called for tableId:', tableId.toString());
        const startTime = Date.now();
        
        try {
          const { provider } = get();
          
          // CRITICAL: Get latest block number to ensure fresh data
          // This forces the provider to query the blockchain instead of using cache
          let latestBlock;
          try {
            // Replace lines 377-380 with:
            if (provider && 'getBlockNumber' in provider) {
              latestBlock = await (provider as ethers.Provider).getBlockNumber();
              console.log(`  🔢 Latest block number: ${latestBlock} (cache busted)`);
            }
          } catch (err) {
            console.warn('Failed to get block number:', err);
          }
          
          // Fetch table state first to ensure it exists
          await get().fetchTableState(tableId);
          console.log(`  ✅ Table state fetched (${Date.now() - startTime}ms)`);
          
          // Then fetch everything else in parallel
          await Promise.all([
            get().fetchBettingInfo(tableId),
            get().fetchPlayers(tableId),
            get().fetchCommunityCards(tableId),
          ]);
          console.log(`  ✅ Betting, players, community cards fetched (${Date.now() - startTime}ms)`);
          
          // After players are fetched, fetch their states
          await get().fetchAllPlayerStates(tableId);
          console.log(`  ✅ All player states fetched (${Date.now() - startTime}ms)`);
          
          const finalState = get();
          console.log(`✅ refreshAll completed in ${Date.now() - startTime}ms. Summary:`, {
            players: finalState.players,
            playersCount: finalState.players.length,
            tableState: finalState.tableState?.state,
            bettingStreet: finalState.communityCards?.currentStreet,
            latestBlock,
            lastUpdate: new Date(finalState.lastUpdate).toLocaleTimeString(),
          });
        } catch (error) {
          console.error('❌ Failed to refresh all data:', error);
        }
      },
      
      // Clear table state completely (including currentTableId)
      clearTable: () => set({
        currentTableId: null,
        tableState: null,
        bettingInfo: null,
        players: [],
        allPlayersBettingState: {},
        communityCards: null,
      }),
      
      // Clear table data but keep currentTableId (for event refreshes)
      clearTableData: () => set({
        tableState: null,
        bettingInfo: null,
        players: [],
        allPlayersBettingState: {},
        communityCards: null,
        decryptedCommunityCards: [], // Clear to prevent stale decrypt button
        // DON'T clear playerActions - they persist until street change
        playersWithDealtCards: new Set(), // Clear dealt cards tracking
        // Keep revealedCards - they survive refreshes (only for showdown)
        lastUpdate: Date.now(), // Force re-render
      }),
    }),
    { name: 'poker-store' }
  )
);

