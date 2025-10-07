"use client";

import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { sepolia } from 'viem/chains';
import { ReactNode, useState } from 'react';

// Wagmi config for Sepolia
export const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

export function PrivyProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <BasePrivyProvider
      appId="cmggia5o900jzjs0cux2xulkj"
      config={{
        loginMethods: ['email', 'wallet', 'google'],
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

