"use client";

import { useState } from "react";
import { ethers } from "ethers";

interface FundingRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  smartAccountAddress: string;
  currentBalance: bigint;
  requiredAmount: bigint;
  eoaAddress?: string;
}

export function FundingRequiredModal({
  isOpen,
  onClose,
  smartAccountAddress,
  currentBalance,
  requiredAmount,
  eoaAddress,
}: FundingRequiredModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(smartAccountAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const currentBalanceEth = ethers.formatEther(currentBalance);
  const requiredAmountEth = ethers.formatEther(requiredAmount);
  const shortfallEth = ethers.formatEther(requiredAmount - currentBalance);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">💰</span>
              <h2 className="text-2xl font-bold text-white">Insufficient Balance</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
              aria-label="Close"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Balance Summary */}
          <div className="bg-gray-800 rounded-xl p-5 space-y-3 border border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Current Balance:</span>
              <span className="text-xl font-semibold text-white">
                {currentBalanceEth} ETH
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Required Amount:</span>
              <span className="text-xl font-semibold text-green-400">
                {requiredAmountEth} ETH
              </span>
            </div>
            <div className="h-px bg-gray-700 my-2"></div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400 font-semibold">Need to Add:</span>
              <span className="text-2xl font-bold text-orange-400">
                {shortfallEth} ETH
              </span>
            </div>
          </div>

          {/* Smart Account Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-purple-400">
                🔐 Your Smart Account Address
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between gap-3">
                <code className="text-sm text-gray-300 font-mono break-all">
                  {smartAccountAddress}
                </code>
                <button
                  onClick={handleCopyAddress}
                  className="flex-shrink-0 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-semibold"
                >
                  {copied ? "✓ Copied!" : "📋 Copy"}
                </button>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">ℹ️</span>
              <h3 className="text-lg font-semibold text-blue-300">
                How to Fund Your Smart Account
              </h3>
            </div>
            <ol className="space-y-2 text-gray-300 text-sm list-decimal list-inside">
              <li>Copy your smart account address above</li>
              <li>
                Get Sepolia ETH from a faucet:
                <div className="mt-2 space-y-1 ml-6">
                  <a
                    href="https://sepoliafaucet.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-400 hover:text-blue-300 underline"
                  >
                    🔗 SepoliaFaucet.com
                  </a>
                  <a
                    href="https://faucet.quicknode.com/ethereum/sepolia"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-400 hover:text-blue-300 underline"
                  >
                    🔗 QuickNode Faucet
                  </a>
                </div>
              </li>
              <li>Send at least <strong className="text-orange-400">{shortfallEth} ETH</strong> to your smart account</li>
              <li>Wait for the transaction to confirm (~15 seconds)</li>
              <li>Refresh the page and try again</li>
            </ol>
          </div>

          {/* Note about EOA */}
          {eoaAddress && (
            <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-xl p-4">
              <div className="flex gap-2">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <div className="text-sm text-yellow-200">
                  <p className="font-semibold mb-1">Important Note:</p>
                  <p>
                    Your embedded wallet (EOA) address is different from your smart account.
                    Make sure to send funds to the <strong>Smart Account Address</strong> shown above,
                    not your embedded wallet address.
                  </p>
                  <p className="mt-2 text-xs text-yellow-300">
                    Embedded Wallet: {eoaAddress.slice(0, 10)}...{eoaAddress.slice(-8)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Why This is Needed */}
          <details className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <summary className="cursor-pointer text-sm font-semibold text-purple-300 hover:text-purple-200">
              💡 Why do I need to fund my smart account?
            </summary>
            <div className="mt-3 text-sm text-gray-400 space-y-2">
              <p>
                Your smart account is a special type of wallet that offers enhanced features like
                gasless transactions (sponsored by a paymaster).
              </p>
              <p>
                <strong className="text-gray-300">However:</strong> While the paymaster covers gas fees,
                your smart account still needs to have its own balance to send ETH in payable transactions
                (like buying into a poker game).
              </p>
              <p>
                Think of it like this: The paymaster pays for the "shipping" (gas), but you still need
                to pay for the "product" (buy-in amount).
              </p>
            </div>
          </details>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-800 rounded-b-2xl border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg"
          >
            Got it! I'll fund my account
          </button>
        </div>
      </div>
    </div>
  );
}

