// Test script to check Stellar bridge account on mainnet
import { Horizon, Keypair } from '@stellar/stellar-sdk';

async function checkBridgeAccount() {
  try {
    console.log('🔍 Checking Stellar bridge account...');

    // Use the secret key from your .env file
    const secretKey = process.env.STELLAR_BRIDGE_SECRET_KEY;

    const keypair = Keypair.fromSecret(secretKey);
    const publicKey = keypair.publicKey();

    console.log('🔑 Bridge account public key:', publicKey);

    // Connect to mainnet
    const server = new Horizon.Server('https://horizon.stellar.org');

    console.log('🌐 Loading account from mainnet...');
    const account = await server.loadAccount(publicKey);

    console.log('✅ Account found!');
    console.log('📊 Account details:');
    console.log('  Sequence:', account.sequence);
    console.log('  Balances:');

    account.balances.forEach(balance => {
      if (balance.asset_type === 'native') {
        console.log('    - XLM:', balance.balance);
      } else {
        console.log(`    - ${balance.asset_code}:${balance.asset_issuer?.slice(0,8)}...`, balance.balance);
      }
    });

    console.log('\n🌐 View on explorer:');
    console.log(`https://steexp.com/account/${publicKey}`);

  } catch (error) {
    console.error('❌ Error:', error.message);

    if (error.message.includes('Not Found')) {
      console.log('\n💡 Solutions:');
      console.log('1. Send at least 1 XLM to the bridge account to activate it');
      console.log('2. Check if the secret key is correct');
      console.log('3. Verify you are on the correct network (mainnet)');
    }
  }
}

checkBridgeAccount();
