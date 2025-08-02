import { NextResponse } from 'next/server';
import { StellarBridge } from '@/app/utils/stellar-bridge';

interface BridgeRequest {
  sourceChain: number;
  sourceToken: string;
  sourceAmount: string;
  senderAddress: string;
  targetStellarAddress: string;
  targetAsset: 'XLM' | 'USDC';
}

export async function POST(request: Request) {
  try {
    const body: BridgeRequest = await request.json();
    console.log('🌉 Real bridge request:', body);

    const {
      sourceChain,
      sourceToken,
      sourceAmount,
      senderAddress,
      targetStellarAddress,
      targetAsset,
    } = body;

    // Validate input
    if (!sourceToken || !sourceAmount || !senderAddress || !targetStellarAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate Stellar address format
    if (!targetStellarAddress.startsWith('G') || targetStellarAddress.length !== 56) {
      return NextResponse.json(
        { success: false, error: 'Invalid Stellar address format' },
        { status: 400 }
      );
    }

    try {
      console.log('🚀 Initiating real Stellar bridge transfer...');

      // Use environment configuration for network
      const bridge = new StellarBridge();

      const result = await bridge.createBridgeOrder({
        ethereumSender: senderAddress,
        ethereumToken: sourceToken,
        ethereumAmount: sourceAmount,
        stellarReceiver: targetStellarAddress,
        stellarAsset: targetAsset
      });

      console.log('✅ Bridge transfer completed:', result);

      return NextResponse.json(result);

    } catch (error) {
      console.error('❌ Bridge transfer failed:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Bridge transfer failed',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error in bridge API:', error);
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
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Missing orderId parameter' },
        { status: 400 }
      );
    }

    const bridge = new StellarBridge();
    const status = await bridge.getOrderStatus(orderId);

    return NextResponse.json({
      success: true,
      ...status,
    });

  } catch (error) {
    console.error('❌ Error checking bridge status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
