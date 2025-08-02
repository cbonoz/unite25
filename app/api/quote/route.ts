import { NextRequest, NextResponse } from 'next/server';

const ONEINCH_AGGREGATION_API = 'https://api.1inch.dev/swap/v6.0';
const API_KEY = process.env.NEXT_PUBLIC_ONE_INCH_API_KEY;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId');
    const src = searchParams.get('src');
    const dst = searchParams.get('dst');
    const amount = searchParams.get('amount');

    // Validate required parameters
    if (!chainId || !src || !dst || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: chainId, src, dst, amount' },
        { status: 400 }
      );
    }

    console.log('🔍 Proxying 1inch quote request:', { chainId, src, dst, amount });

    // Make request to 1inch API from server-side (no CORS issues)
    const quoteUrl = `${ONEINCH_AGGREGATION_API}/${chainId}/quote?src=${src}&dst=${dst}&amount=${amount}`;

    const response = await fetch(quoteUrl, {
      method: 'GET',
      headers: {
                'Authorization': `Bearer ${API_KEY}`,
        'Accept': 'application/json',
        'User-Agent': 'SwapJar/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch API error:', response.status, errorText);

      return NextResponse.json(
        {
          error: `1inch API Error: ${response.status}`,
          description: errorText,
          details: { chainId, src, dst, amount }
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch quote received:', data);

    // Calculate proper rate accounting for token decimals
    let rate = '0';
    if (data.dstAmount && amount) {
      // Get token info for proper decimal handling
      const srcDecimals = data.srcToken?.decimals || 18; // Default to 18 for ETH
      const dstDecimals = data.dstToken?.decimals || 6;  // Default to 6 for USDC

      // Convert amounts to human-readable numbers
      const srcAmountNormalized = parseFloat(amount) / Math.pow(10, srcDecimals);
      const dstAmountNormalized = parseFloat(data.dstAmount) / Math.pow(10, dstDecimals);

      // Calculate rate (how much destination token per 1 source token)
      rate = (dstAmountNormalized / srcAmountNormalized).toString();

      console.log('💱 Rate calculation:', {
        srcAmount: amount,
        dstAmount: data.dstAmount,
        srcDecimals,
        dstDecimals,
        srcAmountNormalized,
        dstAmountNormalized,
        calculatedRate: rate
      });
    }

    // Transform the response to match our expected format
    const transformedData = {
      srcToken: data.srcToken?.address || src,
      dstToken: data.dstToken?.address || dst,
      srcAmount: amount,
      dstAmount: data.dstAmount,
      rate: rate,
      gasFee: data.estimatedGas || '0',
      timestamp: Date.now(),
      originalData: data // Include original response for debugging
    };

    return NextResponse.json(transformedData);

  } catch (error) {
    console.error('❌ Error in quote proxy:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
