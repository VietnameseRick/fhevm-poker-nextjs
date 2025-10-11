import { PokerGame } from "@/components/PokerGame";

// Remove edge runtime to support WalletConnect
// export const runtime = 'edge';

export default function Home() {
  return (
    <main className="relative">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-block mb-6">
          <div className="px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/50 rounded-full">
            <span className="text-cyan-300 text-sm font-bold tracking-wider mono">
              GHUB • POKER PROTOCOL
            </span>
          </div>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
            Privacy-First Poker
          </span>
        </h1>
        
        <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-4">
          Experience true privacy with{" "}
          <span className="text-cyan-400 font-semibold">Fully Homomorphic Encryption</span>
          {" "}on the blockchain
        </p>
        
        <div className="flex items-center justify-center gap-4 text-sm text-gray-400 mono">
          <span>Powered by</span>
          <span className="text-purple-400 font-bold">Zama fhEVM</span>
        </div>
      </div>

      {/* Game Container with Futuristic Wrapper */}
      <div className="relative">
        {/* Corner brackets */}
        <div className="absolute -top-4 -left-4 w-20 h-20 border-t-2 border-l-2 border-cyan-500/50 pointer-events-none"></div>
        <div className="absolute -top-4 -right-4 w-20 h-20 border-t-2 border-r-2 border-cyan-500/50 pointer-events-none"></div>
        <div className="absolute -bottom-4 -left-4 w-20 h-20 border-b-2 border-l-2 border-purple-500/50 pointer-events-none"></div>
        <div className="absolute -bottom-4 -right-4 w-20 h-20 border-b-2 border-r-2 border-purple-500/50 pointer-events-none"></div>
        
        {/* Main game wrapper */}
        <div className="relative glass-card rounded-2xl p-4 md:p-6 border-2 border-cyan-500/30 overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none"></div>
          
          {/* Content */}
          <div className="relative z-10">
            <PokerGame />
          </div>
        </div>
      </div>
    </main>
  );
}
