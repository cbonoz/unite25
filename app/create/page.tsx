
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../components/AppLayout';
import { SUPPORTED_CHAINS, type ChainId } from '../utils/oneinch';
import { createTipJar, getTipJarUrl } from '@/app/utils/storage';
import { siteConfig } from '@/app/siteConfig';

interface FormData {
  displayName: string;
  walletAddress: string;
  preferredStablecoin: 'USDC' | 'DAI' | 'USDT';
  customUrl: string;
  selectedChains: ChainId[];
}

const CreatePage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    displayName: '',
    walletAddress: '',
    preferredStablecoin: 'USDC',
    customUrl: '',
    selectedChains: [SUPPORTED_CHAINS.ETHEREUM],
  });
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const chainOptions = [
    { id: SUPPORTED_CHAINS.ETHEREUM, name: 'Ethereum', color: 'bg-blue-500' },
    { id: SUPPORTED_CHAINS.BASE, name: 'Base', color: 'bg-blue-600' },
    { id: SUPPORTED_CHAINS.OPTIMISM, name: 'Optimism', color: 'bg-red-500' },
    { id: SUPPORTED_CHAINS.POLYGON, name: 'Polygon', color: 'bg-purple-500' },
    { id: SUPPORTED_CHAINS.ARBITRUM, name: 'Arbitrum', color: 'bg-blue-400' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (!formData.walletAddress.trim()) {
      newErrors.walletAddress = 'Wallet address is required';
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.walletAddress)) {
      newErrors.walletAddress = 'Invalid Ethereum address format';
    }

    if (formData.customUrl && !/^[a-zA-Z0-9-_]+$/.test(formData.customUrl)) {
      newErrors.customUrl = 'URL can only contain letters, numbers, hyphens, and underscores';
    }

    if (formData.selectedChains.length === 0) {
      newErrors.chains = 'Select at least one blockchain';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string | ChainId[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleChainToggle = (chainId: ChainId) => {
    setFormData(prev => ({
      ...prev,
      selectedChains: prev.selectedChains.includes(chainId)
        ? prev.selectedChains.filter(id => id !== chainId)
        : [...prev.selectedChains, chainId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsCreating(true);

    try {
      // Create tip jar configuration and store in Storacha
      const { config, cid } = await createTipJar({
        name: formData.displayName,
        description: `${formData.displayName}'s tip jar`,
        walletAddress: formData.walletAddress,
        preferredStablecoin: formData.preferredStablecoin,
        chains: formData.selectedChains,
        customization: {
          primaryColor: '#3B82F6', // Default blue
          backgroundColor: '#F8FAFC', // Default light background
        }
      });

      console.log('Tip jar created:', { config, cid });

      // Redirect to the new tip jar using the CID
      router.push(`/tip/${cid}?created=true`);
    } catch (error) {
      console.error('Error creating tip jar:', error);
      setErrors({ general: 'Failed to create tip jar. Please try again.' });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
            Create Your SwapJar
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Set up your universal tip jar in just a few steps
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Configuration Form */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
                  Configuration
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Your Display Name *
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      placeholder="e.g., Chris's Tips"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.displayName ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {errors.displayName && (
                      <p className="text-red-500 text-sm mt-1">{errors.displayName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Wallet Address *
                    </label>
                    <input
                      type="text"
                      value={formData.walletAddress}
                      onChange={(e) => handleInputChange('walletAddress', e.target.value)}
                      placeholder="0x..."
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.walletAddress ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      This is where you&apos;ll receive your stablecoins
                    </p>
                    {errors.walletAddress && (
                      <p className="text-red-500 text-sm mt-1">{errors.walletAddress}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Preferred Stablecoin
                    </label>
                    <select
                      value={formData.preferredStablecoin}
                      onChange={(e) => handleInputChange('preferredStablecoin', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="USDC">USDC - USD Coin</option>
                      <option value="DAI">DAI - MakerDAO</option>
                      <option value="USDT">USDT - Tether</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Supported Blockchains *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {chainOptions.map((chain) => (
                        <button
                          key={chain.id}
                          type="button"
                          onClick={() => handleChainToggle(chain.id)}
                          className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                            formData.selectedChains.includes(chain.id)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <div className={`w-3 h-3 ${chain.color} rounded-full mx-auto mb-1`}></div>
                          {chain.name}
                        </button>
                      ))}
                    </div>
                    {errors.chains && (
                      <p className="text-red-500 text-sm mt-1">{errors.chains}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Custom URL (Optional)
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-sm">
                        {siteConfig.appUrl.replace(/^https?:\/\//, '')}/
                      </span>
                      <input
                        type="text"
                        value={formData.customUrl}
                        onChange={(e) => handleInputChange('customUrl', e.target.value)}
                        placeholder="yourname"
                        className={`flex-1 px-4 py-3 border rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                          errors.customUrl ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                    </div>
                    {errors.customUrl && (
                      <p className="text-red-500 text-sm mt-1">{errors.customUrl}</p>
                    )}
                  </div>
                </div>

                {errors.general && (
                  <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">{errors.general}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating SwapJar...' : 'Create SwapJar'}
                </button>
              </div>

              {/* Preview */}
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">
                  Preview
                </h2>

                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                    <div className="text-4xl mb-4">🪙</div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                      {formData.displayName || 'Your Tips'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Send tips in any token, I&apos;ll receive {formData.preferredStablecoin}
                    </p>
                    <div className="space-y-2">
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
                        Send Tip
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Supports {formData.selectedChains.length} blockchain{formData.selectedChains.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    ✨ Your SwapJar will:
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• Accept tips from {formData.selectedChains.length}+ blockchain{formData.selectedChains.length !== 1 ? 's' : ''}</li>
                    <li>• Auto-swap to {formData.preferredStablecoin}</li>
                    <li>• Zero gas fees for you</li>
                    <li>• Real-time notifications</li>
                    <li>• Powered by 1inch Fusion+</li>
                  </ul>
                </div>

                {formData.customUrl && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      <strong>Your URL:</strong> {siteConfig.appUrl.replace(/^https?:\/\//, '')}/{formData.customUrl}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default CreatePage;
