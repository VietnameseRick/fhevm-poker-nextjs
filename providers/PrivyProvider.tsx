"use client";

import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'viem';
import { sepolia, hardhat } from 'viem/chains';
import { ReactNode, useState } from 'react';
import config from '@/utils/config';

// Get the appropriate chain based on network
const chain = config.isLocal ? hardhat : sepolia;

// Wagmi config with environment-based RPC
// Uses config.rpcUrl which switches based on NEXT_PUBLIC_NETWORK env var
export const wagmiConfig = config.isLocal 
  ? createConfig({
      chains: [hardhat],
      transports: {
        [hardhat.id]: http(config.rpcUrl),
      },
    })
  : createConfig({
      chains: [sepolia],
      transports: {
        [sepolia.id]: http(config.rpcUrl),
      },
    });

export function PrivyProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <BasePrivyProvider
      appId={config.privyAppId}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          logo: '/zama-logo.svg',
        },
        defaultChain: chain,
        supportedChains: [chain],
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

