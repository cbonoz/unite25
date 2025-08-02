import { NextResponse } from 'next/server';
import { Horizon, Keypair } from '@stellar/stellar-sdk';

export async function GET() {
  try {
    console.log('🔍 Debug: Checking Stellar bridge account...');

    if (!process.env.STELLAR_BRIDGE_SECRET_KEY) {
      return NextResponse.json({
        success: false,
        error: 'STELLAR_BRIDGE_SECRET_KEY not found in environment'
      }, { status: 500 });
    }

    const secretKey = process.env.STELLAR_BRIDGE_SECRET_KEY;
    const envNetwork = process.env.STELLAR_NETWORK;
    const isTestnet = envNetwork === 'TESTNET';

    const keypair = Keypair.fromSecret(secretKey);
    const publicKey = keypair.publicKey();

    console.log('🔑 Bridge account public key:', publicKey);
    console.log('🌐 Network:', isTestnet ? 'TESTNET' : 'MAINNET');

    // Connect to appropriate network
    const server = new Horizon.Server(
      isTestnet
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org'
    );

    try {
      console.log('🌐 Loading account...');
      const account = await server.loadAccount(publicKey);

      const balances = account.balances.map(balance => {
        if (balance.asset_type === 'native') {
          return { asset: 'XLM', balance: balance.balance };
        } else if (balance.asset_type === 'credit_alphanum4' || balance.asset_type === 'credit_alphanum12') {
          return {
            asset: `${balance.asset_code}:${balance.asset_issuer.slice(0,8)}...`,
            balance: balance.balance
          };
        } else {
          return {
            asset: 'Unknown',
            balance: balance.balance
          };
        }
      });

      const explorerUrl = isTestnet
        ? `https://testnet.steexp.com/account/${publicKey}`
        : `https://steexp.com/account/${publicKey}`;

      return NextResponse.json({
        success: true,
        accountExists: true,
        publicKey,
        network: isTestnet ? 'TESTNET' : 'MAINNET',
        sequence: account.sequence,
        balances,
        explorerUrl,
        message: '✅ Bridge account is active and ready!'
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('Not Found')) {
        const explorerUrl = isTestnet
          ? `https://testnet.steexp.com/account/${publicKey}`
          : `https://steexp.com/account/${publicKey}`;

        return NextResponse.json({
          success: false,
          accountExists: false,
          publicKey,
          network: isTestnet ? 'TESTNET' : 'MAINNET',
          error: 'Account not found',
          explorerUrl,
          solutions: [
            'Send at least 1 XLM to activate the account',
            'Account will be automatically created when funded',
            `View on explorer: ${explorerUrl}`
          ],
          fundingInstructions: {
            address: publicKey,
            minimumAmount: '1 XLM',
            network: isTestnet ? 'Stellar Testnet' : 'Stellar Mainnet'
          }
        }, { status: 404 });
      }

      throw error;
    }

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
