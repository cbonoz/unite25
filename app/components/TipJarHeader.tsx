interface TipJarHeaderProps {
  name: string;
  recipientToken: string;
  walletAddress: string;
  customMessage?: string;
}

export default function TipJarHeader({
  name,
  recipientToken,
  walletAddress,
  customMessage
}: TipJarHeaderProps) {
  return (
    <div className="text-center mb-8">
      <div className="text-6xl mb-4">🪙</div>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
        {name}
      </h1>
      <div className="flex items-center justify-center gap-2">
        <p className="text-gray-600 dark:text-gray-300">
          {customMessage || `Send tips in any token, I'll receive ${recipientToken}`}
        </p>
        <div className="relative group">
          <div className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
            ℹ️
          </div>
          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            Recipient: {walletAddress}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800 dark:border-t-gray-700"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
