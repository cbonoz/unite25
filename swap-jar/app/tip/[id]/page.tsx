'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '../../components/AppLayout';
import {
  getPopularTokens,
  getTokenPrice,
  createTipSwap,
  SUPPORTED_CHAINS,
  type Token,
  type ChainId
} from '../../utils/oneinch';

interface TipJarData {
  name: string;
  walletAddress: string;
  preferredStablecoin: 'USDC' | 'DAI' | 'USDT';
  chains: ChainId[];
}

export default function TipPage() {
  const params = useParams();
  const tipJarId = params?.id as string;

  // State
  const [tipJarData, setTipJarData] = useState<TipJarData | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainId>(SUPPORTED_CHAINS.ETHEREUM);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tipAmount, setTipAmount] = useState('');
  const [usdValue, setUsdValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Mock tip jar data (in real app, fetch from API/database)
  useEffect(() => {
    // Simulate loading tip jar data
    const mockTipJarData: TipJarData = {
      name: tipJarId ? `${tipJarId}'s Tips` : 'Anonymous Tips',
      walletAddress: '0x742d35Cc1aC1d4f4d6c0C2c41C5a9e1B1e7AD0A2',
      preferredStablecoin: 'USDC',
      chains: [SUPPORTED_CHAINS.ETHEREUM, SUPPORTED_CHAINS.BASE, SUPPORTED_CHAINS.OPTIMISM],
    };
    setTipJarData(mockTipJarData);
  }, [tipJarId]);

  // Load popular tokens for selected chain
  useEffect(() => {
    const loadTokens = async () => {
      try {
        setIsLoading(true);
        const tokens = await getPopularTokens(selectedChain);
        setAvailableTokens(tokens.slice(0, 10)); // Limit to top 10
        if (tokens.length > 0 && !selectedToken) {
          setSelectedToken(tokens[0]);
        }
      } catch (error) {
        console.error('Error loading tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTokens();
  }, [selectedChain, selectedToken]);

  // Calculate USD value when amount or token changes
  useEffect(() => {
    const calculateValue = async () => {
      if (selectedToken && tipAmount && parseFloat(tipAmount) > 0) {
        try {
          const price = await getTokenPrice(selectedChain, selectedToken.address);
          const value = parseFloat(tipAmount) * price;
          setUsdValue(value);
        } catch (error) {
          console.error('Error calculating USD value:', error);
          setUsdValue(0);
        }
      } else {
        setUsdValue(0);
      }
    };

    calculateValue();
  }, [selectedToken, tipAmount, selectedChain]);

  const handleSendTip = async () => {
    if (!selectedToken || !tipAmount || !tipJarData) return;

    try {
      setIsLoading(true);
      setTxStatus('pending');
      setErrorMessage('');

      // Convert tip amount to wei/smallest unit
      const amountInWei = (parseFloat(tipAmount) * Math.pow(10, selectedToken.decimals)).toString();

      const result = await createTipSwap(
        selectedChain,
        selectedToken.address,
        amountInWei,
        tipJarData.walletAddress,
        tipJarData.preferredStablecoin
      );

      if (result.success) {
        setTxStatus('success');
      } else {
        setTxStatus('error');
        setErrorMessage(result.error || 'Failed to create tip swap');
      }
    } catch (error) {
      setTxStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const chainNames = {
    [SUPPORTED_CHAINS.ETHEREUM]: 'Ethereum',
    [SUPPORTED_CHAINS.BASE]: 'Base',
    [SUPPORTED_CHAINS.OPTIMISM]: 'Optimism',
    [SUPPORTED_CHAINS.POLYGON]: 'Polygon',
    [SUPPORTED_CHAINS.ARBITRUM]: 'Arbitrum',
  };

  if (!tipJarData) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Tip Jar Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🪙</div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            {tipJarData.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Send tips in any token, I&apos;ll receive {tipJarData.preferredStablecoin}
          </p>
        </div>

        {/* Tip Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {txStatus === 'success' ? (
            <div className="text-center">
              <div className="text-green-500 text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Tip Sent Successfully!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your tip is being processed via 1inch Fusion+. The recipient will receive {tipJarData.preferredStablecoin} shortly.
              </p>
              <button
                onClick={() => {
                  setTxStatus('idle');
                  setTipAmount('');
                  setUsdValue(0);
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send Another Tip
              </button>
            </div>
          ) : (
            <>
              {/* Chain Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Chain
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {tipJarData.chains.map((chainId) => (
                    <button
                      key={chainId}
                      onClick={() => setSelectedChain(chainId)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        selectedChain === chainId
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {chainNames[chainId]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Token Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Token
                </label>
                <select
                  value={selectedToken?.address || ''}
                  onChange={(e) => {
                    const token = availableTokens.find(t => t.address === e.target.value);
                    setSelectedToken(token || null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={isLoading}
                >
                  {availableTokens.map((token) => (
                    <option key={token.address} value={token.address}>
                      {token.symbol} - {token.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tip Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <div className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">
                    {selectedToken?.symbol}
                  </div>
                </div>
                {usdValue > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ≈ ${usdValue.toFixed(2)} USD
                  </p>
                )}
              </div>

              {/* Error Message */}
              {txStatus === 'error' && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400">{errorMessage}</p>
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={handleSendTip}
                disabled={!selectedToken || !tipAmount || parseFloat(tipAmount) <= 0 || isLoading}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {txStatus === 'pending' ? 'Processing...' : 'Send Tip'}
              </button>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                  ⚡ Powered by 1inch Fusion+
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Gasless swaps for recipients</li>
                  <li>• Best price execution</li>
                  <li>• MEV protection</li>
                  <li>• Automatic conversion to {tipJarData.preferredStablecoin}</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
