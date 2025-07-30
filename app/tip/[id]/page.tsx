'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '../../components/AppLayout';
import StellarWallet from '../../components/StellarWallet';
import EthereumToStellar from '../../components/EthereumToStellar';
import { useWallet } from '../../hooks/useWallet';
import { retrieveTipJarConfig, isValidCID } from '@/app/utils/storage';
import {
  getPopularTokens,
  getTokenPrice,
  createFusionOrder,
  getFusionOrderStatus,
  getWalletBalances,
  getTokenAllowance,
  SUPPORTED_CHAINS,
  type Token,
  type ChainId,
  type Balance
} from '../../utils/oneinch';

interface TipJarData {
  name: string;
  walletAddress: string;
  recipientToken: 'USDC' | 'DAI' | 'USDT' | 'XLM' | 'STELLAR_USDC';
  chains: ChainId[];
  customMessage?: string;
}

interface StellarTipResult {
  swapId: string;
  stellarTxId: string;
  amount: string;
  asset: string;
}

interface CrossChainTipResult {
  txHash: string;
  stellarAddress: string;
  amount: string;
  token: string;
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
  const [crossChainTips, setCrossChainTips] = useState<CrossChainTipResult[]>([]);
  const [showStellarOption, setShowStellarOption] = useState(false);
  const [showCrossChainOption, setShowCrossChainOption] = useState(false);
  const [orderHash, setOrderHash] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // New state for enhanced 1inch API integration
  const [userBalances, setUserBalances] = useState<Balance[]>([]);
  const [tokenAllowance, setTokenAllowance] = useState<string>('0');
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Handler for stellar tips
  const handleStellarTip = (result: StellarTipResult) => {
    setStellarTips(prev => [...prev, result]);
    setTxStatus('success');
  };

  // Handler for cross-chain tips (Ethereum → Stellar)
  const handleCrossChainTip = (result: CrossChainTipResult) => {
    setCrossChainTips(prev => [...prev, result]);
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
          recipientToken: config.recipientToken,
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

      // Skip token loading for Stellar - handle via StellarWallet component
      if (selectedChain === 'stellar') {
        setAvailableTokens([]);
        setSelectedToken(null);
        return;
      }

      try {
        console.log(`🪙 Loading popular tokens for chain ${selectedChain}...`);
        const tokens = await getPopularTokens(selectedChain);
        console.log(`✅ Loaded ${tokens.length} tokens:`, tokens.map(t => t.symbol));
        
        // For cross-chain scenarios, we want to show available tokens on the source chain
        // but let Fusion+ handle the conversion to the recipient token
        const filteredTokens = tokens.slice(0, 10); // Limit to top 10
        
        // If recipient wants a specific token and it's not available on this chain,
        // add a note that Fusion+ will handle the conversion
        const recipientToken = tipJarData.recipientToken;
        const hasRecipientToken = filteredTokens.some(t => 
          t.symbol.toUpperCase() === recipientToken.toUpperCase() ||
          (recipientToken === 'STELLAR_USDC' && t.symbol.toUpperCase() === 'USDC')
        );
        
        if (!hasRecipientToken && recipientToken) {
          console.log(`ℹ️ Recipient token ${recipientToken} not available on ${selectedChain}, Fusion+ will handle conversion`);
        }
        
        setAvailableTokens(filteredTokens);
        if (filteredTokens.length > 0 && !selectedToken) {
          setSelectedToken(filteredTokens[0]);
          console.log(`🎯 Auto-selected first token: ${filteredTokens[0].symbol}`);
        }
      } catch (error) {
        console.error('❌ Error loading tokens:', error);
        console.log('🔄 Using fallback tokens due to API error');
        
        // Use fallback tokens even for cross-chain scenarios
        try {
          const fallbackTokens = await getPopularTokens(selectedChain);
          setAvailableTokens(fallbackTokens.slice(0, 5));
          if (fallbackTokens.length > 0 && !selectedToken) {
            setSelectedToken(fallbackTokens[0]);
          }
        } catch (fallbackError) {
          console.error('❌ Even fallback tokens failed:', fallbackError);
          setAvailableTokens([]);
        }
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

  // Load user wallet balances when wallet connects (1inch Balances API)
  useEffect(() => {
    const loadUserBalances = async () => {
      if (!address || !isConnected) {
        setUserBalances([]);
        return;
      }

      // Skip balance loading for Stellar (not supported by 1inch API)
      if (selectedChain === 'stellar') {
        setUserBalances([]);
        return;
      }

      try {
        setIsLoadingBalances(true);
        console.log('💰 Loading user wallet balances...');

        const balances = await getWalletBalances(selectedChain as number, address);
        console.log('✅ User balances loaded:', balances);

        setUserBalances(balances);
      } catch (error) {
        console.error('❌ Error loading user balances:', error);
        setUserBalances([]);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    loadUserBalances();
  }, [address, isConnected, selectedChain]);

  // Check token allowance when token is selected (1inch Web3 API)
  useEffect(() => {
    const checkTokenAllowance = async () => {
      if (!address || !selectedToken || !isConnected) {
        setTokenAllowance('0');
        return;
      }

      try {
        console.log('🔐 Checking token allowance...');

        // For Fusion+, we need to check allowance for the 1inch router
        const INCH_ROUTER = '0x111111125421ca6dc452d289314280a0f8842a65'; // 1inch v5 router

        const allowance = await getTokenAllowance(
          selectedChain,
          selectedToken.address,
          address,
          INCH_ROUTER
        );

        console.log('✅ Token allowance:', allowance);
        setTokenAllowance(allowance);
      } catch (error) {
        console.error('❌ Error checking token allowance:', error);
        setTokenAllowance('0');
      }
    };

    checkTokenAllowance();
  }, [address, selectedToken, selectedChain, isConnected]);

  const handleSendTip = async () => {
    if (!selectedToken || !tipAmount || !tipJarData || !address) {
      setErrorMessage('Please connect wallet and enter tip amount');
      return;
    }

    // Check if wallet is on correct chain (only for EVM chains)
    if (typeof selectedChain === 'number' && walletChainId !== selectedChain) {
      try {
        await switchNetwork(selectedChain);
      } catch (error) {
        setErrorMessage('Please switch to the correct network');
        return;
      }
    }

    // Handle Stellar chain separately
    if (selectedChain === 'stellar') {
      setErrorMessage('Stellar transactions coming soon! Please select an EVM chain for now.');
      return;
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
        recipient: tipJarData.walletAddress,
        recipientToken: tipJarData.recipientToken
      });

      // Convert tip amount to wei/smallest unit
      const amountInWei = (parseFloat(tipAmount) * Math.pow(10, selectedToken.decimals)).toString();

      // For cross-chain scenarios, we'll swap to USDC as intermediate token
      // since USDC is widely available and can be easily converted
      const stablecoins = await getPopularTokens(selectedChain);
      let targetToken = stablecoins.find(token => 
        token.symbol.toUpperCase() === tipJarData.recipientToken.toUpperCase()
      );

      // If recipient token not available on this chain, use USDC as intermediate
      if (!targetToken) {
        targetToken = stablecoins.find(token => token.symbol.toUpperCase() === 'USDC');
        console.log(`ℹ️ ${tipJarData.recipientToken} not available on ${selectedChain}, using USDC as intermediate token`);
      }

      if (!targetToken) {
        throw new Error(`Unable to find suitable intermediate token on this chain`);
      }

      console.log('💱 Creating swap transaction...', {
        fromToken: selectedToken.address,
        toToken: targetToken.address,
        amount: amountInWei,
        userAddress: address,
        receiverAddress: tipJarData.walletAddress
      });

      // Create swap transaction via 1inch API
      const swapOrder = await createFusionOrder(
        selectedChain,
        selectedToken.address,
        targetToken.address,
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

  const chainNames: Record<ChainId, string> = {
    [SUPPORTED_CHAINS.ETHEREUM]: 'Ethereum',
    [SUPPORTED_CHAINS.BASE]: 'Base',
    [SUPPORTED_CHAINS.OPTIMISM]: 'Optimism',
    [SUPPORTED_CHAINS.POLYGON]: 'Polygon',
    [SUPPORTED_CHAINS.ARBITRUM]: 'Arbitrum',
    [SUPPORTED_CHAINS.STELLAR]: 'Stellar',
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
          <div className="flex items-center justify-center gap-2">
            <p className="text-gray-600 dark:text-gray-300">
              {tipJarData.customMessage || `Send tips in any token, I'll receive ${tipJarData.recipientToken}`}
            </p>
            <div className="relative group">
              <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                ℹ️
              </div>
              <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                Recipient: {tipJarData.walletAddress}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 dark:border-t-gray-700"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Tip Form */}
        <div className="space-y-6">
          {/* Traditional EVM Tips */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {txStatus === 'success' ? (
            <div className="text-center">
              <div className="text-green-500 text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                Tip Sent Successfully!
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Your tip is being processed via 1inch Fusion+. The recipient will receive {tipJarData.recipientToken} shortly.
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
                    🌉 Cross-Chain Swap Details (Stellar → Ethereum)
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

              {/* Show cross-chain tip details (Ethereum → Stellar) */}
              {crossChainTips.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    🌉 Cross-Chain Bridge Details (Ethereum → Stellar)
                  </h3>
                  {crossChainTips.map((tip, index) => (
                    <div key={index} className="text-sm text-blue-700 dark:text-blue-300">
                      <p><strong>Amount:</strong> {tip.amount} {tip.token}</p>
                      <p><strong>Ethereum Tx:</strong> {tip.txHash}</p>
                      <p><strong>Stellar Address:</strong> {tip.stellarAddress.slice(0, 8)}...{tip.stellarAddress.slice(-8)}</p>
                      <p className="text-xs mt-1 opacity-75">USDC will arrive on Stellar network within 2-5 minutes</p>
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
                  setStellarTips([]);
                  setCrossChainTips([]);
                  setShowStellarOption(false);
                  setShowCrossChainOption(false);
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
                    {/* Only show switch network for EVM chains, not for cross-chain scenarios */}
                    {walletChainId !== selectedChain && 
                     typeof selectedChain === 'number' && 
                     !tipJarData.chains.some(chain => typeof chain === 'string') && (
                      <button
                        onClick={() => switchNetwork(selectedChain as number)}
                        className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                      >
                        Switch Network
                      </button>
                    )}
                    {/* Show cross-chain info instead of switch network for mixed chains */}
                    {(typeof selectedChain === 'string' || tipJarData.chains.some(chain => typeof chain === 'string')) && (
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        🌉 Cross-chain via Fusion+
                      </div>
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
                      {chainNames[chainId] || `Chain ${chainId}`}
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
                      Please try refreshing the page or contact support.
                    </p>
                  </div>
                )}
                
                {/* Cross-chain conversion info */}
                {selectedToken && tipJarData.recipientToken && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      🌉 <strong>Smart Conversion:</strong> Your {selectedToken.symbol} will be automatically converted to {tipJarData.recipientToken} via 1inch Fusion+
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
                  <li>• Automatic conversion to {tipJarData.recipientToken}</li>
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
