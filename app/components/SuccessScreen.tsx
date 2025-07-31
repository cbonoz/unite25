interface SuccessScreenProps {
  recipientToken: string;
  orderHash?: string;
  stellarTips: Array<{
    swapId: string;
    stellarTxId: string;
    amount: string;
    asset: string;
  }>;
  crossChainTips: Array<{
    txHash: string;
    stellarAddress: string;
    amount: string;
    token: string;
  }>;
  onSendAnother: () => void;
}

export default function SuccessScreen({
  recipientToken,
  orderHash,
  stellarTips,
  crossChainTips,
  onSendAnother
}: SuccessScreenProps) {
  return (
    <div className="text-center">
      <div className="text-green-500 text-5xl mb-4">✅</div>
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        Tip Sent Successfully!
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Your tip is being processed via 1inch Fusion+. The recipient will receive {recipientToken} shortly.
      </p>

      {/* Order Details */}
      {orderHash && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
            🔗 Fusion+ Order Details
          </h3>
          <div className="text-sm text-green-700 dark:text-green-300">
            <p><strong>Order Hash:</strong></p>
            <p className="font-mono text-xs break-all">{orderHash}</p>
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
              <p><strong>Stellar Tx:</strong> {tip.stellarTxId}</p>
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
              <p><strong>Ethereum Tx:</strong> {tip.txHash}</p>
              <p><strong>Stellar Address:</strong> {tip.stellarAddress.slice(0, 8)}...{tip.stellarAddress.slice(-8)}</p>
              <p className="text-xs mt-1 opacity-75">USDC will arrive on Stellar network within 2-5 minutes</p>
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
