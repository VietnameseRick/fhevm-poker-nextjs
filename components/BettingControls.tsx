"use client";

import { useState } from "react";

interface BettingControlsProps {
  canAct: boolean;
  currentBet: bigint;
  playerBet: bigint;
  playerChips: bigint;
  minRaise?: bigint;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: (amount: string) => void;
  isLoading: boolean;
  currentPlayerAddress?: string;
  pendingAction?: string | null;
}

export function BettingControls({
  canAct,
  currentBet,
  playerBet,
  playerChips,
  minRaise,
  onFold,
  onCheck,
  onCall,
  onRaise,
  isLoading,
  currentPlayerAddress,
  pendingAction,
}: BettingControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState<string>("");
  const [showRaiseInput, setShowRaiseInput] = useState(false);

  const formatEth = (wei: bigint) => {
    const eth = Number(wei) / 1e18;
    return eth.toFixed(4);
  };

  const amountToCall = currentBet - playerBet;
  const canCheck = currentBet === playerBet;
  const canCall = amountToCall > 0n && amountToCall <= playerChips;
  const canRaise = playerChips > amountToCall;

  const handleQuickRaise = (multiplier: number) => {
    const baseAmount = Number(currentBet > 0n ? currentBet : minRaise || 0n) / 1e18;
    const amount = (baseAmount * multiplier).toFixed(4);
    setRaiseAmount(amount);
    setShowRaiseInput(true);
  };

  const handleRaise = () => {
    if (raiseAmount && parseFloat(raiseAmount) > 0) {
      onRaise(raiseAmount);
      setRaiseAmount("");
      setShowRaiseInput(false);
    }
  };

  if (!canAct) {
    const formatAddress = (addr: string) =>
      `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    
    return (
      <div className="glass-card rounded-xl p-6 text-center border border-cyan-500/30">
        {pendingAction ? (
          <div className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-cyan-400 font-semibold mono">Processing your {pendingAction}...</p>
          </div>
        ) : currentPlayerAddress ? (
          <div>
            <p className="text-cyan-400 font-semibold mono mb-1">Waiting for player</p>
            <p className="text-cyan-300 text-sm mono">{formatAddress(currentPlayerAddress)}</p>
          </div>
        ) : (
          <p className="text-cyan-400 font-semibold mono">Waiting for your turn...</p>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6 shadow-lg shadow-cyan-500/20 border-2 border-cyan-500/30">
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-3 border border-cyan-500/30">
          <p className="text-gray-400 mb-1 mono text-xs">Your Chips</p>
          <p className="text-xl font-bold text-cyan-400 mono">{formatEth(playerChips)} ETH</p>
        </div>
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-lg p-3 border border-purple-500/30">
          <p className="text-gray-400 mb-1 mono text-xs">To Call</p>
          <p className="text-xl font-bold text-purple-400 mono">
            {amountToCall > 0n ? `${formatEth(amountToCall)} ETH` : "0 ETH"}
          </p>
        </div>
      </div>

      {!showRaiseInput ? (
        <>
          {/* Main Actions */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <button
              onClick={onFold}
              disabled={isLoading}
              className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 border border-red-500/50"
            >
              <span className="text-lg">Fold</span>
            </button>

            {canCheck ? (
              <button
                onClick={onCheck}
                disabled={isLoading}
                className="bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 border border-cyan-500/50"
              >
                <span className="text-lg">Check</span>
              </button>
            ) : (
              <button
                onClick={onCall}
                disabled={isLoading || !canCall}
                className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 border border-green-500/50"
              >
                <div className="flex flex-col items-center">
                  <span className="text-lg">Call</span>
                  {amountToCall > 0n && (
                    <span className="text-xs opacity-90 mono">{formatEth(amountToCall)}</span>
                  )}
                </div>
              </button>
            )}

            <button
              onClick={() => setShowRaiseInput(true)}
              disabled={isLoading || !canRaise}
              className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 border border-purple-500/50"
            >
              <span className="text-lg">Raise</span>
            </button>
          </div>

          {/* Quick Raise Buttons */}
          {canRaise && (
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => handleQuickRaise(2)}
                disabled={isLoading}
                className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/20 hover:from-cyan-500/30 hover:to-cyan-600/30 border border-cyan-500/50 text-cyan-300 font-semibold py-2 px-2 rounded-lg text-sm transition-all duration-200 hover:scale-105 mono"
              >
                2x
              </button>
              <button
                onClick={() => handleQuickRaise(3)}
                disabled={isLoading}
                className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 border border-purple-500/50 text-purple-300 font-semibold py-2 px-2 rounded-lg text-sm transition-all duration-200 hover:scale-105 mono"
              >
                3x
              </button>
              <button
                onClick={() => handleQuickRaise(5)}
                disabled={isLoading}
                className="bg-gradient-to-br from-pink-500/20 to-pink-600/20 hover:from-pink-500/30 hover:to-pink-600/30 border border-pink-500/50 text-pink-300 font-semibold py-2 px-2 rounded-lg text-sm transition-all duration-200 hover:scale-105 mono"
              >
                5x
              </button>
              <button
                onClick={() => {
                  setRaiseAmount(formatEth(playerChips));
                  setShowRaiseInput(true);
                }}
                disabled={isLoading}
                className="bg-gradient-to-br from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border border-red-500/50 text-red-300 font-semibold py-2 px-2 rounded-lg text-sm transition-all duration-200 hover:scale-105 mono"
              >
                All In
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Custom Raise Input */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-cyan-400 mb-2 mono">
                Raise Amount (ETH)
              </label>
              <input
                type="number"
                value={raiseAmount}
                onChange={(e) => setRaiseAmount(e.target.value)}
                placeholder="0.01"
                step="0.001"
                min="0"
                max={formatEth(playerChips)}
                className="w-full px-4 py-3 bg-gray-800/50 border-2 border-cyan-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-lg font-semibold text-white mono"
              />
              <p className="text-xs text-gray-400 mt-1 mono">
                Max: {formatEth(playerChips)} ETH
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowRaiseInput(false);
                  setRaiseAmount("");
                }}
                className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-3 px-4 rounded-lg transition-all duration-200 border border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleRaise}
                disabled={isLoading || !raiseAmount || parseFloat(raiseAmount) <= 0}
                className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-200 disabled:cursor-not-allowed border border-purple-500/50"
              >
                Confirm Raise
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

