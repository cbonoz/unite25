
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '../components/AppLayout';
import TipJarSuccess from '../components/TipJarSuccess';
import { SUPPORTED_CHAINS, type ChainId } from '../utils/oneinch';
import { createTipJar } from '@/app/utils/storage';
import { siteConfig } from '@/app/siteConfig';

interface FormData {
  displayName: string;
  walletAddress: string;
  recipientToken: 'USDC' | 'DAI' | 'USDT' | 'XLM' | 'STELLAR_USDC';
  selectedChains: ChainId[];
  customMessage: string;
  successMessage: string;
}

interface CreatedTipJar {
  id: string;
  data: {
    name: string;
    walletAddress: string;
    recipientToken: 'USDC' | 'DAI' | 'USDT' | 'XLM' | 'STELLAR_USDC';
    chains: ChainId[];
    customMessage: string;
    successMessage?: string;
  };
}

const CreatePage = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    displayName: '',
    walletAddress: '',
    recipientToken: 'USDC',
    selectedChains: [SUPPORTED_CHAINS.ETHEREUM],
    customMessage: '',
    successMessage: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdTipJar, setCreatedTipJar] = useState<CreatedTipJar | null>(null);

  const chainOptions = [
    { id: SUPPORTED_CHAINS.ETHEREUM, name: 'Ethereum', color: 'bg-blue-500' },
    { id: SUPPORTED_CHAINS.BASE, name: 'Base', color: 'bg-blue-300' },
    { id: SUPPORTED_CHAINS.OPTIMISM, name: 'Optimism', color: 'bg-red-500' },
    { id: SUPPORTED_CHAINS.POLYGON, name: 'Polygon', color: 'bg-purple-500' },
    // { id: SUPPORTED_CHAINS.ARBITRUM, name: 'Arbitrum', color: 'bg-blue-400' },
    { id: 'stellar' as ChainId, name: 'Stellar', color: 'bg-green-500' },
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (!formData.walletAddress.trim()) {
      newErrors.walletAddress = 'Wallet address is required';
    }

    // Validate Stellar address if cross-chain is enabled
    if (formData.selectedChains.includes('stellar' as ChainId)) {
      // For Stellar native support, we might need additional validation
      // This could be implemented later based on requirements
    }

    if (formData.selectedChains.length === 0) {
      newErrors.chains = 'Select at least one blockchain';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string | ChainId[] | boolean) => {
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
        recipientToken: formData.recipientToken,
        chains: formData.selectedChains,
        customMessage: formData.customMessage || `Send tips in any token, I'll receive ${formData.recipientToken}`,
        successMessage: formData.successMessage,
        customization: {
          primaryColor: '#3B82F6', // Default blue
          backgroundColor: '#F8FAFC', // Default light background
        }
      });

      console.log('Tip jar created:', { config, cid });

      // Show success component instead of redirecting
      setCreatedTipJar({
        id: cid,
        data: {
          name: formData.displayName,
          walletAddress: formData.walletAddress,
          recipientToken: formData.recipientToken,
          chains: formData.selectedChains,
          customMessage: formData.customMessage,
          successMessage: formData.successMessage,
        }
      });
    } catch (error) {
      console.error('Error creating tip jar:', error);
      setErrors({ general: 'Failed to create tip jar. Please try again.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateAnother = () => {
    setCreatedTipJar(null);
    setFormData({
      displayName: '',
      walletAddress: '',
      recipientToken: 'USDC',
      selectedChains: [SUPPORTED_CHAINS.ETHEREUM],
      customMessage: '',
      successMessage: '',
    });
    setErrors({});
  };

  return (
    <AppLayout>
      {createdTipJar ? (
        <TipJarSuccess
          tipJarId={createdTipJar.id}
          tipJarData={createdTipJar.data}
          onCreateAnother={handleCreateAnother}
        />
      ) : (
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
              Create Your SwapJar
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Set up your universal tip jar link in just a few steps
            </p>
          </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Configuration Form */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
                    Configuration
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        displayName: "Sarah & Mike's Wedding Fund 💒",
                        walletAddress: "0x742d35Cc6634C0532925a3b8D4020A2E2B1e8d4B",
                        recipientToken: 'USDC',
                        selectedChains: [SUPPORTED_CHAINS.ETHEREUM, 'stellar' as ChainId],
                        customMessage: "Help us celebrate our special day! Your tips will go toward our honeymoon in Italy. We accept any token from any chain - it all converts to USDC automatically! 🇮🇹✨",
                        successMessage: "Thank you for celebrating with us! ❤️ Your donation means the world to us.",
                      });
                      setErrors({});
                    }}
                    className="cursor-pointer px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center gap-2 shadow-md"
                  >
                    <span>✨</span>
                    Use Wedding Demo
                  </button>
                </div>

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
                      Receive Donations In
                    </label>
                    <select
                      value={formData.recipientToken}
                      onChange={(e) => handleInputChange('recipientToken', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="USDC">USDC - USD Coin</option>
                      <option value="DAI">DAI - MakerDAO</option>
                      <option value="USDT">USDT - Tether</option>
                      <option value="XLM">XLM - Stellar Lumens</option>
                      <option value="STELLAR_USDC">USDC on Stellar</option>
                    </select>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      All tips will be automatically converted to this currency
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Wallet address
                    </label>
                    <input
                      type="text"
                      value={formData.walletAddress}
                      onChange={(e) => handleInputChange('walletAddress', e.target.value)}
                      placeholder={formData.selectedChains.includes('stellar' as ChainId) && formData.selectedChains.length === 1 ? 'G...' : '0x...'}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${
                        errors.walletAddress ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Enter your wallet address
                      {/* {formData.selectedChains.includes('stellar' as ChainId) && formData.selectedChains.length === 1
                        ? 'Enter your Stellar address (starts with G)'
                        : 'Enter your Ethereum address (starts with 0x)'
                      } */}
                    </p>
                    {errors.walletAddress && (
                      <p className="text-red-500 text-sm mt-1">{errors.walletAddress}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Custom Message (Optional)
                    </label>
                    <textarea
                      value={formData.customMessage}
                      onChange={(e) => handleInputChange('customMessage', e.target.value)}
                      placeholder={`Send tips in any token, I'll receive ${formData.recipientToken}`}
                      rows={5}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      This message will be displayed on your tip jar page. Leave blank to use default.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Success Message (Optional)
                    </label>
                    <textarea
                      value={formData.successMessage}
                      onChange={(e) => handleInputChange('successMessage', e.target.value)}
                      placeholder="Thank you for your donation! Your support means a lot to us."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      This message will be shown after a successful donation. Leave blank to only show default message.
                    </p>
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
                      {formData.customMessage || `Send tips in any token, I'll receive ${formData.recipientToken}`}
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
                    <li>• Auto-convert to {formData.recipientToken}</li>
                    <li>• Zero gas fees for you</li>
                    <li>• Real-time notifications</li>
                    <li>• Powered by 1inch Fusion+</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </form>
        </div>
      )}
    </AppLayout>
  );
}

export default CreatePage;
