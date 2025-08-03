import { NextRequest, NextResponse } from 'next/server';

// Simple price feed using CoinGecko API as fallback when 1inch fails
const COINGECKO_API = 'https://api.coingecko.com/api/v3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromToken = searchParams.get('from')?.toLowerCase() || 'ethereum';
    const toToken = searchParams.get('to')?.toLowerCase() || 'usd-coin';

    console.log('🔍 Fetching price from CoinGecko:', { fromToken, toToken });

    // Map common token symbols to CoinGecko IDs
    const tokenMap: Record<string, string> = {
      'eth': 'ethereum',
      'ethereum': 'ethereum',
      'usdc': 'usd-coin',
      'dai': 'dai',
      'usdt': 'tether',
      'xlm': 'stellar',
      'matic': 'matic-network',
      'bnb': 'binancecoin'
    };

    const fromTokenId = tokenMap[fromToken] || fromToken;
    const toTokenId = tokenMap[toToken] || toToken;

    // Get prices for both tokens in USD first
    const priceUrl = `${COINGECKO_API}/simple/price?ids=${fromTokenId},${toTokenId}&vs_currencies=usd`;

    const response = await fetch(priceUrl, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ CoinGecko price data:', data);

    const fromPrice = data[fromTokenId]?.usd;
    const toPrice = data[toTokenId]?.usd;

    if (!fromPrice || !toPrice) {
      throw new Error('Price data not available for requested tokens');
    }

    // Calculate exchange rate
    const rate = fromPrice / toPrice;

    return NextResponse.json({
      fromToken: fromTokenId,
      toToken: toTokenId,
      rate,
      fromPriceUsd: fromPrice,
      toPriceUsd: toPrice,
      timestamp: Date.now(),
      source: 'coingecko'
    });

  } catch (error) {
    console.error('❌ Error in price feed:', error);
    return NextResponse.json(
      {
        error: 'Price feed error',
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
