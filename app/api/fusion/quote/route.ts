import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_PUBLIC_ONE_INCH_API_KEY;
const BASE_URL = 'https://api.1inch.dev';

// Get quote from 1inch API (backend proxy to avoid CORS)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      receiverAddress,
    } = body;

    if (!chainId || !fromTokenAddress || !toTokenAddress || !amount || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('🔄 Getting 1inch quote:', {
      chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
    });

    // Check if Fusion+ is supported
    const supportsFusionPlus = [1, 137, 42161, 10].includes(chainId);

    if (supportsFusionPlus) {
      try {
        // Try Fusion+ quote first
        const fusionParams = new URLSearchParams({
          fromTokenAddress,
          toTokenAddress,
          amount,
          walletAddress,
          ...(receiverAddress && { receiver: receiverAddress }),
          preset: 'fast',
        });

        const fusionResponse = await fetch(`${BASE_URL}/fusion-plus/v1.0/${chainId}/quote?${fusionParams}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (fusionResponse.ok) {
          const fusionQuote = await fusionResponse.json();
          console.log('✅ Fusion+ quote received');

          return NextResponse.json({
            success: true,
            method: 'fusion-plus',
            quote: fusionQuote,
            estimatedGas: '0', // Fusion+ is gasless
          });
        } else {
          console.warn('⚠️ Fusion+ quote failed, falling back to regular swap');
        }
      } catch (fusionError) {
        console.warn('⚠️ Fusion+ error, falling back:', fusionError);
      }
    }

    // Fallback to regular swap quote
    const swapParams = new URLSearchParams({
      src: fromTokenAddress,
      dst: toTokenAddress,
      amount,
      from: walletAddress,
      slippage: '1',
      ...(receiverAddress && { destReceiver: receiverAddress }),
    });

    const swapResponse = await fetch(`${BASE_URL}/swap/v6.0/${chainId}/quote?${swapParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!swapResponse.ok) {
      const errorData = await swapResponse.text();
      console.error('❌ Regular swap quote error:', swapResponse.status, errorData);
      throw new Error(`Quote error: ${swapResponse.status} ${errorData}`);
    }

    const swapQuote = await swapResponse.json();
    console.log('✅ Regular swap quote received');

    return NextResponse.json({
      success: true,
      method: 'regular-swap',
      quote: swapQuote,
      estimatedGas: swapQuote.estimatedGas,
    });

  } catch (error) {
    console.error('❌ Error getting quote:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get quote',
        success: false,
      },
      { status: 500 }
    );
  }
}
