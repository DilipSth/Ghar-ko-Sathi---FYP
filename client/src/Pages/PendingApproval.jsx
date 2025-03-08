import { useNavigate } from 'react-router-dom';

const PendingApproval = () => {
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-md text-center">
        <div className="mb-6">
          <svg 
            className="mx-auto h-24 w-24 text-yellow-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Account Under Review</h2>
        
        <p className="text-gray-600 mb-6">
          Your service provider account is currently pending approval from an administrator. 
          This process may take up to 2-3 hours.
        </p>
        
        <p className="text-gray-600 mb-8">
          Once your account is approved, you&apos;ll have full access to all service provider features. 
          Thank you for your patience!
        </p>
        
        <button
          onClick={handleGoBack}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
        >
          Go Back
        </button>
        
        <div className="border-t mt-6 pt-6">
          <p className="text-sm text-gray-500">
            If you have any questions, please contact support at gharkosathi@gmail.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;