import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Mock FHE Decryption API for Local Development
 * 
 * This endpoint triggers the FHEVM mock decryption oracle on local hardhat node.
 * It simulates the async decryption callback that would normally be handled by
 * Zama's KMS in production.
 * 
 * Only works when connected to localhost hardhat node.
 */
export async function POST(request: NextRequest) {
  try {
    const { tableId, rpcUrl } = await request.json();

    // Security check: Only allow on localhost
    if (!rpcUrl || (!rpcUrl.includes('localhost') && !rpcUrl.includes('127.0.0.1'))) {
      return NextResponse.json(
        { error: 'Mock decryption only available on localhost' },
        { status: 403 }
      );
    }

    console.log('🔧 [Mock Decryption API] Triggering decryption oracle for table:', tableId);

    // Path to the fhevm-poker package where hardhat is configured
    const hardhatPath = path.join(process.cwd(), '../fhevm-poker');

    // Execute the hardhat task to trigger decryption
    const command = 'npx hardhat trigger-decryption --network localhost';
    
    console.log(`⚡ [Mock Decryption] Executing: ${command}`);
    console.log(`   Working directory: ${hardhatPath}`);

    const { stdout, stderr } = await execAsync(command, {
      cwd: hardhatPath,
      timeout: 30000, // 30 second timeout
    });

    if (stderr && !stderr.includes('[Mock Decryption]')) {
      console.warn('⚠️  [Mock Decryption] stderr:', stderr);
    }

    console.log('📄 [Mock Decryption] stdout:', stdout);

    // Check if execution was successful
    if (stdout.includes('Successfully processed')) {
      return NextResponse.json({
        success: true,
        message: 'Mock decryption completed successfully',
        output: stdout.trim(),
      });
    } else if (stdout.includes('No pending requests') || stdout.includes('not await')) {
      return NextResponse.json({
        success: true,
        message: 'No pending decryption requests or already processed',
        output: stdout.trim(),
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Decryption task completed but with unexpected output',
        output: stdout.trim(),
      });
    }
  } catch (error) {
    console.error('❌ [Mock Decryption API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStderr = typeof error === 'object' && error !== null && 'stderr' in error 
      ? String(error.stderr) 
      : undefined;
    
    return NextResponse.json(
      {
        error: 'Failed to trigger mock decryption',
        details: errorMessage,
        stderr: errorStderr,
      },
      { status: 500 }
    );
  }
}

// Also support GET for health check
export async function GET() {
  return NextResponse.json({
    service: 'Mock FHE Decryption Oracle',
    status: 'ready',
    description: 'Triggers FHEVM mock decryption on localhost hardhat node',
  });
}

