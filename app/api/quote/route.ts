import { NextRequest, NextResponse } from 'next/server';

const ONEINCH_AGGREGATION_API = 'https://api.1inch.dev/swap/v6.0';
const API_KEY = process.env.ONE_INCH_API_KEY;

export async function GET(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!API_KEY) {
      console.warn('⚠️  ONE_INCH_API_KEY not configured, will try without API key (may have rate limits)');
    }

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

    console.log('🔍 Proxying 1inch quote request:', {
      chainId,
      src,
      dst,
      amount,
      apiKeyPresent: !!API_KEY,
      srcFormatted: src === '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' ? 'ETH' : src,
      dstFormatted: dst
    });

    // Make request to 1inch API from server-side (no CORS issues)
    const quoteUrl = `${ONEINCH_AGGREGATION_API}/${chainId}/quote?src=${src}&dst=${dst}&amount=${amount}`;

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'SwapJar/1.0'
    };

    // Add API key if available - 1inch uses Authorization header
    if (API_KEY) {
      headers['Authorization'] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(quoteUrl, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 1inch API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        url: quoteUrl,
        apiKeyPresent: !!API_KEY
      });

      // Try to parse error response for better error messages
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.description || errorJson.error || errorText;
      } catch (e) {
        // Keep original error text if not JSON
      }

      return NextResponse.json(
        {
          error: `1inch API Error: ${response.status}`,
          description: errorDetails,
          details: { chainId, src, dst, amount, needsApiKey: !API_KEY }
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ 1inch quote received:', JSON.stringify(data, null, 2));

    // Simply pass through the raw 1inch data with minimal processing
    // Let the frontend handle decimal calculations with proper token info
    const transformedData = {
      srcToken: data.srcToken?.address || src,
      dstToken: data.dstToken?.address || dst,
      srcAmount: amount,
      dstAmount: data.dstAmount,
      // Include token metadata if available from 1inch
      srcTokenInfo: data.srcToken,
      dstTokenInfo: data.dstToken,
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
