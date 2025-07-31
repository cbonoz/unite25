interface ErrorScreenProps {
  errorMessage: string;
  errorType: 'tipjar' | 'transaction' | null;
  onGoHome: () => void;
  onGoBack: () => void;
}

export default function ErrorScreen({
  errorMessage,
  errorType,
  onGoHome,
  onGoBack
}: ErrorScreenProps) {
  const isTipJarError = errorType === 'tipjar';

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="text-red-500 text-6xl mb-4">❌</div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
        {isTipJarError ? 'Tip Jar Not Found' : 'Transaction Failed'}
      </h1>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        {errorMessage}
      </p>
      <button
        onClick={isTipJarError ? onGoHome : onGoBack}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {isTipJarError ? 'Go Home' : 'Go Back'}
      </button>
    </div>
  );
}
