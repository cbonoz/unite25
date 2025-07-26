'use client';

import Image from "next/image";
import { useRouter } from 'next/navigation';
import Header from './components/Header';

export default function Home() {
  const { push } = useRouter();

  const goToCreate = () => {
    push("/create");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Header />

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-12">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-white mb-6">
            Receive tips in <span className="text-blue-600">any token</span> from{" "}
            <span className="text-purple-600">any chain</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Automatically swapped to your favorite stablecoin via{" "}
            <span className="font-semibold">1inch Fusion+</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-lg font-semibold"
            onClick={goToCreate}
            >
              Create Your Tip Jar
            </button>
            <button
              onClick={() => push('/tip/demo')}
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 transition-colors text-lg font-semibold"
            >
              View Demo
            </button>
          </div>
        </div>

        {/* How It Works */}
        <section className="py-16">
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-12">
            How SwapJar Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Create Tip Jar
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Set your wallet address and preferred stablecoin. Get a shareable link.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Receive Tips
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Accept any ERC-20 token from Ethereum, Base, Optimism, or USDC/XLM from Stellar.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔁</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Auto-Swap
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                1inch Fusion+ automatically swaps tokens to your chosen stablecoin.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Get Stablecoins
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Receive USDC, DAI, or USDT directly in your wallet with zero gas fees.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 bg-white dark:bg-gray-800 rounded-2xl">
          <div className="px-8">
            <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-12">
              Why Choose SwapJar?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                  🎯 Universal Compatibility
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  One link accepts tips from Ethereum, Base, Optimism, and Stellar. No more chain restrictions.
                </p>
              </div>
              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                  ⚡ Zero Gas Fees
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Fusion+ handles all swaps gaslessly. You keep 100% of your tip value.
                </p>
              </div>
              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                  💰 Stable Value
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Always receive stablecoins. No volatility risk, no manual conversions needed.
                </p>
              </div>
              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                  🌉 Cross-Chain Bridge
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  First to support Stellar → EVM tips via Circle CCTP integration.
                </p>
              </div>
              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                  🔄 Intent-Based Swaps
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Better prices, MEV protection, and guaranteed execution with 1inch Fusion+.
                </p>
              </div>
              <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
                  📱 Simple UX
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Clean interface supporting both EVM and Stellar wallets seamlessly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Chains */}
        <section className="py-16">
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-12">
            Supported Networks
          </h2>
          <div className="flex flex-wrap justify-center gap-8">
            <div className="flex items-center space-x-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="w-8 h-8 bg-blue-500 rounded-full"></div>
              <span className="font-semibold text-gray-800 dark:text-white">Ethereum</span>
            </div>
            <div className="flex items-center space-x-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
              <span className="font-semibold text-gray-800 dark:text-white">Base</span>
            </div>
            <div className="flex items-center space-x-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="w-8 h-8 bg-red-500 rounded-full"></div>
              <span className="font-semibold text-gray-800 dark:text-white">Optimism</span>
            </div>
            <div className="flex items-center space-x-3 px-6 py-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <div className="w-8 h-8 bg-black dark:bg-white rounded-full"></div>
              <span className="font-semibold text-gray-800 dark:text-white">Stellar</span>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
              Ready to Start Receiving Tips?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Create your universal tip jar in seconds. No setup fees, no monthly costs.
            </p>
            <button className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all text-lg font-semibold shadow-lg">
              Create Your SwapJar Now
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 dark:bg-gray-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <span className="text-2xl">🪙</span>
              <span className="text-xl font-bold">SwapJar</span>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-blue-400 transition-colors">Documentation</a>
              <a href="#" className="hover:text-blue-400 transition-colors">GitHub</a>
              <a href="#" className="hover:text-blue-400 transition-colors">Support</a>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
            <p>Powered by 1inch Fusion+ • Built for ETHGlobal Unite 2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
