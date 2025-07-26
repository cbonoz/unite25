

// 1inch API Integration for SwapJar
// Supports: Fusion+ Swap, Price Feeds, Token Metadata, Wallet Balances, Web3

const API_KEY = process.env.NEXT_PUBLIC_ONE_INCH_API_KEY;
const BASE_URL = 'https://api.1inch.dev';

// Supported chain IDs
export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  BASE: 8453,
  OPTIMISM: 10,
  POLYGON: 137,
  ARBITRUM: 42161,
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
  token: Token;
  balance: string;
  balanceUSD?: string;
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
  order: OrderData;
  quoteId?: string;
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

// Helper function for API requests
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`1inch API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// 1. Token Metadata API
export async function getTokenMetadata(chainId: ChainId, tokenAddress: string): Promise<Token> {
  try {
    const data = await apiRequest(`/token/v1.2/${chainId}/custom/${tokenAddress}`);
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
    const data = await apiRequest(`/token/v1.2/${chainId}`);
    return Object.entries(data.tokens).map(([address, token]) => ({
      address,
      symbol: (token as TokenData).symbol,
      name: (token as TokenData).name,
      decimals: (token as TokenData).decimals,
      logoURI: (token as TokenData).logoURI,
    }));
  } catch (error) {
    console.error('Error fetching popular tokens:', error);
    throw error;
  }
}

// 2. Price Feeds API
export async function getTokenPrice(chainId: ChainId, tokenAddress: string): Promise<number> {
  try {
    const data = await apiRequest(`/price/v1.1/${chainId}/${tokenAddress}`);
    return parseFloat(data[tokenAddress.toLowerCase()]);
  } catch (error) {
    console.error('Error fetching token price:', error);
    throw error;
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

// 3. Wallet Balances API
export async function getWalletBalances(chainId: ChainId, walletAddress: string): Promise<Balance[]> {
  try {
    const data = await apiRequest(`/balance/v1.2/${chainId}/balances/${walletAddress}`);

    return Object.entries(data).map(([tokenAddress, tokenData]) => ({
      token: {
        address: tokenAddress,
        symbol: (tokenData as BalanceData).symbol,
        name: (tokenData as BalanceData).name,
        decimals: (tokenData as BalanceData).decimals,
        logoURI: (tokenData as BalanceData).logoURI,
      },
      balance: (tokenData as BalanceData).balance,
      balanceUSD: (tokenData as BalanceData).balanceUSD,
    }));
  } catch (error) {
    console.error('Error fetching wallet balances:', error);
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
    const orderData = {
      srcToken: fromToken,
      dstToken: toToken,
      srcAmount: amount,
      dstReceiver: receiverAddress || userAddress,
      srcReceiver: userAddress,
    };

    const data = await apiRequest(`/fusion/v1.0/${chainId}/order`, {
      method: 'POST',
      body: JSON.stringify(orderData),
    });

    return {
      orderHash: data.orderHash,
      signature: data.signature,
      order: data.order,
      quoteId: data.quoteId,
    };
  } catch (error) {
    console.error('Error creating Fusion+ order:', error);
    throw error;
  }
}

export async function getFusionOrderStatus(chainId: ChainId, orderHash: string) {
  try {
    return await apiRequest(`/fusion/v1.0/${chainId}/order/status/${orderHash}`);
  } catch (error) {
    console.error('Error fetching Fusion+ order status:', error);
    throw error;
  }
}

// 6. Helper functions for SwapJar
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
  };

  return stablecoinAddresses[chainId][stablecoin];
}

// Create a tip swap using Fusion+ (gasless for recipient)
export async function createTipSwap(
  chainId: ChainId,
  tipToken: string,
  tipAmount: string,
  recipientAddress: string,
  preferredStablecoin: 'USDC' | 'DAI' | 'USDT' = 'USDC'
) {
  try {
    const stablecoinAddress = await getStablecoinAddress(chainId, preferredStablecoin);

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
      message: `Tip swap created! Converting to ${preferredStablecoin}`,
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
    const balances = await getWalletBalances(chainId, walletAddress);

    // Process each balance and notify of new tips
    for (const balance of balances) {
      if (parseFloat(balance.balance) > 0) {
        const value = await calculateTipValue(
          chainId,
          balance.token.address,
          balance.balance,
          balance.token.decimals
        );

        onTipReceived({
          token: balance.token,
          amount: balance.balance,
          value: value.usdValue,
        });
      }
    }
  } catch (error) {
    console.error('Error monitoring tip jar:', error);
  }
}
