import { PokerGame } from "@/components/PokerGame";

// Remove edge runtime to support WalletConnect
// export const runtime = 'edge';

export default function Home() {
  return (
    <main className="relative">
          <div className="relative z-10">
            <PokerGame />
          </div>
    </main>
  );
}
