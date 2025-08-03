import { useState, useEffect } from 'react';
import { getCrossChainQuote, isCrossChainSwapRequired, type CrossChainQuote, type CrossChainError } from '../utils/crosschain';
import { type Token, getPopularTokens } from '../utils/oneinch';
import { fetchSpotPriceQuote, COMMON_TOKEN_ADDRESSES, type SpotPriceQuote, type QuoteError } from '../utils/quotes';

// Helper component to handle async quote display
function QuoteDisplayContent({
  quote,
  selectedToken,
  recipientToken,
  chainId
}: {
  quote: SpotPriceQuote;
  selectedToken: Token;
  recipientToken: string;
  chainId: number;
}) {
  const [decimals, setDecimals] = useState<number>(18);
  const [loading, setLoading] = useState(true);

  // Smart formatting function that adjusts decimal places based on value magnitude
  const formatSmartAmount = (amount: number): string => {
    if (amount === 0) return '0';
    if (amount >= 1000) return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (amount >= 10) return amount.toFixed(4);
    if (amount >= 1) return amount.toFixed(6);
    if (amount >= 0.01) return amount.toFixed(6);
    if (amount >= 0.0001) return amount.toFixed(8);
    // For very small amounts, use scientific notation if needed
    if (amount < 0.0000001) return amount.toExponential(3);
    return amount.toFixed(10);
  };

  // Calculate rate and normalized amounts directly from token info we have
  const calculateQuoteData = (quote: SpotPriceQuote, srcToken: Token, dstDecimals: number) => {
    try {
      // Convert amounts using the actual token decimals we know
      const srcAmountNormalized = parseFloat(quote.srcAmount) / Math.pow(10, srcToken.decimals);
      const dstAmountNormalized = parseFloat(quote.dstAmount) / Math.pow(10, dstDecimals);

      // Calculate rate (how much destination token per 1 source token)
      const rate = dstAmountNormalized / srcAmountNormalized;

      console.log('💱 Frontend rate calculation:', {
        srcAmount: quote.srcAmount,
        dstAmount: quote.dstAmount,
        srcDecimals: srcToken.decimals,
        dstDecimals,
        srcAmountNormalized,
        dstAmountNormalized,
        calculatedRate: rate,
        srcToken: srcToken.symbol,
        dstToken: recipientToken
      });

      return {
        rate,
        dstAmountNormalized,
        srcAmountNormalized
      };
    } catch (error) {
      console.error('Error calculating quote data:', error);
      return {
        rate: 0,
        dstAmountNormalized: 0,
        srcAmountNormalized: 0
      };
    }
  };

  useEffect(() => {
    const fetchDecimals = async () => {
      try {
        setLoading(true);

        // For cross-chain scenarios, use standard decimals
        if (recipientToken === 'XLM') {
          setDecimals(7);
          return;
        }
        if (recipientToken === 'STELLAR_USDC') {
          setDecimals(6);
          return;
        }

        // Fetch all tokens for this chain from 1inch API
        const chainTokens = await getPopularTokens(chainId as any);

        // Try to find the token in the API response and use its decimals
        let foundToken: Token | undefined;

        switch (recipientToken) {
          case 'USDC':
            foundToken = chainTokens.find((token: Token) =>
              token.symbol === 'USDC'
            );
            break;

          case 'DAI':
            // Look for exact DAI match first, avoid compound tokens like cDAI
            foundToken = chainTokens.find((token: Token) =>
              token.symbol === 'DAI' && !token.name?.toLowerCase().includes('compound')
            );
            break;

          case 'USDT':
            foundToken = chainTokens.find((token: Token) =>
              token.symbol === 'USDT'
            );
            break;

          case 'ETH':
            foundToken = chainTokens.find((token: Token) =>
              token.symbol === 'ETH' || token.symbol === 'WETH'
            );
            break;
        }

        if (foundToken?.decimals !== undefined) {
          console.log(`✅ Found ${recipientToken} token with ${foundToken.decimals} decimals from API:`, foundToken);
          setDecimals(foundToken.decimals);
        } else {
          console.log(`❌ Token ${recipientToken} not found in API response - cannot show accurate quote`);
          // Don't set decimals, which will cause the component to show "No quote available"
          setDecimals(-1); // Use -1 as a flag for "no valid data"
        }
      } catch (error) {
        console.error('❌ Error fetching token decimals from API:', error);
        console.log('❌ Cannot verify token data - refusing to show potentially incorrect quote');
        setDecimals(-1); // Use -1 as a flag for "no valid data"
      } finally {
        setLoading(false);
      }
    };

    fetchDecimals();
  }, [recipientToken, chainId]);

  if (loading) {
    return (
      <div className="text-green-600 dark:text-green-400 text-sm">
        Loading quote details...
      </div>
    );
  }

  // If we couldn't get valid token data, don't show a quote
  if (decimals === -1) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-sm">
        📊 No quote available - token data could not be verified
      </div>
    );
  }

  const quoteData = calculateQuoteData(quote, selectedToken, decimals);

  return (
    <>
      <p className="text-green-800 dark:text-green-200 text-sm">
        <strong>Rate:</strong> 1 {selectedToken.symbol} ≈ {formatSmartAmount(quoteData.rate)} {recipientToken}
      </p>
      <p className="text-green-700 dark:text-green-300 text-xs">
        You&apos;ll receive ≈ {formatSmartAmount(quoteData.dstAmountNormalized)} {recipientToken}
      </p>
    </>
  );
}

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
  // Fetch tokens from 1inch API for the specific chain to get accurate addresses
  const getDestinationTokenAddress = async (recipientToken: string): Promise<string | null> => {
    console.log('🎯 Looking for destination token:', {
      recipientToken,
      chainId
    });

    // For cross-chain scenarios (XLM, STELLAR_USDC), we don't need destination addresses
    if (recipientToken === 'XLM' || recipientToken === 'STELLAR_USDC') {
      return null;
    }

    try {
      // Fetch all tokens for this chain from 1inch API
      const chainTokens = await getPopularTokens(chainId as any);
      console.log(`📋 Fetched ${chainTokens.length} tokens for chain ${chainId}`);

      // Try to find the token in the API response (most reliable)
      // Prioritize exact symbol matches to avoid confusion with derivative tokens
      let foundToken: Token | undefined;

      switch (recipientToken) {
        case 'USDC':
          foundToken = chainTokens.find((token: Token) =>
            token.symbol === 'USDC'
          );
          break;

        case 'DAI':
          // Look for exact DAI match first, avoid compound tokens like cDAI
          foundToken = chainTokens.find((token: Token) =>
            token.symbol === 'DAI' && !token.name?.toLowerCase().includes('compound')
          );
          break;

        case 'USDT':
          foundToken = chainTokens.find((token: Token) =>
            token.symbol === 'USDT'
          );
          break;

        case 'ETH':
          // For ETH, look for WETH on non-mainnet chains or native ETH
          foundToken = chainTokens.find((token: Token) =>
            token.symbol === 'ETH' || token.symbol === 'WETH'
          );
          break;
      }

      if (foundToken) {
        console.log(`✅ Found ${recipientToken} token from API:`, foundToken);
        return foundToken.address;
      }

      console.log(`❌ Token ${recipientToken} not found in API response - refusing to show quote with incorrect data`);
      return null; // Return null instead of fallback to avoid showing incorrect rates
    } catch (error) {
      console.error('❌ Error fetching tokens from API:', error);
      console.log('❌ Refusing to show quote without verified token data');
      return null; // Return null instead of fallback to avoid showing incorrect rates
    }
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
        const dstTokenAddress = await getDestinationTokenAddress(recipientToken);
        console.log('🎯 Quote request details:', {
          recipientToken,
          dstTokenAddress,
          chainId,
          srcToken: selectedToken.address,
          srcAmount: amountInWei
        });

        if (!dstTokenAddress) {
          console.error('❌ Destination token not supported or could not be verified:', recipientToken, 'on chain', chainId);
          setError(null); // Don't show error in UI
          setQuote(null); // Clear any existing quote
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
          <QuoteDisplayContent
            quote={quote}
            selectedToken={selectedToken}
            recipientToken={recipientToken}
            chainId={chainId}
          />
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
