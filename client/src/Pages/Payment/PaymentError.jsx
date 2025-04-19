import { useLocation, useNavigate } from 'react-router-dom';

// Simple AlertTriangle SVG component to replace lucide-react
const AlertTriangle = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
    <path d="M12 9v4"></path>
    <path d="M12 17h.01"></path>
  </svg>
);

const PaymentError = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const errorMessage = params.get('message') || 'Your payment could not be processed';

  const handleTryAgain = () => {
    navigate(-1); // Go back to previous page
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Failed</h1>
          <p className="text-gray-600 mb-6">
            {errorMessage}
          </p>
          
          <div className="bg-red-50 p-4 rounded-md mb-6 text-left">
            <h2 className="font-semibold text-lg mb-2">What went wrong?</h2>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>The payment might have been cancelled</li>
              <li>There could be an issue with the payment gateway</li>
              <li>Your account may have insufficient funds</li>
              <li>There might be a temporary technical issue</li>
            </ul>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button 
              onClick={handleTryAgain}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={handleGoHome}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentError; 