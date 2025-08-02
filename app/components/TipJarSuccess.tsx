'use client';

import { useState } from 'react';
import Link from 'next/link';
import { siteConfig } from '@/app/siteConfig';
import { type ChainId } from '../utils/oneinch';

interface TipJarSuccessProps {
  tipJarId: string;
  tipJarData: {
    name: string;
    walletAddress: string;
    recipientToken: 'USDC' | 'DAI' | 'USDT' | 'XLM' | 'STELLAR_USDC';
    chains: ChainId[];
    customMessage: string;
    successMessage?: string;
    showSuccessMessage?: boolean;
  };
  onCreateAnother: () => void;
}

export default function TipJarSuccess({ tipJarId, tipJarData, onCreateAnother }: TipJarSuccessProps) {
  const [copySuccess, setCopySuccess] = useState<string>('');

  const tipJarUrl = `${siteConfig.appUrl}/tip/${tipJarId}`;
  const qrUrl = `${siteConfig.appUrl}/qr/${tipJarId}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(tipJarUrl);
      setCopySuccess('URL copied to clipboard!');
      setTimeout(() => setCopySuccess(''), 3000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
      setCopySuccess('Failed to copy URL');
      setTimeout(() => setCopySuccess(''), 3000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${tipJarData.name} - SwapJar`,
          text: `Send tips to ${tipJarData.name} in any token!`,
          url: tipJarUrl,
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to copy URL
        handleCopyUrl();
      }
    } else {
      // Fallback to copy URL
      handleCopyUrl();
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="text-8xl mb-4">🎉</div>
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">
          SwapJar Created Successfully!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Your universal tip jar is ready to receive tips from any blockchain
        </p>
      </div>

      {/* Main Success Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 mb-8">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Left: Tip Jar Details */}
          <div>
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🪙</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                {tipJarData.name}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Receives tips as {tipJarData.recipientToken}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Supports {tipJarData.chains.length} blockchain{tipJarData.chains.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* URL Display */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your SwapJar URL:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 break-all font-mono">
                {tipJarUrl}
              </p>
              {copySuccess && (
                <p className="text-green-600 text-sm mt-2">✓ {copySuccess}</p>
              )}
            </div>

            {/* Features List */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                ✨ Your SwapJar Features:
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• Accept tips from {tipJarData.chains.length}+ blockchain{tipJarData.chains.length !== 1 ? 's' : ''}</li>
                <li>• Auto-swap to {tipJarData.recipientToken}</li>
                <li>• Zero gas fees for you</li>
                <li>• Real-time notifications</li>
                <li>• Powered by 1inch Fusion+</li>
              </ul>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
              Share Your SwapJar
            </h3>

            {/* Primary Actions */}
            <div className="space-y-3">
              <Link
                href={`/tip/${tipJarId}`}
                className="w-full block px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-center"
              >
                🪙 View Your SwapJar
              </Link>

              <Link
                href={qrUrl}
                className="w-full block px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-center"
              >
                📱 View QR Code
              </Link>
            </div>

            {/* Secondary Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCopyUrl}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-sm"
              >
                📋 Copy URL
              </button>

              <button
                onClick={handleShare}
                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
              >
                📤 Share
              </button>
            </div>

            {/* Social Sharing */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Share on social media:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={`https://twitter.com/intent/tweet?text=Check out my new SwapJar! Send me tips in any token and I'll receive ${tipJarData.recipientToken} ⚡&url=${encodeURIComponent(tipJarUrl)}&hashtags=SwapJar,crypto,tips`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-blue-500 text-white rounded text-xs text-center hover:bg-blue-600 transition-colors"
                >
                  🐦 Twitter
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(tipJarUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-blue-700 text-white rounded text-xs text-center hover:bg-blue-800 transition-colors"
                >
                  💼 LinkedIn
                </a>
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(tipJarUrl)}&text=Check out my SwapJar! Send tips in any token 💰`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-blue-400 text-white rounded text-xs text-center hover:bg-blue-500 transition-colors"
                >
                  📬 Telegram
                </a>
              </div>
            </div>

            {/* Create Another */}
            <div className="pt-4">
              <button
                onClick={onCreateAnother}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                ➕ Create Another SwapJar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* How it Works */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            🔄 How Your SwapJar Works
          </h3>
          <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">1</span>
              Someone sends you tips in any token
            </li>
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">2</span>
              1inch Fusion+ automatically swaps to {tipJarData.recipientToken}
            </li>
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">3</span>
              You receive {tipJarData.recipientToken} in your wallet
            </li>
            <li className="flex items-start">
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5">4</span>
              Zero gas fees for you!
            </li>
          </ol>
        </div>

        {/* Next Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            🚀 Next Steps
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Add the URL to your social media bio
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Print the QR code for physical locations
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Share with your community
            </li>
            <li className="flex items-center">
              <span className="text-green-500 mr-2">✓</span>
              Monitor tips in your wallet
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
