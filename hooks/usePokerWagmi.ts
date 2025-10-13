import { useWatchContractEvent } from 'wagmi';
import { FHEPokerABI } from '@/abi/FHEPokerABI';
import { usePokerStore } from '@/stores/pokerStore';
import { useCallback } from 'react';

/**
 * Wagmi-based hook for poker event watching
 * Replaces custom WebSocket implementation with Wagmi's event listeners
 * Uses Zustand store for state management
 */
export function usePokerWagmi(
  contractAddress: `0x${string}` | undefined,
  tableId: bigint | null,
  enabled: boolean = true
) {
  // Get refreshAll from Zustand store
  const refreshAll = usePokerStore(state => state.refreshAll);

  // Create a debounced refresh callback
  const handleEvent = useCallback((eventName: string) => {
    return (logs: unknown) => {
      console.log(`🎰 [Wagmi Event] ${eventName}:`, logs);
      if (tableId) {
        // Trigger Zustand store refresh
        refreshAll(tableId);
      }
    };
  }, [tableId, refreshAll]);

  // Event listeners - automatically trigger refetch
  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerJoined',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('PlayerJoined'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerFolded',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('PlayerFolded'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerCalled',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('PlayerCalled'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerRaised',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('PlayerRaised'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerChecked',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('PlayerChecked'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'GameStarted',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('GameStarted'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'GameFinished',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('GameFinished'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'CardsDealt',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('CardsDealt'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'FlopDealt',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('FlopDealt'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'TurnDealt',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('TurnDealt'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'RiverDealt',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('RiverDealt'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'CountdownStarted',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('CountdownStarted'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'StreetAdvanced',
    enabled: !!contractAddress && enabled,
    onLogs: handleEvent('StreetAdvanced'),
  });
}

