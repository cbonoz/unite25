// API endpoint for completing Stellar to Ethereum cross-chain swaps
import { NextRequest, NextResponse } from 'next/server';
import StellarEthereumBridge from '../../../utils/stellar-bridge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { swapId, secret } = body;

    // Validate required fields
    if (!swapId || !secret) {
      return NextResponse.json(
        { error: 'Missing swapId or secret' },
        { status: 400 }
      );
    }

    // Initialize bridge with configured bridge address
    const bridgeAddress = process.env.STELLAR_BRIDGE_ADDRESS!;
    const bridge = new StellarEthereumBridge(bridgeAddress);

    // Complete the cross-chain swap
    const result = await bridge.completeStellarToEthereumTip(swapId, secret);

    return NextResponse.json({
      success: true,
      fusionOrderHash: result.fusionOrderHash,
      stellarRedeemTx: result.stellarRedeemTx,
      message: 'Cross-chain swap completed successfully'
    });

  } catch (error) {
    console.error('Error completing cross-chain swap:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
