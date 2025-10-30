import { useEffect, useState, useRef } from 'react';
import { usePokerStore } from '@/stores/pokerStore';

/**
 * Hook to poll contract for winner determination at showdown
 * 
 * Polls the contract every 2-3 seconds to check if winner has been set
 * by the FHE decryption callback. Stops polling once winner is determined.
 */
export function useWinnerPolling(
  tableId: bigint | null,
  currentStreet: number | undefined,
  enabled: boolean = true
) {
  const [isPolling, setIsPolling] = useState(false);
  const [isWaitingForWinner, setIsWaitingForWinner] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fetchTableState = usePokerStore(state => state.fetchTableState);
  const tableState = usePokerStore(state => state.tableState);

  useEffect(() => {
    // Only poll when at showdown (street 4) and enabled
    const shouldPoll = enabled && 
                      currentStreet === 4 && 
                      tableId !== null && 
                      tableState?.state === 1; // Playing state

    if (!shouldPoll) {
      // Clear any existing polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
        setIsWaitingForWinner(false);
      }
      return;
    }

    // Check if winner is already set
    const hasWinner = tableState?.winner && tableState.winner !== '0x0000000000000000000000000000000000000000';
    
    if (hasWinner) {
      // Winner already determined, no need to poll
      setIsWaitingForWinner(false);
      setIsPolling(false);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Start polling for winner
    console.log('🔄 [Winner Polling] Starting to poll for winner determination...');
    setIsWaitingForWinner(true);
    setIsPolling(true);

    // Poll every 2.5 seconds
    pollingIntervalRef.current = setInterval(async () => {
      if (!tableId) return;

      try {
        await fetchTableState(tableId);
        
        // Check if winner is now set
        const updatedTableState = usePokerStore.getState().tableState;
        const nowHasWinner = updatedTableState?.winner && 
                            updatedTableState.winner !== '0x0000000000000000000000000000000000000000';

        if (nowHasWinner) {
          console.log('✅ [Winner Polling] Winner determined! Stopping poll.');
          setIsWaitingForWinner(false);
          setIsPolling(false);
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('❌ [Winner Polling] Error fetching table state:', error);
      }
    }, 2500);

    // Cleanup on unmount
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setIsPolling(false);
      setIsWaitingForWinner(false);
    };
  }, [tableId, currentStreet, enabled, tableState?.state, tableState?.winner, fetchTableState]);

  return {
    isWaitingForWinner,
    isPolling,
    winner: tableState?.winner,
  };
}

