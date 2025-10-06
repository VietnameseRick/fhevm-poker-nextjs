import { useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { usePokerStore } from '@/stores/pokerStore';
import { FHEPokerABI } from '@/abi/FHEPokerABI';

/**
 * Hook to manage WebSocket event listeners for poker game
 * Automatically refreshes store when events are detected
 */
export function usePokerWebSocket(
  contractAddress: string | null | undefined,
  provider: ethers.ContractRunner | null | undefined,
  currentTableId: bigint | null
) {
  const mountedRef = useRef(true);
  const lastRefreshRef = useRef<number>(0);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Debounced refresh - prevents rapid-fire event spam
  const debouncedRefresh = useCallback((tableId: bigint) => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshRef.current;
    
    // Clear any pending refresh
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    // If we refreshed recently (< 500ms ago), debounce
    if (timeSinceLastRefresh < 500) {
      console.log(`⏱️ [Debounce] Delaying refresh (last refresh ${timeSinceLastRefresh}ms ago)`);
      refreshTimerRef.current = setTimeout(() => {
        console.log(`🔄 [Store] Refreshing all data for table ${tableId}`);
        lastRefreshRef.current = Date.now();
        usePokerStore.getState().refreshAll(tableId);
      }, 500 - timeSinceLastRefresh);
    } else {
      // Refresh immediately
      console.log(`🔄 [Store] Refreshing all data for table ${tableId}`);
      lastRefreshRef.current = now;
      usePokerStore.getState().refreshAll(tableId);
    }
  }, []);
  
  useEffect(() => {
    mountedRef.current = true;
    
    if (!contractAddress || !provider || !currentTableId) {
      return;
    }
    
    let contract: ethers.Contract;
    
    const setupListeners = async () => {
      try {
        contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
        
        // Initial data load
        if (mountedRef.current) {
          await usePokerStore.getState().refreshAll(currentTableId);
          lastRefreshRef.current = Date.now();
        }
        
        // All poker events we need to listen for
        const events = [
          'PlayerJoined',
          'CountdownStarted',
          'GameStarted',
          'CardsDealt',
          'FlopDealt',
          'TurnDealt',
          'RiverDealt',
          'StreetAdvanced',
          'PlayerFolded',
          'PlayerCalled',
          'PlayerRaised',
          'PlayerChecked',
          'GameFinished',
        ];
        
        // Event handler - refreshes store when event is for our table
        const handleEvent = (...args: unknown[]) => {
          if (!mountedRef.current) return;
          
          const event = args[args.length - 1] as { 
            args?: { tableId?: bigint }; 
            fragment?: { name?: string } 
          };
          
          if (event.args?.tableId) {
            const eventTableId = BigInt(event.args.tableId.toString());
            if (eventTableId === currentTableId) {
              console.log(`🎰 [Event] ${event.fragment?.name} detected`);
              // Debounced refresh to prevent spam
              debouncedRefresh(currentTableId);
            }
          }
        };
        
        // Attach all event listeners
        events.forEach(eventName => {
          contract.on(eventName, handleEvent);
        });
        
        console.log(`✅ [WebSocket] Listeners attached for table ${currentTableId}`);
      } catch (error) {
        console.error('[WebSocket] Failed to setup listeners:', error);
      }
    };
    
    setupListeners();
    
    // Cleanup
    return () => {
      mountedRef.current = false;
      
      // Clear any pending refresh timers
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      
      // Remove all listeners
      if (contract) {
        try {
          contract.removeAllListeners();
          console.log(`🔌 [WebSocket] Listeners removed for table ${currentTableId}`);
        } catch (error) {
          console.error('[WebSocket] Error removing listeners:', error);
        }
      }
    };
  }, [contractAddress, provider, currentTableId, debouncedRefresh]);
}

