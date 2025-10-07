import { PokerGame } from "@/components/PokerGame";

// Remove edge runtime to support WalletConnect
// export const runtime = 'edge';

export default function Home() {
  return (
    <main className="">
      <div className="flex flex-col gap-8 items-center sm:items-start w-full px-3 md:px-0">
        <PokerGame />
      </div>
    </main>
  );
}
