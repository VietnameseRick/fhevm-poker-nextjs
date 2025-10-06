"use client";

import { ethers } from "ethers";
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FhevmDecryptionSignature,
  type FhevmInstance,
  type GenericStringStorage,
} from "@fhevm/react";

import { FHEPokerABI } from "@/abi/FHEPokerABI";
import { FHEPokerAddresses } from "@/abi/FHEPokerAddresses";
import { usePokerStore } from "@/stores/pokerStore";
import { usePokerWebSocket } from "./usePokerWebSocket";

interface PokerTableInfo {
  abi: typeof FHEPokerABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
}

interface Card {
  handle: string;
  clear?: number;
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

  // Check if entry exists and has a valid address
  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: FHEPokerABI.abi, chainId };
  }

  return {
    address: entry.address as `0x${string}` | undefined,
    chainId: entry.chainId ?? chainId,
    chainName: entry.chainName,
    abi: FHEPokerABI.abi,
  };
}

/**
 * Hook for interacting with FHEPoker contract
 */
export const useFHEPoker = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
  } = parameters;

  // State - MUST be declared before any memoized values that use setState
  const [currentTableId, setCurrentTableId] = useState<bigint | undefined>(undefined);
  const [message, setMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cards, setCards] = useState<[Card | undefined, Card | undefined]>([undefined, undefined]);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [userAddress, setUserAddress] = useState<string | undefined>(undefined);

  // Refs
  const pokerContractRef = useRef<PokerTableInfo | undefined>(undefined);
  const isLoadingRef = useRef<boolean>(false);
  const isDecryptingRef = useRef<boolean>(false);

  // Contract metadata
  const pokerContract = useMemo(() => {
    const c = getFHEPokerByChainId(chainId);
    pokerContractRef.current = c;

    if (!c.address) {
      setMessage(`FHEPoker deployment not found for chainId=${chainId}.`);
    }

    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!pokerContract) {
      return undefined;
    }
    return Boolean(pokerContract.address) && pokerContract.address !== ethers.ZeroAddress;
  }, [pokerContract]);

  // Get user address
  useEffect(() => {
    if (ethersSigner) {
      ethersSigner.getAddress().then(setUserAddress);
    }
  }, [ethersSigner]);

  // Use signer if available, otherwise readonly provider
  const provider = ethersSigner || ethersReadonlyProvider;

  // Zustand store - subscribe to state
  const tableState = usePokerStore(state => state.tableState);
  const bettingInfo = usePokerStore(state => state.bettingInfo);
  const players = usePokerStore(state => state.players);
  const allPlayersBettingState = usePokerStore(state => state.allPlayersBettingState);
  const communityCards = usePokerStore(state => state.communityCards);
  const refreshAll = usePokerStore(state => state.refreshAll);
  const setStoreTableId = usePokerStore(state => state.setCurrentTableId);
  const setContractInfo = usePokerStore(state => state.setContractInfo);
  
  // Derived state
  const playerState = userAddress && allPlayersBettingState[userAddress.toLowerCase()];

  // Setup contract info in store
  useEffect(() => {
    if (pokerContract.address && provider) {
      setContractInfo(pokerContract.address, provider);
    }
  }, [pokerContract.address, provider, setContractInfo]);

  // Sync currentTableId to store
  useEffect(() => {
    setStoreTableId(currentTableId ?? null);
  }, [currentTableId, setStoreTableId]);

  // WebSocket listener - auto-refreshes store when events fire
  usePokerWebSocket(
    pokerContract.address,
    provider,
    currentTableId ?? null
  );

  // Create a new poker table
  const createTable = useCallback(
    async (minBuyIn: string, maxPlayers: number, smallBlind: string, bigBlind: string) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) {
        setMessage("Contract not deployed or signer not available");
        return;
      }

      try {
        isLoadingRef.current = true;
        setIsLoading(true);

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        setMessage("Creating poker table...");

        const tx = await contract.createTable(
          ethers.parseEther(minBuyIn),
          maxPlayers,
          ethers.parseEther(smallBlind),
          ethers.parseEther(bigBlind)
        );

        setMessage(`Waiting for transaction: ${tx.hash}`);
        const receipt = await tx.wait();

        // Parse the TableCreated event to get the table ID
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          setCurrentTableId(newTableId);
          setMessage(`Table created! ID: ${newTableId.toString()}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Provide helpful error messages
        if (errorMessage.includes("BUY_IN_TOO_LOW")) {
          setMessage("❌ Min Buy-In must be at least 20× the Big Blind!");
        } else if (errorMessage.includes("INVALID_BLINDS")) {
          setMessage("❌ Big Blind must be larger than Small Blind!");
        } else if (errorMessage.includes("INVALID_MAX_PLAYERS")) {
          setMessage("❌ Max players must be between 2 and 10!");
        } else if (errorMessage.includes("INVALID_BUY_IN")) {
          setMessage("❌ Buy-In amount must be greater than 0!");
        } else {
          setMessage(`❌ Failed to create table: ${errorMessage}`);
        }
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner]
  );

  // Join a table
  const joinTable = useCallback(
    async (tableId: bigint, buyInAmount: string) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) {
        setMessage("Contract not deployed or signer not available");
        return;
      }

      try {
        isLoadingRef.current = true;
        setIsLoading(true);

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        setMessage("Joining table...");

        const tx = await contract.joinTable(tableId, {
          value: ethers.parseEther(buyInAmount),
        });

        setMessage(`Waiting for transaction: ${tx.hash}`);
        await tx.wait();

        setCurrentTableId(tableId);
        setMessage(`✅ Successfully joined table ${tableId.toString()}!`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Check for specific error messages
        if (errorMessage.includes("ALREADY_SEATED")) {
          setMessage("⚠️ You are already seated at this table!");
          setCurrentTableId(tableId); // Set it anyway so they can see the table
        } else if (errorMessage.includes("TABLE_FULL")) {
          setMessage("❌ This table is full. Try another table.");
        } else if (errorMessage.includes("INSUFFICIENT_BUY_IN")) {
          setMessage("❌ Buy-in amount is too low for this table.");
        } else {
          setMessage(`❌ Failed to join table: ${errorMessage}`);
        }
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner]
  );

  // Advance game (from countdown to playing)
  const advanceGame = useCallback(
    async (tableId: bigint) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) {
        return;
      }

      try {
        isLoadingRef.current = true;
        setIsLoading(true);

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        setMessage("Advancing game...");

        const tx = await contract.advanceGame(tableId);

        setMessage(`Waiting for transaction: ${tx.hash}`);
        await tx.wait();

        setMessage("✅ Game advanced! Loading table...");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage(`Failed to advance game: ${errorMessage}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner]
  );

  // Poker actions
  const fold = useCallback(
    async (tableId: bigint) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setIsLoading(true);
        const contract = new ethers.Contract(pokerContract.address, pokerContract.abi, ethersSigner);
        setMessage("Folding...");
        const tx = await contract.fold(tableId);
        await tx.wait();
        setMessage("✅ Folded!");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage(`❌ Failed to fold: ${errorMessage}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner]
  );

  const check = useCallback(
    async (tableId: bigint) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setIsLoading(true);
        const contract = new ethers.Contract(pokerContract.address, pokerContract.abi, ethersSigner);
        setMessage("Checking...");
        const tx = await contract.check(tableId);
        await tx.wait();
        setMessage("✅ Checked!");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage(`❌ Failed to check: ${errorMessage}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner]
  );

  const call = useCallback(
    async (tableId: bigint) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setIsLoading(true);
        const contract = new ethers.Contract(pokerContract.address, pokerContract.abi, ethersSigner);
        setMessage("Calling...");
        const tx = await contract.call(tableId);
        await tx.wait();
        setMessage("✅ Called!");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage(`❌ Failed to call: ${errorMessage}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner]
  );

  const raise = useCallback(
    async (tableId: bigint, raiseAmount: string) => {
      if (!pokerContract.address || !ethersSigner || isLoadingRef.current) return;

      try {
        isLoadingRef.current = true;
        setIsLoading(true);
        const contract = new ethers.Contract(pokerContract.address, pokerContract.abi, ethersSigner);
        setMessage("Raising...");
        const tx = await contract.raise(tableId, ethers.parseEther(raiseAmount));
        await tx.wait();
        setMessage(`✅ Raised ${raiseAmount} ETH!`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage(`❌ Failed to raise: ${errorMessage}`);
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
      }
    },
    [pokerContract, ethersSigner]
  );

  // Refresh table state
  const refreshTableState = useCallback(
    (tableId: bigint) => {
      refreshAll(tableId);
    },
    [refreshAll]
  );

  // Decrypt hole cards
  const decryptCards = useCallback(
    async (tableId: bigint) => {
      if (
        !pokerContract.address ||
        !instance ||
        !ethersSigner ||
        isDecryptingRef.current
      ) {
        return;
      }

      try {
        isDecryptingRef.current = true;
        setIsDecrypting(true);
        setMessage("Fetching encrypted cards...");

        const contract = new ethers.Contract(
          pokerContract.address,
          pokerContract.abi,
          ethersSigner
        );

        const [card1Handle, card2Handle] = await contract.getMyHoleCards(tableId);

        setMessage("Decrypting cards...");

        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [pokerContract.address as `0x${string}`],
          ethersSigner,
          fhevmDecryptionSignatureStorage
        );

        if (!sig) {
          setMessage("Unable to build FHEVM decryption signature");
          return;
        }

        const res = await instance.userDecrypt(
          [
            { handle: card1Handle, contractAddress: pokerContract.address },
            { handle: card2Handle, contractAddress: pokerContract.address },
          ],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        const card1Value = Number(res[card1Handle]);
        const card2Value = Number(res[card2Handle]);

        setCards([
          { handle: card1Handle, clear: card1Value },
          { handle: card2Handle, clear: card2Value },
        ]);

        setMessage("Cards decrypted!");
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setMessage(`Failed to decrypt cards: ${errorMessage}`);
      } finally {
        isDecryptingRef.current = false;
        setIsDecrypting(false);
      }
    },
    [pokerContract, instance, ethersSigner, fhevmDecryptionSignatureStorage]
  );

  // Track WebSocket connection status
  useEffect(() => {
    // Simple connection tracking based on WebSocket hook
    if (currentTableId && pokerContract.address && provider) {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, [currentTableId, pokerContract.address, provider]);

  return {
    contractAddress: pokerContract.address,
    isDeployed,
    currentTableId,
    tableState,
    bettingInfo,
    playerState,
    allPlayersBettingState,
    players,
    cards,
    communityCards,
    message,
    isLoading,
    isDecrypting,
    isConnected,
    createTable,
    joinTable,
    advanceGame,
    fold,
    check,
    call,
    raise,
    refreshTableState,
    decryptCards,
    setCurrentTableId,
  };
};

