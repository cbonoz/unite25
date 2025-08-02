// Constants for SwapJar application
import { randomBytes, createHash } from 'crypto';

// Supported chain IDs
export const SUPPORTED_CHAINS = {
  ETHEREUM: 1,
  BASE: 8453,
  OPTIMISM: 10,
  POLYGON: 137,
  ARBITRUM: 42161,
  STELLAR: 'stellar' as const, // Special case for Stellar network
} as const;

export type ChainId = typeof SUPPORTED_CHAINS[keyof typeof SUPPORTED_CHAINS];

// Common interfaces
export interface Token {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// Stablecoin addresses across different chains
export const STABLECOIN_ADDRESSES: Record<ChainId, Record<string, string>> = {
  [SUPPORTED_CHAINS.ETHEREUM]: {
    USDC: '0xA0b86a33E6441C8C7b60b8B5fa46a80C42a59C5d',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  [SUPPORTED_CHAINS.BASE]: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  },
  [SUPPORTED_CHAINS.OPTIMISM]: {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  },
  [SUPPORTED_CHAINS.POLYGON]: {
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  [SUPPORTED_CHAINS.ARBITRUM]: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
  [SUPPORTED_CHAINS.STELLAR]: {
    USDC: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    DAI: 'native', // No DAI on Stellar, use XLM
    USDT: 'native', // No USDT on Stellar, use XLM
  },
};

// Helper function to get stablecoin address
export function getStablecoinAddress(chainId: ChainId, stablecoin: 'USDC' | 'DAI' | 'USDT'): string {
  return STABLECOIN_ADDRESSES[chainId][stablecoin];
}

// Fallback tokens in case API fails
export function getFallbackTokens(chainId: ChainId): Token[] {
  if (chainId === SUPPORTED_CHAINS.ETHEREUM) {
    return ETHEREUM_FALLBACK_TOKENS;
  }

  if (chainId === SUPPORTED_CHAINS.STELLAR) {
    return STELLAR_FALLBACK_TOKENS;
  }

  if (chainId === SUPPORTED_CHAINS.BASE) {
    return BASE_FALLBACK_TOKENS;
  }

  if (chainId === SUPPORTED_CHAINS.POLYGON) {
    return POLYGON_FALLBACK_TOKENS;
  }

  if (chainId === SUPPORTED_CHAINS.ARBITRUM) {
    return ARBITRUM_FALLBACK_TOKENS;
  }

  if (chainId === SUPPORTED_CHAINS.OPTIMISM) {
    return OPTIMISM_FALLBACK_TOKENS;
  }

  // Default fallback for unknown chains
  return [
    {
      address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
    },
  ];
}

// Ethereum mainnet fallback tokens
export const ETHEREUM_FALLBACK_TOKENS: Token[] = [
  {
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
  },
  {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  },
  {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
  },
  {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  },
  {
    address: '0x4fabb145d64652a948d72533023f6e7a623c7c53',
    symbol: 'BUSD',
    name: 'BUSD',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0x4fabb145d64652a948d72533023f6e7a623c7c53.png',
  },
  {
    address: '0xb8c77482e45f1f44de1745f52c74426c631bdd52',
    symbol: 'BNB',
    name: 'BNB',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xb8c77482e45f1f44de1745f52c74426c631bdd52.png',
  },
  {
    address: '0x320623b8e4ff03373931769a31fc52a4e78b5d70',
    symbol: 'RSR',
    name: 'Reserve Rights',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0x320623b8e4ff03373931769a31fc52a4e78b5d70.png',
  },
  {
    address: '0x39aa39c021dfbae8fac545936693ac917d5e7563',
    symbol: 'cUSDC',
    name: 'Compound USD Coin',
    decimals: 8,
    logoURI: 'https://tokens.1inch.io/0x39aa39c021dfbae8fac545936693ac917d5e7563.png',
  },
  {
    address: '0xc3d688b66703497daa19211eedff47f25384cdc3',
    symbol: 'cUSDCv3',
    name: 'Compound USDC',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xc3d688b66703497daa19211eedff47f25384cdc3.png',
  },
];

// Stellar network fallback tokens
export const STELLAR_FALLBACK_TOKENS: Token[] = [
  {
    address: 'native',
    symbol: 'XLM',
    name: 'Stellar Lumens',
    decimals: 7,
    logoURI: 'https://assets.stellar.org/tokens/xlm.png',
  },
  {
    address: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  },
];

// Base fallback tokens
export const BASE_FALLBACK_TOKENS: Token[] = [
  {
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
  },
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  },
  {
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0x6b175474e89094c44da98b954eedeac495271d0f.png',
  },
];

// Polygon fallback tokens
export const POLYGON_FALLBACK_TOKENS: Token[] = [
  {
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    symbol: 'MATIC',
    name: 'Polygon',
    decimals: 18,
    logoURI: 'https://wallet-asset.matic.network/img/tokens/matic.svg',
  },
  {
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  },
  {
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
  },
];

// Arbitrum fallback tokens
export const ARBITRUM_FALLBACK_TOKENS: Token[] = [
  {
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
  },
  {
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  },
  {
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
  },
];

// Optimism fallback tokens
export const OPTIMISM_FALLBACK_TOKENS: Token[] = [
  {
    address: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    logoURI: 'https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png',
  },
  {
    address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
  },
  {
    address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://tokens.1inch.io/0xdac17f958d2ee523a2206206994597c13d831ec7.png',
  },
];

// Cross-chain hashlock and timelock constants
export const CROSS_CHAIN_CONSTANTS = {
  // Default timelock duration (24 hours in seconds)
  DEFAULT_TIMELOCK_DURATION: 24 * 60 * 60,

  // Minimum timelock duration (1 hour in seconds)
  MIN_TIMELOCK_DURATION: 60 * 60,

  // Maximum timelock duration (7 days in seconds)
  MAX_TIMELOCK_DURATION: 7 * 24 * 60 * 60,

  // Secret length for hashlock (32 bytes)
  SECRET_LENGTH: 32,

  // Default preset for cross-chain swaps
  DEFAULT_PRESET: 'fast' as const,
} as const;

// Preset options for cross-chain swaps
export const CROSS_CHAIN_PRESETS = {
  fast: 'fast',
  medium: 'medium',
  slow: 'slow',
} as const;

export type CrossChainPreset = typeof CROSS_CHAIN_PRESETS[keyof typeof CROSS_CHAIN_PRESETS];

// Cross-chain swap interfaces
export interface CrossChainSecret {
  secret: string;
  hash: string;
}

export interface CrossChainHashLock {
  hash: string;
  secrets: CrossChainSecret[];
  merkleRoot?: string;
}

export interface CrossChainOrder {
  hash: string;
  quoteId: string;
  order: Record<string, unknown>;
  hashLock: CrossChainHashLock;
  timelock: number;
  preset: CrossChainPreset;
  secretHashes: string[];
}

// Helper functions for cross-chain hashlock/timelock functionality
export class CrossChainUtils {
  /**
   * Generate cryptographically secure secrets for hashlock
   */
  static generateSecrets(count: number = 1): string[] {
    return Array.from({ length: count }).map(() =>
      '0x' + randomBytes(CROSS_CHAIN_CONSTANTS.SECRET_LENGTH).toString('hex')
    );
  }

  /**
   * Hash a secret for hashlock verification
   */
  static hashSecret(secret: string): string {
    return '0x' + createHash('sha256').update(secret.replace('0x', ''), 'hex').digest('hex');
  }

  /**
   * Create a simple hashlock for single fill orders
   */
  static createSingleHashLock(secret: string): CrossChainHashLock {
    const hash = this.hashSecret(secret);
    return {
      hash,
      secrets: [{ secret, hash }],
    };
  }

  /**
   * Create merkle tree hashlock for multiple fill orders
   */
  static createMultipleHashLock(secrets: string[]): CrossChainHashLock {
    const secretObjects = secrets.map(secret => ({
      secret,
      hash: this.hashSecret(secret),
    }));

    // For simplicity, use the first secret hash as merkle root
    // In production, implement proper merkle tree
    const merkleRoot = secretObjects[0].hash;

    return {
      hash: merkleRoot,
      secrets: secretObjects,
      merkleRoot,
    };
  }

  /**
   * Get merkle leaves for hashlock (simplified implementation)
   */
  static getMerkleLeaves(secrets: string[]): string[] {
    return secrets.map(secret => this.hashSecret(secret));
  }

  /**
   * Calculate timelock expiration timestamp
   */
  static calculateTimelock(durationSeconds: number = CROSS_CHAIN_CONSTANTS.DEFAULT_TIMELOCK_DURATION): number {
    const now = Math.floor(Date.now() / 1000);
    const clampedDuration = Math.max(
      CROSS_CHAIN_CONSTANTS.MIN_TIMELOCK_DURATION,
      Math.min(CROSS_CHAIN_CONSTANTS.MAX_TIMELOCK_DURATION, durationSeconds)
    );
    return now + clampedDuration;
  }

  /**
   * Validate if timelock is still active
   */
  static isTimelockActive(timelock: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    return timelock > now;
  }

  /**
   * Get time remaining for timelock (in seconds)
   */
  static getTimelockRemaining(timelock: number): number {
    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, timelock - now);
  }

  /**
   * Format timelock remaining time as human readable string
   */
  static formatTimelockRemaining(timelock: number): string {
    const remaining = this.getTimelockRemaining(timelock);

    if (remaining === 0) {
      return 'Expired';
    }

    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
}

// Example usage constants for cross-chain scenarios
export const CROSS_CHAIN_EXAMPLES = {
  POLYGON_TO_BSC_USDT_TO_BNB: {
    srcChainId: 137, // Polygon
    dstChainId: 56,  // BSC
    srcTokenAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', // USDT on Polygon
    dstTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // BNB on BSC
    amount: '10000000', // 10 USDT (6 decimals)
  },
  ETHEREUM_TO_POLYGON_ETH_TO_MATIC: {
    srcChainId: 1,   // Ethereum
    dstChainId: 137, // Polygon
    srcTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // ETH
    dstTokenAddress: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', // MATIC
    amount: '1000000000000000000', // 1 ETH (18 decimals)
  },
} as const;
