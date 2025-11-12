import { ethers } from "ethers";
import {
  EIP712Type,
  FhevmDecryptionSignatureType,
  FhevmInstance,
} from "./fhevmTypes";
import { GenericStringStorage } from "./GenericStringStorage";

function _timestampNow(): number {
  return Math.floor(Date.now() / 1000);
}

class FhevmDecryptionSignatureStorageKey {
  #contractAddresses: `0x${string}`[];
  #userAddress: `0x${string}`;
  #publicKey: string | undefined;
  #key: string;

  constructor(
    instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ) {
    if (!ethers.isAddress(userAddress)) {
      throw new TypeError(`Invalid address ${userAddress}`);
    }

    const sortedContractAddresses = (
      contractAddresses as `0x${string}`[]
    ).sort();

    const emptyEIP712 = instance.createEIP712(
      publicKey ?? ethers.ZeroAddress,
      sortedContractAddresses,
      0,
      0
    );

    try {
      const hash = ethers.TypedDataEncoder.hash(
        emptyEIP712.domain,
        { UserDecryptRequestVerification: emptyEIP712.types.UserDecryptRequestVerification },
        emptyEIP712.message
      );

      this.#contractAddresses = sortedContractAddresses;
      this.#userAddress = userAddress as `0x${string}`;

      this.#key = `${userAddress}:${hash}`;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  get contractAddresses(): `0x${string}`[] {
    return this.#contractAddresses;
  }

  get userAddress(): `0x${string}` {
    return this.#userAddress;
  }

  get publicKey(): string | undefined {
    return this.#publicKey;
  }

  get key(): string {
    return this.#key;
  }
}

export class FhevmDecryptionSignature {
  #publicKey: string;
  #privateKey: string;
  #signature: string;
  #startTimestamp: number; // Unix timestamp in seconds
  #durationDays: number;
  #userAddress: `0x${string}`;
  #contractAddresses: `0x${string}`[];
  #eip712: EIP712Type;

  private constructor(parameters: FhevmDecryptionSignatureType) {
    if (!FhevmDecryptionSignature.checkIs(parameters)) {
      throw new TypeError("Invalid FhevmDecryptionSignatureType");
    }
    this.#publicKey = parameters.publicKey;
    this.#privateKey = parameters.privateKey;
    this.#signature = parameters.signature;
    this.#startTimestamp = parameters.startTimestamp;
    this.#durationDays = parameters.durationDays;
    this.#userAddress = parameters.userAddress;
    this.#contractAddresses = parameters.contractAddresses;
    this.#eip712 = parameters.eip712;
  }

  public get privateKey() {
    return this.#privateKey;
  }

  public get publicKey() {
    return this.#publicKey;
  }

  public get signature() {
    return this.#signature;
  }

  public get contractAddresses() {
    return this.#contractAddresses;
  }

  public get startTimestamp() {
    return this.#startTimestamp;
  }

  public get durationDays() {
    return this.#durationDays;
  }

  public get userAddress() {
    return this.#userAddress;
  }

  static checkIs(s: unknown): s is FhevmDecryptionSignatureType {
    if (!s || typeof s !== "object") {
      return false;
    }
    if (!("publicKey" in s && typeof s.publicKey === "string")) {
      return false;
    }
    if (!("privateKey" in s && typeof s.privateKey === "string")) {
      return false;
    }
    if (!("signature" in s && typeof s.signature === "string")) {
      return false;
    }
    if (!("startTimestamp" in s && typeof s.startTimestamp === "number")) {
      return false;
    }
    if (!("durationDays" in s && typeof s.durationDays === "number")) {
      return false;
    }
    if (!("contractAddresses" in s && Array.isArray(s.contractAddresses))) {
      return false;
    }
    for (let i = 0; i < s.contractAddresses.length; ++i) {
      if (typeof s.contractAddresses[i] !== "string") return false;
      if (!s.contractAddresses[i].startsWith("0x")) return false;
    }
    if (
      !(
        "userAddress" in s &&
        typeof s.userAddress === "string" &&
        s.userAddress.startsWith("0x")
      )
    ) {
      return false;
    }
    if (!("eip712" in s && typeof s.eip712 === "object" && s.eip712 !== null)) {
      return false;
    }

    // Partial type check
    if (!("domain" in s.eip712 && typeof s.eip712.domain === "object")) {
      return false;
    }
    if (
      !("primaryType" in s.eip712 && typeof s.eip712.primaryType === "string")
    ) {
      return false;
    }
    if (!("message" in s.eip712)) {
      return false;
    }
    if (
      !(
        "types" in s.eip712 &&
        typeof s.eip712.types === "object" &&
        s.eip712.types !== null
      )
    ) {
      return false;
    }

    return true;
  }

  toJSON() {
    return {
      publicKey: this.#publicKey,
      privateKey: this.#privateKey,
      signature: this.#signature,
      startTimestamp: this.#startTimestamp,
      durationDays: this.#durationDays,
      userAddress: this.#userAddress,
      contractAddresses: this.#contractAddresses,
      eip712: this.#eip712,
    };
  }

  static fromJSON(json: unknown) {
    const data = typeof json === "string" ? JSON.parse(json) : json;
    return new FhevmDecryptionSignature(data);
  }

  equals(s: FhevmDecryptionSignatureType) {
    return s.signature === this.#signature;
  }

  isValid(): boolean {
    return (
      _timestampNow() < this.#startTimestamp + this.#durationDays * 24 * 60 * 60
    );
  }

  async saveToGenericStringStorage(
    storage: GenericStringStorage,
    instance: FhevmInstance,
    withPublicKey: boolean
  ) {
    try {
      const value = JSON.stringify(this);

      const storageKey = new FhevmDecryptionSignatureStorageKey(
        instance,
        this.#contractAddresses,
        this.#userAddress,
        withPublicKey ? this.#publicKey : undefined
      );
      await storage.setItem(storageKey.key, value);
      console.log(
        `signature saved! contracts=${this.#contractAddresses.length}`
      );
    } catch {
      console.error(
        `FhevmDecryptionSignature.saveToGenericStringStorage() failed!`
      );
    }
  }

  static async loadFromGenericStringStorage(
    storage: GenericStringStorage,
    instance: FhevmInstance,
    contractAddresses: string[],
    userAddress: string,
    publicKey?: string
  ): Promise<FhevmDecryptionSignature | null> {
    try {
      const storageKey = new FhevmDecryptionSignatureStorageKey(
        instance,
        contractAddresses,
        userAddress,
        publicKey
      );

      const result = await storage.getItem(storageKey.key);

      if (!result) {
        console.warn(`Could not load signature! key=${storageKey.key}`);
        return null;
      }

      try {
        const kps = FhevmDecryptionSignature.fromJSON(result);
        if (!kps.isValid()) {
          return null;
        }

        return kps;
      } catch {
        return null;
      }
    } catch {
      console.error(
        `FhevmDecryptionSignature.loadFromGenericStringStorage() failed!`
      );
      return null;
    }
  }

  static async new(
    instance: FhevmInstance,
    contractAddresses: string[],
    publicKey: string,
    privateKey: string,
    signer: ethers.Signer,
    userAddressOverride?: string
  ): Promise<FhevmDecryptionSignature | null> {
    try {
      // Use override address if provided (for smart accounts), otherwise use signer's address
      const userAddress = (userAddressOverride || (await signer.getAddress())) as `0x${string}`;
      
      console.log('🔐 Creating FHEVM signature:', {
        signerAddress: await signer.getAddress(),
        userAddress,
        isSmartAccount: !!userAddressOverride,
      });
      
      const startTimestamp = _timestampNow();
      const durationDays = 365;
      const eip712 = instance.createEIP712(
        publicKey,
        contractAddresses,
        startTimestamp,
        durationDays
      );
      
      console.log('📋 EIP-712 data before signing:', {
        domain: eip712.domain,
        types: Object.keys(eip712.types),
        message: eip712.message,
        userAddress,
      });
      
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message
      );
      
      console.log('✅ Signature created:', {
        signature: signature.substring(0, 20) + '...',
        signatureLength: signature.length,
        willUseUserAddress: userAddress,
        NOTE: 'The signature was signed by the signer (possibly EOA), but will be sent with userAddress (possibly smart account)',
      });
      
      // Try to recover the address from the signature to verify
      try {
        const recoveredAddress = ethers.verifyTypedData(
          eip712.domain,
          { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
          eip712.message,
          signature
        );
        console.log('🔍 Signature verification:', {
          recoveredAddress,
          matchesUserAddress: recoveredAddress.toLowerCase() === userAddress.toLowerCase(),
          userAddress,
        });
        
        if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
          console.warn('⚠️ SIGNATURE MISMATCH!', {
            recoveredAddress,
            userAddress,
            NOTE: 'Signature was created by EOA but userAddress is smart account. FHEVM relayer may reject this!',
          });
        }
      } catch (verifyError) {
        console.warn('Could not verify signature:', verifyError);
      }
      
      return new FhevmDecryptionSignature({
        publicKey,
        privateKey,
        contractAddresses: contractAddresses as `0x${string}`[],
        startTimestamp,
        durationDays,
        signature,
        eip712: eip712 as EIP712Type,
        userAddress,
      });
    } catch (error) {
      console.error('❌ Failed to create FHEVM signature:', error);
      return null;
    }
  }

  static async loadOrSign(
    instance: FhevmInstance,
    contractAddresses: string[],
    signer: ethers.Signer,
    storage: GenericStringStorage,
    keyPair?: { publicKey: string; privateKey: string },
    userAddressOverride?: string
  ): Promise<FhevmDecryptionSignature | null> {
    // Use override address if provided (for smart accounts), otherwise use signer's address
    const userAddress = (userAddressOverride || (await signer.getAddress())) as `0x${string}`;

    const cached: FhevmDecryptionSignature | null =
      await FhevmDecryptionSignature.loadFromGenericStringStorage(
        storage,
        instance,
        contractAddresses,
        userAddress,
        keyPair?.publicKey
      );

    if (cached) {
      console.log('✅ Using cached FHEVM signature for', userAddress);
      console.log('📋 Cached signature details:', {
        cachedUserAddress: cached.userAddress,
        requestedUserAddress: userAddress,
        addressMatch: cached.userAddress.toLowerCase() === userAddress.toLowerCase(),
        signatureLength: cached.signature.length,
        contractAddresses: cached.contractAddresses,
        isValid: cached.isValid(),
      });
      
      // ⚠️ CRITICAL: Verify the cached signature was created for the correct userAddress
      if (cached.userAddress.toLowerCase() !== userAddress.toLowerCase()) {
        console.warn('⚠️ Cached signature has wrong userAddress!', {
          cached: cached.userAddress,
          expected: userAddress,
        });
        console.log('🔄 Creating new signature with correct userAddress...');
        // Don't use cached signature - create a new one with correct address
      } else if (cached.signature.length !== 132) {
        // Signature length should be 132 characters (0x + 130 hex chars = 65 bytes)
        console.warn('⚠️ Cached signature has invalid length!', {
          length: cached.signature.length,
          expected: 132,
          NOTE: 'This may be a Kernel-wrapped signature. Creating new raw ECDSA signature...',
        });
        // Don't use cached signature - create a new one with correct format
      } else {
        console.log('✅ Cached signature userAddress matches and format is correct - using cached signature');
        return cached;
      }
    }

    const { publicKey, privateKey } = keyPair ?? instance.generateKeypair();

    const sig = await FhevmDecryptionSignature.new(
      instance,
      contractAddresses,
      publicKey,
      privateKey,
      signer,
      userAddressOverride
    );

    if (!sig) {
      return null;
    }

    await sig.saveToGenericStringStorage(
      storage,
      instance,
      Boolean(keyPair?.publicKey)
    );

    return sig;
  }
}
