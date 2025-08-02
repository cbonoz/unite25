import { useState, useEffect } from 'react';
import { fetchSpotPriceQuote, formatQuoteDisplay, COMMON_TOKEN_ADDRESSES, type SpotPriceQuote, type QuoteError } from '../utils/quotes';
import { getCrossChainQuote, isCrossChainSwapRequired, type CrossChainQuote, type CrossChainError } from '../utils/crosschain';
import { type Token } from '../utils/oneinch';

interface QuoteDisplayProps {
  selectedToken: Token | null;
  recipientToken: string;
  tipAmount: string;
  chainId: number;
  availableTokens?: Token[];
}

export default function QuoteDisplay({
  selectedToken,
  recipientToken,
  tipAmount,
  chainId,
  availableTokens = []
}: QuoteDisplayProps) {
  const [quote, setQuote] = useState<SpotPriceQuote | null>(null);
  const [crossChainQuote, setCrossChainQuote] = useState<CrossChainQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isCrossChain, setIsCrossChain] = useState(false);

  // Get destination token address based on recipient token preference
  // Use the actual token addresses from the loaded tokens instead of hardcoded addresses
  const getDestinationTokenAddress = (recipientToken: string): string | null => {
    // For cross-chain scenarios (XLM, STELLAR_USDC), we don't need destination addresses
    if (recipientToken === 'XLM' || recipientToken === 'STELLAR_USDC') {
      return null;
    }

    // Try to find the token in the available tokens first (most reliable)
    switch (recipientToken) {
      case 'USDC':
        const usdcToken = availableTokens.find((token: Token) =>
          token.symbol === 'USDC' || token.symbol === 'USD Coin'
        );
        if (usdcToken) return usdcToken.address;
        break;

      case 'DAI':
        const daiToken = availableTokens.find((token: Token) =>
          token.symbol === 'DAI' || token.name?.includes('Dai')
        );
        if (daiToken) return daiToken.address;
        break;

      case 'USDT':
        const usdtToken = availableTokens.find((token: Token) =>
          token.symbol === 'USDT' || token.symbol === 'Tether'
        );
        if (usdtToken) return usdtToken.address;
        break;
    }

    // Fallback to hardcoded addresses as last resort
    if (chainId === 1) {
      // Ethereum Mainnet
      const tokens = COMMON_TOKEN_ADDRESSES[1];
      switch (recipientToken) {
        case 'USDC': return tokens.USDC;
        case 'DAI': return tokens.DAI;
        case 'USDT': return tokens.USDT;
        default: return tokens.USDC;
      }
    } else if (chainId === 8453) {
      // Base
      const tokens = COMMON_TOKEN_ADDRESSES[8453];
      switch (recipientToken) {
        case 'USDC': return tokens.USDC;
        case 'DAI': return tokens.DAI;
        case 'USDT': return tokens.USDC; // Fallback to USDC
        default: return tokens.USDC;
      }
    } else if (chainId === 137) {
      // Polygon
      const tokens = COMMON_TOKEN_ADDRESSES[137];
      switch (recipientToken) {
        case 'USDC': return tokens.USDC;
        case 'DAI': return tokens.DAI;
        case 'USDT': return tokens.USDT;
        default: return tokens.USDC;
      }
    }

    return null; // Unsupported chain
  };

  // Format cross-chain amount display
  const formatCrossChainAmount = (crossChainQuote: CrossChainQuote, recipientToken: string): string => {
    if (recipientToken === 'XLM') {
      const xlmAmount = parseFloat(crossChainQuote.dstAmount) / Math.pow(10, 7); // XLM has 7 decimals
      return xlmAmount.toFixed(4);
    } else if (recipientToken === 'STELLAR_USDC') {
      const usdcAmount = parseFloat(crossChainQuote.dstAmount) / Math.pow(10, 6); // USDC has 6 decimals
      return usdcAmount.toFixed(4);
    } else {
      // Generic formatting
      const amount = parseFloat(crossChainQuote.dstAmount) / Math.pow(10, 18);
      return amount.toFixed(4);
    }
  };

  // Get proper decimals for destination token
  const getDestinationTokenDecimals = (recipientToken: string): number => {
    switch (recipientToken) {
      case 'USDC':
      case 'USDT':
        return 6;
      case 'DAI':
      case 'ETH':
        return 18;
      case 'XLM':
        return 7;
      default:
        return 18; // Default to 18 decimals
    }
  };

  // Format amount display with proper decimals
  const formatAmountDisplay = (amount: string, decimals: number): string => {
    try {
      const normalizedAmount = parseFloat(amount) / Math.pow(10, decimals);
      console.log('🔢 Amount formatting:', {
        rawAmount: amount,
        decimals,
        normalizedAmount,
        formatted: normalizedAmount.toFixed(4)
      });
      return normalizedAmount.toFixed(4);
    } catch (error) {
      console.error('Error formatting amount:', error);
      return '0.0000';
    }
  };

  // Fetch quote from 1inch API (regular or cross-chain)
  const fetchQuote = async () => {
    if (!selectedToken || !tipAmount || parseFloat(tipAmount) <= 0) {
      setQuote(null);
      setCrossChainQuote(null);
      setError(null);
      return;
    }

    // Check if this requires cross-chain swap
    const requiresCrossChain = isCrossChainSwapRequired(chainId, recipientToken);
    setIsCrossChain(requiresCrossChain);

    setIsLoading(true);
    setError(null);

    try {
      // Convert amount to wei (multiply by 10^decimals)
      const amountInWei = (parseFloat(tipAmount) * Math.pow(10, selectedToken.decimals)).toString();

      if (requiresCrossChain) {
        // Use cross-chain quote for Stellar destinations
        console.log('🌉 Fetching cross-chain quote for', recipientToken);

        // For Stellar destinations, we determine the destination token based on recipient preference
        const dstToken = recipientToken === 'XLM' ? 'native' : 'USDC';

        const result = await getCrossChainQuote(
          chainId,
          selectedToken.address,
          dstToken, // Use appropriate destination token for Stellar
          amountInWei,
          recipientToken
        );

        if ('error' in result) {
          console.error('❌ Cross-chain quote error:', result.error, result.description);
          setError(null); // Don't show error in UI
          setCrossChainQuote(null);
        } else {
          setCrossChainQuote(result);
          setError(null);
          setLastUpdate(new Date());
        }
        setQuote(null); // Clear regular quote
      } else {
        // Use regular 1inch quote for same-chain swaps
        const dstTokenAddress = getDestinationTokenAddress(recipientToken);
        if (!dstTokenAddress) {
          console.error('❌ Destination token not supported:', recipientToken, 'on chain', chainId);
          setError(null); // Don't show error in UI
          return;
        }

        const result = await fetchSpotPriceQuote(
          chainId,
          selectedToken.address,
          dstTokenAddress,
          amountInWei
        );

        if ('error' in result) {
          console.error('❌ Regular quote error:', result.error, result.description);
          setError(null); // Don't show error in UI
          setQuote(null);
        } else {
          setQuote(result);
          setError(null);
          setLastUpdate(new Date());
        }
        setCrossChainQuote(null); // Clear cross-chain quote
      }
    } catch (err) {
      console.error('❌ Error fetching quote:', err);
      setError(null); // Don't show error in UI, just log it
      setQuote(null);
      setCrossChainQuote(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch quote when dependencies change
  useEffect(() => {
    const timeoutId = setTimeout(fetchQuote, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [selectedToken, recipientToken, tipAmount, chainId]);

  // Auto-refresh quote every 30 seconds
  useEffect(() => {
    if (!quote && !crossChainQuote) return;

    const intervalId = setInterval(fetchQuote, 30000);
    return () => clearInterval(intervalId);
  }, [quote, crossChainQuote]);

  if (!selectedToken || !tipAmount || parseFloat(tipAmount) <= 0) {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-green-700 dark:text-green-300 text-sm font-medium">
            {isCrossChain ? '🌉 Cross-Chain Quote:' : '📊 Live 1inch Quote:'}
          </span>
          {isLoading && (
            <div className="ml-2 animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
          )}
        </div>
        {lastUpdate && (
          <span className="text-xs text-green-600 dark:text-green-400">
            {lastUpdate.toLocaleTimeString()}
          </span>
        )}
      </div>

      {error && (
        <p className="text-red-600 dark:text-red-400 text-sm mt-1">
          ⚠️ {error}
        </p>
      )}

      {/* Show "No quote available" when no quote and not loading */}
      {!quote && !crossChainQuote && !isLoading && !error && (
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          📊 No quote available
        </p>
      )}

      {/* Regular 1inch Quote Display */}
      {quote && !isLoading && !isCrossChain && (
        <div className="mt-2 space-y-1">
          <p className="text-green-800 dark:text-green-200 text-sm">
            <strong>Rate:</strong> {formatQuoteDisplay(
              quote,
              selectedToken.symbol,
              recipientToken,
              selectedToken.decimals,
              getDestinationTokenDecimals(recipientToken)
            )}
          </p>
          <p className="text-green-700 dark:text-green-300 text-xs">
            You&apos;ll receive ≈ {formatAmountDisplay(quote.dstAmount, getDestinationTokenDecimals(recipientToken))} {recipientToken}
          </p>
          {quote.gasFee && parseFloat(quote.gasFee) > 0 && (
            <p className="text-green-600 dark:text-green-400 text-xs">
              Est. gas: {(parseFloat(quote.gasFee) / Math.pow(10, 18)).toFixed(6)} ETH
            </p>
          )}
        </div>
      )}

      {/* Cross-Chain Quote Display */}
      {crossChainQuote && !isLoading && isCrossChain && (
        <div className="mt-2 space-y-1">
          <p className="text-green-800 dark:text-green-200 text-sm">
            <strong>Cross-Chain Route:</strong> {crossChainQuote.route.type}
          </p>
          <p className="text-green-700 dark:text-green-300 text-xs">
            You&apos;ll receive ≈ {formatCrossChainAmount(crossChainQuote, recipientToken)} {recipientToken}
          </p>
          <div className="text-green-600 dark:text-green-400 text-xs space-y-1">
            <p><strong>Steps:</strong></p>
            {crossChainQuote.route.steps.map((step, index) => (
              <p key={index} className="ml-2">
                {index + 1}. {step.chain}: {step.action}
              </p>
            ))}
          </div>
          {crossChainQuote.estimatedGas && parseFloat(crossChainQuote.estimatedGas) > 0 && (
            <p className="text-green-600 dark:text-green-400 text-xs">
              Est. gas: {parseFloat(crossChainQuote.estimatedGas).toFixed(6)} ETH
            </p>
          )}
        </div>
      )}

      <button
        onClick={fetchQuote}
        disabled={isLoading}
        className="mt-2 text-xs text-green-700 dark:text-green-300 hover:text-green-800 dark:hover:text-green-200 disabled:opacity-50"
      >
        🔄 Refresh Quote
      </button>
    </div>
  );
}
