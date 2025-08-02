import Header from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export default function AppLayout({ children, className = '' }: AppLayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 ${className}`}>
      <Header />
      <main className="flex-1 container mx-auto px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 dark:bg-gray-900 text-white py-8 mt-auto">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <span className="text-2xl">🪙</span>
              <span className="text-xl font-bold">SwapJar</span>
            </div>
            <div className="flex space-x-6 text-sm">
              <a href="#" className="hover:text-blue-400 transition-colors">Documentation</a>
              <a href="https://github.com/cbonoz/unite25" className="hover:text-blue-400 transition-colors">GitHub</a>
            </div>
          </div>
           <div className="border-t border-gray-700 mt-8 pt-8 text-center">
            <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4 max-w-2xl mx-auto">

              <p className="text-gray-300 font-semibold mb-1">⚠ Hackathon Prototype</p>
              <p className="text-gray-200 text-sm">
                This is a prototype built for ETHGlobal Unite 2025.
              </p>
            </div>
            <p className="text-gray-400">Powered by 1inch Fusion+ • Built for ETHGlobal Unite 2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
