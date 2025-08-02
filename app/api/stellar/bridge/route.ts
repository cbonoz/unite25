import { NextResponse } from 'next/server';
import { getPopularTokens, SUPPORTED_CHAINS } from '@/app/utils/oneinch';
import { createOptimizedSwap } from '@/app/utils/fusion';
import type { ChainId } from '@/app/utils/oneinch';

interface BridgeRequest {
  sourceChain: ChainId;
  sourceToken: string;
  sourceAmount: string;
  senderAddress: string;
  targetStellarAddress: string;
  targetAsset: 'XLM' | 'USDC';
}

// Bridge wallet address (in production, use secure key management)
const BRIDGE_ETHEREUM_ADDRESS = '0x742d35Cc6634C0532925a3b8D4B9e9d0c8e5B7b1'; // Example bridge address

export async function POST(request: Request) {
  try {
    const body: BridgeRequest = await request.json();
    console.log('🌉 Creating Ethereum → Stellar bridge order:', body);

    const {
      sourceChain,
      sourceToken,
      sourceAmount,
      senderAddress,
      targetStellarAddress,
      targetAsset,
    } = body;

    // Validate input
    if (!sourceToken || !sourceAmount || !senderAddress || !targetStellarAddress) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate Stellar address format
    if (!targetStellarAddress.startsWith('G') || targetStellarAddress.length !== 56) {
      return NextResponse.json(
        { success: false, error: 'Invalid Stellar address format' },
        { status: 400 }
      );
    }

    try {
      // Get available tokens to find the target stablecoin
      const tokens = await getPopularTokens(sourceChain);
      const targetToken = tokens.find(token =>
        token.symbol === 'USDC' || token.symbol === 'DAI' || token.symbol === 'USDT'
      );

      if (!targetToken) {
        throw new Error('No suitable stablecoin found on source chain');
      }

      console.log('🔄 Creating optimized swap for cross-chain bridge...');

      // Create an optimized swap order where the bridge receives the tokens
      // and will send equivalent value to Stellar
      const swapResult = await createOptimizedSwap(
        Number(sourceChain),
        sourceToken,
        targetToken.address, // Convert to stablecoin
        sourceAmount,
        senderAddress,
        BRIDGE_ETHEREUM_ADDRESS // Bridge receives the tokens
      );

      console.log('✅ Bridge swap order created:', swapResult);

      // Generate a unique bridge transaction ID
      const bridgeId = `eth-stellar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // In production, store bridge order details in database:
      // await storeBridgeOrder({
      //   bridgeId,
      //   sourceChain,
      //   sourceToken,
      //   sourceAmount,
      //   senderAddress,
      //   targetStellarAddress,
      //   targetAsset,
      //   swapOrderHash: swapResult.orderHash || swapResult.tx?.hash,
      //   status: 'pending',
      //   createdAt: new Date(),
      // });

      // Schedule Stellar transfer (in production, this would be handled by a background service)
      console.log('📡 Scheduling Stellar transfer...');

      // Calculate Stellar amount (simplified conversion)
      const stellarAmount = (parseFloat(sourceAmount) / Math.pow(10, 18) * 0.98).toString(); // 2% bridge fee

      // Check if swap was successful
      if (!swapResult.success) {
        const errorMessage = ('error' in swapResult) ? swapResult.error : 'Failed to create swap for bridge';
        throw new Error(errorMessage || 'Failed to create swap for bridge');
      }

      // Extract transaction data depending on the result type
      let transactionData = null;
      if ('transaction' in swapResult) {
        transactionData = swapResult.transaction;
      } else if ('order' in swapResult) {
        transactionData = swapResult.order;
      } else if ('quote' in swapResult) {
        transactionData = swapResult.quote;
      }

      return NextResponse.json({
        success: true,
        bridgeId,
        transaction: transactionData,
        orderHash: swapResult.orderHash,
        stellarTransfer: {
          targetAddress: targetStellarAddress,
          amount: stellarAmount,
          asset: targetAsset,
          memo: `Bridge from Ethereum: ${bridgeId}`,
        },
        estimatedTime: '2-5 minutes',
        bridgeFee: '2%',
      });

    } catch (error) {
      console.error('❌ Failed to create bridge order:', error);
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create bridge order',
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error in bridge API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const bridgeId = searchParams.get('bridgeId');

  if (!bridgeId) {
    return NextResponse.json(
      { success: false, error: 'Missing bridgeId parameter' },
      { status: 400 }
    );
  }

  try {
    // In production, retrieve bridge status from database
    console.log('📊 Checking bridge status for:', bridgeId);

    // Mock status for demo
    const status = {
      bridgeId,
      status: 'completed',
      ethereumConfirmed: true,
      stellarConfirmed: true,
      stellarTxHash: 'stellar_tx_' + bridgeId.slice(-8),
      completedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('❌ Error checking bridge status:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
