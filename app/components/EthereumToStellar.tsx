'use client';

import { useState } from 'react';
import { getPopularTokens, createFusionOrder, SUPPORTED_CHAINS } from '../utils/oneinch';
import type { Token, ChainId } from '../utils/oneinch';

interface EthereumToStellarProps {
  isConnected: boolean;
  address: string | null;
  selectedChain: ChainId;
  recipientToken: string;
  recipientStellarAddress?: string;
  signer: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  onTipSent: (result: {
    txHash: string;
    stellarAddress: string;
    amount: string;
    token: string;
  }) => void;
}

export default function EthereumToStellar({
  isConnected,
  address,
  selectedChain,
  recipientToken,
  recipientStellarAddress,
  signer,
  onTipSent,
}: EthereumToStellarProps) {
  const [stellarAddress, setStellarAddress] = useState(recipientStellarAddress || '');
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [tipAmount, setTipAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokens, setTokens] = useState<Token[]>([]);

  // Load tokens when component mounts
  useState(() => {
    const loadTokens = async () => {
      try {
        const availableTokens = await getPopularTokens(selectedChain);
        setTokens(availableTokens.slice(0, 5)); // Top 5 tokens
        if (availableTokens.length > 0) {
          setSelectedToken(availableTokens[0]);
        }
      } catch (error) {
        console.error('Error loading tokens:', error);
      }
    };

    if (isConnected) {
      loadTokens();
    }
  });

  const handleCrossChainTip = async () => {
    if (!selectedToken || !tipAmount || !stellarAddress || !address || !signer) {
      setError('Please fill in all fields and connect wallet');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      console.log('🌉 Initiating Ethereum → Stellar cross-chain tip...');

      // Convert tip amount to wei
      const amountInWei = (parseFloat(tipAmount) * Math.pow(10, selectedToken.decimals)).toString();

      // Step 1: Create a cross-chain swap order
      const response = await fetch('/api/stellar/bridge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceChain: selectedChain,
          sourceToken: selectedToken.address,
          sourceAmount: amountInWei,
          senderAddress: address,
          targetStellarAddress: stellarAddress,
          targetAsset: 'USDC', // Convert to USDC on Stellar
        }),
      });

      const swapData = await response.json();

      if (!swapData.success) {
        throw new Error(swapData.error || 'Failed to create cross-chain swap');
      }

      // Step 2: Execute the Ethereum transaction
      console.log('📝 Executing Ethereum transaction...');

      const txResponse = await signer.sendTransaction({
        to: swapData.transaction.to,
        value: swapData.transaction.value || '0',
        data: swapData.transaction.data,
        gasLimit: swapData.transaction.gas || '500000',
      });

      console.log('⏳ Transaction sent:', txResponse.hash);

      // Wait for confirmation
      const receipt = await txResponse.wait();

      if (receipt.status === 1) {
        console.log('✅ Ethereum transaction confirmed, initiating Stellar transfer...');

        // Notify parent component
        onTipSent({
          txHash: receipt.hash,
          stellarAddress,
          amount: tipAmount,
          token: selectedToken.symbol,
        });

        // Reset form
        setTipAmount('');
        setStellarAddress('');
      } else {
        throw new Error('Transaction failed');
      }

    } catch (error) {
      console.error('❌ Cross-chain tip error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send cross-chain tip');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 text-center">
        <div className="text-orange-600 dark:text-orange-400 text-2xl mb-2">🔗</div>
        <p className="text-orange-800 dark:text-orange-200 font-medium">
          Connect your Ethereum wallet to send cross-chain tips
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border-2 border-dashed border-blue-300 dark:border-blue-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-white flex items-center">
          <span className="mr-2">🌉</span>
          Ethereum → Stellar Bridge
        </h3>
        <div className="bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
          Fusion+ Extension
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
        Send tokens from your Ethereum wallet to any Stellar address. Powered by 1inch Fusion+ atomic swaps.
      </p>

      <div className="space-y-4">
        {/* Stellar Address Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recipient Stellar Address
          </label>
          <input
            type="text"
            value={stellarAddress}
            onChange={(e) => setStellarAddress(e.target.value)}
            placeholder="G... (Stellar public key)"
            readOnly={!!recipientStellarAddress}
            className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm ${
              recipientStellarAddress ? 'bg-gray-100 dark:bg-gray-600 cursor-not-allowed' : ''
            }`}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {recipientStellarAddress
              ? 'This Stellar address is configured by the tip jar creator'
              : 'The Stellar address where you want to send the tip'
            }
          </p>
        </div>

        {/* Token Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Token
            </label>
            <select
              value={selectedToken?.address || ''}
              onChange={(e) => {
                const token = tokens.find(t => t.address === e.target.value);
                setSelectedToken(token || null);
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              {tokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol}
                </option>
              ))}
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
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleCrossChainTip}
          disabled={!stellarAddress || !selectedToken || !tipAmount || parseFloat(tipAmount) <= 0 || isLoading}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing Cross-Chain Swap...' : `Send ${tipAmount} ${selectedToken?.symbol || ''} to Stellar`}
        </button>

        {/* How it Works */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 text-sm">
            🔐 How Ethereum → Stellar Works:
          </h4>
          <ol className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>1. Your tokens are locked in Fusion+ smart contract</li>
            <li>2. Bridge service creates hashlock on Stellar network</li>
            <li>3. USDC is sent to recipient&apos;s Stellar address</li>
            <li>4. Atomic swap completes when conditions are met</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
