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
const STELLAR_NETWORK = process.env.NODE_ENV === 'production' ? Networks.PUBLIC : Networks.TESTNET;
const HORIZON_URL = process.env.NODE_ENV === 'production' 
  ? 'https://horizon.stellar.org' 
  : 'https://horizon-testnet.stellar.org';

// Bridge account configuration (in production, store securely)
const BRIDGE_SECRET_KEY = process.env.STELLAR_BRIDGE_SECRET_KEY;
const USDC_ISSUER = process.env.NODE_ENV === 'production'
  ? 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' // Circle USDC issuer on mainnet
  : 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'; // Test USDC issuer on testnet

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
    if (!BRIDGE_SECRET_KEY) {
      console.log('⚠️ Bridge account not configured, simulating bridge...');
      return simulateBridge(body);
    }

    // Generate bridge ID for tracking
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
    // Load bridge account
    const bridgeAccount = await server.loadAccount(bridgeKeypair.publicKey());
    
    // Calculate bridge amount (subtract 2% fee)
    const bridgeAmount = (parseFloat(amount) * 0.98).toString();
    
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
    const result = await server.submitTransaction(transaction);
    
    console.log('✅ Stellar bridge transaction completed:', {
      bridgeId,
      stellarTxHash: result.hash,
      actualAmount: bridgeAmount,
    });

    return {
      stellarTxHash: result.hash,
      actualAmount: bridgeAmount,
    };

  } catch (error) {
    console.error('❌ Stellar transaction failed:', error);
    throw error;
  }
}
