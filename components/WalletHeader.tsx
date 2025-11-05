"use client";

import { useState } from "react";
import { useServerStatus, ServerStatus } from "@/hooks/useServerStatus";

interface WalletHeaderProps {
  address?: string;
  smartAccountAddress?: string;
  eoaAddress?: string;
  isSmartAccount?: boolean;
  onLogout?: () => void;
  chainId?: number;
  smartAccountBalance?: bigint;
  eoaBalance?: bigint;
  onDepositToSmartAccount?: () => void;
}

export function WalletHeader({
  address,
  smartAccountAddress,
  eoaAddress,
  isSmartAccount,
  onLogout,
  chainId,
  smartAccountBalance,
  eoaBalance,
  onDepositToSmartAccount,
}: WalletHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [copiedEOA, setCopiedEOA] = useState(false);
  const serverStatus = useServerStatus();

  const copyToClipboard = (text: string, isEOA = false) => {
    navigator.clipboard.writeText(text);
    if (isEOA) {
      setCopiedEOA(true);
      setTimeout(() => setCopiedEOA(false), 2000);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(38)}`;
  };

  const formatBalance = (balance: bigint | undefined) => {
    if (balance === undefined) return "Loading...";
    const eth = Number(balance) / 1e18;
    return `${eth.toFixed(4)} ETH`;
  };

  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "operational":
        return "bg-green-500";
      case "degraded":
      case "maintenance":
        return "bg-yellow-500";
      case "downtime":
        return "bg-red-500";
      case "recovered":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case "operational":
        return "Online";
      case "degraded":
        return "Degraded";
      case "maintenance":
        return "Maintenance";
      case "downtime":
        return "Offline";
      case "recovered":
        return "Recovering";
      default:
        return "Unknown";
    }
  };

  const renderServerIndicator = (server: ServerStatus | null, label: string) => {
    if (!server) {
      return (
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-500" />
          <span className="text-xs text-gray-400 mono">{label}</span>
        </div>
      );
    }

    return (
      <div 
        className="flex items-center gap-1.5 group relative cursor-help"
        title={`${server.name}: ${getStatusLabel(server.status)} (${(server.availability * 100).toFixed(2)}% uptime)`}
      >
        <div className={`w-2 h-2 rounded-full ${getStatusColor(server.status)} ${server.status === "operational" ? "animate-pulse" : ""}`} />
        <span className="text-xs text-gray-300 mono">{label}</span>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50 w-48 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg text-xs">
          <div className="font-semibold text-white mb-1">{server.name}</div>
          <div className="text-gray-300">Status: <span className={server.status === "operational" ? "text-green-400" : "text-red-400"}>{getStatusLabel(server.status)}</span></div>
          <div className="text-gray-300">Uptime: {(server.availability * 100).toFixed(2)}%</div>
        </div>
      </div>
    );
  };

  if (!address) return null;

  return (
    <div className="w-full glass-card border-b border-cyan-500/30">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Warning Banner - Show if any server has issues */}
        {serverStatus.hasIssues && !serverStatus.loading && (
          <div className="mb-3 p-3 bg-gradient-to-r from-yellow-600/20 to-red-600/20 border border-yellow-500/50 rounded-lg flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div className="flex-1">
              <div className="text-sm font-bold text-yellow-300 mb-1">Server Status Warning</div>
              <div className="text-xs text-gray-300">
                One or more Zama services are experiencing issues. This may cause delays in card decryption and winner determination. 
                Please be patient while the services recover.
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Left: Wallet Info */}
          <div className="flex items-center gap-3">
            {/* Smart Account Address */}
            {isSmartAccount && smartAccountAddress && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/50 rounded-lg px-3 py-2 box-glow">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <div>
                    <div className="text-xs text-cyan-300 font-bold mono">Smart Account</div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-white font-mono">
                        {formatAddress(smartAccountAddress)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(smartAccountAddress)}
                        className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                        title="Copy smart account address"
                      >
                        {copied ? (
                          <span className="text-green-400 text-xs">✓</span>
                        ) : (
                          <svg
                            className="w-4 h-4 text-cyan-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-cyan-200 mono">
                        Balance: {formatBalance(smartAccountBalance)}
                      </span>
                      {onDepositToSmartAccount && (
                        <button
                          onClick={onDepositToSmartAccount}
                          className="px-2 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400 text-cyan-200 text-xs rounded transition-colors mono"
                          title="Deposit ETH to Smart Account"
                        >
                          Deposit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EOA Address (if smart account is active, show as secondary) */}
            {isSmartAccount && eoaAddress ? (
              <div className="flex items-center gap-2 bg-gray-800/50 border border-gray-600/50 rounded-lg px-3 py-2">
                <div>
                  <div className="text-xs text-gray-400 mono font-bold">EOA Signer</div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-gray-300 font-mono">
                      {formatAddress(eoaAddress)}
                    </code>
                    <button
                      onClick={() => copyToClipboard(eoaAddress, true)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title="Copy EOA address"
                    >
                      {copiedEOA ? (
                        <span className="text-green-400 text-xs">✓</span>
                      ) : (
                        <svg
                          className="w-3 h-3 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="text-xs text-gray-300 mt-1 mono">
                    Balance: {formatBalance(eoaBalance)}
                  </div>
                </div>
              </div>
            ) : (
              // Regular wallet (no smart account)
              !isSmartAccount && address && (
                <div className="flex items-center gap-2 bg-gray-800/50 border border-purple-500/50 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-xs text-purple-400 mono font-bold">Wallet</div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-white font-mono">
                        {formatAddress(address)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(address)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="Copy address"
                      >
                        {copied ? (
                          <span className="text-green-400 text-xs">✓</span>
                        ) : (
                          <svg
                            className="w-4 h-4 text-gray-300"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Chain Badge */}
            {chainId && (
              <div className="px-3 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/50 rounded-lg">
                <div className="text-xs text-purple-300 font-bold mono">
                  {chainId === 11155111 ? "Sepolia" : chainId === 31337 ? "Hardhat" : `Chain ${chainId}`}
                </div>
              </div>
            )}

            {/* Server Status Indicators */}
            <div className="px-3 py-2 bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-gray-600/50 rounded-lg">
              <div className="text-xs text-gray-400 font-bold mono mb-1.5">Server Status</div>
              <div className="flex items-center gap-3">
                {serverStatus.loading ? (
                  <span className="text-xs text-gray-400 mono">Loading...</span>
                ) : serverStatus.error ? (
                  <span className="text-xs text-red-400 mono">Error loading status</span>
                ) : (
                  <>
                    {renderServerIndicator(serverStatus.coprocessor, "Coprocessor")}
                    {renderServerIndicator(serverStatus.mpc, "MPC")}
                    {renderServerIndicator(serverStatus.relayer, "Relayer")}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-gradient-to-br from-red-600/20 to-red-700/20 hover:from-red-600/30 hover:to-red-700/30 border border-red-500/50 text-red-300 rounded-lg transition-all font-semibold text-sm mono"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

