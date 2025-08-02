import { NextResponse } from 'next/server';
import {
  Keypair,
  Asset,
  Operation,
  Transaction,
  TransactionBuilder,
  Networks,
  Horizon,
  Memo
} from '@stellar/stellar-sdk';

// API handler for ETH → Stellar swaps
interface BridgeRequest {
  ethereumTxHash: string;
  sourceChain: number;
  amount: string;
  stellarRecipient: string;
  targetAsset: 'XLM' | 'USDC';
}

// Stellar network configuration
const STELLAR_NETWORK = process.env.STELLAR_NETWORK === 'MAINNET' ? Networks.PUBLIC : Networks.TESTNET;
const HORIZON_URL = process.env.STELLAR_NETWORK === 'MAINNET'
  ? 'https://horizon.stellar.org'
  : 'https://horizon-testnet.stellar.org';

// Bridge account configuration (in production, store securely)
const BRIDGE_SECRET_KEY = process.env.STELLAR_BRIDGE_SECRET_KEY;
const USDC_ISSUER = process.env.STELLAR_NETWORK === 'MAINNET'
  ? 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' // Circle USDC issuer on mainnet
  : 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'; // Test USDC issuer on testnet

// Debug environment variables (remove in production)
console.log('🔧 Stellar Bridge Configuration:', {
  network: process.env.STELLAR_NETWORK,
  stellarNetwork: STELLAR_NETWORK,
  horizonUrl: HORIZON_URL,
  bridgeSecretKeyExists: !!BRIDGE_SECRET_KEY,
  bridgeSecretKeyLength: BRIDGE_SECRET_KEY?.length,
  bridgeSecretKeyPreview: BRIDGE_SECRET_KEY ? `${BRIDGE_SECRET_KEY.substring(0, 4)}...${BRIDGE_SECRET_KEY.substring(-4)}` : 'MISSING',
  usdcIssuer: USDC_ISSUER,
  allEnvKeys: Object.keys(process.env).filter(key => key.includes('STELLAR')),
});

export async function POST(request: Request) {
  try {
    const body: BridgeRequest = await request.json();
    console.log('🌉 Processing ETH → Stellar bridge request:', body);

    const {
      ethereumTxHash,
      sourceChain,
      amount,
      stellarRecipient,
      targetAsset,
    } = body;

    // Validate inputs
    if (!ethereumTxHash || !sourceChain || !amount || !stellarRecipient) {
      const missingFields = [];
      if (!ethereumTxHash) missingFields.push('ethereumTxHash');
      if (!sourceChain) missingFields.push('sourceChain');
      if (!amount) missingFields.push('amount');
      if (!stellarRecipient) missingFields.push('stellarRecipient');

      console.error('❌ Missing required parameters:', missingFields);
      return NextResponse.json(
        {
          success: false,
          error: `Missing required parameters: ${missingFields.join(', ')}`,
          received: { ethereumTxHash, sourceChain, amount, stellarRecipient, targetAsset }
        },
        { status: 400 }
      );
    }

    // Validate Stellar address
    if (!stellarRecipient.startsWith('G') || stellarRecipient.length !== 56) {
      return NextResponse.json(
        { success: false, error: 'Invalid Stellar address format' },
        { status: 400 }
      );
    }

    // Check if bridge account is configured
    console.log('🔍 Checking bridge configuration:', {
      bridgeSecretKeyExists: !!BRIDGE_SECRET_KEY,
      bridgeSecretKeyValue: BRIDGE_SECRET_KEY ? 'PRESENT' : 'MISSING',
      directEnvCheck: !!process.env.STELLAR_BRIDGE_SECRET_KEY,
      directEnvValue: process.env.STELLAR_BRIDGE_SECRET_KEY ? 'PRESENT' : 'MISSING',
    });

    if (!BRIDGE_SECRET_KEY && !process.env.STELLAR_BRIDGE_SECRET_KEY) {
      console.log('⚠️ Bridge account not configured, simulating bridge...');
      return simulateBridge(body);
    }    // Generate bridge ID for tracking
    const bridgeId = `eth-stellar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Execute the actual bridge transaction
      const bridgeResult = await executeStellarBridge(
        bridgeId,
        amount,
        stellarRecipient,
        targetAsset
      );

      return NextResponse.json({
        success: true,
        bridgeId,
        status: 'completed',
        message: 'Bridge transaction completed successfully',
        stellarTx: bridgeResult.stellarTxHash,
        stellarDelivery: {
          recipient: stellarRecipient,
          asset: targetAsset,
          actualAmount: bridgeResult.actualAmount,
          stellarTxHash: bridgeResult.stellarTxHash,
        },
        tracking: {
          ethereumTx: ethereumTxHash,
          bridgeId,
          status: 'completed',
        },
      });

    } catch (bridgeError) {
      console.error('❌ Bridge execution failed:', bridgeError);

      // Return simulation result as fallback
      return simulateBridge(body, `Bridge failed: ${bridgeError instanceof Error ? bridgeError.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('❌ Error processing bridge request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process bridge request'
      },
      { status: 500 }
    );
  }
}

// Simulate bridge for development/testing
function simulateBridge(body: BridgeRequest, errorMessage?: string) {
  const bridgeId = `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  console.log('🎭 Simulating bridge transaction:', {
    bridgeId,
    reason: errorMessage || 'Development mode - no bridge account configured',
  });

  return NextResponse.json({
    success: true,
    bridgeId,
    status: 'simulated',
    message: errorMessage || 'Bridge request received and simulated (development mode)',
    stellarDelivery: {
      recipient: body.stellarRecipient,
      asset: body.targetAsset,
      estimatedAmount: (parseFloat(body.amount) * 0.98).toString(), // 2% bridge fee
      estimatedTimeMinutes: 5,
      note: 'This is a simulated transaction for development purposes'
    },
    tracking: {
      ethereumTx: body.ethereumTxHash,
      bridgeId,
      status: 'simulated',
    },
  });
}

// Execute actual Stellar bridge transaction
async function executeStellarBridge(
  bridgeId: string,
  amount: string,
  stellarRecipient: string,
  targetAsset: 'XLM' | 'USDC'
): Promise<{ stellarTxHash: string; actualAmount: string }> {

  if (!BRIDGE_SECRET_KEY) {
    throw new Error('Bridge account not configured');
  }

  const server = new Horizon.Server(HORIZON_URL);
  const bridgeKeypair = Keypair.fromSecret(BRIDGE_SECRET_KEY);

  console.log('🌉 Executing Stellar bridge transaction:', {
    bridgeId,
    amount,
    stellarRecipient,
    targetAsset,
    bridgeAccount: bridgeKeypair.publicKey(),
  });

  try {
    // Skip recipient account verification - Stellar will handle this during transaction
    // Load bridge account - only verify the bridge account exists
    let bridgeAccount;
    try {
      bridgeAccount = await server.loadAccount(bridgeKeypair.publicKey());
    } catch (accountError) {
      console.error('❌ Bridge account not found or funded:', accountError);
      throw new Error(`Bridge account ${bridgeKeypair.publicKey()} not found or not funded on ${STELLAR_NETWORK === Networks.PUBLIC ? 'mainnet' : 'testnet'}. Please fund the account with at least 1 XLM.`);
    }

    // Calculate bridge amount (subtract 2% fee)
    const bridgeAmount = (parseFloat(amount) * 0.98).toString();

    console.log('💰 Bridge account loaded successfully:', {
      accountId: bridgeAccount.accountId(),
      sequenceNumber: bridgeAccount.sequenceNumber(),
      balances: bridgeAccount.balances.map(b => {
        if (b.asset_type === 'native') {
          return { asset: 'XLM', balance: b.balance };
        } else if (b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') {
          return { asset: `${b.asset_code}:${b.asset_issuer}`, balance: b.balance };
        } else {
          return { asset: 'unknown', balance: b.balance };
        }
      })
    });

    let transaction: Transaction;

    if (targetAsset === 'XLM') {
      // Send XLM directly
      transaction = new TransactionBuilder(bridgeAccount, {
        fee: '10000', // 0.001 XLM
        networkPassphrase: STELLAR_NETWORK,
      })
        .addOperation(Operation.payment({
          destination: stellarRecipient,
          asset: Asset.native(), // XLM
          amount: bridgeAmount,
        }))
        .addMemo(Memo.text(`Bridge: ${bridgeId}`))
        .setTimeout(30)
        .build();
    } else {
      // Send USDC on Stellar
      const usdcAsset = new Asset('USDC', USDC_ISSUER);

      transaction = new TransactionBuilder(bridgeAccount, {
        fee: '10000', // 0.001 XLM
        networkPassphrase: STELLAR_NETWORK,
      })
        .addOperation(Operation.payment({
          destination: stellarRecipient,
          asset: usdcAsset,
          amount: bridgeAmount,
        }))
        .addMemo(Memo.text(`Bridge: ${bridgeId}`))
        .setTimeout(30)
        .build();
    }

    // Sign and submit transaction
    transaction.sign(bridgeKeypair);

    console.log('📤 Submitting Stellar transaction...');
    const result = await server.submitTransaction(transaction);

    console.log('✅ Stellar bridge transaction completed:', {
      bridgeId,
      stellarTxHash: result.hash,
      actualAmount: bridgeAmount,
      ledger: result.ledger,
    });

    return {
      stellarTxHash: result.hash,
      actualAmount: bridgeAmount,
    };

  } catch (error) {
    console.error('❌ Stellar transaction failed:', error);

    // Provide more detailed error messages
    if (error instanceof Error) {
      if (error.message.includes('op_no_destination')) {
        throw new Error(`Recipient Stellar address ${stellarRecipient} does not exist. The recipient needs to create their Stellar account first.`);
      } else if (error.message.includes('op_underfunded')) {
        throw new Error(`Bridge account has insufficient ${targetAsset} balance to complete the transaction.`);
      } else if (error.message.includes('tx_insufficient_fee')) {
        throw new Error('Transaction fee too low. Please try again.');
      } else {
        throw new Error(`Stellar transaction failed: ${error.message}`);
      }
    }

    throw error;
  }
}
