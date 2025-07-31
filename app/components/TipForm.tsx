import TokenAutocomplete from './TokenAutocomplete';
import { type Token } from '../utils/oneinch';

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
  onSendTip
}: TipFormProps) {
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
              Please try refreshing the page or contact support.
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
              🌉 <strong>Smart Conversion:</strong> Your {selectedToken.symbol} will be automatically converted to {recipientToken} via 1inch Fusion+
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
            onChange={(e) => onAmountChange(e.target.value)}
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
        onClick={onSendTip}
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
          <li>• Automatic conversion to {recipientToken}</li>
        </ul>
      </div>
    </>
  );
}
