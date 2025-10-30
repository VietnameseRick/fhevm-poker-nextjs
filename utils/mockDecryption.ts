/**
 * Mock FHE Decryption Utility for Local Development
 * 
 * Auto-triggers the decryption oracle on localhost to simulate
 * the asynchronous FHE decryption callback that happens in production.
 */

import { config } from './config';

/**
 * Check if we're running on localhost hardhat node
 */
export function isLocalDevelopment(): boolean {
  const rpcUrl = config.rpcUrl?.toLowerCase() || '';
  return rpcUrl.includes('localhost') || rpcUrl.includes('127.0.0.1');
}

/**
 * Trigger the mock decryption oracle to process pending decryption requests
 * 
 * This simulates what the Zama KMS does in production:
 * 1. Listens for RequestDecryption events
 * 2. Decrypts the ciphertexts off-chain
 * 3. Calls back the contract with decrypted values
 * 
 * In local development with FHEVM mock, we manually trigger this process.
 */
export async function triggerMockDecryption(tableId: bigint): Promise<void> {
  if (!isLocalDevelopment()) {
    console.log('⏭️  [Mock Decryption] Skipping - not on localhost');
    return;
  }

  try {
    console.log(`🎯 [Mock Decryption] Auto-triggering for table ${tableId.toString()}...`);
    
    const response = await fetch('/api/trigger-decryption', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tableId: tableId.toString(),
        rpcUrl: config.rpcUrl,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log(`✅ [Mock Decryption] Success:`, data.message);
      if (data.processed > 0) {
        console.log(`   📦 Processed ${data.processed} decryption request(s)`);
        console.log(`   🔗 TX: ${data.txHash}`);
      }
    } else {
      console.warn('⚠️  [Mock Decryption] Failed:', data.error || data.details);
    }
  } catch (error) {
    console.error('❌ [Mock Decryption] Error calling API:', error);
  }
}

/**
 * Auto-trigger mock decryption after a small delay
 * 
 * The delay allows the RequestDecryption transaction to be mined
 * before we attempt to process it.
 */
export function autoTriggerMockDecryption(tableId: bigint, delayMs: number = 1000): void {
  if (!isLocalDevelopment()) {
    return;
  }

  setTimeout(() => {
    triggerMockDecryption(tableId);
  }, delayMs);
}

