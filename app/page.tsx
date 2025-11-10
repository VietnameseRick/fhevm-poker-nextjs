/**
 * FHE Poker - Privacy-First Blockchain Poker
 * 
 * Copyright (c) 2025 0xDRick (Tra Anh Khoi)
 * Licensed under Business Source License 1.1 (see LICENSE-BSL)
 * 
 * Portions Copyright (c) 2025 Zama
 * Licensed under BSD 3-Clause Clear License (see LICENSE)
 */

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
