import { getFusionOrderUrl, formatOrderHash, getTransactionUrl, type ChainId } from '../constants';
import { useState } from 'react';

interface SuccessScreenProps {
  recipientToken: string;
  orderHash?: string;
  chainId?: ChainId;
  transactionMethod?: string; // 'fusion-plus' | 'regular-swap' | 'ethereum-tx' etc.
  stellarTips: Array<{
    swapId: string;
    stellarTxId: string;
    amount: string;
    asset: string;
    stellarExplorer?: string;
  }>;
  crossChainTips: Array<{
    txHash: string;
    stellarAddress: string;
    amount: string;
    token: string;
    stellarExplorer?: string;
  }>;
  successMessage?: string;
  onSendAnother: () => void;
}

export default function SuccessScreen({
  recipientToken,
  orderHash,
  chainId,
  transactionMethod,
  stellarTips,
  crossChainTips,
  successMessage,
  onSendAnother
}: SuccessScreenProps) {
  const [copyText, setCopyText] = useState('Copy');

  const handleCopyOrderHash = async () => {
    if (!orderHash) return;

    try {
      await navigator.clipboard.writeText(orderHash);
      setCopyText('Copied!');
      setTimeout(() => setCopyText('Copy'), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyText('Failed');
      setTimeout(() => setCopyText('Copy'), 2000);
    }
  };

  // Determine if this is a Fusion+ order or Ethereum transaction
  const isFusionPlusOrder = transactionMethod === 'fusion-plus' ||
                           transactionMethod === 'fusion-order' ||
                           (orderHash && !orderHash.startsWith('0x')); // Fusion+ orders typically don't start with 0x

  const isEthereumTransaction = transactionMethod === 'regular-swap' ||
                               transactionMethod === 'ethereum-tx' ||
                               (orderHash && orderHash.startsWith('0x') && orderHash.length === 66); // Standard Ethereum tx hash format
  return (
    <div className="text-center">
      <div className="text-green-500 text-5xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        Payment Sent Successfully!
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {crossChainTips.length > 0
          ? `Your ${crossChainTips[0]?.token || 'tokens'} have been bridged to Stellar. The recipient will receive ${recipientToken} shortly.`
          : `Your payment is being processed via 1inch Fusion+. The recipient will receive ${recipientToken} shortly.`
        }
      </p>

      {/* Custom Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-blue-800 dark:text-blue-200 text-lg">
            {successMessage}
          </p>
        </div>
      )}

      {/* Order Details */}
      {orderHash && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
            {crossChainTips.length > 0 ? '🌉 Bridge Transaction' :
             isFusionPlusOrder ? '🔗 Fusion+ Order Details' :
             '💸 Transaction Details'}
          </h3>
          <div className="text-sm text-green-700 dark:text-green-300">
            <p><strong>
              {crossChainTips.length > 0 ? 'Transaction Hash:' :
               isFusionPlusOrder ? 'Order Hash:' :
               'Transaction Hash:'}
            </strong></p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs break-all flex-1 bg-white dark:bg-gray-800 p-2 rounded border">
                {orderHash}
              </span>
              <button
                onClick={handleCopyOrderHash}
                className="inline-flex items-center px-2 py-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded transition-colors duration-200"
                title="Copy to clipboard"
              >
                {copyText === 'Copied!' ? '✅' : '📋'}
                <span className="ml-1">{copyText}</span>
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              {crossChainTips.length === 0 ? (
                // Choose appropriate link based on transaction type
                isFusionPlusOrder ? (
                  // Fusion+ order link
                  <a
                    href={getFusionOrderUrl(orderHash, chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded-md transition-colors duration-200"
                    title="View order details on 1inch Fusion+"
                  >
                    <span className="mr-1">👁️</span>
                    View Order Details
                  </a>
                ) : isEthereumTransaction && chainId ? (
                  // Ethereum transaction link
                  <a
                    href={getTransactionUrl(orderHash, chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors duration-200"
                    title="View transaction on block explorer"
                  >
                    <span className="mr-1">🔍</span>
                    View on Explorer
                  </a>
                ) : null
              ) : chainId ? (
                // Cross-chain transaction link
                <a
                  href={getTransactionUrl(orderHash, chainId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-md transition-colors duration-200"
                  title="View transaction on block explorer"
                >
                  <span className="mr-1">🔍</span>
                  View on Explorer
                </a>
              ) : null}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              {crossChainTips.length === 0
                ? isFusionPlusOrder
                  ? 'Track your Fusion+ swap progress and view detailed information about the order'
                  : 'View transaction details and confirmations on the blockchain explorer'
                : 'View transaction details and confirmations on the blockchain explorer'
              }
            </p>
          </div>
        </div>
      )}

      {/* Show Stellar tip details if it was a cross-chain tip */}
      {stellarTips.length > 0 && (
        <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <h3 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
            🌉 Cross-Chain Swap Details (Stellar → Ethereum)
          </h3>
          {stellarTips.map((tip, index) => (
            <div key={index} className="text-sm text-purple-700 dark:text-purple-300">
              <p><strong>Amount:</strong> {tip.amount} {tip.asset}</p>
              <p><strong>Swap ID:</strong> {tip.swapId}</p>
              <p><strong>Stellar Tx:</strong>
                {tip.stellarExplorer ? (
                  <a
                    href={tip.stellarExplorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 underline font-mono text-xs"
                  >
                    {tip.stellarTxId.slice(0, 8)}...{tip.stellarTxId.slice(-8)} ↗
                  </a>
                ) : (
                  <span className="ml-1 font-mono text-xs">{tip.stellarTxId}</span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Show cross-chain tip details (Ethereum → Stellar) */}
      {crossChainTips.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            🌉 Cross-Chain Bridge Details (Ethereum → Stellar)
          </h3>
          {crossChainTips.map((tip, index) => (
            <div key={index} className="text-sm text-blue-700 dark:text-blue-300">
              <p><strong>Amount:</strong> {tip.amount} {tip.token}</p>
              <p><strong>Stellar Transaction:</strong>
                {tip.stellarExplorer ? (
                  <a
                    href={tip.stellarExplorer}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline font-mono text-xs"
                  >
                    {tip.txHash.slice(0, 8)}...{tip.txHash.slice(-8)} ↗
                  </a>
                ) : (
                  <span className="ml-1 font-mono text-xs">{tip.txHash}</span>
                )}
              </p>
              <p><strong>Stellar Address:</strong> {tip.stellarAddress.slice(0, 8)}...{tip.stellarAddress.slice(-8)}</p>
              <p className="text-xs mt-1 opacity-75">
                {tip.token === 'USDC'
                  ? `${recipientToken} will arrive on Stellar network within 2-5 minutes`
                  : 'Tokens will arrive on Stellar network within 2-5 minutes'
                }
              </p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onSendAnother}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Send Another Tip
      </button>
    </div>
  );
}
