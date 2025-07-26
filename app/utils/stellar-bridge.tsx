// Stellar Network Integration for 1inch Fusion+ Extension
// Enables cross-chain swaps between Stellar and Ethereum with hashlock/timelock

import crypto from 'crypto';
import {
  Server,
  Keypair,
  TransactionBuilder,
  Networks,
  Operation,
  Asset,
  Account,
  Memo,
} from '@stellar/stellar-sdk';

// Stellar Configuration
const STELLAR_HORIZON_URL = 'https://horizon-testnet.stellar.org'; // Use mainnet for production
const STELLAR_NETWORK = Networks.TESTNET; // Use Networks.PUBLIC for mainnet

export const server = new Server(STELLAR_HORIZON_URL);

// Cross-chain swap states
export enum SwapState {
  INITIATED = 'initiated',
  LOCKED = 'locked',
  REDEEMED = 'redeemed',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
}

// Hashlock/Timelock swap contract interface
export interface StellarSwapContract {
  swapId: string;
  initiator: string;
  participant: string;
  amount: string;
  asset: Asset;
  hashlock: string;
  timelock: number; // Unix timestamp
  state: SwapState;
  secret?: string;
  stellarTxId?: string;
  evmTxId?: string;
}

// Stellar transaction interface
export interface StellarTransaction {
  id: string;
  hash: string;
  memo?: string;
  created_at: string;
  source_account: string;
}

// Cross-chain swap data interface
export interface CrossChainSwapData extends StellarSwapContract {
  targetChain: string;
  targetAddress: string;
  targetToken: string;
  tipJarId: string;
  type: 'stellar_to_ethereum' | 'ethereum_to_stellar';
}

// Stellar atomic swap operations
export class StellarAtomicSwap {
  private server: Server;
  private network: string;

  constructor() {
    this.server = server;
    this.network = STELLAR_NETWORK;
  }

  // Generate a secure random secret and its hash
  generateHashlockPair(): { secret: string; hashlock: string } {
    const secret = Keypair.random().secret();
    const hashlock = crypto.createHash('sha256').update(secret).digest('hex');
    return { secret, hashlock };
  }

  // Create a swap contract on Stellar (Step 1: Lock funds)
  async createStellarSwap(
    initiatorKeypair: Keypair,
    participantAddress: string,
    amount: string,
    asset: Asset,
    hashlock: string,
    timelockHours: number = 24
  ): Promise<StellarSwapContract> {
    try {
      const initiatorAccount = await this.server.loadAccount(initiatorKeypair.publicKey());
      const timelock = Math.floor(Date.now() / 1000) + (timelockHours * 3600);

      const swapId = `swap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create a transaction that locks funds with conditions
      const transaction = new TransactionBuilder(initiatorAccount, {
        fee: '10000',
        networkPassphrase: this.network,
      })
        .addOperation(
          Operation.payment({
            destination: participantAddress,
            asset: asset,
            amount: amount,
          })
        )
        .addMemo(Memo.text(`SWAP:${swapId}:${hashlock}:${timelock}`))
        .setTimeout(30)
        .build();

      transaction.sign(initiatorKeypair);
      const result = await this.server.submitTransaction(transaction);

      const swapContract: StellarSwapContract = {
        swapId,
        initiator: initiatorKeypair.publicKey(),
        participant: participantAddress,
        amount,
        asset,
        hashlock,
        timelock,
        state: SwapState.LOCKED,
        stellarTxId: result.hash,
      };

      return swapContract;
    } catch (error) {
      console.error('Error creating Stellar swap:', error);
      throw error;
    }
  }

  // Redeem swap with secret (Step 2: Complete swap)
  async redeemStellarSwap(
    participantKeypair: Keypair,
    swapContract: StellarSwapContract,
    secret: string
  ): Promise<string> {
    try {
      // Verify the secret matches the hashlock
      const computedHash = crypto.createHash('sha256').update(secret).digest('hex');
      if (computedHash !== swapContract.hashlock) {
        throw new Error('Invalid secret for hashlock');
      }

      // Check if timelock hasn't expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime > swapContract.timelock) {
        throw new Error('Swap has expired');
      }

      const participantAccount = await this.server.loadAccount(participantKeypair.publicKey());

      // Create redeem transaction
      const transaction = new TransactionBuilder(participantAccount, {
        fee: '10000',
        networkPassphrase: this.network,
      })
        .addOperation(
          Operation.manageData({
            name: `redeem_${swapContract.swapId}`,
            value: Buffer.from(secret, 'utf8'),
          })
        )
        .addMemo(Memo.text(`REDEEM:${swapContract.swapId}:${secret}`))
        .setTimeout(30)
        .build();

      transaction.sign(participantKeypair);
      const result = await this.server.submitTransaction(transaction);

      return result.hash;
    } catch (error) {
      console.error('Error redeeming Stellar swap:', error);
      throw error;
    }
  }

  // Refund swap after timelock expires
  async refundStellarSwap(
    initiatorKeypair: Keypair,
    swapContract: StellarSwapContract
  ): Promise<string> {
    try {
      const currentTime = Math.floor(Date.now() / 1000);
      if (currentTime <= swapContract.timelock) {
        throw new Error('Timelock has not expired yet');
      }

      const initiatorAccount = await this.server.loadAccount(initiatorKeypair.publicKey());

      const transaction = new TransactionBuilder(initiatorAccount, {
        fee: '10000',
        networkPassphrase: this.network,
      })
        .addOperation(
          Operation.manageData({
            name: `refund_${swapContract.swapId}`,
            value: Buffer.from('refunded', 'utf8'),
          })
        )
        .addMemo(Memo.text(`REFUND:${swapContract.swapId}`))
        .setTimeout(30)
        .build();

      transaction.sign(initiatorKeypair);
      const result = await this.server.submitTransaction(transaction);

      return result.hash;
    } catch (error) {
      console.error('Error refunding Stellar swap:', error);
      throw error;
    }
  }

  // Monitor Stellar transactions for swap events
  async monitorSwapEvents(swapId: string): Promise<StellarTransaction[]> {
    try {
      const transactions = await this.server
        .transactions()
        .order('desc')
        .limit(100)
        .call();

      const swapEvents = transactions.records.filter((tx: StellarTransaction) => {
        return tx.memo && tx.memo.includes(swapId);
      });

      return swapEvents;
    } catch (error) {
      console.error('Error monitoring swap events:', error);
      throw error;
    }
  }
}

// Cross-chain bridge for Stellar ↔ Ethereum swaps
export class StellarEthereumBridge {
  private stellarSwap: StellarAtomicSwap;
  private bridgeAddress: string;

  constructor(bridgeAddress: string) {
    this.stellarSwap = new StellarAtomicSwap();
    this.bridgeAddress = bridgeAddress;
  }

  // Step 1: Stellar → Ethereum tip
  async initiateStellarToEthereumTip(
    stellarSender: Keypair,
    ethereumRecipient: string,
    amount: string,
    stellarAsset: Asset,
    targetEthereumToken: string,
    tipJarId: string
  ): Promise<{ swapContract: StellarSwapContract; secret: string; hashlock: string }> {
    try {
      // Generate hashlock pair
      const { secret, hashlock } = this.stellarSwap.generateHashlockPair();

      // Lock funds on Stellar
      const swapContract = await this.stellarSwap.createStellarSwap(
        stellarSender,
        this.bridgeAddress, // Bridge acts as participant
        amount,
        stellarAsset,
        hashlock,
        24 // 24 hour timelock
      );

      // Store swap details for bridge monitoring
      await this.storeCrossChainSwap({
        ...swapContract,
        targetChain: 'ethereum',
        targetAddress: ethereumRecipient,
        targetToken: targetEthereumToken,
        tipJarId,
        type: 'stellar_to_ethereum',
      });

      return { swapContract, secret, hashlock };
    } catch (error) {
      console.error('Error initiating Stellar to Ethereum tip:', error);
      throw error;
    }
  }

  // Step 2: Bridge completes Ethereum side via Fusion+
  async completeStellarToEthereumTip(
    swapId: string,
    secret: string
  ): Promise<{ fusionOrderHash: string; stellarRedeemTx: string }> {
    try {
      // Get swap details
      const swapDetails = await this.getCrossChainSwap(swapId);

      // Create Fusion+ order on Ethereum
      const fusionResult = await this.createFusionOrderForTip(
        swapDetails.targetToken,
        swapDetails.targetAddress,
        swapDetails.amount,
        swapDetails.tipJarId
      );

      // Redeem on Stellar to complete the atomic swap
      const bridgeKeypair = Keypair.fromSecret(process.env.STELLAR_BRIDGE_SECRET!);
      const stellarRedeemTx = await this.stellarSwap.redeemStellarSwap(
        bridgeKeypair,
        swapDetails,
        secret
      );

      return {
        fusionOrderHash: fusionResult.orderHash,
        stellarRedeemTx,
      };
    } catch (error) {
      console.error('Error completing Stellar to Ethereum tip:', error);
      throw error;
    }
  }

  // Integration with 1inch Fusion+ for the Ethereum side
  private async createFusionOrderForTip(
    fromToken: string,
    toAddress: string,
    amount: string,
    tipJarId: string
  ): Promise<{ orderHash: string }> {
    // This would integrate with your existing 1inch Fusion+ implementation
    // Import from your oneinch utils
    const { createTipSwap } = await import('./oneinch');

    const result = await createTipSwap(
      1, // Ethereum mainnet
      fromToken,
      amount,
      toAddress,
      'USDC'
    );

    if (!result.success || !result.orderHash) {
      throw new Error(`Fusion+ order failed: ${result.error}`);
    }

    return { orderHash: result.orderHash };
  }

  // Storage methods (implement with your preferred database)
  private async storeCrossChainSwap(swapData: CrossChainSwapData): Promise<void> {
    // Store in database/IPFS for bridge monitoring
    console.log('Storing cross-chain swap:', swapData);
    // Implementation depends on your storage solution
  }

  private async getCrossChainSwap(swapId: string): Promise<CrossChainSwapData> {
    // Retrieve from database
    console.log('Retrieving cross-chain swap:', swapId);
    // Implementation depends on your storage solution
    return {} as CrossChainSwapData;
  }
}

// Helper functions for Stellar asset management
export const StellarAssets = {
  XLM: Asset.native(),
  USDC: new Asset('USDC', 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'), // Testnet USDC
  // Add more assets as needed
};

// Export for use in tip page
export default StellarEthereumBridge;
