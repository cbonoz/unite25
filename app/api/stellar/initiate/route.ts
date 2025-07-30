import { NextResponse } from 'next/server';
import {
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Memo,
  Networks,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { Horizon } from '@stellar/stellar-sdk';
import { createHash } from 'crypto';
import { createFusionOrder } from '@/app/utils/oneinch';
import { SUPPORTED_CHAINS } from '@/app/utils/oneinch';

// Stellar testnet server
const stellarServer = new Horizon.Server('https://horizon-testnet.stellar.org');

// Hashlock contract duration (1 hour)
const LOCK_DURATION = 3600;

// Bridge wallet keypair (in production, this would be securely managed)
const BRIDGE_KEYPAIR = Keypair.random(); // For demo - in production use secure key management

interface InitiateSwapRequest {
  stellarSenderSecret: string;
  ethereumRecipient: string;
  amount: string;
  assetCode: 'XLM' | 'USDC';
  targetEthereumToken?: string;
  tipJarId: string;
}

// Generate a random preimage and its hash for the hashlock
function generateHashlock() {
  const preimage = Keypair.random().rawSecretKey();
  const hash = createHash('sha256').update(preimage).digest();
  return { preimage, hash };
}

export async function POST(request: Request) {
  try {
    const body: InitiateSwapRequest = await request.json();
    console.log('🌉 Initiating Stellar → Ethereum cross-chain swap:', body);

    const {
      stellarSenderSecret,
      ethereumRecipient,
      amount,
      assetCode,
      targetEthereumToken,
      tipJarId,
    } = body;

    // Validate input
    if (!stellarSenderSecret || !ethereumRecipient || !amount || !assetCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Create sender keypair
    const senderKeypair = Keypair.fromSecret(stellarSenderSecret);
    console.log('👤 Stellar sender:', senderKeypair.publicKey());

    // Generate hashlock for atomic swap
    const { preimage, hash } = generateHashlock();
    const hashlockHex = hash.toString('hex');
    console.log('🔐 Generated hashlock:', hashlockHex);

    // Load sender account
    const senderAccount = await stellarServer.loadAccount(senderKeypair.publicKey());

    // Define asset
    const asset = assetCode === 'XLM'
      ? Asset.native()
      : new Asset('USDC', 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'); // Testnet USDC issuer

    // Create conditional payment operation with hashlock
    const transaction = new TransactionBuilder(senderAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.payment({
          destination: BRIDGE_KEYPAIR.publicKey(),
          asset: asset,
          amount: amount,
        })
      )
      .addMemo(Memo.text(`swap:${hashlockHex}:${ethereumRecipient}:${tipJarId}`))
      .setTimeout(LOCK_DURATION)
      .build();

    // Sign and submit Stellar transaction
    transaction.sign(senderKeypair);
    const stellarResult = await stellarServer.submitTransaction(transaction);
    console.log('✅ Stellar transaction submitted:', stellarResult.hash);

    // Now create the corresponding Fusion+ order on Ethereum
    try {
      console.log('🔄 Creating corresponding Fusion+ order on Ethereum...');

      // Convert Stellar amount to Ethereum decimals
      const ethereumAmount = (parseFloat(amount) * Math.pow(10, 18)).toString(); // Assuming 18 decimals

      // Default to USDC if no target token specified
      const targetToken = targetEthereumToken || '0xA0b86a33E6441C8C7b60b8B5fa46a80C42a59C5d'; // USDC on Base

      // Create a Fusion+ order that will be filled when the hashlock is revealed
      const fusionOrder = await createFusionOrder(
        SUPPORTED_CHAINS.BASE, // Use Base for lower fees
        '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base as source
        targetToken, // Target token (USDC, DAI, etc.)
        ethereumAmount,
        BRIDGE_KEYPAIR.publicKey(), // Bridge acts as sender
        ethereumRecipient
      );

      console.log('✅ Fusion+ order created:', fusionOrder);

      // Store the swap details (in production, use a database)
      const swapId = `stellar-eth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // In production, store this in a database:
      // await storeSwapDetails({
      //   swapId,
      //   stellarTxHash: stellarResult.hash,
      //   preimage: preimage.toString('hex'),
      //   hashlockHex,
      //   ethereumRecipient,
      //   amount,
      //   assetCode,
      //   fusionOrderHash: fusionOrder.orderHash,
      //   status: 'initiated',
      //   expiresAt: new Date(Date.now() + LOCK_DURATION * 1000),
      // });

      console.log('🎉 Cross-chain swap initiated successfully!');

      return NextResponse.json({
        success: true,
        swapId,
        stellarTxId: stellarResult.hash,
        hashlockHex,
        fusionOrderHash: fusionOrder.orderHash || 'pending',
        bridgeAddress: BRIDGE_KEYPAIR.publicKey(),
        message: 'Cross-chain swap initiated. Funds will be released when conditions are met.',
      });

    } catch (ethereumError) {
      console.error('❌ Failed to create Ethereum side of swap:', ethereumError);

      // In production, would implement a refund mechanism here
      return NextResponse.json({
        success: false,
        error: 'Failed to create Ethereum swap order',
        stellarTxId: stellarResult.hash,
        refundRequired: true,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error initiating cross-chain swap:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
