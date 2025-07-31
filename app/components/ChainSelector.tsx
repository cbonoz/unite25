import { type ChainId } from '../utils/oneinch';

interface ChainSelectorProps {
  chains: ChainId[];
  selectedChain: ChainId;
  chainNames: Record<ChainId, string>;
  onChainSelect: (chainId: ChainId) => void;
}

export default function ChainSelector({
  chains,
  selectedChain,
  chainNames,
  onChainSelect
}: ChainSelectorProps) {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Select Chain
      </label>
      <div className="grid grid-cols-3 gap-2">
        {chains.map((chainId) => (
          <button
            key={chainId}
            onClick={() => onChainSelect(chainId)}
            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
              selectedChain === chainId
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
            }`}
          >
            {chainNames[chainId] || `Chain ${chainId}`}
          </button>
        ))}
      </div>
    </div>
  );
}
