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
    return (
      <div className="bg-gray-100 rounded-xl p-6 text-center">
        <p className="text-gray-500 font-semibold">Waiting for your turn...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 shadow-lg border-2 border-gray-300">
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-gray-600 mb-1">Your Chips</p>
          <p className="text-xl font-bold text-green-600">{formatEth(playerChips)} ETH</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-gray-600 mb-1">To Call</p>
          <p className="text-xl font-bold text-blue-600">
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
              className="bg-gradient-to-b from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
            >
              <span className="text-lg">Fold</span>
            </button>

            {canCheck ? (
              <button
                onClick={onCheck}
                disabled={isLoading}
                className="bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              >
                <span className="text-lg">Check</span>
              </button>
            ) : (
              <button
                onClick={onCall}
                disabled={isLoading || !canCall}
                className="bg-gradient-to-b from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              >
                <div className="flex flex-col items-center">
                  <span className="text-lg">Call</span>
                  {amountToCall > 0n && (
                    <span className="text-xs opacity-90">{formatEth(amountToCall)}</span>
                  )}
                </div>
              </button>
            )}

            <button
              onClick={() => setShowRaiseInput(true)}
              disabled={isLoading || !canRaise}
              className="bg-gradient-to-b from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
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
                className="bg-amber-100 hover:bg-amber-200 border-2 border-amber-400 text-amber-900 font-semibold py-2 px-2 rounded-lg text-sm transition-all duration-200 hover:scale-105"
              >
                2x
              </button>
              <button
                onClick={() => handleQuickRaise(3)}
                disabled={isLoading}
                className="bg-amber-100 hover:bg-amber-200 border-2 border-amber-400 text-amber-900 font-semibold py-2 px-2 rounded-lg text-sm transition-all duration-200 hover:scale-105"
              >
                3x
              </button>
              <button
                onClick={() => handleQuickRaise(5)}
                disabled={isLoading}
                className="bg-amber-100 hover:bg-amber-200 border-2 border-amber-400 text-amber-900 font-semibold py-2 px-2 rounded-lg text-sm transition-all duration-200 hover:scale-105"
              >
                5x
              </button>
              <button
                onClick={() => {
                  setRaiseAmount(formatEth(playerChips));
                  setShowRaiseInput(true);
                }}
                disabled={isLoading}
                className="bg-red-100 hover:bg-red-200 border-2 border-red-400 text-red-900 font-semibold py-2 px-2 rounded-lg text-sm transition-all duration-200 hover:scale-105"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-lg font-semibold"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max: {formatEth(playerChips)} ETH
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowRaiseInput(false);
                  setRaiseAmount("");
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRaise}
                disabled={isLoading || !raiseAmount || parseFloat(raiseAmount) <= 0}
                className="bg-gradient-to-b from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 disabled:cursor-not-allowed"
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

