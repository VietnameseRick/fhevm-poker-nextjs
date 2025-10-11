/**
 * Environment Configuration
 * 
 * This file centralizes all environment-specific settings.
 * It reads from environment variables (NEXT_PUBLIC_*) with sensible defaults.
 * 
 * To switch between local and Sepolia:
 * 1. Copy env.example to .env.local
 * 2. Set NEXT_PUBLIC_NETWORK=local or NEXT_PUBLIC_NETWORK=sepolia
 */

export type Network = 'local' | 'sepolia';

// =============================================================================
// NETWORK CONFIGURATION
// =============================================================================

export const NETWORK: Network = (process.env.NEXT_PUBLIC_NETWORK as Network) || 'sepolia';
export const IS_LOCAL = NETWORK === 'local';
export const IS_SEPOLIA = NETWORK === 'sepolia';

// =============================================================================
// CHAIN IDS
// =============================================================================

export const CHAIN_IDS = {
  local: 31337, // Hardhat default
  sepolia: 11155111,
} as const;

export const CHAIN_ID = CHAIN_IDS[NETWORK];

// =============================================================================
// RPC ENDPOINTS
// =============================================================================

const DEFAULT_LOCAL_RPC = 'http://127.0.0.1:8545';
const DEFAULT_SEPOLIA_RPC = 'https://sepolia.infura.io/v3/472e39d0d0e4446d933eb750d348b337';

// WebSocket endpoints for event listening (more efficient than HTTP polling)
const DEFAULT_LOCAL_WS = 'ws://127.0.0.1:8545';
const DEFAULT_SEPOLIA_WS = 'wss://sepolia.infura.io/ws/v3/472e39d0d0e4446d933eb750d348b337';

export const RPC_URLS = {
  local: process.env.NEXT_PUBLIC_LOCAL_RPC_URL || DEFAULT_LOCAL_RPC,
  sepolia: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC,
} as const;

export const WS_RPC_URLS = {
  local: process.env.NEXT_PUBLIC_LOCAL_WS_RPC_URL || DEFAULT_LOCAL_WS,
  sepolia: process.env.NEXT_PUBLIC_SEPOLIA_WS_RPC_URL || DEFAULT_SEPOLIA_WS,
} as const;

export const RPC_URL = RPC_URLS[NETWORK];
export const WS_RPC_URL = WS_RPC_URLS[NETWORK];

// =============================================================================
// SMART ACCOUNT CONFIGURATION (ZeroDev + Pimlico)
// =============================================================================

// Smart accounts only work on Sepolia (not local hardhat)
export const ENABLE_SMART_ACCOUNT = 
  process.env.NEXT_PUBLIC_ENABLE_SMART_ACCOUNT === 'true' && IS_SEPOLIA;

// Pimlico configuration
export const PIMLICO_API_KEY = 
  process.env.NEXT_PUBLIC_PIMLICO_API_KEY || 'pim_5FMzCjv9XBFeD8rtYWz6N5';

export const PIMLICO_BUNDLER_URL = 
  process.env.NEXT_PUBLIC_PIMLICO_BUNDLER_URL || 
  `https://api.pimlico.io/v2/sepolia/rpc?apikey=${PIMLICO_API_KEY}`;

// =============================================================================
// PRIVY AUTHENTICATION
// =============================================================================

export const PRIVY_APP_ID = 
  process.env.NEXT_PUBLIC_PRIVY_APP_ID || 'cmggia5o900jzjs0cux2xulkj';

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export const ENABLE_WEBSOCKET = 
  process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET !== 'false';

// =============================================================================
// CONTRACT ADDRESSES (optional overrides)
// =============================================================================

export const CONTRACT_ADDRESSES = {
  FHEPOKER: {
    sepolia: process.env.NEXT_PUBLIC_FHEPOKER_ADDRESS_SEPOLIA,
    local: process.env.NEXT_PUBLIC_FHEPOKER_ADDRESS_LOCAL,
  },
} as const;

// =============================================================================
// LOGGING
// =============================================================================

// Log configuration on startup (client-side only)
if (typeof window !== 'undefined') {
  console.log('🔧 Environment Configuration:', {
    network: NETWORK,
    chainId: CHAIN_ID,
    rpcUrl: RPC_URL,
    enableSmartAccount: ENABLE_SMART_ACCOUNT,
    enableWebSocket: ENABLE_WEBSOCKET,
  });
}

// =============================================================================
// EXPORTS
// =============================================================================

export const config = {
  network: NETWORK,
  isLocal: IS_LOCAL,
  isSepolia: IS_SEPOLIA,
  chainId: CHAIN_ID,
  rpcUrl: RPC_URL,
  wsRpcUrl: WS_RPC_URL,
  privyAppId: PRIVY_APP_ID,
  enableSmartAccount: ENABLE_SMART_ACCOUNT,
  enableWebSocket: ENABLE_WEBSOCKET,
  pimlico: {
    apiKey: PIMLICO_API_KEY,
    bundlerUrl: PIMLICO_BUNDLER_URL,
  },
  contractAddresses: CONTRACT_ADDRESSES,
} as const;

export default config;

