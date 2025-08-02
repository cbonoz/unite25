// 1inch Cross Chain SDK integration for ETH → XLM swaps

import { SDK, QuoteParams, OrderParams, OrderInfo, CrossChainSDKConfigParams } from '@1inch/cross-chain-sdk';
import { SupportedChain, SupportedChains } from '@1inch/cross-chain-sdk';
import { Quote } from '@1inch/cross-chain-sdk';
import { NetworkEnum } from '@1inch/fusion-sdk';

export interface CrossChainQuote {
  srcChainId: number;
  dstChainId: number;
  srcToken: string;
  dstToken: string;
  srcAmount: string;
  dstAmount: string;
  route: {
    type: string;
    intermediate?: string;
    steps: Array<{ chain: string; action: string }>;
  };
  estimatedGas: string;
  bridgeFee: string;
  rate: string;
  timestamp: number;
}

export interface CrossChainSwapParams {
  srcChainId: number;
  dstChainId: number;
  srcToken: string;
  dstToken: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  slippage?: number;
}

export interface CrossChainError {
  error: string;
  description?: string;
}

// Initialize the Cross Chain SDK
let crossChainSDK: SDK | null = null;

const initializeCrossChainSDK = () => {
  if (!crossChainSDK) {
    const config: CrossChainSDKConfigParams = {
      url: 'https://api.1inch.dev/fusion-plus', // Default 1inch API URL
      authKey: process.env.ONEINCH_API_KEY, // Optional API key
    };
    crossChainSDK = new SDK(config);
  }
  return crossChainSDK;
};

/**
 * Check if cross-chain swap is needed (different chains or Stellar destination)
 */
export function isCrossChainSwapRequired(
  srcChainId: number,
  recipientToken: string
): boolean {
  // If destination is XLM or STELLAR_USDC, it's definitely cross-chain
  if (recipientToken === 'XLM' || recipientToken === 'STELLAR_USDC') {
    return true;
  }

  // Add other cross-chain scenarios here
  return false;
}

/**
 * Get quote for cross-chain swap using 1inch Cross Chain SDK
 */
export async function getCrossChainQuote(
  srcChainId: number,
  srcToken: string,
  dstToken: string,
  amount: string,
  recipientToken: string
): Promise<CrossChainQuote | CrossChainError> {
  try {
    console.log('🌉 Getting cross-chain quote:', {
      srcChainId,
      srcToken,
      dstToken,
      amount,
      recipientToken
    });

    // Handle ETH → XLM case specially (not yet supported by 1inch cross-chain)
    if (recipientToken === 'XLM' || recipientToken === 'STELLAR_USDC') {
      return await getEthereumToStellarQuote(srcChainId, srcToken, amount, recipientToken);
    }

    // For supported cross-chain swaps, use the 1inch Cross Chain SDK
    const sdk = initializeCrossChainSDK();

    // Convert chain ID to SupportedChain enum
    const srcChain = chainIdToSupportedChain(srcChainId);
    const dstChain = NetworkEnum.ETHEREUM; // For now, default to Ethereum as destination

    if (!srcChain) {
      return {
        error: 'Unsupported source chain',
        description: `Chain ID ${srcChainId} is not supported by 1inch Cross Chain SDK`
      };
    }

    const quoteParams: QuoteParams = {
      srcChainId: srcChain,
      dstChainId: dstChain,
      srcTokenAddress: srcToken,
      dstTokenAddress: dstToken,
      amount: amount,
      walletAddress: '0x0000000000000000000000000000000000000000' // Placeholder
    };

    const quote = await sdk.getQuote(quoteParams);

    return {
      srcChainId,
      dstChainId: dstChain,
      srcToken: srcToken,
      dstToken: dstToken,
      srcAmount: amount,
      dstAmount: quote.dstTokenAmount.toString(),
      route: {
        type: 'cross-chain-swap',
        steps: [
          { chain: `Chain ${srcChainId}`, action: `Swap via 1inch Cross Chain` },
          { chain: `Chain ${dstChain}`, action: `Receive ${dstToken}` }
        ]
      },
      estimatedGas: '0', // Available through presets
      bridgeFee: '0', // Available through presets
      rate: (Number(quote.dstTokenAmount) / Number(quote.srcTokenAmount)).toString(),
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('❌ Error getting cross-chain quote:', error);
    return {
      error: 'Cross-chain quote failed',
      description: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Convert numeric chain ID to SupportedChain enum
 */
function chainIdToSupportedChain(chainId: number): SupportedChain | null {
  switch (chainId) {
    case 1: return NetworkEnum.ETHEREUM;
    case 137: return NetworkEnum.POLYGON;
    case 56: return NetworkEnum.BINANCE;
    case 10: return NetworkEnum.OPTIMISM;
    case 42161: return NetworkEnum.ARBITRUM;
    case 43114: return NetworkEnum.AVALANCHE;
    case 100: return NetworkEnum.GNOSIS;
    case 8453: return NetworkEnum.COINBASE;
    case 324: return NetworkEnum.ZKSYNC;
    case 59144: return NetworkEnum.LINEA;
    case 146: return NetworkEnum.SONIC;
    case 130: return NetworkEnum.UNICHAIN;
    default: return null;
  }
}

/**
 * Special handling for Ethereum → Stellar swaps
 * This uses our existing bridge logic but with 1inch SDK for optimal routing
 */
async function getEthereumToStellarQuote(
  srcChainId: number,
  srcToken: string,
  amount: string,
  recipientToken: string
): Promise<CrossChainQuote | CrossChainError> {
  try {
    console.log('🌟 Getting Ethereum → Stellar quote via 1inch optimization');

    // For now, return a simulated quote since Stellar is not directly supported
    // In production, this would:
    // 1. Get optimal ETH → USDC swap quote using 1inch
    // 2. Bridge USDC to Stellar
    // 3. Convert to XLM if needed

    // Simulated conversion rates
    let stellarAmount: string;
    let stellarRate: number;

    if (recipientToken === 'XLM') {
      // Example: 1 ETH = ~3000 USDC = ~30000 XLM (assuming 1 USDC = 10 XLM)
      stellarRate = 30000; // Simplified rate
      const ethAmount = parseFloat(amount) / Math.pow(10, 18);
      stellarAmount = (ethAmount * stellarRate * Math.pow(10, 7)).toString(); // XLM has 7 decimals
    } else {
      // STELLAR_USDC - assume 1 ETH = ~3000 USDC minus fees
      stellarRate = 2970; // ~3000 USDC minus 1% fees
      const ethAmount = parseFloat(amount) / Math.pow(10, 18);
      stellarAmount = (ethAmount * stellarRate * Math.pow(10, 6)).toString(); // STELLAR_USDC has 6 decimals
    }

    return {
      srcChainId,
      dstChainId: 0, // Use 0 to represent Stellar
      srcToken: srcToken,
      dstToken: recipientToken === 'XLM' ? 'native' : 'USDC',
      srcAmount: amount,
      dstAmount: stellarAmount,
      route: {
        type: 'ethereum-to-stellar',
        intermediate: 'USDC',
        steps: [
          { chain: 'Ethereum', action: `Swap ${srcToken} → USDC via 1inch` },
          { chain: 'Bridge', action: 'Transfer USDC to Stellar' },
          { chain: 'Stellar', action: `Convert to ${recipientToken}` }
        ]
      },
      estimatedGas: '0.01', // Estimated gas in ETH
      bridgeFee: '0', // Bridge fee included in rate calculation
      rate: (parseFloat(stellarAmount) / parseFloat(amount)).toString(),
      timestamp: Date.now()
    };

  } catch (error) {
    console.error('❌ Error getting Ethereum → Stellar quote:', error);
    return {
      error: 'Ethereum to Stellar quote failed',
      description: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Execute cross-chain swap using 1inch Cross Chain SDK
 * Note: This is a simplified implementation. Full implementation would require:
 * 1. Getting a quote first
 * 2. Creating the order with proper parameters
 * 3. Handling wallet integration for signing
 */
export async function executeCrossChainSwap(
  params: CrossChainSwapParams
): Promise<{ orderHash: string; route: { type: string; steps: Array<{ chain: string; action: string }> } } | CrossChainError> {
  try {
    console.log('🚀 Executing cross-chain swap:', params);

    // For Stellar destinations, use special handling
    if (params.dstChainId === 0) { // Stellar represented as 0
      return {
        error: 'Stellar execution not yet implemented',
        description: 'Direct Stellar execution requires additional bridge integration'
      };
    }

    const sdk = initializeCrossChainSDK();
    const srcChain = chainIdToSupportedChain(params.srcChainId);
    const dstChain = chainIdToSupportedChain(params.dstChainId);

    if (!srcChain || !dstChain) {
      return {
        error: 'Unsupported chain',
        description: `Chain ${params.srcChainId} or ${params.dstChainId} not supported`
      };
    }

    // First get a quote
    const quoteParams: QuoteParams = {
      srcChainId: srcChain,
      dstChainId: dstChain,
      srcTokenAddress: params.srcToken,
      dstTokenAddress: params.dstToken,
      amount: params.amount,
      walletAddress: params.fromAddress
    };

    const quote = await sdk.getQuote(quoteParams);

    // For now, return the quote ID as placeholder
    // Full implementation would create and submit the order
    return {
      orderHash: quote.quoteId || 'pending',
      route: {
        type: 'cross-chain-swap',
        steps: [
          { chain: `Chain ${params.srcChainId}`, action: 'Source transaction' },
          { chain: `Chain ${params.dstChainId}`, action: 'Destination execution' }
        ]
      }
    };

  } catch (error) {
    console.error('❌ Error executing cross-chain swap:', error);
    return {
      error: 'Cross-chain swap execution failed',
      description: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get supported chains for cross-chain swaps
 */
export function getSupportedCrossChainRoutes(): Array<{
  srcChain: number;
  dstChain: number | string;
  tokens: string[];
}> {
  return [
    {
      srcChain: 1, // Ethereum
      dstChain: 'stellar',
      tokens: ['ETH', 'USDC', 'DAI']
    },
    {
      srcChain: 8453, // Base
      dstChain: 'stellar',
      tokens: ['ETH', 'USDC']
    },
    {
      srcChain: 137, // Polygon
      dstChain: 'stellar',
      tokens: ['MATIC', 'USDC', 'DAI']
    }
  ];
}
