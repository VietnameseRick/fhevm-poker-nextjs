import { BrowserProvider, JsonRpcSigner } from 'ethers';
import type { WalletClient } from 'viem';

/**
 * Converts a viem WalletClient to an ethers JsonRpcSigner
 * This is needed for FHEVM decryption which uses ethers.js
 */
export function walletClientToSigner(walletClient: WalletClient): JsonRpcSigner {
  const { account, chain, transport } = walletClient;
  
  if (!account) {
    throw new Error('No account found in wallet client');
  }
  
  if (!chain) {
    throw new Error('No chain found in wallet client');
  }
  
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account.address);
  
  return signer;
}

/**
 * Converts a viem WalletClient to an ethers BrowserProvider
 */
export function walletClientToProvider(walletClient: WalletClient): BrowserProvider {
  const { chain, transport } = walletClient;
  
  if (!chain) {
    throw new Error('No chain found in wallet client');
  }
  
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address,
  };
  
  return new BrowserProvider(transport, network);
}

