// 1inch Quote API integration for live quotes

export interface SpotPriceQuote {
  srcToken: string;
  dstToken: string;
  srcAmount: string;
  dstAmount: string;
  // Token metadata from 1inch API
  srcTokenInfo?: {
    address: string;
    symbol?: string;
    name?: string;
    decimals?: number;
  };
  dstTokenInfo?: {
    address: string;
    symbol?: string;
    name?: string;
    decimals?: number;
  };
  gasFee: string;
  timestamp: number;
}

export interface QuoteError {
  error: string;
  description?: string;
}

/**
 * Fetch live quote from 1inch via our Next.js API proxy
 * @param chainId - The blockchain chain ID (1 for Ethereum, 8453 for Base, etc.)
 * @param srcToken - Source token address
 * @param dstToken - Destination token address
 * @param amount - Amount in source token (in wei)
 * @returns Promise with quote data or error
 */
export async function fetchSpotPriceQuote(
  chainId: number,
  srcToken: string,
  dstToken: string,
  amount: string
): Promise<SpotPriceQuote | QuoteError> {
  try {
    console.log('🔍 Fetching 1inch quote via API proxy:', {
      chainId,
      srcToken,
      dstToken,
      amount
    });

    // Use our Next.js API endpoint to avoid CORS issues
    const quoteUrl = `/api/quote?chainId=${chainId}&src=${srcToken}&dst=${dstToken}&amount=${amount}`;

    const response = await fetch(quoteUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Quote API error:', response.status, errorData);

      return {
        error: errorData.error || `API Error: ${response.status}`,
        description: errorData.description || 'Failed to fetch quote'
      };
    }

    const data = await response.json();
    console.log('✅ Quote received via proxy:', data);

    return {
      srcToken: data.srcToken,
      dstToken: data.dstToken,
      srcAmount: data.srcAmount,
      dstAmount: data.dstAmount,
      srcTokenInfo: data.srcTokenInfo,
      dstTokenInfo: data.dstTokenInfo,
      gasFee: data.gasFee,
      timestamp: data.timestamp
    };

  } catch (error) {
    console.error('❌ Error fetching quote via proxy:', error);
    return {
      error: 'Network Error',
      description: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get common token addresses for supported chains
 */
export const COMMON_TOKEN_ADDRESSES = {
  // Ethereum Mainnet (1)
  1: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    USDC: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // Correct USDC address from 1inch API
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
  },
  // Base (8453)
  8453: {
    ETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb'
  },
  // Polygon (137)
  137: {
    MATIC: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'
  }
} as const;
