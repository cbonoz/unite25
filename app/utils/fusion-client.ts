// Frontend Fusion+ SDK implementation using MetaMask
// This handles the actual wallet interactions while API calls go through backend

import { FusionSDK, NetworkEnum } from '@1inch/fusion-sdk';
import { ethers } from 'ethers';
import { type Token } from './oneinch';

// Initialize SDK with proper network mapping
function getNetworkEnum(chainId: number): NetworkEnum {
  switch (chainId) {
    case 1:
      return NetworkEnum.ETHEREUM;
    case 137:
      return NetworkEnum.POLYGON;
    case 42161:
      return NetworkEnum.ARBITRUM;
    case 10:
      return NetworkEnum.OPTIMISM;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}. Supported: 1 (Ethereum), 137 (Polygon), 42161 (Arbitrum), 10 (Optimism)`);
  }
}

// Create Web3 provider connector for MetaMask
function createWeb3Connector(provider: ethers.BrowserProvider) {
  return {
    signTypedData: async (walletAddress: string, typedData: any) => {
      const signer = await provider.getSigner();
      return await signer.signTypedData(typedData.domain, typedData.types, typedData.message);
    },
    address: async () => {
      const signer = await provider.getSigner();
      return await signer.getAddress();
    }
  };
}

// Frontend Fusion+ client using MetaMask and backend APIs
// This handles wallet interactions while keeping API calls on the backend


// Check if chain supports Fusion+
export function supportsFusionPlus(chainId: number): boolean {
  return [1, 137, 42161, 10].includes(chainId); // Removed Base (8453) as it's not in the SDK
}

// Main client class for handling swaps
export class FusionClientSDK {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  async initialize() {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not available');
    }

    try {
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      console.log('✅ Fusion client initialized');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Fusion client:', error);
      throw error;
    }
  }

  async getWalletAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('Client not initialized');
    }
    return await this.signer.getAddress();
  }

  // Get quote via backend (avoids CORS)
  async getQuote(params: {
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    walletAddress: string;
    chainId: number;
    receiverAddress?: string;
  }) {
    try {
      console.log('📋 Getting quote via backend...');

      const response = await fetch('/api/fusion/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get quote');
      }

      const quote = await response.json();
      console.log('✅ Quote received from backend');
      return quote;
    } catch (error) {
      console.error('❌ Error getting quote:', error);
      throw error;
    }
  }

  // Execute swap using backend API and MetaMask
  async executeSwap(params: {
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    chainId: number;
    receiverAddress?: string;
  }) {
    if (!this.signer) {
      throw new Error('Client not initialized');
    }

    try {
      console.log('🔄 Executing swap...');

      const walletAddress = await this.getWalletAddress();

      // Step 1: Get order/transaction from backend
      const orderResponse = await fetch('/api/fusion/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chainId: params.chainId,
          srcToken: params.fromTokenAddress,
          dstToken: params.toTokenAddress,
          srcAmount: params.amount,
          walletAddress,
          receiverAddress: params.receiverAddress,
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();
      console.log('✅ Order/transaction prepared:', orderData.method);

      // Step 2: Execute transaction with MetaMask
      if (orderData.transaction) {
        console.log('🔄 Sending transaction via MetaMask...');

        const tx = await this.signer.sendTransaction({
          to: orderData.transaction.to,
          data: orderData.transaction.data,
          value: orderData.transaction.value || '0',
          gasLimit: orderData.transaction.gas,
        });

        console.log('✅ Transaction sent:', tx.hash);

        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed:', receipt?.hash);

        return {
          success: true,
          txHash: receipt?.hash,
          orderHash: orderData.orderHash,
          method: orderData.method || 'swap',
          blockNumber: receipt?.blockNumber,
        };
      }

      throw new Error('No transaction data received from backend');

    } catch (error) {
      console.error('❌ Error executing swap:', error);
      throw error;
    }
  }

  // Execute ETH -> USDC -> Recipient flow
  async executeETHToUSDCSwap(params: {
    ethAmount: string;
    chainId: number;
    recipientAddress: string;
    finalToken?: 'USDC' | 'XLM';
  }) {
    try {
      console.log('🌉 Executing ETH -> USDC -> Recipient flow...');

      // ETH address (native token)
      const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

      // Get USDC address for this chain
      const usdcAddress = await this.getUSDCAddress(params.chainId);

      // Step 1: Execute ETH -> USDC swap
      const swapResult = await this.executeSwap({
        fromTokenAddress: ETH_ADDRESS,
        toTokenAddress: usdcAddress,
        amount: params.ethAmount,
        chainId: params.chainId,
        receiverAddress: params.recipientAddress,
      });

      console.log('✅ ETH -> USDC swap completed:', swapResult);

      // Step 2: If target is XLM, initiate Stellar bridge
      if (params.finalToken === 'XLM' && swapResult.txHash) {
        try {
          console.log('🌉 Initiating Stellar bridge...');

          const bridgeResponse = await fetch('/api/stellar/initiate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ethereumTxHash: swapResult.txHash,
              sourceChain: params.chainId,
              stellarRecipient: params.recipientAddress,
              targetAsset: 'XLM',
            }),
          });

          if (bridgeResponse.ok) {
            const bridgeResult = await bridgeResponse.json();
            console.log('✅ Stellar bridge initiated:', bridgeResult);

            return {
              ...swapResult,
              stellarBridge: bridgeResult,
              finalDestination: 'stellar',
            };
          } else {
            console.warn('⚠️ Stellar bridge failed, but swap completed');
          }
        } catch (bridgeError) {
          console.warn('⚠️ Stellar bridge error:', bridgeError);
        }
      }

      return {
        ...swapResult,
        finalDestination: params.finalToken === 'XLM' ? 'stellar' : 'ethereum',
      };

    } catch (error) {
      console.error('❌ Error in ETH -> USDC flow:', error);
      throw error;
    }
  }

  // Get USDC address for a given chain
  private async getUSDCAddress(chainId: number): Promise<string> {
    try {
      // Try to get from tokens API first
      const response = await fetch(`/api/tokens/${chainId}`);
      if (response.ok) {
        const tokens = await response.json();
        const usdc = tokens.find((token: Token) =>
          token.symbol === 'USDC' ||
          token.name?.toLowerCase().includes('usd coin')
        );
        if (usdc) {
          return usdc.address;
        }
      }
    } catch (error) {
      console.warn('Failed to get USDC from API, using fallback');
    }

    // Fallback to hardcoded addresses
    const usdcAddresses: Record<number, string> = {
      1: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',   // Ethereum
      137: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // Polygon
      42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum
      10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',  // Optimism
    };

    const address = usdcAddresses[chainId];
    if (!address) {
      throw new Error(`USDC not available on chain ${chainId}`);
    }

    return address;
  }
}

// Export singleton instance
export const fusionClient = new FusionClientSDK();

// Helper function to initialize and use
export async function initializeFusionClient() {
  await fusionClient.initialize();
  return fusionClient;
}
