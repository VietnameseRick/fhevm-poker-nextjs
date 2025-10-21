"use client";

import { useState } from "react";

interface BettingControlsProps {
  canAct: boolean;
  currentBet: bigint;
  playerBet: bigint;
  playerChips: bigint;
  bigBlind: string;
  smallBlind: string;
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
  bigBlind,
  smallBlind,
  minRaise,
  onFold,
  onCheck,
  onCall,
  onRaise,
  isLoading,
}: BettingControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState<string>("");
  const [showRaiseInput, setShowRaiseInput] = useState(false);

  const bigBlindEth = parseFloat(bigBlind);
  const bigBlindValue = BigInt(bigBlindEth * 1e18);

  const smallBlindEth = parseFloat(smallBlind);
  const smallBlindValue = BigInt(smallBlindEth * 1e18); 

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

  if (!canAct) return null;

  console.log('currentBet: ', currentBet);
  console.log('playerBet: ', playerBet);

  return (
    <div className="p-6 flex flex-col items-end">
      <div className="bg-black/30 w-1/4 text-center rounded-3xl px-4 py-2 mb-2">
        <p className="text-gray-400 text-xl">To Call: {amountToCall > 0n ? `${formatEth(amountToCall)} ETH` : "0 ETH"}</p>
      </div>

      {!showRaiseInput ? (
        <>
          {/* Main Actions */}
          <div className="grid grid-cols-3 gap-3 mb-3 w-2/3">
            <button
              onClick={onFold}
              disabled={isLoading}
              className="text-white font-bold 
              py-2 transition-all duration-200 
              disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              style={{backgroundImage: `url(/bg-betting.png)`, backgroundSize: '100% 100%'}}>
              <span className="text-2xl">Fold</span>
            </button>

            {canCheck ? (
              <button
                onClick={onCheck}
                disabled={isLoading}
                className="text-white font-bold 
                py-2 transition-all duration-200 
                disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                style={{backgroundImage: `url(/bg-betting.png)`, backgroundSize: '100% 100%'}}>
                <span className="text-2xl">Check</span>
              </button>
            ) : (
              <button
                onClick={onCall}
                disabled={isLoading || !canCall}
                className="text-white font-bold 
                py-2 transition-all duration-200 
                disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                style={{backgroundImage: `url(/bg-betting.png)`, backgroundSize: '100% 100%'}}>
                <span className="text-2xl">Call</span>
              </button>
            )}

            <button
              onClick={() => setShowRaiseInput(true)}
              disabled={isLoading || !canRaise}
              className="text-white font-bold 
              py-2 transition-all duration-200 
              disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
              style={{backgroundImage: `url(/bg-betting.png)`, backgroundSize: '100% 100%'}}>
              <span className="text-2xl">{currentBet <= bigBlindValue && playerBet <= smallBlindValue  ? "Bet" : "Raise"}</span>
            </button>
          </div>

          {/* Quick Raise Buttons */}
          {canRaise && (
            <div className="grid grid-cols-4 gap-2 w-2/3">
              <button
                onClick={() => handleQuickRaise(2)}
                disabled={isLoading}
                className="text-white text-xl font-bold 
                transition-all duration-200 
                disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"              
                style={{backgroundImage: `url(/bg-betting-2.png)`, backgroundSize: '100% 100%'}}>
                2x
              </button>
              <button
                onClick={() => handleQuickRaise(3)}
                disabled={isLoading}
                className="text-white text-xl font-bold 
                transition-all duration-200 
                disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"              
                style={{backgroundImage: `url(/bg-betting-2.png)`, backgroundSize: '100% 100%'}}>
                3x
              </button>
              <button
                onClick={() => handleQuickRaise(5)}
                disabled={isLoading}
                className="text-white text-xl font-bold 
                transition-all duration-200 
                disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"              
                style={{backgroundImage: `url(/bg-betting-2.png)`, backgroundSize: '100% 100%'}}>
                5x
              </button>
              <button
                onClick={() => {
                  setRaiseAmount(formatEth(playerChips));
                  setShowRaiseInput(true);
                }}
                disabled={isLoading}
                className="text-white text-xl font-bold 
                transition-all duration-200 
                disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"              
                style={{backgroundImage: `url(/bg-betting-2.png)`, backgroundSize: '100% 100%'}}>
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
                {currentBet <= bigBlindValue && playerBet <= smallBlindValue  ? "Bet Amount (ETH)" : "Raise Amount (ETH)"}
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
                {currentBet <= bigBlindValue && playerBet <= smallBlindValue  ? "Confirm Bet" : "Confirm Raise"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

