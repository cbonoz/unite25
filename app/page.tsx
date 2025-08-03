'use client';

import { useRouter } from 'next/navigation';
import AppLayout from './components/AppLayout';
import { siteConfig } from './siteConfig';

export default function Home() {
  const { push } = useRouter();

  const goToCreate = () => {
    push("/create");
  };

  return (
    <AppLayout backgroundImage="/coin_background.png">
      {/* Hero Section */}
      <div className="py-4">
        <div className="text-center max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-800 dark:text-white mb-6 mt-6 font-serif">
            Receive payments in <span className="text-blue-600">any token</span> from{" "}
            <span className="text-purple-600">any chain</span>*
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
            Automatically swapped to your favorite coin or stablecoin via{" "}
            <span className="font-semibold">1inch Fusion+</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <button className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-lg font-semibold"
            onClick={goToCreate}
            >
              Create Your Payment Jar
            </button>
            <button
              onClick={() => window.open(siteConfig.youtubeUrl, '_blank')}
              className="px-8 py-4 border-2 border-gray-300 text-gray-700 dark:text-gray-300 dark:border-gray-600 rounded-xl hover:border-blue-500 transition-colors text-lg font-semibold"
            >
              View Demo
            </button>
          </div>
          <div className="text-center">
            <button
              onClick={() => push('/about')}
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Learn more about how SwapJar works →
            </button>
          </div>
        </div>

        {/* Key Benefits Summary */}
        <section className="py-16">
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-12">
            Why SwapJar?
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Universal Compatibility
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Accept payments from any supported blockchain with one simple link.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Zero Gas Fees
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Keep more of your payment value with gasless swaps via Fusion+.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">💎</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Auto-Convert to Stablecoin
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                No volatility risk - receive USDC, DAI, or USDT automatically.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
              Ready to Start Receiving Payments?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Create your universal payment link in seconds. No setup fees, no monthly costs.
            </p>
            <button
              onClick={goToCreate}
              className="px-12 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all text-lg font-semibold shadow-lg"
            >
              Create Your SwapJar Now
            </button>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
