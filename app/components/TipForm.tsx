import TokenAutocomplete from './TokenAutocomplete';
import QuoteDisplay from './QuoteDisplay';
import { type Token } from '../utils/oneinch';
import { siteConfig } from '../siteConfig';

interface TipFormProps {
  availableTokens: Token[];
  selectedToken: Token | null;
  tipAmount: string;
  usdValue: number;
  recipientToken: string;
  txStatus: 'idle' | 'pending' | 'success' | 'error';
  errorMessage: string;
  isConnected: boolean;
  isLoading: boolean;
  isProcessing: boolean;
  isLoadingTokens?: boolean;
  walletChainId?: number;
  selectedChain: number | string;
  onTokenSelect: (token: Token | null) => void;
  onAmountChange: (amount: string) => void;
  onSendTip: () => void;
  // New props for USDC balance feature
  usdcBalance?: string;
  useExistingUSDC?: boolean;
  isCheckingBalance?: boolean;
  onToggleUseExistingUSDC?: (use: boolean) => void;
  // New props for cross-chain detection
  recipientChains?: Array<number | string>;
  recipientWalletAddress?: string;
}

export default function TipForm({
  availableTokens,
  selectedToken,
  tipAmount,
  usdValue,
  recipientToken,
  txStatus,
  errorMessage,
  isConnected,
  isLoading,
  isProcessing,
  isLoadingTokens = false,
  walletChainId,
  selectedChain,
  onTokenSelect,
  onAmountChange,
  onSendTip,
  // New props for USDC balance feature
  usdcBalance = '0',
  useExistingUSDC = false,
  isCheckingBalance = false,
  onToggleUseExistingUSDC,
  // New props for cross-chain detection
  recipientChains = [],
  recipientWalletAddress = ''
}: TipFormProps) {
  // Cross-chain detection logic
  const isStellarRecipient = recipientToken === 'XLM' ||
                           recipientToken === 'STELLAR_USDC' ||
                           (recipientWalletAddress.startsWith('G') && recipientWalletAddress.length === 56);

  const isEVMCrossChain = !isStellarRecipient &&
                         !recipientChains.includes(selectedChain) &&
                         typeof selectedChain === 'number';

  const isCrossChain = isStellarRecipient || isEVMCrossChain;

  // Find target chain for cross-chain scenarios
  const targetChain = isStellarRecipient
    ? 'Stellar'
    : isEVMCrossChain
    ? getChainName(recipientChains.find(chain => typeof chain === 'number') || 1)
    : '';

  function getChainName(chainId: number | string): string {
    const chainNames: Record<number, string> = {
      1: 'Ethereum',
      137: 'Polygon',
      8453: 'Base',
      10: 'Optimism',
      42161: 'Arbitrum'
    };
    return chainNames[chainId as number] || 'Unknown';
  }

  return (
    <>
      {/* Token Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select Token
        </label>
        {isLoadingTokens ? (
          <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-gray-600 dark:text-gray-400 text-sm">Loading available tokens...</span>
            </div>
          </div>
        ) : availableTokens.length > 0 ? (
          <TokenAutocomplete
            tokens={availableTokens}
            selectedToken={selectedToken}
            onTokenSelect={onTokenSelect}
            placeholder="Search for a token (e.g., ETH, USDC, DAI...)"
          />
        ) : (
          <div className="w-full px-4 py-3 border border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-600 rounded-lg text-orange-700 dark:text-orange-300">
            <p className="text-sm">
              ⚠️ Unable to load token list. API may be temporarily unavailable.
            </p>
            <p className="text-xs mt-1">
              Please try refreshing the page or try again later.
            </p>
          </div>
        )}

        {/* Token count info */}
        {!isLoadingTokens && availableTokens.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {availableTokens.length} tokens available on {typeof selectedChain === 'number' ? 'this network' : 'this network'}
          </p>
        )}

        {/* Cross-chain conversion info */}
        {selectedToken && recipientToken && (
          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {selectedToken.symbol === 'USDC' && isStellarRecipient ? (
                <>⚡ <strong>Direct Bridge:</strong> Your USDC will be bridged directly to Stellar and converted to {recipientToken} (no swap needed!)</>
              ) : isStellarRecipient ? (
                <>🌉 <strong>Cross-Chain Bridge:</strong> Your {selectedToken.symbol} will be swapped to USDC and bridged to Stellar as {recipientToken}</>
              ) : isEVMCrossChain ? (
                <>🌉 <strong>Cross-Chain Transfer:</strong> Your {selectedToken.symbol} will be swapped to USDC on {getChainName(selectedChain)} and bridged to {targetChain}</>
              ) : (
                <>🌉 <strong>Smart Conversion:</strong> Your {selectedToken.symbol} will be automatically converted to {recipientToken} via 1inch Fusion+</>
              )}
            </p>
          </div>
        )}

        {/* USDC Balance Option - show when recipient wants USDC and user has USDC balance */}
        {recipientToken === 'USDC' && parseFloat(usdcBalance) > 0 && isConnected && onToggleUseExistingUSDC && (
          <div className="mt-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <div className="text-green-600 dark:text-green-400 mr-2">💰</div>
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    USDC Balance Available
                  </p>
                  {isCheckingBalance ? (
                    <p className="text-xs text-green-600 dark:text-green-400">Checking balance...</p>
                  ) : (
                    <p className="text-xs text-green-600 dark:text-green-400">
                      You have {parseFloat(usdcBalance).toFixed(2)} USDC
                    </p>
                  )}
                </div>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useExistingUSDC}
                  onChange={(e) => onToggleUseExistingUSDC(e.target.checked)}
                  className="sr-only"
                />
                <div className={`relative w-10 h-5 transition-colors duration-200 ease-in-out rounded-full ${
                  useExistingUSDC ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ease-in-out ${
                    useExistingUSDC ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
                </div>
              </label>
            </div>
            {useExistingUSDC ? (
              <p className="text-xs text-green-700 dark:text-green-300">
                ✅ Will use your existing USDC balance (no swap needed)
              </p>
            ) : (
              <p className="text-xs text-green-700 dark:text-green-300">
                Will swap {selectedToken?.symbol || 'selected token'} → USDC via Fusion+
              </p>
            )}
          </div>
        )}
      </div>

      {/* Amount Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Tip Amount {useExistingUSDC ? '(from your USDC balance)' : ''}
        </label>
        <div className="relative">
          <input
            type="number"
            value={tipAmount}
            onChange={(e) => onAmountChange(e.target.value)}
            placeholder="0.0"
            max={useExistingUSDC ? usdcBalance : undefined}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          <div className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">
            {useExistingUSDC ? 'USDC' : selectedToken?.symbol}
          </div>
        </div>

        {/* Balance warning when using existing USDC */}
        {useExistingUSDC && parseFloat(tipAmount) > parseFloat(usdcBalance) && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            ⚠️ Amount exceeds your USDC balance ({usdcBalance} USDC available)
          </p>
        )}

        {/* Live 1inch Quote */}
        {!useExistingUSDC && (
          <QuoteDisplay
            selectedToken={selectedToken}
            recipientToken={recipientToken}
            tipAmount={tipAmount}
            chainId={typeof selectedChain === 'number' ? selectedChain : 1}
            availableTokens={availableTokens}
          />
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
        onClick={onSendTip}
        disabled={
          !isConnected ||
          !selectedToken ||
          !tipAmount ||
          parseFloat(tipAmount) <= 0 ||
          isLoading ||
          isProcessing ||
          (walletChainId !== selectedChain) ||
          (useExistingUSDC && parseFloat(tipAmount) > parseFloat(usdcBalance))
        }
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!isConnected
          ? 'Connect Wallet First'
          : walletChainId !== selectedChain
          ? 'Switch Network Required'
          : useExistingUSDC && parseFloat(tipAmount) > parseFloat(usdcBalance)
          ? 'Insufficient USDC Balance'
          : txStatus === 'pending' || isProcessing
          ? useExistingUSDC
            ? 'Sending USDC...'
            : selectedToken?.symbol === 'USDC' && isStellarRecipient
            ? 'Bridging to Stellar...'
            : isCrossChain
            ? 'Creating Cross-Chain Transfer...'
            : 'Creating Fusion+ Order...'
          : useExistingUSDC
          ? 'Send USDC Directly'
          : selectedToken?.symbol === 'USDC' && isStellarRecipient
          ? 'Bridge to Stellar'
          : isCrossChain
          ? `Bridge to ${targetChain}`
          : siteConfig.sendPaymentButtonText || 'Send Payment via Fusion+'
        }
      </button>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
          {useExistingUSDC
            ? '💰 Direct USDC Transfer'
            : selectedToken?.symbol === 'USDC' && isStellarRecipient
            ? '🌉 Direct Stellar Bridge'
            : isCrossChain
            ? `🌉 Cross-Chain Bridge to ${targetChain}`
            : '⚡ Powered by 1inch Fusion+'
          }
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          {useExistingUSDC ? (
            <>
              <li>• Uses your existing USDC balance</li>
              <li>• No swap fees required</li>
              <li>• Direct transfer to recipient</li>
              <li>• Instant settlement</li>
            </>
          ) : selectedToken?.symbol === 'USDC' && isStellarRecipient ? (
            <>
              <li>• No swap needed (you have USDC)</li>
              <li>• Direct bridge to Stellar network</li>
              <li>• Automatic conversion to {recipientToken}</li>
              <li>• Settlement within 2-5 minutes</li>
            </>
          ) : isCrossChain ? (
            <>
              <li>• Swap to USDC on {getChainName(selectedChain)}</li>
              <li>• Bridge USDC to {targetChain}</li>
              <li>• Automatic conversion to {recipientToken}</li>
              <li>• Cross-chain settlement within 5-10 minutes</li>
            </>
          ) : (
            <>
              <li>• Gasless swaps for recipients</li>
              <li>• Best price execution</li>
              <li>• MEV protection</li>
              <li>• Automatic conversion to {recipientToken}</li>
            </>
          )}
        </ul>
      </div>
    </>
  );
}
