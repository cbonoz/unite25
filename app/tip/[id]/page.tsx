'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AppLayout from '../../components/AppLayout';
import TipJarHeader from '../../components/TipJarHeader';
import WalletConnection from '../../components/WalletConnection';
import ChainSelector from '../../components/ChainSelector';
import TipForm from '../../components/TipForm';
import SuccessScreen from '../../components/SuccessScreen';
import ErrorScreen from '../../components/ErrorScreen';
import { useWallet } from '../../hooks/useWallet';
import { useFusionSwap } from '../../hooks/useFusionSwap';
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
import { createOptimizedSwap, initiateStellarBridge } from '../../utils/fusion';

interface TipJarData {
  id: string;
  name: string;
  description?: string;
  walletAddress: string;
  recipientToken: 'USDC' | 'DAI' | 'USDT' | 'XLM' | 'STELLAR_USDC';
  chains: ChainId[];
  createdAt: string;
  isActive: boolean;
  customMessage?: string;
  successMessage?: string;
  customization?: {
    primaryColor?: string;
    backgroundColor?: string;
    logoUrl?: string;
  };
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

  // Fusion+ hook for swaps
  const {
    isInitialized: isFusionReady,
    isLoading: isFusionLoading,
    error: fusionError,
    executeETHToUSDC,
    executeSwap,
    supportsFusionPlus,
  } = useFusionSwap();

  // State
  const [tipJarData, setTipJarData] = useState<TipJarData | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainId>(SUPPORTED_CHAINS.ETHEREUM);
  const [availableTokens, setAvailableTokens] = useState<Token[]>([]);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tokenSearchQuery, setTokenSearchQuery] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [usdValue, setUsdValue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true); // Start as true since we need to load tip jar data
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState<'tipjar' | 'transaction' | null>(null);
  const [stellarTips, setStellarTips] = useState<StellarTipResult[]>([]);
  const [crossChainTips, setCrossChainTips] = useState<CrossChainTipResult[]>([]);
  const [orderHash, setOrderHash] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // New state for USDC balance feature
  const [usdcBalance, setUsdcBalance] = useState<string>('0');
  const [useExistingUSDC, setUseExistingUSDC] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  // Load tip jar data from Storacha using CID
  useEffect(() => {
    const loadTipJarData = async () => {
      if (!tipJarId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        console.log(`🔍 Loading tip jar data for ID: ${tipJarId}`);

        // Validate CID format
        if (!isValidCID(tipJarId)) {
          console.error(`❌ Invalid CID format: ${tipJarId}`);
          setErrorMessage('Invalid tip jar ID format');
          setErrorType('tipjar');
          return;
        }

        console.log(`✅ CID format is valid: ${tipJarId}`);

        // Retrieve tip jar configuration from Storacha
        console.log(`📡 Retrieving tip jar config from Storacha...`);
        const config = await retrieveTipJarConfig(tipJarId);

        if (!config) {
          console.error(`❌ Tip jar config not found for CID: ${tipJarId}`);
          setErrorMessage('Tip jar not found');
          setErrorType('tipjar');
          return;
        }

        console.log(`✅ Successfully loaded tip jar config:`, config);

        // Convert the config to the expected TipJarData format
        const tipJarData: TipJarData = {
          id: config.id,
          name: config.name,
          description: config.description,
          walletAddress: config.walletAddress,
          recipientToken: config.recipientToken,
          chains: config.chains as ChainId[],
          createdAt: config.createdAt,
          isActive: config.isActive,
          customMessage: config.customMessage,
          successMessage: config.successMessage,
          customization: config.customization,
        };

        console.log(`✅ Converted to TipJarData format:`, tipJarData);
        setTipJarData(tipJarData);
      } catch (error) {
        console.error('❌ Error loading tip jar:', error);
        setErrorMessage('Failed to load tip jar configuration');
        setErrorType('tipjar');
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
        setIsLoadingTokens(false); // Stop loading state since we're waiting for tip jar data
        return; // Wait for tip jar data to load first
      }

      // Skip token loading for Stellar - handle via StellarWallet component
      if (selectedChain === 'stellar') {
        setAvailableTokens([]);
        setSelectedToken(null);
        setTokenSearchQuery('');
        setIsLoadingTokens(false);
        return;
      }

      try {
        setIsLoadingTokens(true);
        console.log(`🪙 Loading popular tokens for chain ${selectedChain}...`);
        const tokens = await getPopularTokens(selectedChain);
        console.log(`✅ Loaded ${tokens.length} tokens:`, tokens.map(t => t.symbol));

        // For cross-chain scenarios, we want to show available tokens on the source chain
        // but let Fusion+ handle the conversion to the recipient token
        const filteredTokens = tokens;//.slice(0, 10); // Limit to top 10

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
      } catch (error) {
        console.error('❌ Error loading tokens:', error);
        setErrorMessage('Failed to load tokens');
        setErrorType('transaction');
        setAvailableTokens([]);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    loadTokens(); // Always try to load tokens when dependencies change
  }, [selectedChain, tipJarData]); // Removed selectedToken from dependencies to prevent infinite loop

  // Auto-select first token when tokens are loaded
  useEffect(() => {
    if (availableTokens.length > 0 && !selectedToken) {
      // Prioritize ETH or native token, then USDC, then first token
      const ethToken = availableTokens.find(t => t.symbol.toUpperCase() === 'ETH');
      const usdcToken = availableTokens.find(t => t.symbol.toUpperCase() === 'USDC');
      const tokenToSelect = ethToken || usdcToken || availableTokens[0];

      setSelectedToken(tokenToSelect);
      setTokenSearchQuery(tokenToSelect.symbol);
      console.log(`🎯 Auto-selected token: ${tokenToSelect.symbol}`);
    }
  }, [availableTokens, selectedToken]);

    // Calculate USD value when amount or token changes
  useEffect(() => {
    const calculateValue = async () => {
      if (selectedToken && tipAmount && parseFloat(tipAmount) > 0) {
        try {
          const price = await getTokenPrice(selectedChain, selectedToken.address);
          const value = parseFloat(tipAmount) * price;

          console.log('💰 USD value calculation:', {
            tipAmount,
            tokenSymbol: selectedToken.symbol,
            tokenAddress: selectedToken.address,
            priceFromAPI: price,
            calculatedValue: value
          });

          setUsdValue(value);
        } catch (error) {
          console.error('❌ Error calculating USD value:', error);
          setUsdValue(0);
        }
      } else {
        setUsdValue(0);
      }
    };

    calculateValue();
  }, [selectedToken, tipAmount, selectedChain]);

  // Check USDC balance when wallet connects and target is USDC
  const checkUSDCBalance = async () => {
    if (!address || !tipJarData) return;

    // Only check if the recipient wants USDC and we have a way to convert to it
    const targetIsUSDC = tipJarData.recipientToken === 'USDC' || 
                        tipJarData.recipientToken === 'STELLAR_USDC';
    
    if (!targetIsUSDC) return;

    try {
      setIsCheckingBalance(true);
      
      // Get USDC address for current chain
      const stablecoins = await getPopularTokens(selectedChain);
      const usdcToken = stablecoins.find(token => 
        token.symbol.toUpperCase() === 'USDC'
      );
      
      if (!usdcToken) {
        console.log('USDC not available on this chain');
        setUsdcBalance('0');
        return;
      }

      // Get wallet balances
      const balances = await getWalletBalances(selectedChain as number, address);
      const usdcBalanceData = balances.find(balance => 
        balance.tokenAddress.toLowerCase() === usdcToken.address.toLowerCase()
      );

      if (usdcBalanceData) {
        // Convert from wei to human readable
        const balance = (parseInt(usdcBalanceData.balance) / Math.pow(10, usdcToken.decimals)).toString();
        setUsdcBalance(balance);
        console.log(`💰 USDC Balance: ${balance} USDC`);
      } else {
        setUsdcBalance('0');
      }
    } catch (error) {
      console.error('❌ Error checking USDC balance:', error);
      setUsdcBalance('0');
    } finally {
      setIsCheckingBalance(false);
    }
  };

  // Check USDC balance when relevant dependencies change
  useEffect(() => {
    checkUSDCBalance();
  }, [address, tipJarData, selectedChain]);

  // Handle direct USDC transfer (skip swap)
  const handleDirectUSDCTransfer = async () => {
    if (!tipJarData || !address || !signer) {
      setErrorMessage('Wallet not connected');
      setErrorType('transaction');
      return;
    }

    try {
      setTxStatus('pending');
      setErrorMessage('');
      setIsProcessing(true);

      console.log('💰 Using existing USDC balance for direct transfer');

      // Get USDC token for current chain
      const stablecoins = await getPopularTokens(selectedChain);
      const usdcToken = stablecoins.find(token => 
        token.symbol.toUpperCase() === 'USDC'
      );

      if (!usdcToken) {
        throw new Error('USDC not available on this chain');
      }

      // Convert tip amount to wei
      const amountInWei = (parseFloat(tipAmount) * Math.pow(10, usdcToken.decimals)).toString();

      // Check if this is a Stellar recipient (cross-chain scenario)
      const isStellarRecipient = tipJarData.recipientToken === 'XLM' ||
                                tipJarData.recipientToken === 'STELLAR_USDC' ||
                                (tipJarData.walletAddress.startsWith('G') && tipJarData.walletAddress.length === 56);

      if (isStellarRecipient) {
        // For Stellar recipients, transfer USDC to our bridge address and then bridge
        console.log('🌉 Stellar recipient detected, transferring USDC and initiating bridge...');
        
        // Create ERC20 transfer using ethers
        const { ethers } = await import('ethers');
        const usdcContract = new ethers.Contract(
          usdcToken.address,
          ['function transfer(address to, uint256 amount) returns (bool)'],
          signer
        );

        const txResponse = await usdcContract.transfer(address, amountInWei); // Transfer to self for now (bridge would handle)
        const receipt = await txResponse.wait();

        if (!receipt) {
          throw new Error('Transaction failed');
        }

        console.log('✅ USDC transfer completed:', receipt.hash);

        // Initiate Stellar bridge
        try {
          const bridgeResponse = await fetch('/api/stellar/initiate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ethereumTxHash: receipt.hash,
              sourceChain: selectedChain,
              stellarRecipient: tipJarData.walletAddress,
              targetAsset: tipJarData.recipientToken === 'XLM' ? 'XLM' : 'USDC',
            }),
          });

          if (bridgeResponse.ok) {
            const bridgeResult = await bridgeResponse.json();
            console.log('✅ Stellar bridge initiated:', bridgeResult);

            setCrossChainTips(prev => [...prev, {
              txHash: receipt.hash,
              stellarAddress: tipJarData.walletAddress,
              amount: tipAmount,
              token: 'USDC'
            }]);
          }
        } catch (bridgeError) {
          console.error('❌ Stellar bridge failed:', bridgeError);
          setErrorMessage(`USDC transfer successful but Stellar bridge pending. Bridge error: ${bridgeError instanceof Error ? bridgeError.message : 'Unknown error'}`);
        }
      } else {
        // For same-chain recipients, direct USDC transfer
        console.log('💸 Direct USDC transfer to recipient');
        
        const { ethers } = await import('ethers');
        const usdcContract = new ethers.Contract(
          usdcToken.address,
          ['function transfer(address to, uint256 amount) returns (bool)'],
          signer
        );

        const txResponse = await usdcContract.transfer(tipJarData.walletAddress, amountInWei);
        const receipt = await txResponse.wait();

        if (!receipt) {
          throw new Error('Transaction failed');
        }

        console.log('✅ Direct USDC transfer completed:', receipt.hash);
        setOrderHash(receipt.hash);
      }

      setTxStatus('success');
    } catch (error) {
      console.error('❌ Error with direct USDC transfer:', error);
      setTxStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      setErrorType('transaction');
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  const handleSendTip = async () => {
    if (!selectedToken || !tipAmount || !tipJarData || !address) {
      setErrorMessage('Please connect wallet and enter tip amount');
      setErrorType('transaction');
      return;
    }

    // Handle "Use existing USDC" option
    if (useExistingUSDC) {
      return handleDirectUSDCTransfer();
    }

    // Check if wallet is on correct chain (only for EVM chains)
    if (typeof selectedChain === 'number' && walletChainId !== selectedChain) {
      try {
        await switchNetwork(selectedChain);
      } catch {
        setErrorMessage('Please switch to the correct network');
        setErrorType('transaction');
        return;
      }
    }

    // Handle Stellar chain separately
    if (selectedChain === 'stellar') {
      setErrorMessage('Stellar transactions coming soon! Please select an EVM chain for now.');
      setErrorType('transaction');
      return;
    }

    try {
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

      // Check if this is a Stellar recipient (cross-chain scenario)
      const isStellarRecipient = tipJarData.recipientToken === 'XLM' ||
                                tipJarData.recipientToken === 'STELLAR_USDC' ||
                                (tipJarData.walletAddress.startsWith('G') && tipJarData.walletAddress.length === 56);

      // Check if this is a cross-chain scenario (including EVM to EVM)
      const isEVMCrossChain = !isStellarRecipient && 
                             !tipJarData.chains.includes(selectedChain) &&
                             typeof selectedChain === 'number';

      const isCrossChain = isStellarRecipient || isEVMCrossChain;

      // Determine the target chain for the recipient
      let targetChain: ChainId = selectedChain; // Default to same chain
      if (isStellarRecipient) {
        targetChain = 'stellar' as ChainId;
      } else if (isEVMCrossChain) {
        // Find the first EVM chain the recipient supports
        const recipientEVMChain = tipJarData.chains.find(chain => typeof chain === 'number');
        targetChain = recipientEVMChain || SUPPORTED_CHAINS.ETHEREUM;
      }

      console.log('🔍 Cross-chain analysis:', {
        selectedChain,
        targetChain,
        recipientChains: tipJarData.chains,
        isStellarRecipient,
        isEVMCrossChain,
        isCrossChain
      });

      // For same-chain swaps, find the target token (skip for Stellar since we handle it differently)
      let targetToken: Token | undefined;
      if (!isStellarRecipient) {
        const stablecoins = await getPopularTokens(targetChain);
        targetToken = stablecoins.find(token =>
          token.symbol.toUpperCase() === tipJarData.recipientToken.toUpperCase()
        );

        // If recipient token not available on target chain OR it's cross-chain, use USDC as intermediate
        if (!targetToken || isCrossChain) {
          targetToken = stablecoins.find(token => token.symbol.toUpperCase() === 'USDC');
          if (isEVMCrossChain) {
            console.log(`🌉 Cross-chain EVM transfer detected (${selectedChain} → ${targetChain}), using USDC as bridge token`);
          } else {
            console.log(`ℹ️ ${tipJarData.recipientToken} not available on ${targetChain}, using USDC as intermediate token`);
          }
        }
      } else {
        // For Stellar recipients, always use USDC as bridge token from current chain
        const stablecoins = await getPopularTokens(selectedChain);
        targetToken = stablecoins.find(token => token.symbol.toUpperCase() === 'USDC');
        console.log(`🌉 Stellar recipient detected, using USDC as bridge token`);
      }

      if (!targetToken) {
        throw new Error(`Unable to find USDC on this chain. Please try a different network.`);
      }

      // Special case: If user already has the target token and it's going to Stellar, skip swap
      if (selectedToken.address.toLowerCase() === targetToken.address.toLowerCase() && isStellarRecipient) {
        console.log('🎯 User already has target token, skipping swap and going directly to Stellar bridge');
        
        // Transfer USDC to user's wallet (preparing for bridge) - or directly initiate bridge
        const { ethers } = await import('ethers');
        const usdcContract = new ethers.Contract(
          selectedToken.address,
          ['function transfer(address to, uint256 amount) returns (bool)'],
          signer
        );

        // For demo purposes, we'll just simulate the "transfer" by sending to self
        // In production, this would transfer to bridge contract
        const txResponse = await usdcContract.transfer(address, amountInWei);
        const receipt = await txResponse.wait();

        if (!receipt) {
          throw new Error('Transaction failed');
        }

        console.log('✅ USDC prepared for bridge:', receipt.hash);

        // Initiate Stellar bridge directly
        try {
          const bridgeResponse = await fetch('/api/stellar/initiate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ethereumTxHash: receipt.hash,
              sourceChain: selectedChain,
              amount: tipAmount, // Add the missing amount parameter
              stellarRecipient: tipJarData.walletAddress,
              targetAsset: tipJarData.recipientToken === 'XLM' ? 'XLM' : 'USDC',
            }),
          });

          if (bridgeResponse.ok) {
            const bridgeResult = await bridgeResponse.json();
            console.log('✅ Stellar bridge initiated:', bridgeResult);

            setCrossChainTips(prev => [...prev, {
              txHash: receipt.hash,
              stellarAddress: tipJarData.walletAddress,
              amount: tipAmount,
              token: selectedToken.symbol
            }]);

            // Set appropriate success message based on simulation vs real bridge
            if (bridgeResult.status === 'simulated') {
              setOrderHash(receipt.hash);
              setErrorMessage(`USDC transfer completed! Stellar bridge simulated in development mode. In production, ${tipAmount} USDC would be bridged to ${tipJarData.walletAddress} on Stellar.`);
            }
            
            setTxStatus('success');
            return; // Exit early, no need for swap
          } else {
            const errorData = await bridgeResponse.json().catch(() => ({}));
            console.error('Bridge response error:', errorData);
            throw new Error(errorData.error || 'Bridge initiation failed');
          }
        } catch (bridgeError) {
          console.error('❌ Stellar bridge failed:', bridgeError);
          setTxStatus('success'); // Still show success for the transfer
          setOrderHash(receipt.hash);
          setErrorMessage(`Token transfer successful but Stellar bridge pending. Bridge error: ${bridgeError instanceof Error ? bridgeError.message : 'Unknown error'}`);
          return;
        }
      }

      console.log('💱 Creating optimized swap transaction...', {
        fromToken: selectedToken.address,
        toToken: targetToken.address,
        amount: amountInWei,
        userAddress: address,
        receiverAddress: isCrossChain ? address : tipJarData.walletAddress, // For cross-chain, keep tokens in sender's wallet first
        isCrossChain,
        targetChain
      });

      // Use optimized swap (Fusion+ or regular) with cross-chain support
      const swapOrder = await createOptimizedSwap(
        selectedChain,
        selectedToken.address,
        targetToken.address,
        amountInWei,
        address!,
        isCrossChain ? address! : tipJarData.walletAddress, // For cross-chain, keep USDC in sender's wallet first
        isCrossChain
      );

      console.log('✅ Swap transaction prepared:', swapOrder);

      if (!swapOrder.success || !signer) {
        const errorMsg = 'error' in swapOrder ? swapOrder.error : 'Unable to prepare transaction or get signer';
        throw new Error(errorMsg || 'Swap preparation failed');
      }

      // Handle different response formats - extract transaction data
      let transaction: Record<string, unknown> | null = null;
      if ('transaction' in swapOrder) {
        transaction = swapOrder.transaction as Record<string, unknown>;
      } else if ('order' in swapOrder && swapOrder.order) {
        transaction = (swapOrder.order as Record<string, unknown>).transaction as Record<string, unknown>;
      }

      if (!transaction) {
        throw new Error('No transaction data received from swap API');
      }

      // Execute the transaction using the wallet signer
      console.log('📝 Sending transaction...', {
        to: transaction.to,
        value: transaction.value,
        data: transaction.data,
      });

      const txResponse = await signer.sendTransaction({
        to: transaction.to as string,
        value: (transaction.value as string) || '0',
        data: transaction.data as string,
        gasLimit: (transaction.gas as string) || '500000',
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
        // If this was a cross-chain transaction, initiate the appropriate bridge
        if (isStellarRecipient) {
          try {
            console.log('🌉 Initiating Stellar bridge after successful swap...');

            const bridgeResult = await initiateStellarBridge(
              receipt.hash,
              selectedChain as number,
              tipAmount, // Use original tip amount for display
              tipJarData.walletAddress,
              tipJarData.recipientToken === 'XLM' ? 'XLM' : 'USDC'
            );

            console.log('✅ Stellar bridge initiated:', bridgeResult);

            // Add to cross-chain tips for display
            setCrossChainTips(prev => [...prev, {
              txHash: receipt.hash,
              stellarAddress: tipJarData.walletAddress,
              amount: tipAmount,
              token: selectedToken.symbol
            }]);

            setTxStatus('success');
          } catch (bridgeError) {
            console.error('❌ Stellar bridge failed:', bridgeError);
            // Still show success for the swap, but show bridge warning
            setTxStatus('success');
            setErrorMessage(`Swap successful but Stellar bridge pending. Bridge error: ${bridgeError instanceof Error ? bridgeError.message : 'Unknown error'}`);
          }
        } else if (isEVMCrossChain) {
          try {
            console.log(`🌉 Initiating EVM cross-chain bridge (${selectedChain} → ${targetChain})...`);

            // For now, we'll implement a simple notification that cross-chain bridging is needed
            // In production, this would integrate with bridges like LayerZero, Wormhole, or Circle CCTP
            console.log('⚠️ EVM cross-chain bridging not yet implemented. Showing success for same-chain swap.');
            
            // For demo purposes, we'll show this as a pending bridge
            setTxStatus('success');
            setErrorMessage(`Swap successful on ${selectedChain}. Cross-chain bridge to ${targetChain} is pending implementation. Recipient will need to claim USDC on ${selectedChain} for now.`);
            
            // Add to order hash for tracking
            setOrderHash(receipt.hash);
          } catch (bridgeError) {
            console.error('❌ EVM bridge failed:', bridgeError);
            setTxStatus('success');
            setErrorMessage(`Swap successful but cross-chain bridge pending. Bridge error: ${bridgeError instanceof Error ? bridgeError.message : 'Unknown error'}`);
          }
        } else {
          // Same-chain transaction, just show success
          setTxStatus('success');
          setOrderHash(receipt.hash);
        }
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('❌ Error sending tip:', error);
      setTxStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      setErrorType('transaction');
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

  const handleGoBack = () => {
    // Reset all transaction-related state
    setTxStatus('idle');
    setErrorMessage('');
    setErrorType(null);
    setTipAmount('');
    setUsdValue(0);
    setOrderHash('');
    setStellarTips([]);
    setCrossChainTips([]);
    setIsProcessing(false);
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

  if (errorMessage && errorType === 'tipjar') {
    return (
      <AppLayout>
        <ErrorScreen
          errorMessage={errorMessage}
          errorType={errorType}
          onGoHome={() => window.location.href = '/'}
          onGoBack={handleGoBack}
        />
      </AppLayout>
    );
  }

  if (!tipJarData && !isLoading) {
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

  // Show transaction error overlay if it's a transaction error (not tipjar error)
  if (errorMessage && errorType === 'transaction') {
    // Continue to render the form but show error in the TipForm component
  }

  // Don't render main content if we don't have tipJarData yet AND we're in initial loading state
  if (!tipJarData && isLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  // If no tipJarData and not loading, something went wrong
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
        <TipJarHeader
          name={tipJarData.name}
          recipientToken={tipJarData.recipientToken}
          walletAddress={tipJarData.walletAddress}
          customMessage={tipJarData.customMessage}
        />

        {/* Tip Form */}
        <div className="space-y-6">
          {/* Traditional EVM Tips */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
          {txStatus === 'success' ? (
            <SuccessScreen
              recipientToken={tipJarData.recipientToken}
              orderHash={orderHash}
              stellarTips={stellarTips}
              crossChainTips={crossChainTips}
              successMessage={tipJarData.successMessage}
              onSendAnother={handleGoBack}
            />
          ) : txStatus === 'pending' || isProcessing ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Transaction in Progress
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Awaiting confirmation....
              </p>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>• Preparing swap transaction</p>
                <p>• Waiting for blockchain confirmation</p>
                {tipJarData.recipientToken === 'XLM' || tipJarData.recipientToken === 'STELLAR_USDC' ? (
                  <p>• Initiating cross-chain bridge to Stellar</p>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              {/* Wallet Connection */}
              <WalletConnection
                isConnected={isConnected}
                isConnecting={isConnecting}
                address={address || undefined}
                walletChainId={walletChainId || undefined}
                selectedChain={selectedChain}
                shouldShowSwitchNetwork={
                  walletChainId !== selectedChain &&
                  typeof selectedChain === 'number' &&
                  !tipJarData.chains.some(chain => typeof chain === 'string')
                }
                onConnect={connectWallet}
                onSwitchNetwork={switchNetwork}
              />

              {/* Chain Selection */}
              <ChainSelector
                chains={tipJarData.chains}
                selectedChain={selectedChain}
                chainNames={chainNames}
                onChainSelect={setSelectedChain}
              />

              {/* Tip Form */}
              <TipForm
                availableTokens={availableTokens}
                selectedToken={selectedToken}
                tipAmount={tipAmount}
                usdValue={usdValue}
                recipientToken={tipJarData.recipientToken}
                txStatus={txStatus}
                errorMessage={errorMessage}
                isConnected={isConnected}
                isLoading={isLoading}
                isProcessing={isProcessing}
                isLoadingTokens={isLoadingTokens}
                walletChainId={walletChainId || undefined}
                selectedChain={selectedChain}
                onTokenSelect={setSelectedToken}
                onAmountChange={setTipAmount}
                onSendTip={handleSendTip}
                usdcBalance={usdcBalance}
                useExistingUSDC={useExistingUSDC}
                isCheckingBalance={isCheckingBalance}
                onToggleUseExistingUSDC={setUseExistingUSDC}
                recipientChains={tipJarData.chains}
                recipientWalletAddress={tipJarData.walletAddress}
              />
            </>
          )}
        </div>
        </div>
      </div>
    </AppLayout>
  );
}
