"use client";

import { PrivyProvider as BasePrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider, createConfig } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, webSocket } from 'viem';
import { sepolia, hardhat } from 'viem/chains';
import { ReactNode, useState } from 'react';
import config from '@/utils/config';

// Get the appropriate chain based on network
const chain = config.isLocal ? hardhat : sepolia;

// Wagmi config with environment-based RPC
// Uses WebSocket for Sepolia (more efficient for events), HTTP for local Hardhat
export const wagmiConfig = config.isLocal 
  ? createConfig({
      chains: [hardhat],
      transports: {
        [hardhat.id]: http(config.rpcUrl, {
          batch: {
            wait: 100, // Batch multiple calls together
          },
        }),
      },
      pollingInterval: 5000, // Poll every 5 seconds (reduced RPC load)
    })
  : createConfig({
      chains: [sepolia],
      transports: {
        // Use WebSocket for real-time events (no polling needed!)
        [sepolia.id]: config.wsRpcUrl 
          ? webSocket(config.wsRpcUrl, {
              reconnect: {
                attempts: 10,
                delay: 1000,
              },
            })
          : http(config.rpcUrl, {
              batch: {
                wait: 100,
              },
            }),
      },
      pollingInterval: config.wsRpcUrl ? undefined : 5000, // No polling with WebSocket
    });

export function PrivyProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Reduce automatic refetching to save RPC calls
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnReconnect: false, // Don't refetch on reconnect
        staleTime: 3000, // Consider data fresh for 3 seconds
        gcTime: 5 * 60 * 1000, // Keep unused data in cache for 5 minutes
        retry: 1, // Only retry once on failure (instead of 3)
      },
    },
  }));

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

