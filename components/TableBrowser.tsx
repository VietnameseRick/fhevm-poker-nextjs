"use client";

import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { FHEPokerABI } from "@/abi/FHEPokerABI";

interface TableBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tableId: bigint) => void;
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

const GAME_STATES = ["Waiting for Players", "Countdown", "Playing", "Finished"] as const;

export function TableBrowser({ isOpen, onClose, onSelect, contractAddress, provider }: TableBrowserProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);

  const contract = useMemo(() => {
    if (!contractAddress || !provider) return null;
    return new ethers.Contract(contractAddress, FHEPokerABI.abi, provider);
  }, [contractAddress, provider]);

  const loadTables = async () => {
    if (!contract) return;
    setIsLoading(true);
    setError(null);
    try {
      const nextId: bigint = await contract.nextTableId();
      const ids: bigint[] = [];
      for (let i = 1n; i < nextId; i++) ids.push(i);
      const chunks: bigint[][] = [];
      const chunkSize = 20;
      for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));

      const rows: TableRow[] = [];
      for (const chunk of chunks) {
        // Fetch each table struct
        // Note: public struct returns many fields; we only map what we need
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const results = await Promise.all(
          chunk.map(async (id) => {
            try {
              const t: any = await contract.tables(id);
              // t fields based on ABI order
              return {
                id,
                state: Number(t.state),
                minBuyIn: t.minBuyIn as bigint,
                maxPlayers: t.maxPlayers as bigint,
                smallBlind: t.smallBlind as bigint,
                bigBlind: t.bigBlind as bigint,
              };
            } catch {
              return null;
            }
          })
        );
        results.forEach((r) => {
          if (r) rows.push({
            id: r.id,
            state: r.state,
            numPlayers: 0n, // will fill below
            maxPlayers: r.maxPlayers,
            smallBlind: r.smallBlind,
            bigBlind: r.bigBlind,
            minBuyIn: r.minBuyIn,
          });
        });
      }

      // Fetch numPlayers via getTableState (returns player count)
      const withCounts = await Promise.all(rows.map(async (row) => {
        try {
          const state = await contract.getTableState(row.id);
          const numPlayers: bigint = state[1];
          return { ...row, numPlayers } as TableRow;
        } catch {
          return row;
        }
      }));

      setTables(withCounts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tables");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
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
              <div className="mb-3 p-3 rounded border-l-4 border-red-500 bg-red-500/10 text-red-300 text-sm">{error}</div>
            )}
            {isLoading ? (
              <div className="py-12 text-center text-slate-300">Loading tables...</div>
            ) : tables.length === 0 ? (
              <div className="py-12 text-center text-slate-300">No tables found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
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
                        <td className="px-3 py-2"><span className="text-slate-300">{formatEth(t.smallBlind)} / {formatEth(t.bigBlind)} ETH</span></td>
                        <td className="px-3 py-2"><span className="text-slate-300">{formatEth(t.minBuyIn)} ETH</span></td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => onSelect(t.id)}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
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


