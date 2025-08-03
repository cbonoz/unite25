import { useState, useEffect } from 'react';

export interface TokenOption {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
  chainId: number;
  isNative?: boolean;
  category: 'ethereum' | 'stellar';
}

// Base recipient token options (always available)
const BASE_RECIPIENT_TOKENS: TokenOption[] = [
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    chainId: 1,
    category: 'ethereum'
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    decimals: 18,
    chainId: 1,
    category: 'ethereum'
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    chainId: 1,
    category: 'ethereum'
  },
  {
    symbol: 'XLM',
    name: 'Stellar Lumens',
    address: 'native',
    decimals: 7,
    chainId: 0, // Stellar network
    category: 'stellar'
  },
  {
    symbol: 'STELLAR_USDC',
    name: 'USDC on Stellar',
    address: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    decimals: 6,
    chainId: 0, // Stellar network
    category: 'stellar'
  }
];

interface UseRecipientTokensOptions {
  includeEthereumTokens?: boolean;
  maxEthereumTokens?: number;
  ethereumChainId?: number;
}

export function useRecipientTokens(options: UseRecipientTokensOptions = {}) {
  const {
    includeEthereumTokens = true,
    maxEthereumTokens = 10,
    ethereumChainId = 1
  } = options;

  const [tokens, setTokens] = useState<TokenOption[]>(BASE_RECIPIENT_TOKENS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!includeEthereumTokens) return;

    const fetchEthereumTokens = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('🔍 Fetching popular Ethereum tokens for recipient options...');

        const response = await fetch(`/api/tokens/${ethereumChainId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch tokens: ${response.statusText}`);
        }

        const data = await response.json();
        const tokenList = Object.values(data.tokens || {}) as any[];

        // Filter for popular, well-known tokens that would make good recipient currencies
        const popularTokens = tokenList
          .filter(token => {
            // Filter criteria for good recipient tokens
            return (
              token.symbol &&
              token.name &&
              token.address &&
              token.decimals !== undefined &&
              // Only include tokens with reasonable market cap indicators
              (token.tags?.includes('PEG:USD') || // Stablecoins
               token.tags?.includes('tokens') ||
               ['ETH', 'WETH', 'BTC', 'WBTC', 'LINK', 'UNI', 'AAVE', 'MKR', 'CRV', 'COMP'].includes(token.symbol)) &&
              // Avoid duplicates with base tokens
              !BASE_RECIPIENT_TOKENS.some(baseToken =>
                baseToken.symbol.toUpperCase() === token.symbol.toUpperCase()
              )
            );
          })
          .slice(0, maxEthereumTokens)
          .map(token => ({
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            decimals: token.decimals,
            logoURI: token.logoURI,
            chainId: ethereumChainId,
            category: 'ethereum' as const
          }));

        console.log(`✅ Found ${popularTokens.length} additional recipient token options`);

        // Combine base tokens with fetched Ethereum tokens
        const allTokens = [
          ...BASE_RECIPIENT_TOKENS,
          ...popularTokens
        ];

        setTokens(allTokens);

      } catch (err) {
        console.error('❌ Error fetching recipient tokens:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch tokens');
        // Keep base tokens even if API fails
        setTokens(BASE_RECIPIENT_TOKENS);
      } finally {
        setLoading(false);
      }
    };

    fetchEthereumTokens();
  }, [includeEthereumTokens, maxEthereumTokens, ethereumChainId]);

  // Group tokens by category for better UX
  const groupedTokens = {
    ethereum: tokens.filter(t => t.category === 'ethereum'),
    stellar: tokens.filter(t => t.category === 'stellar')
  };

  // Separate base tokens from fetched tokens for more granular control if needed
  const baseEthereumTokens = BASE_RECIPIENT_TOKENS.filter(t => t.category === 'ethereum');
  const baseStellarTokens = BASE_RECIPIENT_TOKENS.filter(t => t.category === 'stellar');
  const fetchedEthereumTokens = tokens.filter(t =>
    t.category === 'ethereum' &&
    !BASE_RECIPIENT_TOKENS.some(baseToken => baseToken.symbol === t.symbol)
  );

  return {
    tokens,
    groupedTokens,
    baseEthereumTokens,
    baseStellarTokens,
    fetchedEthereumTokens,
    loading,
    error,
    // Helper function to find token by symbol
    findToken: (symbol: string) => tokens.find(t =>
      t.symbol.toUpperCase() === symbol.toUpperCase()
    ),
    // Helper function to get display name
    getDisplayName: (symbol: string) => {
      const token = tokens.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
      return token ? `${token.symbol} - ${token.name}` : symbol;
    }
  };
}
