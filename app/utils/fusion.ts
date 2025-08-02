// Fusion+ API Integration for better cross-chain swaps
// Using direct API calls for more reliable implementation

import { NetworkEnum } from '@1inch/fusion-sdk';

const API_KEY = process.env.NEXT_PUBLIC_ONE_INCH_API_KEY;
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

    // Step 1: Get Fusion+ quote
    const quoteParams = new URLSearchParams({
      fromTokenAddress,
      toTokenAddress,
      amount,
      walletAddress,
      ...(receiverAddress && { receiver: receiverAddress }),
      preset: 'fast',
    });

    console.log('📋 Getting Fusion+ quote...');
    const quoteResponse = await fetch(`${BASE_URL}/fusion-plus/v1.0/${chainId}/quote?${quoteParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!quoteResponse.ok) {
      const errorData = await quoteResponse.text();
      console.error('❌ Fusion+ quote error:', quoteResponse.status, errorData);
      throw new Error(`Fusion+ quote error: ${quoteResponse.status} ${errorData}`);
    }

    const quote = await quoteResponse.json();
    console.log('✅ Fusion+ quote received');

    // Step 2: Create order
    console.log('🔄 Creating Fusion+ order...');
    const orderResponse = await fetch(`${BASE_URL}/fusion-plus/v1.0/${chainId}/order`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromTokenAddress,
        toTokenAddress,
        amount,
        walletAddress,
        ...(receiverAddress && { receiver: receiverAddress }),
        preset: 'fast',
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      console.error('❌ Fusion+ order error:', orderResponse.status, errorData);
      throw new Error(`Fusion+ order error: ${orderResponse.status} ${errorData}`);
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

    const swapParams = new URLSearchParams({
      src: fromTokenAddress,
      dst: toTokenAddress,
      amount,
      from: walletAddress,
      slippage: '1',
      disableEstimate: 'false',
      allowPartialFill: 'true',
      ...(receiverAddress && { destReceiver: receiverAddress }),
    });

    console.log('� Getting swap transaction...');
    const swapResponse = await fetch(`${BASE_URL}/swap/v6.0/${chainId}/swap?${swapParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!swapResponse.ok) {
      const errorData = await swapResponse.text();
      console.error('❌ Swap API error:', swapResponse.status, errorData);
      throw new Error(`Swap API error: ${swapResponse.status} ${errorData}`);
    }

    const swapData = await swapResponse.json();
    console.log('✅ Regular swap transaction created');

    return {
      success: true,
      transaction: swapData.tx,
      toAmount: swapData.toAmount,
      estimatedGas: swapData.tx?.gas,
      orderHash: `regular_swap_${Date.now()}`,
    };

  } catch (error) {
    console.error('❌ Error creating regular swap:', error);
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
      1: '0xA0b86a33E6441C8C7b60b8B5fa46a80C42a59C5d', // Ethereum USDC
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
