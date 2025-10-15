import { useWatchContractEvent } from 'wagmi';
import { FHEPokerABI } from '@/abi/FHEPokerABI';
import { usePokerStore } from '@/stores/pokerStore';
import { useCallback, useRef, useEffect } from 'react';

/**
 * Wagmi-based hook for poker event watching
 * Uses WebSocket transport configured in wagmi (from PrivyProvider)
 * No polling - relies on WebSocket for real-time events
 */
export function usePokerWagmi(
  contractAddress: `0x${string}` | undefined,
  tableId: bigint | null,
  enabled: boolean = true
) {
  
  // Get refreshAll from Zustand store
  const refreshAll = usePokerStore(state => state.refreshAll);
  
  // Refs to prevent stale closures
  const tableIdRef = useRef<bigint | null>(tableId);
  const refreshAllRef = useRef(refreshAll);
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);

  // Update refs when values change
  useEffect(() => {
    tableIdRef.current = tableId;
  }, [tableId]);

  useEffect(() => {
    refreshAllRef.current = refreshAll;
  }, [refreshAll]);

  // Helper: Check if event is for current table
  const isEventForCurrentTable = useCallback((log: unknown, currentTableId: bigint): boolean => {
    try {
      const logWithArgs = log as { args?: { tableId?: bigint } };
      const eventTableId = logWithArgs.args?.tableId;
      
      if (!eventTableId) return true;
      
      const match = eventTableId.toString() === currentTableId.toString();
      if (!match) {
        console.log(`⏭️ Event for table ${eventTableId}, current table is ${currentTableId}`);
      }
      return match;
    } catch (error) {
      console.warn('Failed to parse event tableId:', error);
      return true;
    }
  }, []);

  // Debounced refresh with table filtering
  const debouncedRefresh = useCallback((eventName: string, logs: unknown[]) => {
    let currentTableId = tableIdRef.current;
    const currentRefreshAll = refreshAllRef.current;
    
    if (!currentTableId) {
      // Try to derive tableId from event logs
      try {
        const withArgs = (logs as Array<{ args?: { tableId?: bigint } }>);
        const firstWithTable = withArgs.find(l => l?.args?.tableId !== undefined);
        const derived = firstWithTable?.args?.tableId;
        if (derived) {
          currentTableId = BigInt(derived.toString());
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('poker:lastTableId', currentTableId.toString());
            }
            usePokerStore.getState().setCurrentTableId(currentTableId);
          } catch {}
          console.log(`🧭 [Event ${eventName}] Derived tableId from event logs: ${currentTableId.toString()}`);
        }
      } catch {}
      if (!currentTableId) {
        console.log(`⏭️ [Event ${eventName}] No tableId available, skipping`);
        return;
      }
    }
    
    // Filter: Only process events for current table
    const relevantLogs = logs.filter(log => 
      isEventForCurrentTable(log, currentTableId)
    );
    
    if (relevantLogs.length === 0) {
      console.log(`⏭️ [Event ${eventName}] No relevant logs for table ${currentTableId}`);
      return;
    }
    
    console.log(`🎯 [Event ${eventName}] ${relevantLogs.length} events for table ${currentTableId}`);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Reduced debounce for faster updates
    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      if (now - lastRefreshRef.current >= 500) {
        console.log(`⚡ [Event ${eventName}] Triggering refresh for table ${currentTableId}`);
        
        // Clear store data before refresh to force React re-renders
        try {
          usePokerStore.getState().clearTableData();
          console.log(`  🧹 Store data cleared (keeping tableId)`);
        } catch (err) {
          console.warn('Failed to clear table data:', err);
        }
        
        // Delay to ensure:
        // 1. React picks up the cleared state
        // 2. Provider cache is busted (new event loop tick)
        // 3. Any pending promises are resolved
        setTimeout(() => {
          console.log(`  📥 Fetching FRESH data for table ${currentTableId} (cache busted)`);
          currentRefreshAll(currentTableId);
        }, 100); // Increased from 50ms to 100ms for better cache busting
        
        lastRefreshRef.current = now;
      } else {
        console.log(`⏭️ [Event ${eventName}] Skipped (debounced - too soon)`);
      }
    }, 200);
  }, [isEventForCurrentTable]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // No polling interval - wagmi will use WebSocket transport from config
  // The WebSocket transport is configured in PrivyProvider.tsx
  const pollingInterval = undefined;

  // Event listeners - polling automatically disabled when WebSocket works
  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerJoined',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('PlayerJoined', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerFolded',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('PlayerFolded', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerCalled',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('PlayerCalled', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerRaised',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('PlayerRaised', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerChecked',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('PlayerChecked', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'GameStarted',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('GameStarted', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'GameFinished',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('GameFinished', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'CardsDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('CardsDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'FlopDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('FlopDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'TurnDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('TurnDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'RiverDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('RiverDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'CountdownStarted',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('CountdownStarted', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'StreetAdvanced',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('StreetAdvanced', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerLeft',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('PlayerLeft', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerKicked',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('PlayerKicked', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerAllIn',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('PlayerAllIn', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerTimedOut',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('PlayerTimedOut', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerToppedUp',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('PlayerToppedUp', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerWithdrew',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('PlayerWithdrew', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'TableCreated',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('TableCreated', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'CardsRevealed',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => {
      // CardsRevealed events contain player cards revealed at showdown
      // Fetch the revealed cards for each player
      console.log(`🃏 [Event CardsRevealed] ${logs.length} player cards revealed`);
      
      logs.forEach((log) => {
        try {
          const logWithArgs = log as { args?: { tableId?: bigint; player?: string; card1?: number; card2?: number } };
          const { player, card1, card2 } = logWithArgs.args || {};
          
          if (player && card1 !== undefined && card2 !== undefined) {
            console.log(`  🃏 Player ${player} cards: ${card1}, ${card2}`);
            // Store in Zustand
            usePokerStore.getState().addRevealedCards(player, card1, card2);
          }
        } catch (error) {
          console.warn('Failed to parse CardsRevealed event:', error);
        }
      });
      
      // Also trigger normal refresh
      debouncedRefresh('CardsRevealed', logs);
    },
  });
}
