"use client";

/**
 * Example hook showing how to use the @fhevm-poker/ alias
 * 
 * This demonstrates the three different import paths available:
 * 
 * 1. @/ - For site-specific code (components, hooks, generated ABIs)
 * 2. @fhevm/react - For FHEVM core functionality (hooks, types, utilities)
 * 3. @fhevm-poker/ - For poker contract package imports
 */

import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// 1. Import from @fhevm/react - FHEVM core functionality
import {
  FhevmDecryptionSignature,
  type FhevmInstance,
  type GenericStringStorage,
} from "@fhevm/react";

// 2. Import from @/ - Site-specific generated ABIs
import { FHEPokerABI } from "@/abi/FHEPokerABI";
import { FHEPokerAddresses } from "@/abi/FHEPokerAddresses";

// 3. Import from @fhevm-poker/ - Poker contract package
// You can import TypeScript types from the poker package if needed
// import type { FHEPoker } from "@fhevm-poker/types";

interface PokerTableInfo {
  abi: typeof FHEPokerABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
}

/**
 * Resolves FHEPoker contract metadata for the given EVM chainId
 */
function getFHEPokerByChainId(chainId: number | undefined): PokerTableInfo {
  if (!chainId) {
    return { abi: FHEPokerABI.abi };
  }

  const entry =
    FHEPokerAddresses[chainId.toString() as keyof typeof FHEPokerAddresses];

  if (!("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: FHEPokerABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: FHEPokerABI.abi,
  };
}

/**
 * Example hook for interacting with FHEPoker contract
 */
export const useFHEPoker = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
  } = parameters;

  const [tableId, setTableId] = useState<bigint | undefined>(undefined);
  const [message, setMessage] = useState<string>("");

  const pokerContract = useMemo(() => {
    return getFHEPokerByChainId(chainId);
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!pokerContract) {
      return undefined;
    }
    return (
      Boolean(pokerContract.address) &&
      pokerContract.address !== ethers.ZeroAddress
    );
  }, [pokerContract]);

  // Example: Create a poker table
  const createTable = useCallback(async () => {
    if (!pokerContract.address || !ethersSigner) {
      setMessage("Contract not deployed or signer not available");
      return;
    }

    try {
      const contract = new ethers.Contract(
        pokerContract.address,
        pokerContract.abi,
        ethersSigner
      );

      setMessage("Creating poker table...");

      const tx = await contract.createTable(
        ethers.parseEther("0.1"), // minBuyIn: 0.1 ETH
        6, // maxPlayers: 6
        5 // countdownDuration: 5 seconds
      );

      setMessage(`Waiting for transaction: ${tx.hash}`);
      const receipt = await tx.wait();

      // Parse the TableCreated event to get the table ID
      const event = receipt?.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "TableCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        const newTableId = parsed?.args.tableId;
        setTableId(newTableId);
        setMessage(`Table created! ID: ${newTableId.toString()}`);
      }
    } catch (error: any) {
      setMessage(`Failed to create table: ${error.message}`);
    }
  }, [pokerContract, ethersSigner]);

  return {
    contractAddress: pokerContract.address,
    isDeployed,
    tableId,
    message,
    createTable,
  };
};

