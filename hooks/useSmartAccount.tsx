"use client";

import { useCallback, useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import type { Eip1193Provider } from 'ethers';
import { createPublicClient, createWalletClient, custom, type Account, type Chain, type Transport, type WalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { createKernelAccount, createKernelAccountClient } from '@zerodev/sdk';
import { getEntryPoint } from "@zerodev/sdk/constants"; 
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator";
import { KERNEL_V3_1 } from "@zerodev/sdk/constants";
import { createPimlicoClient } from "permissionless/clients/pimlico";

/**
 * Custom EIP-1193 provider wrapper for Kernel smart account
 * This makes the smart account compatible with ethers.js
 */
class KernelEIP1193Provider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private kernelClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private publicClient: any;
  private chainId: number;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(kernelClient: any, publicClient: any, chainId: number) {
    this.kernelClient = kernelClient;
    this.publicClient = publicClient;
    this.chainId = chainId;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async request({ method, params }: { method: string; params?: any[] }): Promise<any> {
    console.log('🔵 KernelEIP1193Provider.request:', method, params);

    switch (method) {
      case 'eth_requestAccounts':
      case 'eth_accounts':
        return [this.kernelClient.account.address];
      
      case 'eth_chainId':
        return `0x${this.chainId.toString(16)}`;
      
      case 'eth_sendTransaction':
        if (!params || !params[0]) throw new Error('No transaction provided');
        const tx = params[0];
        console.log('📤 Sending transaction via Kernel:', tx);
        
        // Check smart account balance if value is being sent
        if (tx.value && BigInt(tx.value) > 0n) {
          const balance = await this.publicClient.getBalance({
            address: this.kernelClient.account.address,
          });
          console.log('💰 Smart Account Balance:', balance.toString(), 'Required:', tx.value);
          
          if (balance < BigInt(tx.value)) {
            const errorMsg = `Insufficient balance. Smart account has ${balance.toString()} wei but needs ${tx.value} wei. Please fund your smart account at ${this.kernelClient.account.address}`;
            console.error('❌', errorMsg);
            throw new Error(errorMsg);
          }
        }
        
        // Send transaction with proper gas estimation
        try {
          const hash = await this.kernelClient.sendTransaction({
            to: tx.to,
            data: tx.data || '0x',
            value: tx.value ? BigInt(tx.value) : 0n,
            // Let the kernel client estimate gas automatically
            // Don't pass gas parameter to force estimation
          });
          
          console.log('✅ Transaction sent:', hash);
          return hash;
        } catch (error: unknown) {
          console.error('❌ Transaction failed:', error);
          
          // Provide more helpful error messages
          if (error instanceof Error && error?.message?.includes('insufficient funds')) {
            throw new Error(`Insufficient funds in smart account (${this.kernelClient.account.address}). Please fund the account first.`);
          }
          
          throw error;
        }
      
      case 'eth_signTypedData_v4':
      case 'personal_sign':
        // For signing, we'll use the underlying EOA wallet
        console.log('✍️ Signing with smart account:', method);
        const message = params?.[0] || '';
        const signature = await this.kernelClient.signMessage({
          message: typeof message === 'string' ? message : message,
        });
        return signature;
      
      case 'eth_estimateGas':
        // Estimate gas for the transaction
        if (!params || !params[0]) throw new Error('No transaction provided');
        return '0x100000'; // Return a reasonable default
      
      case 'eth_getTransactionReceipt':
        // Forward to the public client
        try {
          const receipt = await this.publicClient.getTransactionReceipt({
            hash: params?.[0],
          });
          return receipt;
        } catch (error) {
          console.warn('Failed to get transaction receipt:', error);
          // Return a minimal receipt to avoid breaking the flow
          return {
            transactionHash: params?.[0],
            status: '0x1', // Success
            blockNumber: '0x0',
            blockHash: '0x0',
            logs: [],
            gasUsed: '0x0',
            effectiveGasPrice: '0x0',
            type: '0x2', // EIP-1559
          };
        }

      case 'eth_getTransactionByHash':
        // Forward to the public client
        try {
          const transaction = await this.publicClient.getTransaction({
            hash: params?.[0],
          });
          return transaction;
        } catch (error) {
          console.warn('Failed to get transaction by hash:', error);
          // Return a minimal transaction to avoid breaking the flow
          return {
            hash: params?.[0],
            type: '0x2', // EIP-1559
            from: '0x0',
            to: '0x0',
            value: '0x0',
            gas: '0x0',
            gasPrice: '0x0',
            maxFeePerGas: '0x0',
            maxPriorityFeePerGas: '0x0',
            nonce: 0,
            data: '0x',
            r: '0x0',
            s: '0x0',
            v: 0,
          };
        }

      case 'eth_call':
        if (!params || !params[0]) throw new Error('No call data provided');
        const callData = params[0];
        const result = await this.publicClient.call({
          to: callData.to,
          data: callData.data,
          ...(callData.value && { value: BigInt(callData.value) }),
        });
        return result.data;

      case 'eth_getBalance':
        const balance = await this.publicClient.getBalance({
          address: params?.[0] || this.kernelClient.account.address,
        });
        return `0x${balance.toString(16)}`;

      case 'eth_getCode':
        const code = await this.publicClient.getBytecode({
          address: params?.[0],
        });
        return code || '0x';

      case 'eth_blockNumber':
        const blockNumber = await this.publicClient.getBlockNumber();
        return `0x${blockNumber.toString(16)}`;

      case 'eth_getTransactionCount':
        const nonce = await this.publicClient.getTransactionCount({
          address: params?.[0] || this.kernelClient.account.address,
        });
        return `0x${nonce.toString(16)}`;

      default:
        console.warn(`⚠️ Unhandled method: ${method}`, params);
        throw new Error(`Method ${method} not supported by KernelEIP1193Provider`);
    }
  }
}

/**
 * Hook to create and manage a smart account using Privy + Permissionless (Kernel)
 * This is a drop-in replacement for usePrivyEthers with smart account capabilities
 */
export function useSmartAccount() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  
  const [ethersSigner, setEthersSigner] = useState<ethers.JsonRpcSigner | undefined>(undefined);
  const [ethersProvider, setEthersProvider] = useState<ethers.BrowserProvider | undefined>(undefined);
  const [eip1193Provider, setEip1193Provider] = useState<Eip1193Provider | undefined>(undefined);
  const [address, setAddress] = useState<string | undefined>(undefined); // EOA address
  const [smartAccountAddress, setSmartAccountAddress] = useState<string | undefined>(undefined);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [isDeployingSmartAccount, setIsDeployingSmartAccount] = useState(false);
  const kernelVersion = KERNEL_V3_1;


  useEffect(() => {
    console.log('🔍 Smart Account state:', { 
      ready, 
      authenticated, 
      walletsReady, 
      walletsCount: wallets.length,
      wallets: wallets.map(w => ({ address: w.address, chainId: w.chainId, type: w.walletClientType }))
    });

    const setupSmartAccount = async () => {
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
        setSmartAccountAddress(undefined);
        setChainId(undefined);
        return;
      }

      try {
        setIsDeployingSmartAccount(true);
        
        // Get the embedded wallet (EOA) from Privy - prioritize Privy embedded wallets
        const embeddedWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
        
        // If no embedded wallet found, fallback to regular EOA
        if (!embeddedWallet || embeddedWallet.walletClientType !== 'privy') {
          console.log('⚠️ No Privy embedded wallet found, using regular wallet (no smart account)');
          setIsDeployingSmartAccount(false);
          
          const activeWallet = wallets[0];
          const provider = await activeWallet.getEthereumProvider();
          const ethersProvider = new ethers.BrowserProvider(provider);
          const signer = await ethersProvider.getSigner();
          const network = await ethersProvider.getNetwork();
          
          setEip1193Provider(provider);
          setEthersProvider(ethersProvider);
          setEthersSigner(signer);
          setAddress(activeWallet.address);
          setChainId(Number(network.chainId));
          return;
        }
        
        console.log('🔄 Setting up Smart Account with Privy embedded wallet:', {
          address: embeddedWallet.address,
          walletClientType: embeddedWallet.walletClientType,
          chainId: embeddedWallet.chainId
        });

        // Get EIP-1193 provider from Privy wallet
        const eoaProvider = await embeddedWallet.getEthereumProvider();
        console.log('✅ Got EOA EIP-1193 provider');

        // Set the EOA address
        setAddress(embeddedWallet.address);
        setChainId(11155111); // Sepolia

        // Create viem wallet client from the EOA
        const walletClient = createWalletClient({
          account: embeddedWallet.address as `0x${string}`,
          chain: sepolia,
          transport: custom(eoaProvider),
        }) as WalletClient<Transport, Chain, Account>;

        console.log('✅ Created viem wallet client');

        // Create public client for reading blockchain data
        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http(),
        });

        console.log('✅ Created public client');
        
        // Create ECDSA validator from the EOA signer
        const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
          signer: walletClient,
          kernelVersion,
          entryPoint: getEntryPoint("0.7"), 
        });

        console.log('✅ Created ECDSA validator');

        // Create Kernel Account (Smart Account)
        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: {
                sudo: ecdsaValidator,
            },
            entryPoint: getEntryPoint("0.7"), 
            kernelVersion,
        });

        console.log('✅ Created Kernel Account:', kernelAccount.address);

        // Setup Pimlico bundler and paymaster for gas sponsorship
        const pimlicoApiKey = 'pim_5FMzCjv9XBFeD8rtYWz6N5';
        const pimlicoUrl = `https://api.pimlico.io/v2/sepolia/rpc?apikey=${pimlicoApiKey}`;
        
        // Create Pimlico client (handles both bundler and paymaster)
        const pimlicoClient = createPimlicoClient({
          chain: sepolia,
          transport: http(pimlicoUrl),
          entryPoint: getEntryPoint("0.7"),
        });
        
        // Create Kernel Account Client with Pimlico sponsorship
        const kernelClient = createKernelAccountClient({
          account: kernelAccount,
          chain: sepolia,
          bundlerTransport: http(pimlicoUrl),
          client: publicClient,
          paymaster: pimlicoClient,
          // Let Pimlico handle gas estimation automatically
          userOperation: {
            estimateFeesPerGas: async () => {
              try {
                const gasPrice = await pimlicoClient.getUserOperationGasPrice();
                return gasPrice.fast; // Use fast tier for better reliability
              } catch (error) {
                console.error('Failed to estimate gas price, using fallback:', error);
                // Fallback to public client gas price
                const gasPrice = await publicClient.getGasPrice();
                return {
                  maxFeePerGas: gasPrice,
                  maxPriorityFeePerGas: gasPrice / 2n,
                };
              }
            },
          },
        });

        console.log('✅ Created Kernel Client');

        // Create custom EIP-1193 provider for the smart account
        const smartAccountProvider = new KernelEIP1193Provider(kernelClient, publicClient, 11155111) as unknown as Eip1193Provider;
        
        // Create ethers provider and signer from smart account
        const ethersProvider = new ethers.BrowserProvider(smartAccountProvider);
        console.log('✅ Created ethers provider for smart account');
        
        const signer = await ethersProvider.getSigner();
        console.log('✅ Got signer from smart account');

        setEip1193Provider(smartAccountProvider);
        setEthersProvider(ethersProvider);
        setEthersSigner(signer);
        setSmartAccountAddress(kernelAccount.address);
        
        console.log('✅ Smart Account setup complete:', {
          eoaAddress: embeddedWallet.address,
          smartAccountAddress: kernelAccount.address,
          chainId: 11155111
        });

        setIsDeployingSmartAccount(false);
      } catch (error) {
        console.error('❌ Failed to setup smart account:', error);
        setIsDeployingSmartAccount(false);
        
        // Fallback to regular EOA if smart account setup fails
        console.log('⚠️ Falling back to EOA wallet');
        try {
          const activeWallet = wallets[0];
          const provider = await activeWallet.getEthereumProvider();
          const ethersProvider = new ethers.BrowserProvider(provider);
          const signer = await ethersProvider.getSigner();
          const network = await ethersProvider.getNetwork();
          
          setEip1193Provider(provider);
          setEthersProvider(ethersProvider);
          setEthersSigner(signer);
          setAddress(activeWallet.address);
          setChainId(Number(network.chainId));
        } catch (fallbackError) {
          console.error('❌ Fallback to EOA also failed:', fallbackError);
        }
      }
    };

    setupSmartAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, wallets, walletsReady]);

  // Check smart account balance
  const checkBalance = useCallback(async (): Promise<bigint> => {
    if (!ethersProvider || !smartAccountAddress) {
      return 0n;
    }
    
    try {
      const balance = await ethersProvider.getBalance(smartAccountAddress);
      return balance;
    } catch (error) {
      console.error('Failed to check balance:', error);
      return 0n;
    }
  }, [ethersProvider, smartAccountAddress]);

  // Check if smart account has sufficient balance for a transaction
  const hasEnoughBalance = useCallback(async (requiredAmount: bigint): Promise<boolean> => {
    const balance = await checkBalance();
    return balance >= requiredAmount;
  }, [checkBalance]);

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
      
      // Re-setup smart account after chain switch
      window.location.reload(); // Simple reload to re-initialize
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
    address: smartAccountAddress || address, // Return smart account address if available
    eoaAddress: address, // Original EOA address
    smartAccountAddress,
    chainId,
    isSmartAccount: !!smartAccountAddress,
    isDeployingSmartAccount,
    // Helper to check if on correct chain
    isCorrectChain: chainId === 11155111, // Sepolia
    switchToSepolia,
    // Balance checking functions
    checkBalance,
    hasEnoughBalance,
  };
}

