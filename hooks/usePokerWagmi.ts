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
 * - Uses single event listener with polling interval of 5s
 * - Only refreshes when table ID changes
 */
export function usePokerWagmi(
  contractAddress: `0x${string}` | undefined,
  tableId: bigint | null,
  enabled: boolean = true
) {
  // Get refreshAll from Zustand store
  const refreshAll = usePokerStore(state => state.refreshAll);
  
  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);

  // Debounced refresh - prevents multiple rapid RPC calls
  const debouncedRefresh = useCallback((eventName: string, logs: unknown) => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce: wait 500ms before refreshing
    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      // Prevent refreshing more than once per second
      if (now - lastRefreshRef.current >= 1000) {
        console.log(`🎰 [Wagmi Event] ${eventName} - Refreshing table ${tableId?.toString()}`);
        if (tableId) {
          refreshAll(tableId);
          lastRefreshRef.current = now;
        }
      } else {
        console.log(`🎰 [Wagmi Event] ${eventName} - Skipped (debounced)`);
      }
    }, 500);
  }, [tableId, refreshAll]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Single event listener for player actions (fold, call, raise, check)
  // Wagmi v2 doesn't support wildcard events, so we listen to the most critical events only
  // Polling interval: 3 seconds (reduced from default to save RPC calls)
  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerJoined',
    enabled: !!contractAddress && enabled,
    pollingInterval: 5000, // 5 seconds between polls
    onLogs: (logs) => debouncedRefresh('PlayerJoined', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerFolded',
    enabled: !!contractAddress && enabled,
    pollingInterval: 5000,
    onLogs: (logs) => debouncedRefresh('PlayerFolded', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerCalled',
    enabled: !!contractAddress && enabled,
    pollingInterval: 5000,
    onLogs: (logs) => debouncedRefresh('PlayerCalled', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerRaised',
    enabled: !!contractAddress && enabled,
    pollingInterval: 5000,
    onLogs: (logs) => debouncedRefresh('PlayerRaised', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerChecked',
    enabled: !!contractAddress && enabled,
    pollingInterval: 5000,
    onLogs: (logs) => debouncedRefresh('PlayerChecked', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'GameStarted',
    enabled: !!contractAddress && enabled,
    pollingInterval: 5000,
    onLogs: (logs) => debouncedRefresh('GameStarted', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'GameFinished',
    enabled: !!contractAddress && enabled,
    pollingInterval: 5000,
    onLogs: (logs) => debouncedRefresh('GameFinished', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'CardsDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval: 5000,
    onLogs: (logs) => debouncedRefresh('CardsDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'FlopDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval: 3000,
    onLogs: (logs) => debouncedRefresh('FlopDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'TurnDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval: 5000,
    onLogs: (logs) => debouncedRefresh('TurnDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'RiverDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval: 3000,
    onLogs: (logs) => debouncedRefresh('RiverDealt', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'CountdownStarted',
    enabled: !!contractAddress && enabled,
    pollingInterval: 5000,
    onLogs: (logs) => debouncedRefresh('CountdownStarted', logs),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'StreetAdvanced',
    enabled: !!contractAddress && enabled,
    pollingInterval: 5000,
    onLogs: (logs) => debouncedRefresh('StreetAdvanced', logs),
  });
}

