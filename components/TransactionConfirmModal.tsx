"use client";

import { useEffect, useState } from "react";

interface TransactionConfirmModalProps {
  isOpen: boolean;
  action: string;
  onClose?: () => void;
}

export function TransactionConfirmModal({ isOpen, action, onClose }: TransactionConfirmModalProps) {
  const [dots, setDots] = useState("");
  const [glitchText, setGlitchText] = useState(action);

  // Animated dots
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Glitch effect on action text
  useEffect(() => {
    if (!isOpen) return;
    const glitchChars = "!<>-_\\/[]{}—=+*^?#________";
    const interval = setInterval(() => {
      if (Math.random() > 0.9) {
        const glitched = action
          .split("")
          .map((char) =>
            Math.random() > 0.85
              ? glitchChars[Math.floor(Math.random() * glitchChars.length)]
              : char
          )
          .join("");
        setGlitchText(glitched);
        setTimeout(() => setGlitchText(action), 100);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [isOpen, action]);

  if (!isOpen) return null;

  const getActionIcon = (actionText: string) => {
    if (actionText.includes("Fold")) return "❌";
    if (actionText.includes("Check")) return "✓";
    if (actionText.includes("Call")) return "💰";
    if (actionText.includes("Raise") || actionText.includes("Bet")) return "📈";
    if (actionText.includes("Join")) return "🚪";
    if (actionText.includes("Create")) return "🎲";
    if (actionText.includes("Advance") || actionText.includes("Start")) return "⏭️";
    return "⚡";
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop with animated gradient */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md animate-pulse-slow gpu-opacity"
        onClick={onClose}
        style={{
          background: "radial-gradient(circle at center, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.98) 100%)",
        }}
      />

      {/* Modal content */}
      <div className="relative z-10 max-w-md w-full gpu-transform-opacity">
        {/* Corner brackets */}
        <div className="absolute -top-4 -left-4 w-8 h-8 border-l-4 border-t-4 border-green-500 animate-optimized-pulse" />
        <div className="absolute -top-4 -right-4 w-8 h-8 border-r-4 border-t-4 border-green-500 animate-optimized-pulse" />
        <div className="absolute -bottom-4 -left-4 w-8 h-8 border-l-4 border-b-4 border-green-500 animate-optimized-pulse" />
        <div className="absolute -bottom-4 -right-4 w-8 h-8 border-r-4 border-b-4 border-green-500 animate-optimized-pulse" />

        {/* Main card */}
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-green-500/50 rounded-xl p-8 shadow-2xl shadow-green-500/20">
          {/* Animated grid background */}
          <div className="absolute inset-0 opacity-10 overflow-hidden rounded-xl">
            <div className="absolute inset-0" style={{
              backgroundImage: `
                linear-gradient(90deg, rgba(34,197,94,0.3) 1px, transparent 1px),
                linear-gradient(rgba(34,197,94,0.3) 1px, transparent 1px)
              `,
              backgroundSize: "20px 20px",
              animation: "grid-scroll 20s linear infinite",
            }} />
          </div>

          {/* Wallet icon with pulse */}
          <div className="relative flex justify-center mb-6">
            <div className="relative">
              {/* Pulse rings */}
              <div className="absolute inset-0 -m-4 gpu-accelerate">
                <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-20" />
                <div className="absolute inset-0 rounded-full border-2 border-green-400 animate-ping opacity-20" style={{ animationDelay: "1s" }} />
              </div>
              
              {/* Wallet icon */}
              <div className="relative w-20 h-20 bg-gradient-to-br from-green-900 to-green-700 rounded-full flex items-center justify-center border-4 border-green-500 shadow-lg shadow-green-500/50 gpu-accelerate">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-10 h-10 text-green-300 animate-optimized-pulse"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-center mb-2 text-green-400 tracking-wider" style={{ fontFamily: "monospace" }}>
            WALLET CONFIRMATION
          </h2>

          {/* Action with glitch effect */}
          <div className="mb-6 p-4 bg-black/40 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400/70 text-center mb-1">ACTION</p>
            <p className="text-xl font-bold text-center text-white tracking-wide glitch-text" style={{ fontFamily: "monospace" }}>
              {getActionIcon(action)} {glitchText}
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black text-xs font-bold mt-0.5">
                1
              </div>
              <div>
                <p className="text-green-300 font-semibold text-sm">Check your wallet</p>
                <p className="text-green-400/70 text-xs">A transaction popup should appear</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black text-xs font-bold mt-0.5">
                2
              </div>
              <div>
                <p className="text-green-300 font-semibold text-sm">Review the details</p>
                <p className="text-green-400/70 text-xs">Verify gas fees and amounts</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-black text-xs font-bold mt-0.5">
                3
              </div>
              <div>
                <p className="text-green-300 font-semibold text-sm">Confirm transaction</p>
                <p className="text-green-400/70 text-xs">Click &quot;Confirm&quot; or &quot;Approve&quot;</p>
              </div>
            </div>
          </div>

          {/* Loading indicator */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 via-green-400 to-green-500 rounded-full animate-progress"
                style={{
                  animation: "progress 2s ease-in-out infinite",
                }}
              />
            </div>

            <p className="text-center text-green-400 text-sm animate-pulse font-mono">
              Waiting for confirmation{dots}
            </p>
          </div>

          {/* Cancel button */}
          {onClose && (
            <button
              onClick={onClose}
              className="mt-6 w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-green-500/50 text-slate-300 hover:text-white rounded-lg transition-all text-sm font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes grid-scroll {
          0% {
            transform: translateY(0);
          }
          100% {
            transform: translateY(20px);
          }
        }

        @keyframes progress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-pulse-slow {
          animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .glitch-text {
          text-shadow: 
            0.05em 0 0 rgba(34, 197, 94, 0.75),
            -0.025em -0.05em 0 rgba(34, 197, 94, 0.75),
            0.025em 0.05em 0 rgba(34, 197, 94, 0.75);
        }
      `}</style>
    </div>
  );
}

