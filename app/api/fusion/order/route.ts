import { NextRequest, NextResponse } from 'next/server';
import { createOptimizedSwap } from '@/app/utils/fusion';

// Create an optimized swap order (Fusion+ or regular swap)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      chainId,
      srcToken,
      dstToken,
      srcAmount,
      walletAddress,
      receiverAddress,
    } = body;

    if (!chainId || !srcToken || !dstToken || !srcAmount || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('🔄 Creating optimized swap order:', {
      chainId,
      srcToken,
      dstToken,
      srcAmount,
      walletAddress,
      receiverAddress,
    });

    // Use the optimized swap function (tries Fusion+ first, fallback to regular)
    const result = await createOptimizedSwap(
      chainId,
      srcToken,
      dstToken,
      srcAmount,
      walletAddress,
      receiverAddress
    );

    console.log('✅ Swap order created:', result);

    return NextResponse.json({
      ...result,
    });

  } catch (error) {
    console.error('❌ Error creating swap order:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create swap order'
      },
      { status: 500 }
    );
  }
}
