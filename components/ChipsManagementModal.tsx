"use client";

import { useState } from "react";
import { ethers } from "ethers";

interface ChipsManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentChips: bigint;
  minBuyIn: bigint;
  onLeaveTable: () => Promise<void>;
  onWithdrawChips: (amount: string) => Promise<void>;
  onAddChips: (amount: string) => Promise<void>;
  isLoading: boolean;
  gameState: number; // 0=WaitingForPlayers, 1=Countdown, 2=Playing, 3=Finished
}

export function ChipsManagementModal({
  isOpen,
  onClose,
  currentChips,
  minBuyIn,
  onLeaveTable,
  onWithdrawChips,
  onAddChips,
  isLoading,
  gameState,
}: ChipsManagementModalProps) {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"withdraw" | "add" | "leave">("add");

  if (!isOpen) return null;

  const currentChipsEth = ethers.formatEther(currentChips);
  const minBuyInEth = ethers.formatEther(minBuyIn);
  const canManageChips = gameState === 0 || gameState === 3; // WaitingForPlayers or Finished

  const handleWithdraw = async () => {
    if (!withdrawAmount || isLoading) return;
    await onWithdrawChips(withdrawAmount);
    setWithdrawAmount("");
  };

  const handleAdd = async () => {
    if (!addAmount || isLoading) return;
    await onAddChips(addAmount);
    setAddAmount("");
  };

  const handleLeave = async () => {
    if (isLoading) return;
    await onLeaveTable();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">💰</span>
              <h2 className="text-2xl font-bold text-white">Manage Your Chips</h2>
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
          {/* Current Balance */}
          <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-xl p-5 border border-green-700">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-lg">Your Current Chips:</span>
              <span className="text-3xl font-bold text-green-300">
                {currentChipsEth} ETH
              </span>
            </div>
          </div>

          {!canManageChips && (
            <div className="bg-orange-900 bg-opacity-30 border border-orange-700 rounded-xl p-4">
              <div className="flex gap-2">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <p className="text-sm text-orange-200">
                  Chip management is only available when game is not in progress. 
                  Wait for the current game to finish.
                </p>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("add")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                activeTab === "add"
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              💵 Add Chips
            </button>
            <button
              onClick={() => setActiveTab("withdraw")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                activeTab === "withdraw"
                  ? "bg-purple-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              💸 Withdraw
            </button>
            <button
              onClick={() => setActiveTab("leave")}
              className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                activeTab === "leave"
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              🚪 Leave Table
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {/* Add Chips Tab */}
            {activeTab === "add" && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  Top up your chip stack by adding more ETH. You can add chips any time when the game is not in progress.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Amount to Add (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="0.0"
                    disabled={!canManageChips || isLoading}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handleAdd}
                  disabled={!addAmount || !canManageChips || isLoading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : `Add ${addAmount || "0"} ETH`}
                </button>
              </div>
            )}

            {/* Withdraw Chips Tab */}
            {activeTab === "withdraw" && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  Withdraw chips from the table while staying seated. You must leave at least{" "}
                  <strong className="text-yellow-400">{minBuyInEth} ETH</strong> (minimum buy-in) 
                  or withdraw all chips.
                </p>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Amount to Withdraw (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max={currentChipsEth}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.0"
                    disabled={!canManageChips || isLoading}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWithdrawAmount(currentChipsEth)}
                    disabled={!canManageChips || isLoading}
                    className="flex-1 py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    Withdraw All
                  </button>
                </div>
                <button
                  onClick={handleWithdraw}
                  disabled={!withdrawAmount || !canManageChips || isLoading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : `Withdraw ${withdrawAmount || "0"} ETH`}
                </button>
                <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-3">
                    <span className="text-xs text-yellow-200">
                      💡 <strong>Tip:</strong> Remaining chips must be ≥ {minBuyInEth} ETH or withdraw all to leave your seat
                    </span>
                </div>
              </div>
            )}

            {/* Leave Table Tab */}
            {activeTab === "leave" && (
              <div className="space-y-4">
                <p className="text-gray-300">
                  Leave the table and withdraw all your remaining chips ({currentChipsEth} ETH).
                  You can only leave when no game is in progress.
                </p>
                <div className="bg-red-900 bg-opacity-20 border border-red-700 rounded-lg p-4">
                  <div className="flex gap-2">
                    <span className="text-xl flex-shrink-0">⚠️</span>
                    <div className="text-sm text-red-200">
                      <p className="font-semibold mb-1">Warning:</p>
                      <p>
                        Leaving the table will:
                      </p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Remove you from the player list</li>
                        <li>Withdraw all {currentChipsEth} ETH to your wallet</li>
                        <li>You&apos;ll need to join again to play</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLeave}
                  disabled={!canManageChips || isLoading}
                  className="w-full py-3 px-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : `Leave Table & Withdraw ${currentChipsEth} ETH`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-800 rounded-b-2xl border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

