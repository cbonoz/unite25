

// 1inch API Integration for SwapJar
// Supports: Fusion+ Swap, Price Feeds, Token Metadata, Wallet Balances, Web3

// Supported chain IDs
export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  BASE: 8453,
  OPTIMISM: 10,
  POLYGON: 137,
  ARBITRUM: 42161,
  STELLAR: 'stellar' as const, // Special case for Stellar network
} as const;

export type ChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];

// Common interfaces
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

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

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
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

export async function getPopularTokens(chainId: ChainId): Promise<Token[]> {
  try {
    const data = await apiRequest(`/tokens/${chainId}`);
    return Object.entries(data.tokens || data).map(([address, token]) => ({
      address,
      symbol: (token as TokenData).symbol,
      name: (token as TokenData).name,
      decimals: (token as TokenData).decimals,
      logoURI: (token as TokenData).logoURI,
    }));
  } catch (error) {
    console.error('Error fetching popular tokens:', error);
    // Return fallback tokens for development
    return getFallbackTokens(chainId);
  }
}

// Fallback tokens for development/testing
function getFallbackTokens(chainId: ChainId): Token[] {
  const fallbackTokens: Record<ChainId, Token[]> = {
    [SUPPORTED_CHAINS.ETHEREUM]: [
      { address: '0xA0b86a33E6441C8C7b60b8B5fa46a80C42a59C5d', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    ],
    [SUPPORTED_CHAINS.BASE]: [
      { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    ],
    [SUPPORTED_CHAINS.OPTIMISM]: [
      { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    ],
    [SUPPORTED_CHAINS.POLYGON]: [
      { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    ],
    [SUPPORTED_CHAINS.ARBITRUM]: [
      { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { address: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    ],
    [SUPPORTED_CHAINS.STELLAR]: [
      { address: 'native', symbol: 'XLM', name: 'Stellar Lumens', decimals: 7 },
      { address: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', symbol: 'USDC', name: 'USD Coin', decimals: 7 },
    ],
  };

  return fallbackTokens[chainId] || fallbackTokens[SUPPORTED_CHAINS.ETHEREUM];
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
}// 6. Helper functions for SwapJar
export async function getStablecoinAddress(chainId: ChainId, stablecoin: 'USDC' | 'DAI' | 'USDT'): Promise<string> {
  const stablecoinAddresses: Record<ChainId, Record<string, string>> = {
    [SUPPORTED_CHAINS.ETHEREUM]: {
      USDC: '0xA0b86a33E6441C8C7b60b8B5fa46a80C42a59C5d',
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    },
    [SUPPORTED_CHAINS.BASE]: {
      USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
      USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    },
    [SUPPORTED_CHAINS.OPTIMISM]: {
      USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    },
    [SUPPORTED_CHAINS.POLYGON]: {
      USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
      USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    },
    [SUPPORTED_CHAINS.ARBITRUM]: {
      USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
      USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    },
    [SUPPORTED_CHAINS.STELLAR]: {
      USDC: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
      DAI: 'native', // No DAI on Stellar, use XLM
      USDT: 'native', // No USDT on Stellar, use XLM
    },
  };

  return stablecoinAddresses[chainId][stablecoin];
}

// Create a tip swap using Fusion+ (gasless for recipient)
export async function createTipSwap(
  chainId: ChainId,
  tipToken: string,
  tipAmount: string,
  recipientAddress: string,
  recipientToken: 'USDC' | 'DAI' | 'USDT' = 'USDC'
) {
  try {
    const stablecoinAddress = await getStablecoinAddress(chainId, recipientToken);

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
