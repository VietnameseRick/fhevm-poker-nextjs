"use client";

import { useState, useEffect } from "react";
import { usePokerStore } from "@/stores/pokerStore";

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
  onFold,
  onCheck,
  onCall,
  onRaise,
  isLoading,
}: BettingControlsProps) {
  const [raiseAmount, setRaiseAmount] = useState<string>("");
  const [showRaiseInput, setShowRaiseInput] = useState(false);
  
  // Get pot from store
  const pot = usePokerStore(state => state.bettingInfo?.pot || 0n);

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

  // Calculate minimum raise: big blind or size of previous raise
  const previousRaiseSize = currentBet - (currentBet > bigBlindValue ? bigBlindValue : 0n);
  const minRaiseAmount = previousRaiseSize > bigBlindValue ? previousRaiseSize : bigBlindValue;
  const minRaiseEth = Number(minRaiseAmount) / 1e18;
  
  // Calculate max raise (all remaining chips after calling)
  const chipsAfterCall = playerChips - amountToCall;
  const maxRaiseEth = Number(chipsAfterCall) / 1e18;

  // Handle pot-based quick raises
  const handleQuickRaise = (multiplier: number) => {
    const potEth = Number(pot) / 1e18;
    const raiseEth = potEth * multiplier;
    
    // Clamp to min/max
    const clampedRaise = Math.max(minRaiseEth, Math.min(raiseEth, maxRaiseEth));
    
    setRaiseAmount(clampedRaise.toFixed(4));
    setShowRaiseInput(true);
  };

  // Update slider value when raiseAmount changes
  useEffect(() => {
    if (!showRaiseInput) {
      setRaiseAmount("");
    }
  }, [showRaiseInput]);

  const handleRaise = () => {
    const raiseEth = parseFloat(raiseAmount);
    if (raiseAmount && raiseEth > 0) {
      // Validate minimum raise
      if (raiseEth < minRaiseEth) {
        alert(`Minimum raise is ${minRaiseEth.toFixed(4)} ETH`);
        return;
      }
      onRaise(raiseAmount);
      setRaiseAmount("");
      setShowRaiseInput(false);
    }
  };

  if (!canAct) return null;

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

          {/* Quick Raise Buttons - Pot-based */}
          {canRaise && (
            <div className="w-2/3 space-y-2">
              <p className="text-xs text-gray-400 text-center">Quick Raise (% of Pot: {formatEth(pot)} ETH)</p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleQuickRaise(0.5)}
                  disabled={isLoading}
                  className="text-white text-sm font-bold 
                  transition-all duration-200 
                  disabled:cursor-not-allowed transform hover:scale-105 active:scale-95 relative group"              
                  style={{backgroundImage: `url(/bg-betting-2.png)`, backgroundSize: '100% 100%'}}>
                  <div>½ Pot</div>
                  <div className="text-[10px] opacity-70">{(Number(pot) / 1e18 * 0.5).toFixed(3)}</div>
                </button>
                <button
                  onClick={() => handleQuickRaise(0.75)}
                  disabled={isLoading}
                  className="text-white text-sm font-bold 
                  transition-all duration-200 
                  disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"              
                  style={{backgroundImage: `url(/bg-betting-2.png)`, backgroundSize: '100% 100%'}}>
                  <div>¾ Pot</div>
                  <div className="text-[10px] opacity-70">{(Number(pot) / 1e18 * 0.75).toFixed(3)}</div>
                </button>
                <button
                  onClick={() => handleQuickRaise(1)}
                  disabled={isLoading}
                  className="text-white text-sm font-bold 
                  transition-all duration-200 
                  disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"              
                  style={{backgroundImage: `url(/bg-betting-2.png)`, backgroundSize: '100% 100%'}}>
                  <div>Pot</div>
                  <div className="text-[10px] opacity-70">{(Number(pot) / 1e18).toFixed(3)}</div>
                </button>
                <button
                  onClick={() => {
                    setRaiseAmount(maxRaiseEth.toFixed(4));
                    setShowRaiseInput(true);
                  }}
                  disabled={isLoading}
                  className="text-white text-sm font-bold 
                  transition-all duration-200 
                  disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"              
                  style={{backgroundImage: `url(/bg-betting-2.png)`, backgroundSize: '100% 100%'}}>
                  <div>All In</div>
                  <div className="text-[10px] opacity-70">{maxRaiseEth.toFixed(3)}</div>
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Custom Raise Input with Slider */}
          <div className="space-y-3 w-full px-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-cyan-400 mono">
                  {currentBet <= bigBlindValue && playerBet <= smallBlindValue  ? "Bet Amount (ETH)" : "Raise Amount (ETH)"}
                </label>
                <span className="text-lg font-bold text-white mono">{raiseAmount || "0.0000"} ETH</span>
              </div>

              {/* Range Slider */}
              <input
                type="range"
                value={raiseAmount ? parseFloat(raiseAmount) : minRaiseEth}
                onChange={(e) => setRaiseAmount(parseFloat(e.target.value).toFixed(4))}
                min={minRaiseEth}
                max={maxRaiseEth}
                step={minRaiseEth / 10}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-6 
                  [&::-webkit-slider-thumb]:h-6 
                  [&::-webkit-slider-thumb]:rounded-full 
                  [&::-webkit-slider-thumb]:bg-gradient-to-br 
                  [&::-webkit-slider-thumb]:from-cyan-400 
                  [&::-webkit-slider-thumb]:to-purple-500
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg
                  [&::-webkit-slider-thumb]:shadow-cyan-500/50
                  [&::-webkit-slider-thumb]:transition-all
                  [&::-webkit-slider-thumb]:hover:scale-110
                  [&::-moz-range-thumb]:w-6 
                  [&::-moz-range-thumb]:h-6 
                  [&::-moz-range-thumb]:rounded-full 
                  [&::-moz-range-thumb]:bg-gradient-to-br 
                  [&::-moz-range-thumb]:from-cyan-400 
                  [&::-moz-range-thumb]:to-purple-500
                  [&::-moz-range-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:shadow-lg
                  [&::-moz-range-thumb]:shadow-cyan-500/50
                  "
                style={{
                  background: `linear-gradient(to right, 
                    rgb(34, 211, 238) 0%, 
                    rgb(34, 211, 238) ${((parseFloat(raiseAmount || minRaiseEth.toString()) - minRaiseEth) / (maxRaiseEth - minRaiseEth)) * 100}%, 
                    rgb(55, 65, 81) ${((parseFloat(raiseAmount || minRaiseEth.toString()) - minRaiseEth) / (maxRaiseEth - minRaiseEth)) * 100}%, 
                    rgb(55, 65, 81) 100%)`
                }}
              />

              {/* Min/Max Labels */}
              <div className="flex justify-between text-xs text-gray-400 mt-1 mono">
                <span>Min: {minRaiseEth.toFixed(4)} ETH</span>
                <span>Max: {maxRaiseEth.toFixed(4)} ETH</span>
              </div>

              {/* Number Input (for precise control) */}
              <input
                type="number"
                value={raiseAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    const clamped = Math.max(minRaiseEth, Math.min(val, maxRaiseEth));
                    setRaiseAmount(clamped.toFixed(4));
                  } else {
                    setRaiseAmount(e.target.value);
                  }
                }}
                placeholder={minRaiseEth.toFixed(4)}
                step={minRaiseEth / 10}
                min={minRaiseEth}
                max={maxRaiseEth}
                className="w-full px-4 py-3 mt-2 bg-gray-800/50 border-2 border-cyan-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-lg font-semibold text-white mono text-center"
              />
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
                disabled={isLoading || !raiseAmount || parseFloat(raiseAmount) < minRaiseEth}
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

