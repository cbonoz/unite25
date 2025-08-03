

// 1inch API Integration for SwapJar
// Supports: Fusion+ Swap, Price Feeds, Token Metadata, Wallet Balances, Web3

import {
  getFallbackTokens,
  SUPPORTED_CHAINS,
  getStablecoinAddress,
  type Token,
  type ChainId
} from '../constants';

// Re-export constants and types for backward compatibility
export { SUPPORTED_CHAINS, type Token, type ChainId };

// Common interfaces
export interface Balance {
  tokenAddress: string;
  balance: string;
  decimals: number;
  symbol: string;
  name: string;
  logoURI?: string;
}

export interface SwapQuote {
  fromToken: Token;
  toToken: Token;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  protocols: Protocol[];
}

export interface Protocol {
  name: string;
  part: number;
  fromTokenAddress: string;
  toTokenAddress: string;
}

export interface FusionOrder {
  orderHash: string;
  signature: string;
  order?: OrderData;
  quoteId?: string;
  transaction?: {
    to: string;
    value?: string;
    data: string;
    gas?: string;
    gasPrice?: string;
  };
  quote?: SwapQuote;
  toAmount?: string;
  estimatedGas?: string;
}

export interface TokenData {
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface BalanceData extends TokenData {
  balance: string;
  balanceUSD?: string;
}

export interface OrderData {
  salt: string;
  maker: string;
  receiver: string;
  makerAsset: string;
  takerAsset: string;
  makingAmount: string;
  takingAmount: string;
}

// Helper function for API requests through Next.js API routes
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = endpoint.startsWith('/api') ? endpoint : `/api${endpoint}`;

  console.log(`🌐 Making API request to: ${url}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  console.log(`📡 API Response: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ API Error Response:`, errorText);
    throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  console.log(`✅ API Success Response:`, data);
  return data;
}

// 1. Token Metadata API
export async function getTokenMetadata(chainId: ChainId, tokenAddress: string): Promise<Token> {
  try {
    const data = await apiRequest(`/tokens/${chainId}/${tokenAddress}`);
    return {
      address: tokenAddress,
      symbol: data.symbol,
      name: data.name,
      decimals: data.decimals,
      logoURI: data.logoURI,
    };
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    throw error;
  }
}

// Token cache for browser storage
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
const CACHE_KEY_PREFIX = 'tokens_cache_';

interface CachedTokenData {
  tokens: Token[];
  timestamp: number;
}

export async function getPopularTokens(chainId: ChainId): Promise<Token[]> {
  console.log(`🔍 Fetching tokens from 1inch API for chain ${chainId}...`);

  // Check browser cache first
  const cacheKey = `${CACHE_KEY_PREFIX}${chainId}`;

  if (typeof window !== 'undefined') {
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed: CachedTokenData = JSON.parse(cachedData);
        const isExpired = Date.now() - parsed.timestamp > CACHE_DURATION;

        if (!isExpired && parsed.tokens && parsed.tokens.length > 0) {
          console.log(`✅ Using cached tokens for chain ${chainId} (${parsed.tokens.length} tokens)`);
          return parsed.tokens;
        } else if (isExpired) {
          console.log(`⏰ Cache expired for chain ${chainId}, fetching fresh data`);
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }
  }

  try {
    const data = await apiRequest(`/tokens/${chainId}`);
    console.log(`✅ Raw API response:`, data);

    const tokens = Object.entries(data.tokens || data).map(([address, token]) => ({
      address,
      symbol: (token as TokenData).symbol,
      name: (token as TokenData).name,
      decimals: (token as TokenData).decimals,
      logoURI: (token as TokenData).logoURI,
    }));

    console.log(`✅ Parsed ${tokens.length} tokens from API:`, tokens.slice(0, 5));

    // Cache the results in browser storage
    if (typeof window !== 'undefined' && tokens.length > 0) {
      try {
        const cacheData: CachedTokenData = {
          tokens,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log(`💾 Cached ${tokens.length} tokens for chain ${chainId}`);
      } catch (error) {
        console.warn('Cache write error:', error);
      }
    }

    return tokens;
  } catch (error) {
    console.error('❌ Error fetching tokens from API, using fallback tokens:', error);
    return getFallbackTokens(chainId);
  }
}

// Utility function to clear token cache (useful for debugging or force refresh)
export function clearTokenCache(chainId?: ChainId) {
  if (typeof window === 'undefined') return;

  try {
    if (chainId) {
      const cacheKey = `${CACHE_KEY_PREFIX}${chainId}`;
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ Cleared token cache for chain ${chainId}`);
    } else {
      // Clear all token caches
      const keys = Object.keys(localStorage).filter(key => key.startsWith(CACHE_KEY_PREFIX));
      keys.forEach(key => localStorage.removeItem(key));
      console.log(`🗑️ Cleared all token caches (${keys.length} entries)`);
    }
  } catch (error) {
    console.warn('Cache clear error:', error);
  }
}


// 2. Price Feeds API
export async function getTokenPrice(chainId: ChainId, tokenAddress: string): Promise<number> {
  try {
    const data = await apiRequest(`/price/${chainId}/${tokenAddress}`);
    return parseFloat(data[tokenAddress.toLowerCase()]);
  } catch (error) {
    console.error('Error fetching token price:', error);
    // Return fallback price of $1 for stablecoins, $0.001 for others
    const token = tokenAddress.toLowerCase();
    if (token.includes('usdc') || token.includes('dai') || token.includes('usdt')) {
      return 1.0;
    }
    return 0.001;
  }
}

export async function calculateTipValue(
  chainId: ChainId,
  tokenAddress: string,
  amount: string,
  decimals: number
): Promise<{ usdValue: number; tokenAmount: string }> {
  try {
    const price = await getTokenPrice(chainId, tokenAddress);
    const tokenAmount = (parseFloat(amount) / Math.pow(10, decimals)).toString();
    const usdValue = parseFloat(tokenAmount) * price;

    return { usdValue, tokenAmount };
  } catch (error) {
    console.error('Error calculating tip value:', error);
    throw error;
  }
}

// 3. Balance API
// Get wallet token balances (1inch Balances API)
export async function getWalletBalances(chainId: number, walletAddress: string): Promise<Balance[]> {
  try {
    console.log(`🔍 Fetching wallet balances for ${walletAddress} on chain ${chainId}`);

    const response = await fetch(
      `https://api.1inch.dev/balance/v1.2/${chainId}/balances/${walletAddress}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_1INCH_API_KEY}`,
          'accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('💰 Raw balance data:', data);

    // Convert the balances record to an array of Balance objects
    const balances: Balance[] = [];

    for (const [tokenAddress, balance] of Object.entries(data)) {
      if (typeof balance === 'string' && balance !== '0') {
        try {
          // Get token metadata for each token with balance
          const tokenInfo = await getTokenMetadata(chainId as ChainId, tokenAddress);

          balances.push({
            tokenAddress,
            balance,
            decimals: tokenInfo.decimals,
            symbol: tokenInfo.symbol,
            name: tokenInfo.name,
            logoURI: tokenInfo.logoURI,
          });
        } catch (error) {
          console.warn(`⚠️ Failed to get metadata for token ${tokenAddress}:`, error);
          // Still include the balance even without metadata
          balances.push({
            tokenAddress,
            balance,
            decimals: 18, // Default to 18 decimals
            symbol: tokenAddress.slice(0, 8), // Use truncated address as symbol
            name: 'Unknown Token',
            logoURI: '',
          });
        }
      }
    }

    console.log(`✅ Processed ${balances.length} token balances`);
    return balances;
  } catch (error) {
    console.error('❌ Error fetching wallet balances:', error);
    throw error;
  }
}

// 4. Swap API (Classic)
export async function getSwapQuote(
  chainId: ChainId,
  fromToken: string,
  toToken: string,
  amount: string,
  slippage: number = 1
): Promise<SwapQuote> {
  try {
    const params = new URLSearchParams({
      src: fromToken,
      dst: toToken,
      amount: amount,
      from: '0x0000000000000000000000000000000000000000', // Will be replaced with actual sender
      slippage: slippage.toString(),
      disableEstimate: 'true',
    });

    const data = await apiRequest(`/swap/v6.0/${chainId}/swap?${params}`);

    return {
      fromToken: data.fromToken,
      toToken: data.toToken,
      fromAmount: data.fromAmount,
      toAmount: data.toAmount,
      estimatedGas: data.estimatedGas,
      protocols: data.protocols,
    };
  } catch (error) {
    console.error('Error fetching swap quote:', error);
    throw error;
  }
}

// 5. Fusion+ API (Intent-based swaps)
export async function createFusionOrder(
  chainId: ChainId,
  fromToken: string,
  toToken: string,
  amount: string,
  userAddress: string,
  receiverAddress?: string
): Promise<FusionOrder> {
  try {
    console.log('🔄 Creating Fusion+ order via API:', {
      chainId,
      fromToken,
      toToken,
      amount,
      userAddress,
      receiverAddress
    });

    const response = await fetch('/api/fusion/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chainId,
        srcToken: fromToken,
        dstToken: toToken,
        srcAmount: amount,
        walletAddress: userAddress,
        receiverAddress: receiverAddress || userAddress,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create Fusion+ order');
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Fusion+ order creation failed');
    }

    console.log('✅ Fusion+ order created successfully:', data);

    return {
      orderHash: data.orderHash,
      signature: data.signature,
      order: data.order,
      quoteId: data.quoteId,
    };
  } catch (error) {
    console.error('❌ Error creating Fusion+ order:', error);
    throw error;
  }
}

export async function getFusionOrderStatus(chainId: ChainId, orderHash: string) {
  try {
    const response = await fetch(`/api/fusion/status/${chainId}/${orderHash}`);

    if (!response.ok) {
      throw new Error(`Failed to get order status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('❌ Error fetching Fusion+ order status:', error);
    throw error;
  }
}

// 7. Token Allowance API
export async function getTokenAllowance(
  chainId: ChainId,
  tokenAddress: string,
  walletAddress: string,
  spenderAddress: string
): Promise<string> {
  try {
    console.log('🔍 Checking token allowance:', {
      chainId, tokenAddress, walletAddress, spenderAddress
    });

    const response = await fetch(`/api/allowance/${chainId}/${tokenAddress}?wallet=${walletAddress}&spender=${spenderAddress}`);

    if (!response.ok) {
      throw new Error(`Failed to get token allowance: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Token allowance fetched:', data.allowance);

    return data.allowance || '0';
  } catch (error) {
    console.error('❌ Error fetching token allowance:', error);
    return '0';
  }
}

// 6. Helper functions for SwapJar

// Create a tip swap using Fusion+ (gasless for recipient)
export async function createTipSwap(
  chainId: ChainId,
  tipToken: string,
  tipAmount: string,
  recipientAddress: string,
  recipientToken: 'USDC' | 'DAI' | 'USDT' = 'USDC'
) {
  try {
    const stablecoinAddress = getStablecoinAddress(chainId, recipientToken);

    // Create Fusion+ order for gasless swap
    const fusionOrder = await createFusionOrder(
      chainId,
      tipToken,
      stablecoinAddress,
      tipAmount,
      recipientAddress, // User sending the tip
      recipientAddress  // Recipient receives the stablecoin
    );

    return {
      success: true,
      orderHash: fusionOrder.orderHash,
      order: fusionOrder.order,
      message: `Tip swap created! Converting to ${recipientToken}`,
    };
  } catch (error) {
    console.error('Error creating tip swap:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Monitor tip jar for incoming transactions (simplified)
export async function monitorTipJar(
  chainId: ChainId,
  walletAddress: string,
  onTipReceived: (tip: { token: Token; amount: string; value: number }) => void
) {
  try {
    // In a real implementation, this would use WebSocket or polling
    // For now, we'll check balances periodically

    // Special handling for Stellar
    if (chainId === SUPPORTED_CHAINS.STELLAR) {
      console.log('Stellar monitoring not yet implemented');
      return;
    }

    const balances = await getWalletBalances(Number(chainId), walletAddress);

    // Process each balance and notify of new tips
    for (const balance of balances) {
      if (parseFloat(balance.balance) > 0) {
        const value = await calculateTipValue(
          chainId,
          balance.tokenAddress,
          balance.balance,
          balance.decimals
        );

        onTipReceived({
          token: {
            address: balance.tokenAddress,
            symbol: balance.symbol,
            name: balance.name,
            decimals: balance.decimals,
            logoURI: balance.logoURI || '',
          },
          amount: balance.balance,
          value: value.usdValue,
        });
      }
    }
  } catch (error) {
    console.error('Error monitoring tip jar:', error);
  }
}
