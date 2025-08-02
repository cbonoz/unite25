## CORS Fix - Replace Direct API Calls with Backend Proxy

### Problem:
The current code in `app/tip/[id]/page.tsx` is calling `createOptimizedSwap` from `fusion.ts` which makes direct API calls to 1inch, causing CORS errors.

### Solution:
Replace the current `handleSendTip` function with one that uses the new fusion client that routes through your backend.

### Steps:

1. **Update the imports in your tip page:**
   ```typescript
   // Add this import
   import { useFusionSwap } from '../../hooks/useFusionSwap';

   // You can remove or comment out these that cause CORS:
   // import { createOptimizedSwap, initiateStellarBridge } from '../../utils/fusion';
   ```

2. **Add the Fusion hook after your useWallet hook:**
   ```typescript
   const {
     isInitialized: isFusionReady,
     isLoading: isFusionLoading,
     error: fusionError,
     executeETHToUSDC,
     executeSwap,
     supportsFusionPlus,
   } = useFusionSwap();
   ```

3. **Replace the handleSendTip function with this version:**
   ```typescript
   const handleSendTip = async () => {
     // ... existing validation code stays the same ...

     try {
       setIsLoading(true);
       setTxStatus('pending');
       setErrorMessage('');
       setIsProcessing(true);

       const amountInWei = (parseFloat(tipAmount) * Math.pow(10, selectedToken.decimals)).toString();
       const isStellarRecipient = tipJarData.recipientToken === 'XLM' ||
                                  tipJarData.recipientToken === 'STELLAR_USDC';

       let result;

       // Use the new Fusion client instead of createOptimizedSwap
       if (selectedToken.symbol.toUpperCase() === 'ETH') {
         result = await executeETHToUSDC({
           ethAmount: amountInWei,
           chainId: selectedChain as number,
           recipientAddress: tipJarData.walletAddress,
           finalToken: isStellarRecipient ? 'XLM' : 'USDC',
         });
       } else {
         // Get target token
         const stablecoins = await getPopularTokens(selectedChain);
         const targetToken = stablecoins.find(token =>
           token.symbol.toUpperCase() === 'USDC'
         );

         result = await executeSwap({
           fromTokenAddress: selectedToken.address,
           toTokenAddress: targetToken.address,
           amount: amountInWei,
           chainId: selectedChain as number,
           receiverAddress: tipJarData.walletAddress,
         });
       }

       if (result.success && result.txHash) {
         setOrderHash(result.txHash);
         setTxStatus('success');
       } else {
         throw new Error(result.error || 'Transaction failed');
       }
     } catch (error) {
       // ... existing error handling ...
     }
   };
   ```

### Key Benefits:
- ✅ **No more CORS errors** - All API calls go through your backend
- ✅ **Uses MetaMask directly** - No complex transaction building
- ✅ **Supports Fusion+** - Automatically detects and uses optimal routing
- ✅ **ETH -> USDC flow** - Direct support for your main use case

### Quick Test:
After making these changes, try the ETH -> USDC swap again. You should see:
- No CORS errors in console
- Backend API calls working (check Network tab)
- MetaMask prompts for transaction signing
- Success with transaction hash

The new client will automatically:
- Try Fusion+ first (if supported on that chain)
- Fall back to regular swap if needed
- Handle all API calls through your backend
- Manage MetaMask integration properly
