'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '../../components/AppLayout';
import StellarWallet from '../../components/StellarWallet';
import { useWallet } from '../../hooks/useWallet';
import { retrieveTipJarConfig, isValidCID } from '@/app/utils/storage';
import {
  getPopularTokens,
  getTokenPrice,
  createFusionOrder,
  getFusionOrderStatus,
  SUPPORTED_CHAINS,
  type Token,
  type ChainId
} from '../../utils/oneinch';

interface TipJarData {
  name: string;
  walletAddress: string;
  preferredStablecoin: 'USDC' | 'DAI' | 'USDT';
  chains: ChainId[];
  customMessage?: string;
}

interface StellarTipResult {
  swapId: string;
  stellarTxId: string;
  amount: string;
  asset: string;
}

export default function TipPage() {
  const params = useParams();
  const tipJarId = params?.id as string;
  const {
    address,
    chainId: walletChainId,
    isConnected,
    isConnecting,
    connectWallet,
    switchNetwork,
    signer
  } = useWallet();

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
  const [stellarTips, setStellarTips] = useState<StellarTipResult[]>([]);
  const [showStellarOption, setShowStellarOption] = useState(false);
  const [orderHash, setOrderHash] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Handler for stellar tips
  const handleStellarTip = (result: StellarTipResult) => {
    setStellarTips(prev => [...prev, result]);
    setTxStatus('success');
  };

  // Load tip jar data from Storacha using CID
  useEffect(() => {
    const loadTipJarData = async () => {
      if (!tipJarId) return;

      try {
        setIsLoading(true);
        console.log(`🔍 Loading tip jar data for ID: ${tipJarId}`);

        // Validate CID format
        if (!isValidCID(tipJarId)) {
          console.error(`❌ Invalid CID format: ${tipJarId}`);
          setErrorMessage('Invalid tip jar ID format');
          return;
        }

        console.log(`✅ CID format is valid: ${tipJarId}`);

        // Retrieve tip jar configuration from Storacha
        console.log(`📡 Retrieving tip jar config from Storacha...`);
        const config = await retrieveTipJarConfig(tipJarId);

        if (!config) {
          console.error(`❌ Tip jar config not found for CID: ${tipJarId}`);
          setErrorMessage('Tip jar not found');
          return;
        }

        console.log(`✅ Successfully loaded tip jar config:`, config);

        // Convert the config to the expected TipJarData format
        const tipJarData: TipJarData = {
          name: config.name,
          walletAddress: config.walletAddress,
          preferredStablecoin: config.preferredStablecoin,
          chains: config.chains as ChainId[],
          customMessage: config.customMessage,
        };

        console.log(`✅ Converted to TipJarData format:`, tipJarData);
        setTipJarData(tipJarData);
      } catch (error) {
        console.error('❌ Error loading tip jar:', error);
        setErrorMessage('Failed to load tip jar configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadTipJarData();
  }, [tipJarId]);

  // Load popular tokens for selected chain
  useEffect(() => {
    const loadTokens = async () => {
      if (!tipJarData) {
        console.log('⏳ Waiting for tip jar data before loading tokens...');
        return; // Wait for tip jar data to load first
      }

      try {
        console.log(`🪙 Loading popular tokens for chain ${selectedChain}...`);
        const tokens = await getPopularTokens(selectedChain);
        console.log(`✅ Loaded ${tokens.length} tokens:`, tokens.map(t => t.symbol));
        setAvailableTokens(tokens.slice(0, 10)); // Limit to top 10
        if (tokens.length > 0 && !selectedToken) {
          setSelectedToken(tokens[0]);
          console.log(`🎯 Auto-selected first token: ${tokens[0].symbol}`);
        }
      } catch (error) {
        console.error('❌ Error loading tokens:', error);
        console.log('🔄 Using fallback tokens due to API error');
        // Don't prevent the page from rendering - just log the error
      }
    };

    loadTokens(); // Always try to load tokens when dependencies change
  }, [selectedChain, tipJarData]); // Removed selectedToken from dependencies to prevent infinite loop

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
    if (!selectedToken || !tipAmount || !tipJarData || !address) {
      setErrorMessage('Please connect wallet and enter tip amount');
      return;
    }

    // Check if wallet is on correct chain
    if (walletChainId !== selectedChain) {
      try {
        await switchNetwork(selectedChain);
      } catch (error) {
        setErrorMessage('Please switch to the correct network');
        return;
      }
    }

    try {
      setIsLoading(true);
      setTxStatus('pending');
      setErrorMessage('');
      setIsProcessing(true);

      console.log('🚀 Starting Fusion+ tip process...', {
        selectedToken: selectedToken.symbol,
        tipAmount,
        chain: selectedChain,
        recipient: tipJarData.walletAddress
      });

      // Convert tip amount to wei/smallest unit
      const amountInWei = (parseFloat(tipAmount) * Math.pow(10, selectedToken.decimals)).toString();

      // Get the stablecoin address for the target chain
      const stablecoins = await getPopularTokens(selectedChain);
      const targetStablecoin = stablecoins.find(token =>
        token.symbol === tipJarData.preferredStablecoin
      );

      if (!targetStablecoin) {
        throw new Error(`${tipJarData.preferredStablecoin} not available on this chain`);
      }

      console.log('💱 Creating swap transaction...', {
        fromToken: selectedToken.address,
        toToken: targetStablecoin.address,
        amount: amountInWei,
        userAddress: address,
        receiverAddress: tipJarData.walletAddress
      });

      // Create swap transaction via 1inch API
      const swapOrder = await createFusionOrder(
        selectedChain,
        selectedToken.address,
        targetStablecoin.address,
        amountInWei,
        address,
        tipJarData.walletAddress
      );

      console.log('✅ Swap transaction prepared:', swapOrder);

      if (!swapOrder.transaction || !signer) {
        throw new Error('Unable to prepare transaction or get signer');
      }

      // Execute the transaction using the wallet signer
      console.log('📝 Sending transaction...', {
        to: swapOrder.transaction.to,
        value: swapOrder.transaction.value,
        data: swapOrder.transaction.data,
      });

      const txResponse = await signer.sendTransaction({
        to: swapOrder.transaction.to,
        value: swapOrder.transaction.value || '0',
        data: swapOrder.transaction.data,
        gasLimit: swapOrder.transaction.gas || '500000',
      });

      console.log('⏳ Transaction sent, waiting for confirmation...', txResponse.hash);
      setOrderHash(txResponse.hash);

      // Wait for transaction confirmation
      const receipt = await txResponse.wait();

      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }

      console.log('✅ Transaction confirmed!', {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      });

      if (receipt.status === 1) {
        setTxStatus('success');
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('❌ Error sending tip:', error);
      setTxStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const checkOrderStatus = async (hash: string) => {
    try {
      const status = await getFusionOrderStatus(selectedChain, hash);
      console.log('📊 Order status:', status);

      if (status.status === 'filled') {
        console.log('✅ Order completed successfully!');
      } else if (status.status === 'pending') {
        // Check again in 10 seconds
        setTimeout(() => checkOrderStatus(hash), 10000);
      }
    } catch (error) {
      console.error('❌ Error checking order status:', error);
    }
  };

  const chainNames = {
    [SUPPORTED_CHAINS.ETHEREUM]: 'Ethereum',
    [SUPPORTED_CHAINS.BASE]: 'Base',
    [SUPPORTED_CHAINS.OPTIMISM]: 'Optimism',
    [SUPPORTED_CHAINS.POLYGON]: 'Polygon',
    [SUPPORTED_CHAINS.ARBITRUM]: 'Arbitrum',
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading tip jar...</p>
        </div>
      </AppLayout>
    );
  }

  if (errorMessage) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Tip Jar Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {errorMessage}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!tipJarData) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-gray-500 text-6xl mb-4">🤔</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Tip Jar Not Available
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Unable to load tip jar configuration
          </p>
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
            {tipJarData.customMessage || `Send tips in any token, I'll receive ${tipJarData.preferredStablecoin}`}
          </p>
        </div>

        {/* Tip Form */}
        <div className="space-y-6">
          {/* Fusion+ Extension Banner */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl p-4 text-center">
            <h2 className="text-xl font-bold mb-2">🌟 NEW: Stellar Cross-Chain Tips</h2>
            <p className="text-sm opacity-90">
              First-ever Fusion+ extension enabling Stellar → Ethereum atomic swaps with hashlock/timelock
            </p>
            <button
              onClick={() => setShowStellarOption(!showStellarOption)}
              className="mt-2 px-4 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors"
            >
              {showStellarOption ? 'Hide Stellar Option' : 'Try Stellar Tips →'}
            </button>
          </div>

          {/* Stellar Option */}
          {showStellarOption && (
            <StellarWallet
              onTipSent={handleStellarTip}
              recipientAddress={tipJarData.walletAddress}
              preferredStablecoin={tipJarData.preferredStablecoin}
              tipJarId={tipJarId}
            />
          )}

          {/* Traditional EVM Tips */}
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

              {/* Order Details */}
              {orderHash && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                    🔗 Fusion+ Order Details
                  </h3>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    <p><strong>Order Hash:</strong></p>
                    <p className="font-mono text-xs break-all">{orderHash}</p>
                  </div>
                </div>
              )}

              {/* Show Stellar tip details if it was a cross-chain tip */}
              {stellarTips.length > 0 && (
                <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                    🌉 Cross-Chain Swap Details
                  </h3>
                  {stellarTips.map((tip, index) => (
                    <div key={index} className="text-sm text-purple-700 dark:text-purple-300">
                      <p><strong>Amount:</strong> {tip.amount} {tip.asset}</p>
                      <p><strong>Swap ID:</strong> {tip.swapId}</p>
                      <p><strong>Stellar Tx:</strong> {tip.stellarTxId}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => {
                  setTxStatus('idle');
                  setTipAmount('');
                  setUsdValue(0);
                  setOrderHash('');
                }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Send Another Tip
              </button>
            </div>
          ) : (
            <>
              {/* Wallet Connection */}
              {!isConnected ? (
                <div className="mb-6 text-center">
                  <div className="text-4xl mb-4">🔗</div>
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                    Connect Your Wallet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Connect your wallet to send tips via 1inch Fusion+
                  </p>
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        ✅ Wallet Connected
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-mono">
                        {address?.slice(0, 6)}...{address?.slice(-4)}
                      </p>
                    </div>
                    {walletChainId !== selectedChain && (
                      <button
                        onClick={() => switchNetwork(selectedChain)}
                        className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                      >
                        Switch Network
                      </button>
                    )}
                  </div>
                </div>
              )}

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
                {availableTokens.length > 0 ? (
                  <select
                    value={selectedToken?.address || ''}
                    onChange={(e) => {
                      const token = availableTokens.find(t => t.address === e.target.value);
                      setSelectedToken(token || null);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    {availableTokens.map((token) => (
                      <option key={token.address} value={token.address}>
                        {token.symbol} - {token.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-4 py-3 border border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-600 rounded-lg text-orange-700 dark:text-orange-300">
                    <p className="text-sm">
                      ⚠️ Unable to load token list. API may be temporarily unavailable.
                    </p>
                    <p className="text-xs mt-1">
                      You can still send tips using Stellar cross-chain option above.
                    </p>
                  </div>
                )}
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
                disabled={
                  !isConnected ||
                  !selectedToken ||
                  !tipAmount ||
                  parseFloat(tipAmount) <= 0 ||
                  isLoading ||
                  isProcessing ||
                  (walletChainId !== selectedChain)
                }
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!isConnected
                  ? 'Connect Wallet First'
                  : walletChainId !== selectedChain
                  ? 'Switch Network Required'
                  : txStatus === 'pending' || isProcessing
                  ? 'Creating Fusion+ Order...'
                  : 'Send Tip via Fusion+'
                }
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
      </div>
    </AppLayout>
  );
}
