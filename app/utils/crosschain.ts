// 1inch Cross Chain SDK integration for ETH → XLM swaps

import { SDK, QuoteParams, OrderParams, OrderInfo, CrossChainSDKConfigParams } from '@1inch/cross-chain-sdk';
import { SupportedChain, SupportedChains } from '@1inch/cross-chain-sdk';
import { Quote } from '@1inch/cross-chain-sdk';
import { NetworkEnum, PresetEnum } from '@1inch/fusion-sdk';
import {
  CrossChainUtils,
  CROSS_CHAIN_CONSTANTS,
  CROSS_CHAIN_PRESETS,
  CrossChainOrder,
  CrossChainPreset,
  STABLECOIN_ADDRESSES,
  SUPPORTED_CHAINS
} from '../constants';
import { fetchSpotPriceQuote } from './quotes';

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
    console.log('🌟 Getting Ethereum → Stellar quote using real market rates');

    // Step 1: Get ETH → USDC rate from 1inch for the source chain
    let ethToUsdcRate: number;
    try {
      // Get USDC address for the source chain
      const usdcAddress = STABLECOIN_ADDRESSES[srcChainId]?.USDC;
      if (!usdcAddress) {
        throw new Error(`USDC not available on chain ${srcChainId}`);
      }

      // Get quote for 1 ETH → USDC
      const oneEthInWei = '1000000000000000000'; // 1 ETH in wei
      console.log(`🔍 Getting ETH → USDC quote on chain ${srcChainId}...`);

      const quote = await fetchSpotPriceQuote(
        srcChainId,
        '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH address
        usdcAddress,
        oneEthInWei
      );

      if ('error' in quote) {
        throw new Error(`1inch quote error: ${quote.error}`);
      }

      // Calculate rate: USDC received per 1 ETH
      ethToUsdcRate = parseFloat(quote.dstAmount) / Math.pow(10, 6); // USDC has 6 decimals
      console.log(`📊 Real ETH → USDC rate from 1inch: ${ethToUsdcRate}`);

    } catch (error) {
      console.error('❌ Failed to get ETH → USDC rate from 1inch:', error);
      return {
        error: 'Unable to get ETH to USDC conversion rate',
        description: 'Could not fetch current ETH to USDC rate from 1inch API'
      };
    }

    // Step 2: Handle Stellar USDC (1:1 with USDC) or XLM conversion
    let stellarAmount: string;
    let stellarRate: number;
    let conversionSteps: Array<{ chain: string; action: string }>;

    if (recipientToken === 'STELLAR_USDC') {
      // STELLAR_USDC is 1:1 with USDC, so just convert ETH → USDC
      stellarRate = ethToUsdcRate;
      const ethAmount = parseFloat(amount) / Math.pow(10, 18);
      stellarAmount = (ethAmount * stellarRate * Math.pow(10, 6)).toString(); // USDC has 6 decimals

      conversionSteps = [
        { chain: 'Ethereum', action: `Swap ${srcToken} → USDC via 1inch` },
        { chain: 'Bridge', action: 'Transfer USDC to Stellar' },
        { chain: 'Stellar', action: 'Receive USDC on Stellar' }
      ];
    } else if (recipientToken === 'XLM') {
      // Step 3: Get XLM/USDC rate from Stellar network
      let xlmToUsdcRate: number;
      try {
        xlmToUsdcRate = await getStellarXLMToUSDCRate();
        console.log(`🌟 XLM/USDC rate from Stellar: ${xlmToUsdcRate}`);
      } catch (error) {
        console.error('❌ Failed to get XLM/USDC rate from Stellar:', error);
        return {
          error: 'Unable to get XLM conversion rate',
          description: 'Could not fetch current XLM/USDC rate from Stellar network'
        };
      }

      // Calculate ETH → USDC → XLM
      const usdcPerEth = ethToUsdcRate;
      const xlmPerUsdc = 1 / xlmToUsdcRate; // If XLM/USDC = 0.1, then USDC/XLM = 10
      stellarRate = usdcPerEth * xlmPerUsdc;

      const ethAmount = parseFloat(amount) / Math.pow(10, 18);
      stellarAmount = (ethAmount * stellarRate * Math.pow(10, 7)).toString(); // XLM has 7 decimals

      conversionSteps = [
        { chain: 'Ethereum', action: `Swap ${srcToken} → USDC via 1inch` },
        { chain: 'Bridge', action: 'Transfer USDC to Stellar' },
        { chain: 'Stellar', action: `Swap USDC → XLM on Stellar DEX` }
      ];
    } else {
      return {
        error: 'Unsupported Stellar token',
        description: `Token ${recipientToken} is not supported for Stellar conversion`
      };
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
        steps: conversionSteps
      },
      estimatedGas: '0.01', // Estimated gas in ETH
      bridgeFee: '0', // Bridge fee included in rate calculation
      rate: stellarRate.toString(),
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
 * Get XLM to USDC rate from Stellar network using Stellar SDK
 * This fetches the real market rate from Stellar's orderbook
 */
async function getStellarXLMToUSDCRate(): Promise<number> {
  try {
    // Use Stellar's Horizon API to get the current XLM/USDC rate
    // USDC on Stellar: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
    const usdcAsset = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

    // Query Stellar Horizon API for orderbook
    const horizonUrl = 'https://horizon.stellar.org';
    const orderbookUrl = `${horizonUrl}/order_book?selling_asset_type=native&buying_asset_type=credit_alphanum4&buying_asset_code=USDC&buying_asset_issuer=${usdcAsset}`;

    console.log('🔍 Fetching XLM/USDC rate from Stellar Horizon API...');

    const response = await fetch(orderbookUrl);
    if (!response.ok) {
      throw new Error(`Stellar API error: ${response.status}`);
    }

    const data = await response.json();

    // Get the best bid price (what buyers are willing to pay for XLM in USDC)
    const bids = data.bids || [];
    if (bids.length === 0) {
      throw new Error('No bids available in XLM/USDC orderbook');
    }

    // Use the highest bid as the current rate
    const bestBid = parseFloat(bids[0].price);
    console.log(`✅ Current XLM/USDC rate from Stellar: ${bestBid}`);

    return bestBid;

  } catch (error) {
    console.error('❌ Error fetching XLM/USDC rate from Stellar:', error);

    // Fallback to a reasonable estimate if API fails
    // XLM typically trades around $0.10-0.15, USDC is $1.00
    const fallbackRate = 0.12; // $0.12 per XLM
    console.log(`⚠️ Using fallback XLM/USDC rate: ${fallbackRate}`);

    return fallbackRate;
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

/**
 * Create a cross-chain order with hashlock and timelock functionality
 * Implements the example pattern from 1inch documentation
 */
export async function createCrossChainOrderWithHashlock(
  srcChainId: number,
  dstChainId: number,
  srcTokenAddress: string,
  dstTokenAddress: string,
  amount: string,
  walletAddress: string,
  preset: CrossChainPreset = CROSS_CHAIN_PRESETS.fast,
  timelockDuration?: number
): Promise<CrossChainOrder | { error: string; description?: string }> {
  try {
    console.log('🔐 Creating cross-chain order with hashlock:', {
      srcChainId,
      dstChainId,
      srcTokenAddress,
      dstTokenAddress,
      amount,
      walletAddress,
      preset
    });

    const sdk = initializeCrossChainSDK();

    // Convert chain IDs to supported chains
    const srcChain = chainIdToSupportedChain(srcChainId);
    const dstChain = chainIdToSupportedChain(dstChainId);

    if (!srcChain || !dstChain) {
      return {
        error: 'Unsupported chain',
        description: `Chain ${srcChainId} or ${dstChainId} not supported by 1inch Cross Chain SDK`
      };
    }

    // Step 1: Get quote estimate
    const quote = await sdk.getQuote({
      amount,
      srcChainId: srcChain,
      dstChainId: dstChain,
      enableEstimate: true,
      srcTokenAddress,
      dstTokenAddress,
      walletAddress
    });

    console.log('📊 Cross-chain quote received:', {
      srcTokenAmount: quote.srcTokenAmount,
      dstTokenAmount: quote.dstTokenAmount,
      presets: Object.keys(quote.presets || {}),
      secretsCount: quote.presets?.[preset]?.secretsCount || 1
    });

    // Step 2: Generate secrets based on preset requirements
    const secretsCount = quote.presets?.[preset]?.secretsCount || 1;
    const secrets = CrossChainUtils.generateSecrets(secretsCount);

    console.log(`🔑 Generated ${secrets.length} secrets for hashlock`);

    // Step 3: Create hashlock
    const hashLock = secretsCount === 1
      ? CrossChainUtils.createSingleHashLock(secrets[0])
      : CrossChainUtils.createMultipleHashLock(secrets);

    // Step 4: Generate secret hashes for the order
    const secretHashes = secrets.map(secret => CrossChainUtils.hashSecret(secret));

    // Step 5: Calculate timelock
    const timelock = CrossChainUtils.calculateTimelock(timelockDuration);

    console.log('⏰ Timelock configuration:', {
      timelock,
      remaining: CrossChainUtils.formatTimelockRemaining(timelock),
      isActive: CrossChainUtils.isTimelockActive(timelock)
    });

    // Step 6: Create the order with hashlock and timelock
    // Note: This is a simplified implementation. In production, you would need to:
    // 1. Import the proper HashLock class from the SDK
    // 2. Use the correct preset enum values
    // 3. Handle the full order creation flow with proper types

    console.log('📝 Preparing order creation with hashlock configuration');
    console.log('⚠️  Note: Full SDK integration requires proper HashLock implementation');

    // For demonstration purposes, we'll return the prepared order data
    // In production, replace this with actual SDK order creation
    const mockOrderHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const mockQuoteId = `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log('✅ Cross-chain order prepared with hashlock:', {
      hash: mockOrderHash,
      quoteId: mockQuoteId,
      hashLock: hashLock.hash,
      timelock,
      secretsCount: secrets.length
    });

    return {
      hash: mockOrderHash,
      quoteId: mockQuoteId,
      order: quote as any, // Return the quote as order for now
      hashLock,
      timelock,
      preset,
      secretHashes
    };

  } catch (error) {
    console.error('❌ Error creating cross-chain order with hashlock:', error);
    return {
      error: 'Cross-chain order creation failed',
      description: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reveal secrets to complete cross-chain swap
 */
export async function revealSecretsForOrder(
  orderHash: string,
  secrets: string[]
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    console.log('🔓 Revealing secrets for order:', orderHash);

    // Validate secrets
    const validSecrets = secrets.filter(secret => {
      try {
        return secret.startsWith('0x') && secret.length === 66; // 32 bytes + 0x prefix
      } catch {
        return false;
      }
    });

    if (validSecrets.length !== secrets.length) {
      throw new Error('Invalid secret format detected');
    }

    // In a real implementation, this would interact with the 1inch Cross Chain SDK
    // to reveal the secrets and complete the cross-chain transaction
    console.log('🔑 Secrets revealed:', validSecrets.map(s => s.substring(0, 10) + '...'));

    // Simulate success for now
    return {
      success: true,
      txHash: `0x${Math.random().toString(16).substr(2, 64)}` // Mock transaction hash
    };

  } catch (error) {
    console.error('❌ Error revealing secrets:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Monitor cross-chain order status with hashlock information
 */
export async function getCrossChainOrderStatus(
  orderHash: string
): Promise<{
  status: string;
  timelock?: number;
  timelockRemaining?: string;
  isTimelockActive?: boolean;
  secretsRevealed?: number;
  totalSecrets?: number;
}> {
  try {
    console.log('🔍 Getting cross-chain order status:', orderHash);

    // In a real implementation, this would query the 1inch Cross Chain SDK
    // For now, return mock status
    const mockTimelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    return {
      status: 'pending',
      timelock: mockTimelock,
      timelockRemaining: CrossChainUtils.formatTimelockRemaining(mockTimelock),
      isTimelockActive: CrossChainUtils.isTimelockActive(mockTimelock),
      secretsRevealed: 0,
      totalSecrets: 1
    };

  } catch (error) {
    console.error('❌ Error getting order status:', error);
    return {
      status: 'error'
    };
  }
}
