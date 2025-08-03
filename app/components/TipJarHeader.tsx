import { getAddressUrl, type ChainId } from '../constants';

interface TipJarHeaderProps {
  name: string;
  recipientToken: string;
  walletAddress: string;
  customMessage?: string;
  supportedChains?: ChainId[];
}

export default function TipJarHeader({
  name,
  recipientToken,
  walletAddress,
  customMessage,
  supportedChains = []
}: TipJarHeaderProps) {
  // Get the primary chain (first supported chain) for the explorer link
  const primaryChain = supportedChains.length > 0 ? supportedChains[0] : null;

  // Check if this is a Stellar address
  const isStellarAddress = walletAddress.startsWith('G') && walletAddress.length === 56;

  // Determine which explorer URL to use
  const getExplorerUrl = (): string | null => {
    if (isStellarAddress) {
      return getAddressUrl(walletAddress, 'stellar');
    } else if (primaryChain && typeof primaryChain === 'number') {
      return getAddressUrl(walletAddress, primaryChain);
    }
    return null;
  };

  const explorerUrl = getExplorerUrl();

  const handleAddressClick = () => {
    if (explorerUrl) {
      window.open(explorerUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Helper function to get chain name for display
  const getChainName = (chainId: ChainId): string => {
    const chainNames: Record<string, string> = {
      '1': 'Ethereum',
      '8453': 'Base',
      '137': 'Polygon',
      '42161': 'Arbitrum',
      '10': 'Optimism',
      'stellar': 'Stellar',
    };
    return chainNames[chainId.toString()] || `Chain ${chainId}`;
  };

  return (
    <div className="text-center mb-8">
      <div className="text-6xl mb-4">🪙</div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
        {name}
      </h1>
      <div className="flex items-center justify-center gap-2">
        <p className="text-gray-600 dark:text-gray-300">
          {customMessage || `Send payments in any token, I'll receive ${recipientToken}`}
        </p>
        <div className="relative group">
          <button
            onClick={handleAddressClick}
            className={`text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 ${
              explorerUrl ? 'cursor-pointer' : 'cursor-help'
            }`}
            title={explorerUrl ? 'Click to view address on block explorer' : 'Recipient wallet address'}
          >
            ℹ️
          </button>
          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            <div className="mb-1">
              <strong>Recipient:</strong> {walletAddress}
            </div>
            {primaryChain && (
              <div className="text-xs text-gray-300">
                Primary network: {getChainName(primaryChain)}
                {explorerUrl && ' • Click to view on explorer'}
              </div>
            )}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 dark:border-t-gray-700"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
