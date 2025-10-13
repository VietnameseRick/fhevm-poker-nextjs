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
    const currentTableId = tableIdRef.current;
    const currentRefreshAll = refreshAllRef.current;
    
    if (!currentTableId) {
      console.log(`⏭️ [Event ${eventName}] No tableId, skipping`);
      return;
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

    // Debounce: wait 500ms before refreshing
    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      // Prevent refreshing more than once per second
      if (now - lastRefreshRef.current >= 1000) {
        currentRefreshAll(currentTableId);
        lastRefreshRef.current = now;
      } else {
        console.log(`⏭️ [Event ${eventName}] Skipped (debounced - too soon)`);
      }
    }, 500);
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
}

