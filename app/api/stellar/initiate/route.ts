// API endpoint for initiating Stellar to Ethereum cross-chain swaps
import { NextRequest, NextResponse } from 'next/server';
import { Keypair, Asset } from '@stellar/stellar-sdk';
import StellarEthereumBridge, { StellarAssets } from '../../../utils/stellar-bridge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      stellarSenderSecret,
      ethereumRecipient,
      amount,
      assetCode,
      targetEthereumToken,
      tipJarId
    } = body;

    // Validate required fields
    if (!stellarSenderSecret || !ethereumRecipient || !amount || !tipJarId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Initialize bridge with configured bridge address
    const bridgeAddress = process.env.STELLAR_BRIDGE_ADDRESS!;
    const bridge = new StellarEthereumBridge(bridgeAddress);

    // Create Stellar sender keypair
    const stellarSender = Keypair.fromSecret(stellarSenderSecret);

    // Determine Stellar asset
    let stellarAsset: Asset;
    if (assetCode === 'XLM') {
      stellarAsset = StellarAssets.XLM;
    } else if (assetCode === 'USDC') {
      stellarAsset = StellarAssets.USDC;
    } else {
      return NextResponse.json(
        { error: 'Unsupported asset' },
        { status: 400 }
      );
    }

    // Initiate cross-chain swap
    const result = await bridge.initiateStellarToEthereumTip(
      stellarSender,
      ethereumRecipient,
      amount,
      stellarAsset,
      targetEthereumToken || '0xA0b86a33E6441C8C7b60b8B5fa46a80C42a59C5d', // Default to USDC
      tipJarId
    );

    return NextResponse.json({
      success: true,
      swapId: result.swapContract.swapId,
      stellarTxId: result.swapContract.stellarTxId,
      hashlock: result.hashlock,
      timelock: result.swapContract.timelock,
      message: 'Cross-chain swap initiated successfully'
    });

  } catch (error) {
    console.error('Error initiating cross-chain swap:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
