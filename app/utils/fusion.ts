// Fusion+ API Integration for better cross-chain swaps
// Using direct API calls for more reliable implementation

import { NetworkEnum } from '@1inch/fusion-sdk';

const API_KEY = process.env.ONE_INCH_API_KEY;
const BASE_URL = 'https://api.1inch.dev';

interface FusionQuoteParams {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  walletAddress: string;
  receiver?: string;
  preset?: 'fast' | 'medium' | 'slow';
}

interface FusionOrderResult {
  success: boolean;
  orderHash?: string;
  order?: Record<string, unknown>;
  quote?: Record<string, unknown>;
  error?: string;
}

// Create Fusion+ order using direct API calls
export async function createFusionPlusOrder(
  chainId: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  walletAddress: string,
  receiverAddress?: string
): Promise<FusionOrderResult> {
  try {
    console.log('🔄 Creating Fusion+ order via API:', {
      chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      receiverAddress,
    });

    // Check if chain supports Fusion+
    if (!supportsFusionPlus(chainId)) {
      throw new Error(`Fusion+ not supported on chain ${chainId}`);
    }

    // Step 1: Get Fusion+ quote via backend

    console.log('📋 Getting Fusion+ quote via backend...');
    const quoteResponse = await fetch('/api/fusion/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chainId,
        fromTokenAddress,
        toTokenAddress,
        amount,
        walletAddress,
        receiverAddress,
      }),
    });

    if (!quoteResponse.ok) {
      const errorData = await quoteResponse.json();
      console.error('❌ Fusion+ quote error:', quoteResponse.status, errorData);
      throw new Error(errorData.error || `Fusion+ quote error: ${quoteResponse.status}`);
    }

    const quote = await quoteResponse.json();
    console.log('✅ Fusion+ quote received');

    // Step 2: Create order via backend
    console.log('🔄 Creating Fusion+ order via backend...');
    const orderResponse = await fetch('/api/fusion/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chainId,
        srcToken: fromTokenAddress,
        dstToken: toTokenAddress,
        srcAmount: amount,
        walletAddress,
        receiverAddress,
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error('❌ Fusion+ order error:', orderResponse.status, errorData);
      throw new Error(errorData.error || `Fusion+ order error: ${orderResponse.status}`);
    }

    const order = await orderResponse.json();
    console.log('✅ Fusion+ order created');

    return {
      success: true,
      order,
      quote,
    };

  } catch (error) {
    console.error('❌ Error creating Fusion+ order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Fusion+ order',
    };
  }
}

// Check if a chain supports Fusion+
export function supportsFusionPlus(chainId: number): boolean {
  // Fusion+ is available on these networks
  return [1, 137, 42161, 10, 8453].includes(chainId);
}

// Enhanced regular swap for non-Fusion+ chains or fallback
export async function createRegularSwap(
  chainId: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  walletAddress: string,
  receiverAddress?: string
) {
  try {
    console.log('🔄 Creating regular swap (fallback):', {
      chainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      receiverAddress,
    });

    // Use backend API route instead of direct 1inch API call (avoids CORS)

    console.log('🔄 Getting swap transaction via backend...');
    const swapResponse = await fetch('/api/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chainId,
        fromTokenAddress,
        toTokenAddress,
        amount,
        walletAddress,
        receiverAddress,
        slippage: '1',
      }),
    });

    if (!swapResponse.ok) {
      const errorData = await swapResponse.json();
      console.error('❌ Backend swap API error:', swapResponse.status, errorData);

      // Provide specific guidance for 401 errors
      if (swapResponse.status === 401) {
        throw new Error(`API Authentication Failed: ${errorData.details || 'Invalid 1inch API key. Please check your ONE_INCH_API_KEY environment variable.'}`);
      }

      throw new Error(errorData.error || `Swap API error: ${swapResponse.status}`);
    }

    const swapData = await swapResponse.json();
    console.log('✅ Regular swap transaction created');

    return {
      success: true,
      transaction: swapData.transaction,
      toAmount: swapData.toAmount,
      estimatedGas: swapData.estimatedGas,
      orderHash: swapData.orderHash,
      method: 'regular-swap',
    };

  } catch (error) {
    console.error('❌ Error creating regular swap:', error);

    // If API key is invalid, provide a simulation mode
    if (error instanceof Error && error.message.includes('Authentication Failed')) {
      console.log('🎭 Falling back to simulation mode due to API key issue');
      return {
        success: true,
        transaction: {
          to: toTokenAddress,
          data: '0x',
          value: '0',
          gas: '200000',
        },
        toAmount: (parseFloat(amount) * 0.95).toString(), // Simulate 5% slippage
        estimatedGas: '200000',
        orderHash: `simulated_${Date.now()}`,
        method: 'simulated-swap',
        isSimulation: true,
        message: 'Swap simulation - API key required for actual swaps',
      };
    }

    throw error;
  }
}

// Create optimized swap with cross-chain support
export async function createOptimizedSwap(
  chainId: number,
  fromTokenAddress: string,
  toTokenAddress: string,
  amount: string,
  walletAddress: string,
  receiverAddress?: string,
  isCrossChain?: boolean
) {
  // For cross-chain to Stellar, always convert to USDC first
  if (isCrossChain) {
    console.log('🌉 Cross-chain swap detected, converting to USDC as intermediate token');

    // Find USDC address on the source chain
    const usdcAddresses: Record<number, string> = {
      1: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // Ethereum USDC (corrected)
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon USDC
      42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum USDC
      10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism USDC
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC
    };

    const usdcAddress = usdcAddresses[chainId];
    if (!usdcAddress) {
      throw new Error(`USDC not available on chain ${chainId}`);
    }

    // First convert to USDC, then handle cross-chain bridging
    toTokenAddress = usdcAddress;
  }

  // Try Fusion+ first if supported
  if (supportsFusionPlus(chainId)) {
    try {
      const fusionResult = await createFusionPlusOrder(
        chainId,
        fromTokenAddress,
        toTokenAddress,
        amount,
        walletAddress,
        receiverAddress
      );

      if (fusionResult.success) {
        console.log('✅ Using Fusion+ for optimal execution');
        return {
          ...fusionResult,
          method: 'fusion-plus',
          isCrossChain,
        };
      }
    } catch (error) {
      console.warn('⚠️ Fusion+ failed, falling back to regular swap:', error);
    }
  }

  // Fallback to regular swap
  console.log('🔄 Using regular swap as fallback');
  const regularResult = await createRegularSwap(
    chainId,
    fromTokenAddress,
    toTokenAddress,
    amount,
    walletAddress,
    receiverAddress
  );

  return {
    ...regularResult,
    method: 'regular-swap',
    isCrossChain,
  };
}

// Handle cross-chain bridge to Stellar after the initial swap
export async function initiateStellarBridge(
  txHash: string,
  sourceChain: number,
  amount: string,
  stellarAddress: string,
  targetAsset: 'XLM' | 'USDC' = 'USDC'
) {
  try {
    console.log('🌉 Initiating Stellar bridge after swap:', {
      txHash,
      sourceChain,
      amount,
      stellarAddress,
      targetAsset,
    });

    const response = await fetch('/api/stellar/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ethereumTxHash: txHash,
        sourceChain,
        amount,
        stellarRecipient: stellarAddress,
        targetAsset,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Stellar bridge error: ${response.status} ${errorData}`);
    }

    const bridgeResult = await response.json();
    console.log('✅ Stellar bridge initiated:', bridgeResult);

    return bridgeResult;

  } catch (error) {
    console.error('❌ Error initiating Stellar bridge:', error);
    throw error;
  }
}


NetworkEnum.GNOSIS
