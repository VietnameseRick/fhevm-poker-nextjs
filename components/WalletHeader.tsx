"use client";

import { useState } from "react";

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

  if (!address) return null;

  return (
    <div className="w-full bg-black/30 backdrop-blur-sm border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Left: Wallet Info */}
          <div className="flex items-center gap-3">
            {/* Smart Account Address */}
            {isSmartAccount && smartAccountAddress && (
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  <div>
                    <div className="text-xs text-purple-300 font-semibold">Smart Account</div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-white font-mono">
                        {formatAddress(smartAccountAddress)}
                      </code>
                      <button
                        onClick={() => copyToClipboard(smartAccountAddress)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="Copy smart account address"
                      >
                        {copied ? (
                          <span className="text-green-400 text-xs">✓</span>
                        ) : (
                          <svg
                            className="w-4 h-4 text-purple-300"
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
                      <span className="text-xs text-purple-200">
                        Balance: {formatBalance(smartAccountBalance)}
                      </span>
                      {onDepositToSmartAccount && (
                        <button
                          onClick={onDepositToSmartAccount}
                          className="px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400 text-purple-200 text-xs rounded transition-colors"
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
              <div className="flex items-center gap-2 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2">
                <div>
                  <div className="text-xs text-gray-400">EOA Signer</div>
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
                  <div className="text-xs text-gray-300 mt-1">
                    Balance: {formatBalance(eoaBalance)}
                  </div>
                </div>
              </div>
            ) : (
              // Regular wallet (no smart account)
              !isSmartAccount && address && (
                <div className="flex items-center gap-2 bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2">
                  <div>
                    <div className="text-xs text-gray-400">Wallet</div>
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
              <div className="px-3 py-2 bg-blue-600/20 border border-blue-500 rounded-lg">
                <div className="text-xs text-blue-300 font-semibold">
                  {chainId === 11155111 ? "Sepolia" : chainId === 31337 ? "Hardhat" : `Chain ${chainId}`}
                </div>
              </div>
            )}
          </div>

          {/* Right: Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500 text-red-300 rounded-lg transition-colors font-semibold text-sm"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

