// Debug utility to help find correct token addresses
// This will help us identify the actual USDC address from the 1inch API

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = searchParams.get('chainId') || '1';

    console.log(`🔍 Fetching tokens for chain ${chainId} to find USDC address...`);

    // Get token list from 1inch
    const tokensUrl = `https://api.1inch.dev/swap/v6.0/${chainId}/tokens`;

    const response = await fetch(tokensUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_ONE_INCH_API_KEY}`,
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tokens: ${response.status}`);
    }

    const data = await response.json();
    const tokens = data.tokens || {};

    // Look for USDC tokens
    const usdcTokens = Object.entries(tokens).filter(([address, token]: [string, any]) => {
      const symbol = token.symbol?.toUpperCase();
      const name = token.name?.toLowerCase();
      return symbol === 'USDC' || name?.includes('usd coin') || name?.includes('centre');
    });

    // Look for common stablecoins
    const stablecoins = Object.entries(tokens).filter(([address, token]: [string, any]) => {
      const symbol = token.symbol?.toUpperCase();
      return ['USDC', 'USDT', 'DAI', 'BUSD'].includes(symbol);
    });

    return NextResponse.json({
      chainId,
      totalTokens: Object.keys(tokens).length,
      usdcCandidates: usdcTokens.map(([address, token]: [string, any]) => ({
        address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals
      })),
      stablecoins: stablecoins.map(([address, token]: [string, any]) => ({
        address,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals
      })),
      firstFewTokens: Object.entries(tokens).slice(0, 5).map(([address, token]: [string, any]) => ({
        address,
        symbol: token.symbol,
        name: token.name
      }))
    });

  } catch (error) {
    console.error('❌ Error in debug tokens:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch token info',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
