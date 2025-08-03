interface WalletConnectionProps {
  isConnected: boolean;
  isConnecting: boolean;
  address?: string;
  selectedChain: number | string;
  shouldShowSwitchNetwork: boolean;
  walletChainId?: number;
  onConnect: () => void;
  onSwitchNetwork: (chainId: number) => void;
}

export default function WalletConnection({
  isConnected,
  isConnecting,
  address,
  walletChainId,
  selectedChain,
  shouldShowSwitchNetwork,
  onConnect,
  onSwitchNetwork
}: WalletConnectionProps) {
  if (!isConnected) {
    return (
      <div className="mb-6 text-center">
        <div className="text-4xl mb-4">🔗</div>
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
          Connect Your Wallet
        </h3>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Connect your wallet to send payments via 1inch Fusion+
        </p>
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-green-800 dark:text-green-200">
            ✅ Wallet Connected
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
        {shouldShowSwitchNetwork && (
          <button
            onClick={() => onSwitchNetwork(selectedChain as number)}
            className="px-3 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
          >
            Switch Network
          </button>
        )}
        {!shouldShowSwitchNetwork && typeof selectedChain === 'string' && (
          <div className="text-xs text-blue-600 dark:text-blue-400">
            🌉 Cross-chain via Fusion+
          </div>
        )}
      </div>
    </div>
  );
}
