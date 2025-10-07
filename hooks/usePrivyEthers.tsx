"use client";

import { useCallback, useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import type { Eip1193Provider } from 'ethers';

/**
 * Hook to get ethers.js signer and provider from Privy
 */
export function usePrivyEthers() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  
  const [ethersSigner, setEthersSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);
  const [ethersProvider, setEthersProvider] = useState<ethers.BrowserProvider | undefined>(undefined);
  const [eip1193Provider, setEip1193Provider] = useState<Eip1193Provider | undefined>(undefined);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [chainId, setChainId] = useState<number | undefined>(undefined);

  useEffect(() => {
    console.log('🔍 Privy state:', { 
      ready, 
      authenticated, 
      walletsReady, 
      walletsCount: wallets.length,
      wallets: wallets.map(w => ({ address: w.address, chainId: w.chainId, type: w.walletClientType }))
    });

    const setupEthers = async () => {
      if (!authenticated) {
        console.log('❌ Not authenticated yet');
        return;
      }

      if (wallets.length === 0) {
        console.log('❌ No wallets available');
        setEthersSigner(undefined);
        setEthersProvider(undefined);
        setEip1193Provider(undefined);
        setAddress(undefined);
        setChainId(undefined);
        return;
      }

      try {
        // Get the first wallet (active wallet)
        const activeWallet = wallets[0];
        
        console.log('🔄 Setting up Privy wallet:', {
          address: activeWallet.address,
          walletClientType: activeWallet.walletClientType,
          chainId: activeWallet.chainId
        });

        // Get EIP-1193 provider from Privy wallet
        const provider = await activeWallet.getEthereumProvider();
        console.log('✅ Got EIP-1193 provider');
        
        // Create ethers provider and signer
        const ethersProvider = new ethers.BrowserProvider(provider);
        console.log('✅ Created ethers provider');
        
        const signer = await ethersProvider.getSigner();
        console.log('✅ Got signer');
        
        // Get chain ID from provider
        const network = await ethersProvider.getNetwork();
        const currentChainId = Number(network.chainId);
        console.log('✅ Got network:', { chainId: currentChainId, name: network.name });
        
        setEip1193Provider(provider);
        setEthersProvider(ethersProvider);
        setEthersSigner(signer);
        setAddress(activeWallet.address);
        setChainId(currentChainId);
        
        console.log('✅ Wallet setup complete:', {
          address: activeWallet.address,
          chainId: currentChainId
        });
      } catch (error) {
        console.error('❌ Failed to setup ethers:', error);
      }
    };

    setupEthers();
  }, [ready, authenticated, wallets]);

  // Switch to Sepolia if not on correct chain
  const switchToSepolia = useCallback(async () => {
    if (wallets.length === 0) {
      console.log('No wallets available to switch chain');
      return;
    }

    const activeWallet = wallets[0];
    
    try {
      console.log('Switching to Sepolia...');
      await activeWallet.switchChain(11155111); // Sepolia
      
      // Refresh ethers setup after chain switch
      const provider = await activeWallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();
      const network = await ethersProvider.getNetwork();
      
      setEip1193Provider(provider);
      setEthersProvider(ethersProvider);
      setEthersSigner(signer);
      setChainId(Number(network.chainId));
      
      console.log('✅ Successfully switched to Sepolia');
    } catch (error) {
      console.error('Failed to switch chain:', error);
    }
  }, [wallets]);

  return {
    ready,
    authenticated,
    user,
    login,
    logout,
    ethersSigner,
    ethersProvider,
    eip1193Provider,
    address,
    chainId,
    // Helper to check if on correct chain
    isCorrectChain: chainId === 11155111, // Sepolia
    switchToSepolia,
  };
}

