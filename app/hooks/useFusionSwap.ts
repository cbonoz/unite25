// React hook for using Fusion+ with MetaMask
import { useState, useCallback, useEffect } from 'react';
import { fusionClient, initializeFusionClient, supportsFusionPlus } from '../utils/fusion-client';

interface SwapResult {
  success: boolean;
  txHash?: string;
  orderHash?: string;
  method?: string;
  error?: string;
}

export function useFusionSwap() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the client
  const initialize = useCallback(async () => {
    if (isInitialized) return true;

    try {
      setIsLoading(true);
      setError(null);

      await initializeFusionClient();
      setIsInitialized(true);

      console.log('✅ Fusion client ready');
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize';
      setError(message);
      console.error('❌ Fusion initialization failed:', message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Get quote for a swap
  const getQuote = useCallback(async (params: {
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    chainId: number;
    receiverAddress?: string;
  }) => {
    if (!isInitialized) {
      throw new Error('Client not initialized');
    }

    try {
      setError(null);

      const walletAddress = await fusionClient.getWalletAddress();
      const quote = await fusionClient.getQuote({
        ...params,
        walletAddress,
      });

      return quote;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get quote';
      setError(message);
      throw err;
    }
  }, [isInitialized]);

  // Execute a swap
  const executeSwap = useCallback(async (params: {
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    chainId: number;
    receiverAddress?: string;
  }): Promise<SwapResult> => {
    if (!isInitialized) {
      throw new Error('Client not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await fusionClient.executeSwap(params);

      console.log('✅ Swap completed:', result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Swap failed';
      setError(message);
      console.error('❌ Swap failed:', message);

      return {
        success: false,
        error: message,
      };
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Execute ETH to USDC swap (for tip jar)
  const executeETHToUSDC = useCallback(async (params: {
    ethAmount: string;
    chainId: number;
    recipientAddress: string;
    finalToken?: 'USDC' | 'XLM';
  }): Promise<SwapResult> => {
    if (!isInitialized) {
      throw new Error('Client not initialized');
    }

    try {
      setIsLoading(true);
      setError(null);

      const result = await fusionClient.executeETHToUSDCSwap(params);

      console.log('✅ ETH to USDC swap completed:', result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ETH to USDC swap failed';
      setError(message);
      console.error('❌ ETH to USDC swap failed:', message);

      return {
        success: false,
        error: message,
      };
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Auto-initialize when MetaMask is available
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum && !isInitialized) {
      // Auto-initialize when component mounts and MetaMask is available
      initialize();
    }
  }, [initialize, isInitialized]);

  return {
    // State
    isInitialized,
    isLoading,
    error,

    // Methods
    initialize,
    getQuote,
    executeSwap,
    executeETHToUSDC,

    // Utilities
    supportsFusionPlus,
  };
}
