import {
  Horizon,
  Keypair,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
  BASE_FEE,
  Memo
} from '@stellar/stellar-sdk';

import { htlcTracker, type HTLCOrder } from './htlc-tracker';

export class StellarBridge {
  private server: Horizon.Server;
  private networkPassphrase: string;
  private bridgeKeypair: Keypair;
  private isTestnet: boolean;

  constructor(isTestnet?: boolean) {
    // Use environment variable to determine network, fallback to parameter
    const envNetwork = process.env.STELLAR_NETWORK;
    this.isTestnet = isTestnet ?? (envNetwork === 'TESTNET');

    this.server = new Horizon.Server(
      this.isTestnet
        ? 'https://horizon-testnet.stellar.org'
        : 'https://horizon.stellar.org'
    );
    this.networkPassphrase = this.isTestnet ? Networks.TESTNET : Networks.PUBLIC;

    if (!process.env.STELLAR_BRIDGE_SECRET_KEY) {
      throw new Error('STELLAR_BRIDGE_SECRET_KEY environment variable required');
    }

    this.bridgeKeypair = Keypair.fromSecret(process.env.STELLAR_BRIDGE_SECRET_KEY);
    console.log('🌟 Stellar bridge initialized:', {
      publicKey: this.bridgeKeypair.publicKey(),
      network: this.isTestnet ? 'TESTNET' : 'MAINNET'
    });
  }

  async createBridgeOrder(params: {
    ethereumSender: string;
    ethereumToken: string;
    ethereumAmount: string;
    stellarReceiver: string;
    stellarAsset: 'XLM' | 'USDC';
  }) {
    console.log('🌉 Creating bridge order...', params);

    // Validate Stellar address
    if (!this.isValidStellarAddress(params.stellarReceiver)) {
      throw new Error('Invalid Stellar address format');
    }

    // Create HTLC tracking order
    const stellarAmount = this.convertToStellarAmount(params.stellarAsset, params.ethereumAmount);

    const order = htlcTracker.createOrder({
      ...params,
      stellarAmount
    });

    console.log('📝 Bridge order created:', {
      id: order.id,
      stellarAmount,
      hashlock: order.hashlock,
      timelock: new Date(order.timelock * 1000)
    });

    // Immediately transfer to Stellar (since we're simulating the Ethereum side)
    try {
      const stellarTxId = await this.executeStellarTransfer({
        destinationAddress: params.stellarReceiver,
        asset: params.stellarAsset,
        amount: stellarAmount,
        memo: order.id.slice(-8) // Use only last 8 chars to stay under 28-byte limit
      });

      // Update order with success
      htlcTracker.updateOrder(order.id, {
        stellarTxId,
        status: 'stellar_transferred'
      });

      return {
        success: true,
        orderId: order.id,
        stellarTxId,
        stellarAmount,
        bridgeDetails: {
          hashlock: order.hashlock,
          timelock: order.timelock,
          secret: order.secret // For demo purposes, in production this would be revealed later
        },
        stellarExplorer: this.getStellarExplorerUrl(stellarTxId)
      };

    } catch (error) {
      console.error('❌ Stellar transfer failed:', error);

      htlcTracker.updateOrder(order.id, { status: 'expired' });

      throw new Error(`Stellar transfer failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeStellarTransfer(params: {
    destinationAddress: string;
    asset: 'XLM' | 'USDC';
    amount: string;
    memo: string;
  }): Promise<string> {
    const { destinationAddress, asset, amount, memo } = params;

    console.log('💸 Executing Stellar transfer:', { destinationAddress, asset, amount });
    console.log('🔑 Bridge account:', this.bridgeKeypair.publicKey());
    console.log('🌐 Network:', this.isTestnet ? 'TESTNET' : 'MAINNET');

    // Check if destination account exists
    let destinationAccount;
    try {
      destinationAccount = await this.server.loadAccount(destinationAddress);
      console.log('✅ Destination account exists');
    } catch (error) {
      console.log('🆕 Destination account does not exist, will create with transfer');
      destinationAccount = null;
    }

    // Load source account (bridge account)
    let sourceAccount;
    try {
      console.log('🔍 Loading bridge account...');
      sourceAccount = await this.server.loadAccount(this.bridgeKeypair.publicKey());
      console.log('✅ Bridge account loaded successfully');
      console.log('💰 Bridge account balances:');
      sourceAccount.balances.forEach((balance: { asset_type: string; asset_code?: string; balance: string }) => {
        if (balance.asset_type === 'native') {
          console.log('  - XLM:', balance.balance);
        } else {
          console.log(`  - ${balance.asset_code}:`, balance.balance);
        }
      });
    } catch (error) {
      console.error('❌ Failed to load bridge account:', error);
      const publicKey = this.bridgeKeypair.publicKey();
      throw new Error(`
        Bridge account not found on ${this.isTestnet ? 'testnet' : 'mainnet'}.

        To fix this:
        1. Send at least 1 XLM to: ${publicKey}
        2. Account will be automatically created when funded
        3. View on explorer: ${this.isTestnet
          ? `https://testnet.steexp.com/account/${publicKey}`
          : `https://steexp.com/account/${publicKey}`}

        Error: ${error instanceof Error ? error.message : 'Unknown error'}
      `);
    }

    // Create Stellar asset
    const stellarAsset = asset === 'XLM'
      ? Asset.native()
      : new Asset('USDC', this.getUSDCIssuer());

    // Build transaction
    const transactionBuilder = new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: this.networkPassphrase
    });

    if (!destinationAccount && asset === 'XLM') {
      // Create account with XLM
      transactionBuilder.addOperation(Operation.createAccount({
        destination: destinationAddress,
        startingBalance: amount
      }));
    } else {
      // Regular payment
      transactionBuilder.addOperation(Operation.payment({
        destination: destinationAddress,
        asset: stellarAsset,
        amount: amount
      }));
    }

    // Validate memo length (Stellar text memos have a 28-byte limit)
    let validatedMemo = memo;
    if (memo && Buffer.from(memo, 'utf8').length > 28) {
      console.warn(`⚠️ Memo too long (${Buffer.from(memo, 'utf8').length} bytes), truncating to 28 bytes`);
      validatedMemo = memo.substring(0, 28);
    }

    const transaction = transactionBuilder
      .addMemo(validatedMemo ? Memo.text(validatedMemo) : Memo.none())
      .setTimeout(30)
      .build();

    // Sign and submit
    transaction.sign(this.bridgeKeypair);
    const result = await this.server.submitTransaction(transaction);

    console.log('✅ Stellar transfer completed:', {
      hash: result.hash,
      ledger: result.ledger,
      amount: amount,
      asset: asset
    });

    return result.hash;
  }

  private convertToStellarAmount(asset: 'XLM' | 'USDC', ethereumAmount: string): string {
    try {
      console.log('🔄 Converting amount:', { asset, ethereumAmount });

      const weiAmount = BigInt(ethereumAmount);

      if (asset === 'USDC') {
        // Convert from 18 decimals (Ethereum USDC) to 6 decimals (Stellar USDC)
        // Note: Ethereum USDC actually uses 6 decimals, but we handle as if 18 for safety
        const divisor = BigInt(10 ** 12); // Convert from 18 to 6 decimals
        const usdcBaseUnits = weiAmount / divisor;
        const usdcAmount = Number(usdcBaseUnits) / (10 ** 6);

        // Ensure minimum amount and proper formatting
        const finalAmount = Math.max(usdcAmount, 0.000001); // Min 0.000001 USDC
        const formattedAmount = finalAmount.toFixed(6);

        console.log('💰 USDC conversion:', { weiAmount: weiAmount.toString(), usdcAmount, finalAmount, formattedAmount });
        return formattedAmount;

      } else {
        // Convert from Wei to XLM (7 decimal places)
        // Use a realistic exchange rate: 1 ETH ≈ 10,000 XLM (rough estimate)
        const ethAmount = Number(weiAmount) / (10 ** 18);
        const exchangeRate = 10000; // 1 ETH = 10,000 XLM (adjust as needed)
        const xlmAmount = ethAmount * exchangeRate;

        // Ensure minimum amount and proper formatting
        const finalAmount = Math.max(xlmAmount, 0.0000001); // Min 0.0000001 XLM
        const formattedAmount = finalAmount.toFixed(7);

        console.log('💰 XLM conversion:', { weiAmount: weiAmount.toString(), ethAmount, xlmAmount, finalAmount, formattedAmount });
        return formattedAmount;
      }
    } catch (error) {
      console.error('❌ Amount conversion failed:', error);
      throw new Error(`Amount conversion failed: ${error}`);
    }
  }

  private isValidStellarAddress(address: string): boolean {
    return address.length === 56 && address.startsWith('G');
  }

  private getUSDCIssuer(): string {
    // Centre.io USDC issuer addresses
    return this.isTestnet
      ? 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5' // Testnet
      : 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'; // Mainnet
  }

  private getStellarExplorerUrl(txHash: string): string {
    const baseUrl = this.isTestnet
      ? 'https://testnet.steexp.com/tx'
      : 'https://steexp.com/tx';
    return `${baseUrl}/${txHash}`;
  }

  async getOrderStatus(orderId: string) {
    const order = htlcTracker.getOrder(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Check if order has expired
    const isExpired = Date.now() / 1000 > order.timelock;

    return {
      orderId,
      status: isExpired ? 'expired' : order.status,
      stellarTxId: order.stellarTxId,
      stellarAmount: order.stellarAmount,
      stellarAsset: order.stellarAsset,
      stellarReceiver: order.stellarReceiver,
      timelock: order.timelock,
      createdAt: order.createdAt,
      completedAt: order.completedAt,
      stellarExplorer: order.stellarTxId ? this.getStellarExplorerUrl(order.stellarTxId) : undefined
    };
  }

  async getBridgeAccountInfo() {
    try {
      const account = await this.server.loadAccount(this.bridgeKeypair.publicKey());

      const balances = account.balances.map((balance: { asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }) => ({
        asset: balance.asset_type === 'native' ? 'XLM' : `${balance.asset_code}:${balance.asset_issuer}`,
        balance: balance.balance
      }));

      return {
        publicKey: this.bridgeKeypair.publicKey(),
        balances,
        sequence: account.sequence
      };
    } catch (error) {
      throw new Error(`Failed to get bridge account info: ${error}`);
    }
  }
}
