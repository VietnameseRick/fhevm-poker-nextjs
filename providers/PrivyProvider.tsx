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
// Uses WebSocket for both local and Sepolia networks for real-time events
export const wagmiConfig = config.isLocal 
  ? createConfig({
      chains: [hardhat],
      transports: {
        // Use WebSocket for local Hardhat if available (ws://127.0.0.1:8545)
        [hardhat.id]: config.wsRpcUrl && config.enableWebSocket
          ? webSocket(config.wsRpcUrl, {
              reconnect: {
                attempts: 10,
                delay: 1000,
              },
              keepAlive: true,
            })
          : http(config.rpcUrl, {
              batch: {
                wait: 100,
              },
            }),
      },
      pollingInterval: config.wsRpcUrl && config.enableWebSocket ? undefined : 5000,
      // Disable caching for real-time poker game
      cacheTime: 0,
    })
  : createConfig({
      chains: [sepolia],
      transports: {
        // Use WebSocket for real-time events (no polling needed!)
        [sepolia.id]: config.wsRpcUrl && config.enableWebSocket
          ? webSocket(config.wsRpcUrl, {
              reconnect: {
                attempts: 10,
                delay: 1000,
              },
              keepAlive: true,
            })
          : http(config.rpcUrl, {
              batch: {
                wait: 100,
              },
            }),
      },
      pollingInterval: config.wsRpcUrl && config.enableWebSocket ? undefined : 5000,
      // Disable caching for real-time poker game
      cacheTime: 0,
    });

export function PrivyProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Disable aggressive caching for poker game state - always fetch fresh
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnReconnect: false, // Don't refetch on reconnect
        staleTime: 0, // Always consider data stale (fetch fresh on mount)
        gcTime: 30 * 1000, // Keep unused data in cache for only 30 seconds
        retry: 1, // Only retry once on failure (instead of 3)
        refetchOnMount: true, // Always refetch on component mount
      },
    },
  }));

  return (
    <BasePrivyProvider
      appId={config.privyAppId}
      config={{
        // loginMethods: ['email', 'google', 'wallet'],
        loginMethods: ['wallet'],
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

