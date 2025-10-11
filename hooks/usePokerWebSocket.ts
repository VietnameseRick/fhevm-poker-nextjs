import { useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import { usePokerStore } from '@/stores/pokerStore';
import { FHEPokerABI } from '@/abi/FHEPokerABI';
import config from '@/utils/config';

/**
 * Hook to manage WebSocket event listeners for poker game
 * Automatically refreshes store when events are detected
 * 
 * Uses WebSocket provider for event listening to avoid HTTP polling rate limits.
 * Falls back to HTTP polling with increased interval if WebSocket is unavailable.
 */
export function usePokerWebSocket(
  contractAddress: string | null | undefined,
  provider: ethers.ContractRunner | null | undefined,
  currentTableId: bigint | null
) {
  const mountedRef = useRef(true);
  const lastRefreshRef = useRef<number>(0);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const wsProviderRef = useRef<ethers.WebSocketProvider | ethers.JsonRpcProvider | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
    
    if (!contractAddress || !currentTableId) {
      return;
    }
    
    let contract: ethers.Contract;
    
    const setupListeners = async () => {
      try {
        // Create event provider - prefer WebSocket to avoid HTTP polling rate limits
        let eventProvider: ethers.WebSocketProvider | ethers.JsonRpcProvider;
        
        try {
          // Try WebSocket first (more efficient, no polling needed)
          console.log(`🔌 [WebSocket] Attempting WebSocket connection to ${config.wsRpcUrl}`);
          eventProvider = new ethers.WebSocketProvider(config.wsRpcUrl);
          
          // Test the connection
          await eventProvider.getNetwork();
          
          console.log(`✅ [WebSocket] Successfully connected via WebSocket`);
          wsProviderRef.current = eventProvider;
          
          // Handle WebSocket errors and reconnection
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (eventProvider as any)._websocket?.on('error', (error: Error) => {
            console.error('❌ [WebSocket] Connection error:', error);
          });
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (eventProvider as any)._websocket?.on('close', () => {
            console.warn('⚠️ [WebSocket] Connection closed');
            // Attempt reconnection after 5 seconds
            if (mountedRef.current && !reconnectTimerRef.current) {
              reconnectTimerRef.current = setTimeout(() => {
                console.log('🔄 [WebSocket] Attempting to reconnect...');
                reconnectTimerRef.current = null;
                // Trigger re-setup by clearing and re-running effect
                if (mountedRef.current) {
                  setupListeners();
                }
              }, 5000);
            }
          });
        } catch (wsError) {
          console.warn('⚠️ [WebSocket] WebSocket connection failed, falling back to HTTP polling:', wsError);
          
          // Fallback to HTTP polling - use 5s interval for better responsiveness
          eventProvider = new ethers.JsonRpcProvider(config.rpcUrl, undefined, {
            polling: true,
            // Use 5s polling interval - balance between responsiveness and rate limits
            pollingInterval: 5000, // 5 seconds
          });
          
          console.log(`✅ [WebSocket] Using HTTP polling with 5s interval`);
          wsProviderRef.current = eventProvider;
        }
        
        contract = new ethers.Contract(contractAddress, FHEPokerABI.abi, eventProvider);
        
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
            args?: { tableId?: bigint; player?: string; amount?: bigint }; 
            fragment?: { name?: string } 
          };
          
          console.log(`🎰 [WebSocket] ⚡ Event received:`, {
            event: event.fragment?.name,
            tableId: event.args?.tableId?.toString(),
            player: event.args?.player,
            amount: event.args?.amount?.toString(),
          });
          
          if (event.args?.tableId) {
            const eventTableId = BigInt(event.args.tableId.toString());
            if (eventTableId === currentTableId) {
              console.log(`✅ [WebSocket] ${event.fragment?.name} is for OUR table ${currentTableId} - refreshing!`);
              // Debounced refresh to prevent spam
              debouncedRefresh(currentTableId);
            } else {
              console.log(`⏭️ [WebSocket] ${event.fragment?.name} is for table ${eventTableId}, we're watching ${currentTableId} - ignoring`);
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
      
      // Clear reconnection timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
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
      
      // Clean up WebSocket provider
      if (wsProviderRef.current) {
        try {
          if (wsProviderRef.current instanceof ethers.WebSocketProvider) {
            wsProviderRef.current.destroy();
            console.log(`🔌 [WebSocket] WebSocket provider destroyed`);
          }
          wsProviderRef.current = null;
        } catch (error) {
          console.error('[WebSocket] Error cleaning up provider:', error);
        }
      }
    };
  }, [contractAddress, currentTableId, debouncedRefresh]);
}

