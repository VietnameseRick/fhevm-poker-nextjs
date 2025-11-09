"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { FHEPokerABI } from "@/abi/FHEPokerABI";

interface TableBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tableId: bigint, minBuyIn: bigint) => void;
  contractAddress?: `0x${string}` | undefined;
  provider?: ethers.ContractRunner | null;
}

type TableRow = {
  id: bigint;
  state: number;
  numPlayers: bigint;
  maxPlayers: bigint;
  smallBlind: bigint;
  bigBlind: bigint;
  minBuyIn: bigint;
};

const GAME_STATES = ["Waiting for Players", "Playing", "Finished"] as const;

export function TableBrowser({ isOpen, onClose, onSelect, contractAddress, provider }: TableBrowserProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);

  const contract = useMemo(() => {
    if (!contractAddress || !provider) return null;
    return new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
  }, [contractAddress, provider]);

  const loadTables = async () => {
    if (!contract) {
      console.warn('⚠️ TableBrowser: No contract available');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      console.log('📊 Loading tables from contract...');
      console.log('📊 Contract address:', contractAddress);
      
      // Since nextTableId is internal, we'll try loading tables incrementally
      // Start from table ID 1 and keep trying until we hit an error
      const ids: bigint[] = [];
      let currentId = 1n;
      const maxTables = 100; // Safety limit to prevent infinite loops
      
      // Try to find all existing tables by querying incrementally
      for (let i = 0; i < maxTables; i++) {
        try {
          await contract.getTableState(currentId);
          // If we get here, the table exists
          ids.push(currentId);
          currentId++;
        } catch (err: unknown) {
          // Check if it's a "table not found" error
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (errorMsg.includes('NF') || errorMsg.includes('TABLE_NOT_FOUND') || errorMsg.includes('execution reverted')) {
            // Table doesn't exist, we've found all tables
            break;
          }
          // Some other error, skip this table and continue
          console.warn(`⚠️ Error checking table ${currentId}:`, err);
          currentId++;
        }
      }
      
      console.log(`📊 Found ${ids.length} table(s)`);
      
      if (ids.length === 0) {
        setTables([]);
        return;
      }
      
      const chunks: bigint[][] = [];
      const chunkSize = 20;
      for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));

      const rows: TableRow[] = [];
      for (const chunk of chunks) {
        // Fetch table state for each table
        const results = await Promise.all(
          chunk.map(async (id) => {
            try {
              const state = await contract.getTableState(id);
              return {
                id,
                state: Number(state[0]),
                numPlayers: state[1],
                maxPlayers: state[2],
                minBuyIn: state[3],
              };
            } catch (err) {
              console.warn(`⚠️ Failed to load table ${id}:`, err);
              return null;
            }
          })
        );
        
        // Fetch blinds from TableCreated events
        const withBlinds = await Promise.all(
          results.map(async (r) => {
            if (!r) return null;
            try {
              // Query TableCreated event to get blinds
              const filter = contract.filters.TableCreated(r.id);
              const events = await contract.queryFilter(filter, 0, "latest");
              
              if (events.length > 0) {
                const event = events[0]; // Should only be one TableCreated event per table
                // Type guard to check if event is EventLog with args
                if ('args' in event && event.args && event.args.length >= 4) {
                  // TableCreated event: tableId, creator, minBuyIn, maxPlayers
                  // But we need smallBlind and bigBlind which aren't in the event
                  // For now, we'll set them to 0 and they won't be displayed
                  return {
                    ...r,
                    smallBlind: 0n,
                    bigBlind: 0n,
                  };
                }
              }
              return {
                ...r,
                smallBlind: 0n,
                bigBlind: 0n,
              };
            } catch (err) {
              console.warn(`⚠️ Failed to fetch blinds for table ${r.id}:`, err);
              return {
                ...r,
                smallBlind: 0n,
                bigBlind: 0n,
              };
            }
          })
        );
        
        withBlinds.forEach((r) => {
          if (r) rows.push(r);
        });
      }

      console.log(`✅ Loaded ${rows.length} table(s)`);
      setTables(rows);
    } catch (e) {
      console.error('❌ Failed to load tables:', e);
      
      // Provide more helpful error messages
      const errorMessage = e instanceof Error ? e.message : "Failed to load tables";
      
      if (errorMessage.includes("execution reverted") || errorMessage.includes("CALL_EXCEPTION")) {
        setError(
          "⚠️ Contract call failed. This usually happens when:\n" +
          "• The contract was redeployed (restart your local node and redeploy)\n" +
          "• You're on the wrong network\n" +
          "• The contract address in FHEPokerAddresses.ts is incorrect\n\n" +
          `Contract address: ${contractAddress}`
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      console.log('📊 TableBrowser opened', { contractAddress, hasProvider: !!provider, hasContract: !!contract });
      loadTables();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contractAddress]);

  if (!isOpen) return null;

  const formatEth = (wei: bigint) => (Number(wei) / 1e18).toFixed(4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h3 className="text-white text-lg font-bold">Browse Tables</h3>
          <div className="flex items-center gap-2">
            <button onClick={loadTables} disabled={isLoading} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50">Refresh</button>
            <button onClick={onClose} className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg">Close</button>
          </div>
        </div>

        {!contract && (
          <div className="p-6 text-center text-slate-300">Contract not available on this network.</div>
        )}

        {contract && (
          <div className="p-4">
            {error && (
              <div className="mb-3 p-3 rounded border-l-4 border-red-500 bg-red-500/10 text-red-300 text-sm whitespace-pre-line">
                {error}
              </div>
            )}
            {isLoading ? (
              <div className="py-12 text-center text-slate-300">Loading tables...</div>
            ) : tables.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-300 mb-4">No tables found.</p>
                <p className="text-slate-400 text-sm">Create a new table to get started!</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                <table className="min-w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900 z-10">
                    <tr className="text-left text-slate-400 border-b border-slate-700">
                      <th className="px-3 py-2">Table</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Players</th>
                      <th className="px-3 py-2">Blinds</th>
                      <th className="px-3 py-2">Min Buy-in</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((t) => (
                      <tr key={t.id.toString()} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="px-3 py-2 text-white font-mono">#{t.id.toString()}</td>
                        <td className="px-3 py-2"><span className="text-slate-300">{GAME_STATES[t.state] || t.state}</span></td>
                        <td className="px-3 py-2"><span className="text-slate-300">{t.numPlayers.toString()}/{t.maxPlayers.toString()}</span></td>
                        <td className="px-3 py-2"><span className="text-slate-300">
                          {t.smallBlind > 0n && t.bigBlind > 0n 
                            ? `${formatEth(t.smallBlind)} / ${formatEth(t.bigBlind)} ETH`
                            : 'N/A'}
                        </span></td>
                        <td className="px-3 py-2"><span className="text-slate-300">{formatEth(t.minBuyIn)} ETH</span></td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => onSelect(t.id, t.minBuyIn)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


