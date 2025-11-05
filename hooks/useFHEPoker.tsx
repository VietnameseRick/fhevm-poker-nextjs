"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  type FhevmInstance,
  type GenericStringStorage,
} from "@fhevm/react";

/*
  The following two files are automatically generated when `npx hardhat deploy` is called
  The <root>/packages/<contracts package dir>/deployments directory is parsed to retrieve
  deployment information for FHEPoker.sol and the following files are generated:

  - <root>/packages/site/abi/FHEPokerABI.ts
  - <root>/packages/site/abi/FHEPokerAddresses.ts
*/
import { FHEPokerAddresses } from "@/abi/FHEPokerAddresses";
import { FHEPokerABI } from "@/abi/FHEPokerABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};
type FHEPokerInfoType = {
  abi: typeof FHEPokerABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

/**
 * Resolves FHEPoker contract metadata for the given EVM `chainId`.
 *
 * The ABI and address book are **generated** from the contracts package
 * artifacts into the `@/abi` folder at build time. This function performs a
 * simple lookup in that generated map.
 *
 * Behavior:
 * - If `chainId` is `undefined` or not found in the map, returns ABI only.
 * - Otherwise returns `{ abi, address, chainId, chainName }`.
 *
 * @param chainId - Target chain id (e.g., 1, 5, 11155111). `undefined` returns ABI-only.
 * @returns Contract info for the chain or ABI-only fallback.
 * @example
 * const { abi, address } = getFHEPokerByChainId(chainId);
 */
function getFHEPokerByChainId(
  chainId: number | undefined
): FHEPokerInfoType {
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

/*
 * Main FHEPoker React hook for interacting with the FHE Poker contract
 *  - Provides contract connection and utilities for the poker game
 *  - For game state management, use usePokerStore() directly
 */
export const useFHEPoker = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
  } = parameters;

  //////////////////////////////////////////////////////////////////////////////
  // States + Refs
  //////////////////////////////////////////////////////////////////////////////

  const [message, setMessage] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const fhePokerRef = useRef<FHEPokerInfoType | undefined>(undefined);

  //////////////////////////////////////////////////////////////////////////////
  // FHEPoker Contract Connection
  //////////////////////////////////////////////////////////////////////////////

  const fhePoker = useMemo(() => {
    const c = getFHEPokerByChainId(chainId);
    fhePokerRef.current = c;

    if (!c.address) {
      setMessage(`FHEPoker deployment not found for chainId=${chainId}.`);
      setIsConnected(false);
    } else {
      setIsConnected(true);
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!fhePoker) {
      return undefined;
    }
    return (
      Boolean(fhePoker.address) && fhePoker.address !== ethers.ZeroAddress
    );
  }, [fhePoker]);

  //////////////////////////////////////////////////////////////////////////////
  // Contract Instance
  //////////////////////////////////////////////////////////////////////////////

  const contract = useMemo(() => {
    if (!fhePoker.address || !ethersSigner) {
      return undefined;
    }

    return new ethers.Contract(
      fhePoker.address,
      fhePoker.abi,
      ethersSigner
    );
  }, [fhePoker.address, fhePoker.abi, ethersSigner]);

  const readonlyContract = useMemo(() => {
    if (!fhePoker.address || !ethersReadonlyProvider) {
      return undefined;
    }

    return new ethers.Contract(
      fhePoker.address,
      fhePoker.abi,
      ethersReadonlyProvider
    );
  }, [fhePoker.address, fhePoker.abi, ethersReadonlyProvider]);

  //////////////////////////////////////////////////////////////////////////////
  // Basic Poker Methods (for compatibility)
  //////////////////////////////////////////////////////////////////////////////

  const createTable = useCallback(async (minBuyIn: string, maxPlayers: number, smallBlind: string, bigBlind: string) => {
    if (!contract) {
      setMessage("Contract not connected");
      return;
    }

    try {
      setMessage("Creating table...");
      const minBuyInWei = ethers.parseEther(minBuyIn);
      const smallBlindWei = ethers.parseEther(smallBlind);
      const bigBlindWei = ethers.parseEther(bigBlind);
      const tx = await contract.createTable(minBuyInWei, maxPlayers, smallBlindWei, bigBlindWei);
      setMessage(`Table creation transaction: ${tx.hash}`);
      await tx.wait();
      setMessage("Table created successfully!");
    } catch (error: unknown) {
      setMessage(`Table creation failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  const joinTable = useCallback(async (tableId: bigint, buyInAmount: string) => {
    if (!contract) {
      setMessage("Contract not connected");
      return;
    }

    try {
      setMessage("Joining table...");
      const buyInWei = ethers.parseEther(buyInAmount);
      const tx = await contract.joinTable(tableId, { value: buyInWei });
      setMessage(`Join table transaction: ${tx.hash}`);
      await tx.wait();
      setMessage("Joined table successfully!");
    } catch (error: unknown) {
      setMessage(`Join table failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  const advanceGame = useCallback(async (tableId: bigint) => {
    if (!contract) return;
    try {
      const tx = await contract.advanceGame(tableId);
      await tx.wait();
    } catch (error: unknown) {
      setMessage(`Advance game failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  const fold = useCallback(async (tableId: bigint) => {
    if (!contract) return;
    try {
      const tx = await contract.fold(tableId);
      await tx.wait();
    } catch (error: unknown) {
      setMessage(`Fold failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  const check = useCallback(async (tableId: bigint) => {
    if (!contract) return;
    try {
      const tx = await contract.check(tableId);
      await tx.wait();
    } catch (error: unknown) {
      setMessage(`Check failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  const call = useCallback(async (tableId: bigint) => {
    if (!contract) return;
    try {
      const tx = await contract.call(tableId);
      await tx.wait();
    } catch (error: unknown) {
      setMessage(`Call failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  const raise = useCallback(async (tableId: bigint, amount: string) => {
    if (!contract) return;
    try {
      const raiseAmount = ethers.parseEther(amount);
      const tx = await contract.raise(tableId, raiseAmount);
      await tx.wait();
    } catch (error: unknown) {
      setMessage(`Raise failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  const leaveTable = useCallback(async (tableId: bigint) => {
    if (!contract) return;
    try {
      const tx = await contract.leaveTable(tableId);
      await tx.wait();
    } catch (error: unknown) {
      setMessage(`Leave table failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  const addChips = useCallback(async (tableId: bigint, amount: string) => {
    if (!contract) return;
    try {
      const addAmount = ethers.parseEther(amount);
      const tx = await contract.addChips(tableId, { value: addAmount });
      await tx.wait();
    } catch (error: unknown) {
      setMessage(`Add chips failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  const withdrawChips = useCallback(async (tableId: bigint, amount: string) => {
    if (!contract) return;
    try {
      const withdrawAmount = ethers.parseEther(amount);
      const tx = await contract.withdrawChips(tableId, withdrawAmount);
      await tx.wait();
    } catch (error: unknown) {
      setMessage(`Withdraw chips failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  const decryptCards = useCallback(async (tableId: bigint) => {
    if (!contract) return;
    try {
      const tx = await contract.decryptCards(tableId);
      await tx.wait();
    } catch (error: unknown) {
      setMessage(`Decrypt cards failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  const decryptCommunityCards = useCallback(async (tableId: bigint) => {
    if (!contract) return;
    try {
      const tx = await contract.decryptCommunityCards(tableId);
      await tx.wait();
    } catch (error: unknown) {
      setMessage(`Decrypt community cards failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [contract]);

  return {
    // Contract info
    contractAddress: fhePoker.address,
    contract,
    readonlyContract,
    isConnected,
    isDeployed,

    // Game methods
    createTable,
    joinTable,
    advanceGame,
    fold,
    check,
    call,
    raise,
    leaveTable,
    addChips,
    withdrawChips,
    decryptCards,
    decryptCommunityCards,

    // Status
    message,
  };
};
