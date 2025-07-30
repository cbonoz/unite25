'use client';

import { useState } from 'react';
import { Keypair } from '@stellar/stellar-sdk';

interface StellarWalletProps {
  onTipSent: (result: {
    swapId: string;
    stellarTxId: string;
    amount: string;
    asset: string;
  }) => void;
  recipientAddress: string;
  recipientToken: string;
  tipJarId: string;
}

export default function StellarWallet({
  onTipSent,
  recipientAddress,
  recipientToken,
  tipJarId,
}: StellarWalletProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [stellarAddress, setStellarAddress] = useState('');
  const [stellarSecret, setStellarSecret] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<'XLM' | 'USDC'>('XLM');
  const [tipAmount, setTipAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const connectWallet = () => {
    try {
      // For demo purposes - in production, integrate with Freighter wallet
      if (stellarSecret) {
        const keypair = Keypair.fromSecret(stellarSecret);
        setStellarAddress(keypair.publicKey());
        setIsConnected(true);
        setError('');
      } else {
        setError('Please enter your Stellar secret key');
      }
    } catch {
      setError('Invalid Stellar secret key');
    }
  };

  const sendStellarTip = async () => {
    if (!tipAmount || parseFloat(tipAmount) <= 0) {
      setError('Please enter a valid tip amount');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Call the API to initiate cross-chain swap
      const response = await fetch('/api/stellar/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stellarSenderSecret: stellarSecret,
          ethereumRecipient: recipientAddress,
          amount: tipAmount,
          assetCode: selectedAsset,
          targetEthereumToken: recipientToken === 'USDC'
            ? '0xA0b86a33E6441C8C7b60b8B5fa46a80C42a59C5d'
            : undefined,
          tipJarId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onTipSent({
          swapId: result.swapId,
          stellarTxId: result.stellarTxId,
          amount: tipAmount,
          asset: selectedAsset,
        });
        setTipAmount('');
      } else {
        setError(result.error || 'Failed to send tip');
      }
    } catch (err) {
      setError('Failed to send tip. Please try again.');
      console.error('Stellar tip error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateTestWallet = () => {
    const keypair = Keypair.random();
    setStellarSecret(keypair.secret());
    setStellarAddress(keypair.publicKey());
    setIsConnected(true);
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border-2 border-dashed border-purple-300 dark:border-purple-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
          <span className="mr-2">⭐</span>
          Stellar Cross-Chain Tips
        </h3>
        <div className="bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full text-sm font-medium">
          New! Fusion+ Extension
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
        Send tips from Stellar network (XLM or USDC) and recipient automatically receives {recipientToken} on Ethereum via 1inch Fusion+
      </p>

      {!isConnected ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Stellar Secret Key (for demo)
            </label>
            <input
              type="password"
              value={stellarSecret}
              onChange={(e) => setStellarSecret(e.target.value)}
              placeholder="S..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={connectWallet}
              disabled={!stellarSecret}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect Stellar Wallet
            </button>
            <button
              onClick={generateTestWallet}
              className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors font-medium"
            >
              Generate Test Wallet
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-700 dark:text-green-300 text-sm">
              <strong>Connected:</strong> {stellarAddress.slice(0, 8)}...{stellarAddress.slice(-8)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Asset
              </label>
              <select
                value={selectedAsset}
                onChange={(e) => setSelectedAsset(e.target.value as 'XLM' | 'USDC')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="XLM">XLM - Stellar Lumens</option>
                <option value="USDC">USDC - USD Coin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>
              <input
                type="number"
                value={tipAmount}
                onChange={(e) => setTipAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={sendStellarTip}
            disabled={!tipAmount || parseFloat(tipAmount) <= 0 || isLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing Cross-Chain Swap...' : `Send ${tipAmount} ${selectedAsset} Tip`}
          </button>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 text-sm">
              🌉 How Cross-Chain Tips Work:
            </h4>
            <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>1. Your {selectedAsset} is locked on Stellar with hashlock</li>
              <li>2. Bridge creates 1inch Fusion+ order on Ethereum</li>
              <li>3. Recipient receives {recipientToken} gaslessly</li>
              <li>4. Atomic swap completes when secret is revealed</li>
            </ol>
          </div>

          <button
            onClick={() => {
              setIsConnected(false);
              setStellarAddress('');
              setStellarSecret('');
              setError('');
            }}
            className="w-full text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}
