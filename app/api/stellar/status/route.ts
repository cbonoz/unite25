// API endpoint for monitoring cross-chain swap status
import { NextRequest, NextResponse } from 'next/server';
import { StellarAtomicSwap } from '../../../utils/stellar-bridge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const swapId = searchParams.get('swapId');

    if (!swapId) {
      return NextResponse.json(
        { error: 'Missing swapId parameter' },
        { status: 400 }
      );
    }

    // Initialize Stellar swap monitor
    const stellarSwap = new StellarAtomicSwap();

    // Monitor swap events
    const events = await stellarSwap.monitorSwapEvents(swapId);

    // Determine swap status based on events
    let status = 'initiated';
    let latestEvent = null;

    if (events.length > 0) {
      latestEvent = events[0]; // Most recent event

      if (latestEvent.memo?.includes('REDEEM:')) {
        status = 'redeemed';
      } else if (latestEvent.memo?.includes('REFUND:')) {
        status = 'refunded';
      } else if (latestEvent.memo?.includes('SWAP:')) {
        status = 'locked';
      }
    }

    return NextResponse.json({
      success: true,
      swapId,
      status,
      events: events.map(event => ({
        id: event.id,
        hash: event.hash,
        memo: event.memo,
        created_at: event.created_at,
        source_account: event.source_account
      })),
      latestEvent
    });

  } catch (error) {
    console.error('Error monitoring swap status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
