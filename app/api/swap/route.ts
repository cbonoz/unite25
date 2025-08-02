import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.ONE_INCH_API_KEY;
const BASE_URL = 'https://api.1inch.dev';

// Validate API key
function validateApiKey(): boolean {
  if (!API_KEY) {
    console.warn('⚠️ 1inch API key not configured');
    return false;
  }

  if (API_KEY.length < 32) {
    console.warn('⚠️ 1inch API key appears to be invalid (too short)');
    return false;
  }

  return true;
}

// Get swap transaction from 1inch API (backend proxy to avoid CORS)
export async function POST(request: NextRequest) {
  try {
    // Validate API key first
    if (!validateApiKey()) {
      return NextResponse.json(
        {
          error: 'Invalid or missing 1inch API key',
          details: 'Please configure ONE_INCH_API_KEY in your environment variables',
          success: false
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      receiverAddress,
      slippage = '1',
    } = body;

    if (!chainId || !fromTokenAddress || !toTokenAddress || !amount || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    console.log('🔄 Getting swap transaction via backend:', {
      chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      receiverAddress,
    });

    // Build swap parameters
    const swapParams = new URLSearchParams({
      src: fromTokenAddress,
      dst: toTokenAddress,
      amount,
      from: walletAddress,
      slippage,
      disableEstimate: 'false',
      allowPartialFill: 'true',
      ...(receiverAddress && { destReceiver: receiverAddress }),
    });

    // Make the API call from backend (no CORS issues)
    const swapResponse = await fetch(`${BASE_URL}/swap/v6.0/${chainId}/swap?${swapParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!swapResponse.ok) {
      const errorData = await swapResponse.text();
      console.error('❌ 1inch Swap API error:', {
        status: swapResponse.status,
        statusText: swapResponse.statusText,
        error: errorData,
        apiKey: API_KEY ? `${API_KEY.substring(0, 8)}...` : 'NOT_SET'
      });

      // Handle specific error cases
      if (swapResponse.status === 401) {
        return NextResponse.json(
          {
            error: `Swap API error: ${swapResponse.status}`,
            details: 'Invalid API key - please check your 1inch API key in environment variables',
            success: false
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        {
          error: `Swap API error: ${swapResponse.status}`,
          details: errorData || swapResponse.statusText,
          success: false
        },
        { status: swapResponse.status }
      );
    }

    const swapData = await swapResponse.json();
    console.log('✅ Swap transaction retrieved from 1inch API');

    return NextResponse.json({
      success: true,
      transaction: swapData.tx,
      toAmount: swapData.toAmount,
      estimatedGas: swapData.tx?.gas,
      orderHash: `regular_swap_${Date.now()}`,
      method: 'regular-swap',
    });

  } catch (error) {
    console.error('❌ Error getting swap transaction:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get swap transaction',
        success: false,
      },
      { status: 500 }
    );
  }
}
