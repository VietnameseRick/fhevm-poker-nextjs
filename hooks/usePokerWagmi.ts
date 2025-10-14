import { useWatchContractEvent } from 'wagmi';
import { FHEPokerABI } from '@/abi/FHEPokerABI';
import { usePokerStore } from '@/stores/pokerStore';
import { useCallback, useRef, useEffect } from 'react';

/**
 * Wagmi-based hook for poker event watching
 * Replaces custom WebSocket implementation with Wagmi's event listeners
 * Uses Zustand store for state management
 * 
 * Optimized for minimal RPC calls:
 * - Debounces refresh calls (500ms)
 * - Table-specific event filtering (only refresh for current table)
 * - Uses refs to prevent stale closures
 * - Polling interval of 5s
 * - Backup periodic refresh every 10s
 */
export function usePokerWagmi(
  contractAddress: `0x${string}` | undefined,
  tableId: bigint | null,
  enabled: boolean = true
) {
  // Get refreshAll from Zustand store
  const refreshAll = usePokerStore(state => state.refreshAll);
  
  // Refs to prevent stale closures - always hold latest values
  const tableIdRef = useRef<bigint | null>(tableId);
  const refreshAllRef = useRef(refreshAll);
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);

  // Update refs when values change (always keep current)
  useEffect(() => {
    tableIdRef.current = tableId;
  }, [tableId]);

  useEffect(() => {
    refreshAllRef.current = refreshAll;
  }, [refreshAll]);

  // Helper: Check if event is for current table
  const isEventForCurrentTable = useCallback((log: unknown, currentTableId: bigint): boolean => {
    try {
      // Extract tableId from event arguments
      const logWithArgs = log as { args?: { tableId?: bigint } };
      const eventTableId = logWithArgs.args?.tableId;
      
      if (!eventTableId) {
        // Accept events without tableId (e.g., global events)
        return true;
      }
      
      const match = eventTableId.toString() === currentTableId.toString();
      if (!match) {
        console.log(`⏭️ Event for table ${eventTableId}, current table is ${currentTableId}`);
      }
      return match;
    } catch (error) {
      console.warn('Failed to parse event tableId:', error);
      return true; // Accept on error (fail-safe)
    }
  }, []);

  // Debounced refresh with table filtering - prevents stale closures
  const debouncedRefresh = useCallback((eventName: string, logs: unknown[]) => {
    // Get latest values from refs (never stale!)
    let currentTableId = tableIdRef.current;
    const currentRefreshAll = refreshAllRef.current;
    
    if (!currentTableId) {
      // Try to derive tableId from event logs (self-heal for seated users after refresh)
      try {
        const withArgs = (logs as Array<{ args?: { tableId?: bigint } }>);
        const firstWithTable = withArgs.find(l => l?.args?.tableId !== undefined);
        const derived = firstWithTable?.args?.tableId;
        if (derived) {
          currentTableId = BigInt(derived.toString());
          // Persist and update store so future events have tableId
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.setItem('poker:lastTableId', currentTableId.toString());
            }
          } catch {}
          try {
            // Update Zustand store currentTableId
            usePokerStore.getState().setCurrentTableId(currentTableId);
          } catch {}
          console.log(`🧭 [Event ${eventName}] Derived tableId from event logs: ${currentTableId.toString()}`);
        }
      } catch {}
      if (!currentTableId) {
        console.log(`⏭️ [Event ${eventName}] No tableId available and none derivable, skipping`);
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

    // Reduced debounce delay for faster UI updates: 200ms
    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      // Reduced rate limit: allow refresh every 500ms (was 1000ms)
      if (now - lastRefreshRef.current >= 500) {
        console.log(`⚡ [Event ${eventName}] Triggering refresh for table ${currentTableId}`);
        
        // KEY FIX: Clear store data before refresh to force React re-renders
        // This is what makes "rejoin" work - it clears then refreshes
        // Using clearTableData (not clearTable) to preserve currentTableId
        try {
          usePokerStore.getState().clearTableData();
          console.log(`  🧹 Store data cleared (keeping tableId)`);
        } catch (err) {
          console.warn('Failed to clear table data:', err);
        }
        
        // Small delay to ensure React picks up the cleared state before new data
        setTimeout(() => {
          console.log(`  📥 Fetching fresh data for table ${currentTableId}`);
          currentRefreshAll(currentTableId);
        }, 50);
        
        lastRefreshRef.current = now;
      } else {
        console.log(`⏭️ [Event ${eventName}] Skipped (debounced - too soon)`);
      }
    }, 200);
  }, [isEventForCurrentTable]); // Only depends on helper function

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Backup periodic refresh - safety net for missed events
  useEffect(() => {
    if (!tableId) return;
    
    console.log(`🔄 [Backup] Starting periodic refresh for table ${tableId}`);
    
    const interval = setInterval(() => {
      console.log(`🔄 [Backup] Periodic refresh for table ${tableId}`);
      refreshAll(tableId);
    }, 10000); // 10 seconds
    
    return () => {
      console.log(`🛑 [Backup] Stopping periodic refresh`);
      clearInterval(interval);
    };
  }, [tableId, refreshAll]);

  // Consistent polling interval for all events
  const POLLING_INTERVAL = 5000; // 5 seconds

  // Event listeners with table-specific filtering
  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerJoined',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('PlayerJoined', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerFolded',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('PlayerFolded', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerCalled',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('PlayerCalled', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerRaised',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('PlayerRaised', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerChecked',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('PlayerChecked', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'GameStarted',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('GameStarted', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'GameFinished',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('GameFinished', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'CardsDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('CardsDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'FlopDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('FlopDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'TurnDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('TurnDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'RiverDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('RiverDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'CountdownStarted',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('CountdownStarted', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'StreetAdvanced',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('StreetAdvanced', logs),
  });

  // Additional events to ensure full coverage of table updates
  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerLeft',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('PlayerLeft', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerKicked',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('PlayerKicked', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerAllIn',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('PlayerAllIn', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerTimedOut',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('PlayerTimedOut', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerToppedUp',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('PlayerToppedUp', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerWithdrew',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('PlayerWithdrew', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'TableCreated',
    enabled: !!contractAddress && enabled,
    pollingInterval: POLLING_INTERVAL,
    onLogs: (logs) => debouncedRefresh('TableCreated', logs),
  });
}

