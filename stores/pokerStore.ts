import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ethers } from 'ethers';
import { FHEPokerABI } from '@/abi/FHEPokerABI';

// Types
export interface TableState {
  state: number;
  numPlayers: bigint;
  maxPlayers: bigint;
  minBuyIn: bigint;
  countdownStartTime: bigint;
  countdownDuration: bigint;
  currentRound: bigint;
  isSeated: boolean;
  winner?: string;
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

interface PokerStore {
  // State
  currentTableId: bigint | null;
  tableState: TableState | null;
  bettingInfo: BettingInfo | null;
  players: string[];
  allPlayersBettingState: Record<string, PlayerBettingState>;
  communityCards: CommunityCards | null;
  isLoading: boolean;
  message: string;
  
  // Contract info
  contractAddress: string | null;
  provider: ethers.ContractRunner | null;
  
  // Setters
  setCurrentTableId: (id: bigint | null) => void;
  setContractInfo: (address: string, provider: ethers.ContractRunner) => void;
  setMessage: (msg: string) => void;
  setLoading: (loading: boolean) => void;
  
  // Fetch actions - these update the store directly
  fetchTableState: (tableId: bigint) => Promise<void>;
  fetchBettingInfo: (tableId: bigint) => Promise<void>;
  fetchPlayers: (tableId: bigint) => Promise<void>;
  fetchPlayerState: (tableId: bigint, address: string) => Promise<void>;
  fetchAllPlayerStates: (tableId: bigint) => Promise<void>;
  fetchCommunityCards: (tableId: bigint) => Promise<void>;
  
  // Fetch all data at once
  refreshAll: (tableId: bigint) => Promise<void>;
  
  // Clear state
  clearTable: () => void;
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
      isLoading: false,
      message: '',
      contractAddress: null,
      provider: null,
      
      // Simple setters
      setCurrentTableId: (id) => set({ currentTableId: id }),
      
      setContractInfo: (address, provider) => 
        set({ contractAddress: address, provider }),
      
      setMessage: (msg) => set({ message: msg }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      // Fetch table state
      fetchTableState: async (tableId) => {
        const { contractAddress, provider } = get();
        if (!contractAddress || !provider) return;
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          const state = await contract.getTableState(tableId);
          
          // Fetch winner if game is finished (state 3)
          let winner: string | undefined = undefined;
          if (Number(state[0]) === 3) {
            try {
              // Access the winner from the contract's table storage
              // We'll need to call the contract to get this
              const tables = await contract.tables(tableId);
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
              countdownStartTime: state[4],
              countdownDuration: state[5],
              currentRound: state[6],
              isSeated: state[7],
              winner,
            },
          });
        } catch (error) {
          console.error('Failed to fetch table state:', error);
        }
      },
      
      // Fetch betting info
      fetchBettingInfo: async (tableId) => {
        const { contractAddress, provider } = get();
        if (!contractAddress || !provider) return;
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          const betting = await contract.getBettingInfo(tableId);
          
          set({
            bettingInfo: {
              pot: betting[0],
              currentBet: betting[1],
              currentPlayer: betting[2] as string,
              currentPlayerIndex: betting[3],
              winner: undefined,
            },
          });
        } catch (error) {
          console.error('Failed to fetch betting info:', error);
        }
      },
      
      // Fetch players
      fetchPlayers: async (tableId) => {
        const { contractAddress, provider } = get();
        if (!contractAddress || !provider) return;
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          const players = await contract.getPlayers(tableId);
          
          set({ players: players as string[] });
        } catch (error) {
          console.error('Failed to fetch players:', error);
        }
      },
      
      // Fetch single player state
      fetchPlayerState: async (tableId, address) => {
        const { contractAddress, provider } = get();
        if (!contractAddress || !provider) return;
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          const pState = await contract.getPlayerBettingState(tableId, address);
          
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
          }));
        } catch (error) {
          console.error(`Failed to fetch state for player ${address}:`, error);
        }
      },
      
      // Fetch all player states
      fetchAllPlayerStates: async (tableId) => {
        const { contractAddress, provider, players } = get();
        if (!contractAddress || !provider || players.length === 0) return;
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          
          const allStates: Record<string, PlayerBettingState> = {};
          
          await Promise.all(
            players.map(async (address) => {
              try {
                const pState = await contract.getPlayerBettingState(tableId, address);
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
          
          set({ allPlayersBettingState: allStates });
        } catch (error) {
          console.error('Failed to fetch all player states:', error);
        }
      },
      
      // Fetch community cards
      fetchCommunityCards: async (tableId) => {
        const { contractAddress, provider } = get();
        if (!contractAddress || !provider) return;
        
        try {
          const contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
          
          try {
            const cards = await contract.getCommunityCards(tableId);
            set({
              communityCards: {
                currentStreet: Number(cards[0]),
                flopCard1: Number(cards[1]),
                flopCard2: Number(cards[2]),
                flopCard3: Number(cards[3]),
                turnCard: Number(cards[4]),
                riverCard: Number(cards[5]),
              },
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
              });
            }
          }
        } catch (error) {
          console.error('Failed to fetch community cards:', error);
        }
      },
      
      // Refresh all data at once (called by WebSocket events)
      refreshAll: async (tableId) => {
        try {
          // Fetch all data in parallel
          await Promise.all([
            get().fetchTableState(tableId),
            get().fetchBettingInfo(tableId),
            get().fetchPlayers(tableId),
            get().fetchCommunityCards(tableId),
          ]);
          
          // After players are fetched, fetch their states
          await get().fetchAllPlayerStates(tableId);
        } catch (error) {
          console.error('Failed to refresh all data:', error);
        }
      },
      
      // Clear table state
      clearTable: () => set({
        currentTableId: null,
        tableState: null,
        bettingInfo: null,
        players: [],
        allPlayersBettingState: {},
        communityCards: null,
      }),
    }),
    { name: 'poker-store' }
  )
);

