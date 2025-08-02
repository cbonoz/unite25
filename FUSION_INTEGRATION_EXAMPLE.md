// Example of how to use the new Fusion client - replace handleSendTip with this approach

import { useFusionSwap } from '../../hooks/useFusionSwap';

// In your component:
const {
  isInitialized: isFusionReady,
  isLoading: isFusionLoading,
  error: fusionError,
  executeETHToUSDC,
  executeSwap,
  supportsFusionPlus,
} = useFusionSwap();

// Replace your existing handleSendTip function with this:
const handleSendTipWithFusion = async () => {
  if (!selectedToken || !tipAmount || !tipJarData || !address) {
    setErrorMessage('Please connect wallet and enter tip amount');
    setErrorType('transaction');
    return;
  }

  // Check if wallet is on correct chain
  if (typeof selectedChain === 'number' && walletChainId !== selectedChain) {
    try {
      await switchNetwork(selectedChain);
    } catch {
      setErrorMessage('Please switch to the correct network');
      setErrorType('transaction');
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
      recipient: tipJarData.walletAddress,
      recipientToken: tipJarData.recipientToken
    });

    // Convert tip amount to wei/smallest unit
    const amountInWei = (parseFloat(tipAmount) * Math.pow(10, selectedToken.decimals)).toString();

    // Check if this is a Stellar recipient (cross-chain scenario)
    const isStellarRecipient = tipJarData.recipientToken === 'XLM' ||
                              tipJarData.recipientToken === 'STELLAR_USDC' ||
                              (tipJarData.walletAddress.startsWith('G') && tipJarData.walletAddress.length === 56);

    let result;

    if (selectedToken.symbol.toUpperCase() === 'ETH' &&
        (tipJarData.recipientToken === 'USDC' || isStellarRecipient)) {
      // Use the special ETH -> USDC flow
      console.log('🌉 Using ETH -> USDC flow via Fusion+');

      result = await executeETHToUSDC({
        ethAmount: amountInWei,
        chainId: selectedChain as number,
        recipientAddress: tipJarData.walletAddress,
        finalToken: isStellarRecipient ? 'XLM' : 'USDC',
      });
    } else {
      // Regular token swap
      console.log('💱 Using regular swap via Fusion+');

      // Get target token
      const stablecoins = await getPopularTokens(selectedChain);
      let targetToken = stablecoins.find(token =>
        token.symbol.toUpperCase() === tipJarData.recipientToken.toUpperCase()
      );

      // If recipient token not available, use USDC as intermediate
      if (!targetToken || isStellarRecipient) {
        targetToken = stablecoins.find(token => token.symbol.toUpperCase() === 'USDC');
      }

      if (!targetToken) {
        throw new Error(`Target token ${tipJarData.recipientToken} not available on this chain`);
      }

      result = await executeSwap({
        fromTokenAddress: selectedToken.address,
        toTokenAddress: targetToken.address,
        amount: amountInWei,
        chainId: selectedChain as number,
        receiverAddress: tipJarData.walletAddress,
      });
    }

    console.log('✅ Swap result:', result);

    if (result.success && result.txHash) {
      setOrderHash(result.txHash);

      // Handle cross-chain to Stellar if needed
      if (isStellarRecipient && !result.stellarBridge) {
        try {
          console.log('🌉 Initiating additional Stellar bridge...');

          const bridgeResponse = await fetch('/api/stellar/initiate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ethereumTxHash: result.txHash,
              sourceChain: selectedChain,
              stellarRecipient: tipJarData.walletAddress,
              targetAsset: tipJarData.recipientToken === 'XLM' ? 'XLM' : 'USDC',
            }),
          });

          if (bridgeResponse.ok) {
            const bridgeResult = await bridgeResponse.json();
            console.log('✅ Stellar bridge initiated:', bridgeResult);

            setCrossChainTips(prev => [...prev, {
              txHash: result.txHash!,
              stellarAddress: tipJarData.walletAddress,
              amount: tipAmount,
              token: selectedToken.symbol
            }]);
          }
        } catch (bridgeError) {
          console.error('❌ Stellar bridge failed:', bridgeError);
          setErrorMessage(`Swap successful but Stellar bridge pending. Bridge error: ${bridgeError instanceof Error ? bridgeError.message : 'Unknown error'}`);
        }
      }

      setTxStatus('success');

      // Show success message with method used
      if (result.method === 'fusion-plus') {
        console.log('✅ Transaction completed via Fusion+ (gasless)');
      } else {
        console.log('✅ Transaction completed via regular swap');
      }
    } else {
      throw new Error(result.error || 'Transaction failed');
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

// Summary of key differences:
// 1. No more direct API calls to 1inch - everything goes through your backend
// 2. Uses the useFusionSwap hook which handles MetaMask integration properly
// 3. Supports both ETH->USDC and any token swaps
// 4. Automatically detects Fusion+ vs regular swaps
// 5. No CORS issues since all API calls are backend-routed
