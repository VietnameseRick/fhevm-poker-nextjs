"use client";

import { useEffect, useState } from "react";

export type TransactionStep = {
  id: string;
  action: string;
  status: "pending" | "executing" | "success" | "error";
  timestamp: number;
  details?: string;
};

interface TransactionFlowProps {
  currentAction?: string;
  isLoading?: boolean;
  message?: string;
}

export function TransactionFlow({ currentAction, isLoading, message }: TransactionFlowProps) {
  const [steps, setSteps] = useState<TransactionStep[]>([]);

  useEffect(() => {
    if (currentAction && isLoading) {
      // Add new step when action starts
      const newStep: TransactionStep = {
        id: `${Date.now()}`,
        action: currentAction,
        status: "pending",
        timestamp: Date.now(),
      };
      setSteps(prev => [...prev.slice(-4), newStep]); // Keep last 5 steps
    } else if (currentAction && !isLoading && steps.length > 0) {
      // Update last step when action completes
      setSteps(prev => {
        const updated = [...prev];
        const lastStep = updated[updated.length - 1];
        if (lastStep && lastStep.status === "pending") {
          lastStep.status = message?.includes("❌") || message?.includes("Failed") ? "error" : "success";
          lastStep.details = message;
        }
        return updated;
      });
    }
  }, [currentAction, isLoading, message, steps.length]);

  const getStatusIcon = (status: TransactionStep["status"]) => {
    switch (status) {
      case "pending":
        return (
          <svg className="animate-spin h-4 w-4 text-yellow-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      case "executing":
        return <div className="h-4 w-4 rounded-full bg-blue-400 animate-pulse" />;
      case "success":
        return <div className="h-4 w-4 rounded-full bg-green-400">✓</div>;
      case "error":
        return <div className="h-4 w-4 rounded-full bg-red-400">✗</div>;
    }
  };

  const getStatusColor = (status: TransactionStep["status"]) => {
    switch (status) {
      case "pending":
        return "border-yellow-500 bg-yellow-500/10";
      case "executing":
        return "border-blue-500 bg-blue-500/10";
      case "success":
        return "border-green-500 bg-green-500/10";
      case "error":
        return "border-red-500 bg-red-500/10";
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, { icon: string; label: string; description: string }> = {
      "Decrypting": { icon: "🔓", label: "Decrypt Cards", description: "Fetching encrypted data from chain" },
      "Decrypting Your Cards": { icon: "🎴", label: "Decrypt Hole Cards", description: "Revealing your private cards" },
      "Decrypting Flop": { icon: "🃏", label: "Decrypt Flop", description: "Revealing 3 community cards" },
      "Decrypting Turn": { icon: "🃏", label: "Decrypt Turn", description: "Revealing 4th community card" },
      "Decrypting River": { icon: "🃏", label: "Decrypt River", description: "Revealing 5th community card" },
      "Folding": { icon: "❌", label: "Fold", description: "Broadcasting fold transaction" },
      "Checking": { icon: "✓", label: "Check", description: "Broadcasting check transaction" },
      "Calling": { icon: "💰", label: "Call", description: "Broadcasting call transaction" },
      "Raising": { icon: "📈", label: "Raise", description: "Broadcasting raise transaction" },
      "Joining": { icon: "🚪", label: "Join Table", description: "Sending buy-in transaction" },
      "Creating": { icon: "🎲", label: "Create Table", description: "Deploying table on-chain" },
      "Advancing": { icon: "⏭️", label: "Advance Game", description: "Progressing game state" },
    };

    for (const [key, value] of Object.entries(labels)) {
      if (action.includes(key)) {
        return value;
      }
    }
    return { icon: "⚙️", label: action, description: "Processing on-chain action" };
  };

  const formatTimestamp = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 1000) return "now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    return `${Math.floor(diff / 60000)}m ago`;
  };

  return (
    <div className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700 p-4 h-fit sticky top-4">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-700">
        <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
        <h3 className="text-white font-bold text-sm">On-Chain Activity</h3>
      </div>

      {steps.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">⛓️</div>
          <p className="text-slate-400 text-xs">No recent activity</p>
          <p className="text-slate-500 text-xs mt-1">Actions will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map((step, index) => {
            const actionInfo = getActionLabel(step.action);
            return (
              <div
                key={step.id}
                className={`border rounded-lg p-3 transition-all duration-300 ${getStatusColor(step.status)}`}
                style={{ animation: `slideIn 0.3s ease-out ${index * 0.05}s both` }}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">{getStatusIcon(step.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{actionInfo.icon}</span>
                      <p className="text-white text-sm font-semibold truncate">{actionInfo.label}</p>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">{actionInfo.description}</p>
                    {step.details && (
                      <p className={`text-xs mt-1 ${step.status === "error" ? "text-red-400" : "text-slate-500"}`}>
                        {step.details}
                      </p>
                    )}
                    <p className="text-slate-500 text-xs mt-1">{formatTimestamp(step.timestamp)}</p>
                  </div>
                </div>

                {/* Progress bar for pending/executing */}
                {(step.status === "pending" || step.status === "executing") && (
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse" style={{ width: step.status === "pending" ? "33%" : "66%" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-slate-700">
        <p className="text-slate-400 text-xs mb-2">Status Legend:</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-yellow-400" />
            <span className="text-slate-400">Pending</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-slate-400">Success</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

