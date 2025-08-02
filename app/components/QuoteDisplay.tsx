import { useState, useEffect } from 'react';
import { fetchSpotPriceQuote, formatQuoteDisplay, COMMON_TOKEN_ADDRESSES, type SpotPriceQuote, type QuoteError } from '../utils/quotes';
import { getCrossChainQuote, isCrossChainSwapRequired, type CrossChainQuote, type CrossChainError } from '../utils/crosschain';
import { type Token } from '../utils/oneinch';

interface QuoteDisplayProps {
  selectedToken: Token | null;
  recipientToken: string;
  tipAmount: string;
  chainId: number;
}

export default function QuoteDisplay({
  selectedToken,
  recipientToken,
  tipAmount,
  chainId
}: QuoteDisplayProps) {
  const [quote, setQuote] = useState<SpotPriceQuote | null>(null);
  const [crossChainQuote, setCrossChainQuote] = useState<CrossChainQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isCrossChain, setIsCrossChain] = useState(false);

  // Get destination token address based on recipient token preference
  const getDestinationTokenAddress = (recipientToken: string): string | null => {
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
        
        const result = await getCrossChainQuote(
          chainId,
          selectedToken.address,
          '', // Destination token address not needed for cross-chain
          amountInWei,
          recipientToken
        );

        if ('error' in result) {
          setError(result.description || result.error);
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
          setError(`${recipientToken} not supported on this chain`);
          return;
        }

        const result = await fetchSpotPriceQuote(
          chainId,
          selectedToken.address,
          dstTokenAddress,
          amountInWei
        );

        if ('error' in result) {
          setError(result.description || result.error);
          setQuote(null);
        } else {
          setQuote(result);
          setError(null);
          setLastUpdate(new Date());
        }
        setCrossChainQuote(null); // Clear cross-chain quote
      }
    } catch (err) {
      setError('Failed to fetch quote');
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

      {/* Regular 1inch Quote Display */}
      {quote && !isLoading && !isCrossChain && (
        <div className="mt-2 space-y-1">
          <p className="text-green-800 dark:text-green-200 text-sm">
            <strong>Rate:</strong> {formatQuoteDisplay(
              quote,
              selectedToken.symbol,
              recipientToken,
              selectedToken.decimals,
              18 // Most stablecoins have 18 decimals
            )}
          </p>
          <p className="text-green-700 dark:text-green-300 text-xs">
            You&apos;ll receive ≈ {(parseFloat(quote.dstAmount) / Math.pow(10, 18)).toFixed(4)} {recipientToken}
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
