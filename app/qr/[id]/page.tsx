'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'react-qr-code';
import AppLayout from '../../components/AppLayout';
import { retrieveTipJarConfig, isValidCID } from '@/app/utils/storage';
import { siteConfig } from '@/app/siteConfig';

interface TipJarData {
  name: string;
  walletAddress: string;
  recipientToken: 'USDC' | 'DAI' | 'USDT';
}

export default function QRPage() {
  const params = useParams();
  const tipJarId = params?.id as string;
  const [tipJarData, setTipJarData] = useState<TipJarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const tipJarUrl = `${siteConfig.appUrl}/tip/${tipJarId}`;

  useEffect(() => {
    const loadTipJarData = async () => {
      if (!tipJarId) return;

      try {
        console.log(`🔍 Loading tip jar data for QR: ${tipJarId}`);

        if (!isValidCID(tipJarId)) {
          setErrorMessage('Invalid tip jar ID format');
          return;
        }

        const config = await retrieveTipJarConfig(tipJarId);

        if (!config) {
          setErrorMessage('Tip jar not found');
          return;
        }

        setTipJarData({
          name: config.name,
          walletAddress: config.walletAddress,
          recipientToken: config.recipientToken,
        });
      } catch (error) {
        console.error('❌ Error loading tip jar for QR:', error);
        setErrorMessage('Failed to load tip jar configuration');
      } finally {
        setIsLoading(false);
      }
    };

    loadTipJarData();
  }, [tipJarId]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(tipJarUrl);
      // You could add a toast notification here
      console.log('URL copied to clipboard');
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share && tipJarData) {
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

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>
          <p className="mt-4 text-gray-600">Loading QR code...</p>
        </div>
      </AppLayout>
    );
  }

  if (errorMessage || !tipJarData) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            QR Code Not Available
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {errorMessage || 'Unable to generate QR code'}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">📱</div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            QR Code for {tipJarData.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Scan to send tips in any token
          </p>
        </div>

        {/* QR Code Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          {/* QR Code */}
          <div className="bg-white p-6 rounded-xl mb-6 inline-block">
            <QRCode
              value={tipJarUrl}
              size={256}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox={`0 0 256 256`}
            />
          </div>

          {/* Tip Jar Info */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
              {tipJarData.name}
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Receives tips as {tipJarData.recipientToken}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Powered by 1inch Fusion+ • Zero gas fees
            </p>
          </div>

          {/* URL Display */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tip Jar URL:
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 break-all font-mono">
              {tipJarUrl}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={handleCopyUrl}
              className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              📋 Copy URL
            </button>

            <button
              onClick={handleShare}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              📤 Share
            </button>

            <button
              onClick={() => window.open(tipJarUrl, '_blank')}
              className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              🪙 View Tip Jar
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-left">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
              📱 How to use this QR code:
            </h3>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Scan with any QR code reader or camera app</li>
              <li>• Opens the tip jar page in your browser</li>
              <li>• Connect wallet and send tips in any token</li>
              <li>• Recipient automatically receives {tipJarData.recipientToken}</li>
            </ul>
          </div>
        </div>

        {/* Download Options */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Right-click the QR code above to save as image
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors text-sm"
            >
              🖨️ Print QR Code
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
