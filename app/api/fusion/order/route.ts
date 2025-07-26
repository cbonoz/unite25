import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.NEXT_PUBLIC_ONE_INCH_API_KEY;
const BASE_URL = 'https://api.1inch.dev';

// Create a Fusion+ order (or fallback to regular swap)
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

    console.log('🔄 Creating swap order:', {
      chainId,
      srcToken,
      dstToken,
      srcAmount,
      walletAddress,
      receiverAddress,
    });

    // First try to get a quote using the swap API
    const quoteParams = new URLSearchParams({
      src: srcToken,
      dst: dstToken,
      amount: srcAmount,
      from: walletAddress,
      slippage: '1', // 1% slippage
      disableEstimate: 'false',
      allowPartialFill: 'true',
    });

    console.log('📋 Getting swap quote...');
    const quoteResponse = await fetch(`${BASE_URL}/swap/v6.0/${chainId}/quote?${quoteParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!quoteResponse.ok) {
      const errorData = await quoteResponse.text();
      console.error('❌ Quote API error:', quoteResponse.status, errorData);
      throw new Error(`Quote API error: ${quoteResponse.status} ${quoteResponse.statusText}`);
    }

    const quoteData = await quoteResponse.json();
    console.log('✅ Quote received:', {
      toAmount: quoteData.toAmount,
      estimatedGas: quoteData.estimatedGas,
    });

    // Now get the actual swap transaction data
    const swapParams = new URLSearchParams({
      src: srcToken,
      dst: dstToken,
      amount: srcAmount,
      from: walletAddress,
      slippage: '1',
      disableEstimate: 'false',
      allowPartialFill: 'true',
    });

    if (receiverAddress && receiverAddress !== walletAddress) {
      swapParams.append('destReceiver', receiverAddress);
    }

    console.log('🔄 Getting swap transaction...');
    const swapResponse = await fetch(`${BASE_URL}/swap/v6.0/${chainId}/swap?${swapParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!swapResponse.ok) {
      const errorData = await swapResponse.text();
      console.error('❌ Swap API error:', swapResponse.status, errorData);
      throw new Error(`Swap API error: ${swapResponse.status} ${swapResponse.statusText}`);
    }

    const swapData = await swapResponse.json();
    console.log('✅ Swap transaction created:', {
      to: swapData.tx?.to,
      value: swapData.tx?.value,
      gasLimit: swapData.tx?.gas,
    });

    return NextResponse.json({
      success: true,
      quote: quoteData,
      transaction: swapData.tx,
      toAmount: swapData.toAmount,
      estimatedGas: swapData.tx?.gas,
      // Create a mock order hash for tracking
      orderHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
      signature: 'transaction_based_swap',
      quoteId: quoteData.quoteId || 'quote_' + Date.now(),
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
