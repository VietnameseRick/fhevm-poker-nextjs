"use client";

import { useChainId } from "wagmi";

interface LocalShowdownTriggerProps {
  tableId: bigint | undefined;
  isShowdownReady: boolean;
}

/**
 * Local Development Tool
 * 
 * This component shows a button to manually trigger showdown callbacks
 * when running against a local Hardhat node.
 * 
 * In production (Sepolia), the Zama relayer handles this automatically.
 */
export function LocalShowdownTrigger({ tableId, isShowdownReady }: LocalShowdownTriggerProps) {
  const chainId = useChainId();

  // Only show in local development mode (Hardhat = chainId 31337)
  const isLocal = chainId === 31337;
  
  // Debug logging
  console.log('🔧 [LocalShowdownTrigger]', {
    chainId,
    isLocal,
    tableId: tableId?.toString(),
    isShowdownReady,
    shouldShow: isLocal && isShowdownReady && tableId !== undefined,
  });
  
  if (!isLocal) {
    return null;
  }

  if (!isShowdownReady || !tableId) {
    return null;
  }

  // Removed - no longer needed since we don't trigger public decryption

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-blue-900/90 border-2 border-blue-500 rounded-lg p-4 shadow-xl max-w-sm">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-xs font-bold text-blue-200 uppercase">
            Local Dev - Showdown Info
          </span>
        </div>
        
        <p className="text-xs text-blue-100">
          ⏳ Waiting for on-chain winner determination
        </p>

        <div className="text-xs text-blue-300 border-t border-blue-700 pt-2 mt-2">
          <p className="font-bold mb-1">📝 How it works:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Contract evaluates hands on-chain</li>
            <li>Winner determined by balance changes</li>
            <li>No public decryption needed</li>
            <li>Showdown modal shows automatically</li>
          </ul>
        </div>

        <div className="text-xs text-blue-300 border-t border-blue-700 pt-2 mt-2">
          <p className="font-bold">🧪 For full testing:</p>
          <code className="text-xs bg-black/50 px-2 py-1 rounded block mt-1">
            cd packages/fhevm-poker<br/>
            npx hardhat test
          </code>
        </div>
      </div>
    </div>
  );
}

