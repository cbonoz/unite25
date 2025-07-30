import { NextResponse } from 'next/server';
import { Horizon } from '@stellar/stellar-sdk';
import { getFusionOrderStatus } from '@/app/utils/oneinch';

// Stellar testnet server
const stellarServer = new Horizon.Server('https://horizon-testnet.stellar.org');

interface CompleteSwapRequest {
  swapId: string;
  preimage: string;
  stellarTxHash: string;
  fusionOrderHash: string;
}

export async function POST(request: Request) {
  try {
    const body: CompleteSwapRequest = await request.json();
    console.log('🔓 Completing cross-chain swap:', body);

    const { swapId, preimage, stellarTxHash, fusionOrderHash } = body;

    // Validate the preimage against the original hashlock
    // In production, retrieve from database and verify

    // Check Stellar transaction status
    try {
      const stellarTx = await stellarServer.transactions().transaction(stellarTxHash).call();
      console.log('✅ Stellar transaction confirmed:', stellarTx.successful);

      if (!stellarTx.successful) {
        return NextResponse.json({
          success: false,
          error: 'Stellar transaction failed',
        }, { status: 400 });
      }
    } catch (error) {
      console.error('❌ Error checking Stellar transaction:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to verify Stellar transaction',
      }, { status: 400 });
    }

    // Check Fusion+ order status on Ethereum
    try {
      const orderStatus = await getFusionOrderStatus(1, fusionOrderHash); // Ethereum mainnet
      console.log('📊 Fusion+ order status:', orderStatus);

      return NextResponse.json({
        success: true,
        swapId,
        stellarConfirmed: true,
        ethereumStatus: orderStatus.status,
        message: 'Cross-chain swap completed successfully',
      });
    } catch (error) {
      console.error('❌ Error checking Fusion+ order:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to verify Ethereum order status',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error completing cross-chain swap:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const swapId = searchParams.get('swapId');

  if (!swapId) {
    return NextResponse.json(
      { success: false, error: 'Missing swapId parameter' },
      { status: 400 }
    );
  }

  try {
    // In production, retrieve swap details from database
    // For demo, return mock status
    console.log('📊 Checking swap status for:', swapId);

    return NextResponse.json({
      success: true,
      swapId,
      status: 'completed',
      stellarConfirmed: true,
      ethereumConfirmed: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error checking swap status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
