"use client";

import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { sepolia } from 'viem/chains';
import { ReactNode, useState } from 'react';

// Wagmi config for Sepolia with smart account support
// Use Infura Sepolia RPC that supports event filtering (drpc.org free tier doesn't)
export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http('https://sepolia.infura.io/v3/472e39d0d0e4446d933eb750d348b337'),
  },
});

export function PrivyProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <BasePrivyProvider
      appId="cmggia5o900jzjs0cux2xulkj"
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          logo: '/zama-logo.svg',
        },
        defaultChain: sepolia,
        supportedChains: [sepolia],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </BasePrivyProvider>
  );
}

