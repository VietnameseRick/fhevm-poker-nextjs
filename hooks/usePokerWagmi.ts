import { useWatchContractEvent } from 'wagmi';
import { FHEPokerABI } from '@/abi/FHEPokerABI';
import { usePokerStore } from '@/stores/pokerStore';
import { useCallback, useRef, useEffect } from 'react';

export function usePokerWagmi(
  contractAddress: `0x${string}` | undefined,
  tableId: bigint | null,
  enabled: boolean = true
) {
  
  const refreshAll = usePokerStore(state => state.refreshAll);
  
  const tableIdRef = useRef<bigint | null>(tableId);
  const refreshAllRef = useRef(refreshAll);
  
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);

  useEffect(() => {
    tableIdRef.current = tableId;
  }, [tableId]);

  useEffect(() => {
    refreshAllRef.current = refreshAll;
  }, [refreshAll]);

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

  // Helper function to set player action from event (for immediate UI updates)
  const handlePlayerActionEvent = useCallback((
    eventName: string,
    logs: unknown[],
    action: 'Fold' | 'Check' | 'Call' | 'Raise' | 'All-In'
  ) => {
    const currentTableId = tableIdRef.current;
    if (!currentTableId) return;

    let shouldRefresh = false;
    
    logs.forEach((log) => {
      try {
        const logWithArgs = log as { args?: { tableId?: bigint; player?: string; amount?: bigint } };
        const { tableId: eventTableId, player, amount } = logWithArgs.args || {};
        
        if (!player || !eventTableId) return;
        if (eventTableId.toString() !== currentTableId.toString()) return;
        
        console.log(`🎮 [Event ${eventName}] Player ${player} action: ${action}`, amount ? `amount: ${amount}` : '');
        
        // Update player action immediately in store
        usePokerStore.getState().setPlayerAction(player, action, amount);
        shouldRefresh = true;
      } catch (error) {
        console.warn(`Failed to parse ${eventName} event:`, error);
      }
    });
    
    // Only fetch betting info and player states (no full clear/refresh)
    if (shouldRefresh) {
      const store = usePokerStore.getState();
      store.fetchBettingInfo(currentTableId);
      store.fetchAllPlayerStates(currentTableId);
      console.log(`✅ [Event ${eventName}] Lightweight update (no full refresh)`);
    }
  }, []);

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
    eventName: 'CardsDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => {
      const currentTableId = tableIdRef.current;
      const timestamp = new Date().toLocaleTimeString();
      console.log(`🎴 [Event CardsDealt @ ${timestamp}] ${logs.length} events (table: ${currentTableId})`);
      
      let shouldNotify = false;
      
      logs.forEach((log) => {
        try {
          const logWithArgs = log as { args?: { tableId?: bigint; player?: string } };
          const { tableId: eventTableId, player } = logWithArgs.args || {};
          
          console.log(`  🎴 Event details: tableId=${eventTableId}, player=${player?.slice(0,10)}...`);
          
          if (eventTableId && player && currentTableId && 
              eventTableId.toString() === currentTableId.toString()) {
            console.log(`  ✅ Marking ${player.slice(0,10)}... as having cards dealt`);
            usePokerStore.getState().setPlayerCardsDealt(player);
            shouldNotify = true;
            
            // Log current state after marking
            const store = usePokerStore.getState();
            console.log(`  📊 Store now has ${store.playersWithDealtCards.size} players with cards`);
          } else {
            const reason = !eventTableId ? 'no tableId' : 
                          !player ? 'no player' :
                          !currentTableId ? 'no current table' :
                          'table mismatch';
            console.log(`  ⏭️ Skipped (${reason})`);
          }
        } catch (error) {
          console.warn('Failed to parse CardsDealt event:', error);
        }
      });
      
      if (shouldNotify) {
        console.log(`✨ Cards dealt event processed - decrypt buttons should now appear`);
      }
    },
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerFolded',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => handlePlayerActionEvent('PlayerFolded', logs, 'Fold'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerCalled',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => handlePlayerActionEvent('PlayerCalled', logs, 'Call'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerRaised',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => handlePlayerActionEvent('PlayerRaised', logs, 'Raise'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerChecked',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => handlePlayerActionEvent('PlayerChecked', logs, 'Check'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'PlayerAllIn',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => handlePlayerActionEvent('PlayerAllIn', logs, 'All-In'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'GameStarted',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => debouncedRefresh('GameStarted', logs),
  });

  // ✅ ON-CHAIN STATE: GameFinished needs IMMEDIATE fetch of revealed cards
  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'GameFinished',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => {
      const currentTableId = tableIdRef.current;
      if (!currentTableId) return;

      logs.forEach((log) => {
        try {
          const logWithArgs = log as { args?: { tableId?: bigint; winner?: string } };
          const { tableId: eventTableId, winner } = logWithArgs.args || {};
          
          if (!eventTableId) return;
          if (eventTableId.toString() !== currentTableId.toString()) return;
          
          console.log(`🏆 [Event GameFinished] Winner: ${winner}, fetching revealed cards for all players`);
          
          // Immediate fetch of table state and revealed cards for all players
          const store = usePokerStore.getState();
          store.fetchTableState(currentTableId);
          
          // Fetch revealed cards for all players
          store.players.forEach((playerAddr) => {
            store.fetchRevealedCards(currentTableId, playerAddr);
          });
          
          console.log(`✅ [Event GameFinished] State and revealed cards fetched`);
        } catch (error) {
          console.warn(`Failed to parse GameFinished event:`, error);
        }
      });
    },
  });

  // Note: CardsDealt event is already handled above with custom logic (setPlayerCardsDealt)
  // No need for duplicate listener here

  // ✅ ON-CHAIN STATE: Community card events need IMMEDIATE refresh
  // Don't debounce these - they're critical for decrypt button logic
  const handleCommunityCardEvent = useCallback((eventName: string) => {
    const currentTableId = tableIdRef.current;
    if (!currentTableId) return;

    console.log(`🃏 [Event ${eventName}] Community cards dealt (table: ${currentTableId})`);
    
    // Immediate fetch of community cards state - no debounce, no clear
    const store = usePokerStore.getState();
    store.fetchCommunityCards(currentTableId);
    store.fetchTableState(currentTableId);
    
    // NOTE: Community cards are auto-decrypted by the contract callback
    // No need to manually trigger decryption here - saves gas and avoids batching issues
    
    console.log(`✅ [Event ${eventName}] Community cards state refreshed`);
  }, []);

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'FlopDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: () => handleCommunityCardEvent('FlopDealt'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'TurnDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: () => handleCommunityCardEvent('TurnDealt'),
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'RiverDealt',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: () => handleCommunityCardEvent('RiverDealt'),
  });

  // StreetAdvanced event - triggers on betting street changes (Preflop -> Flop -> Turn -> River -> Showdown)
  useWatchContractEvent({
    address: contractAddress,
    abi: FHEPokerABI.abi,
    eventName: 'StreetAdvanced',
    enabled: !!contractAddress && enabled,
    pollingInterval,
    onLogs: (logs) => {
      debouncedRefresh('StreetAdvanced', logs);
    },
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
      const currentTableId = tableIdRef.current;
      console.log(`🃏 [Event CardsRevealed] ${logs.length} player cards revealed (table: ${currentTableId})`);
      
      let hasRelevantCards = false;
      
      logs.forEach((log) => {
        try {
          const logWithArgs = log as { args?: { tableId?: bigint; player?: string; card1?: number; card2?: number } };
          const { tableId: eventTableId, player, card1, card2 } = logWithArgs.args || {};
          
          console.log(`  🃏 CardsRevealed: player=${player}, card1=${card1}, card2=${card2}, tableId=${eventTableId}, currentTable=${currentTableId}`);
          
          if (player && card1 !== undefined && card2 !== undefined && 
              eventTableId && currentTableId && 
              eventTableId.toString() === currentTableId.toString()) {
            console.log(`  ✅ Storing revealed cards for ${player}: [${card1}, ${card2}]`);
            usePokerStore.getState().addRevealedCards(player, card1, card2);
            hasRelevantCards = true;
          }
        } catch (error) {
          console.warn('Failed to parse CardsRevealed event:', error);
        }
      });
      
      // Only fetch table state (lightweight update, no clear)
      if (hasRelevantCards && currentTableId) {
        console.log(`  📊 Fetching fresh table state after CardsRevealed`);
        usePokerStore.getState().fetchTableState(currentTableId);
      }
    },
  });
}
