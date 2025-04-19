import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import paymentService from '../../services/PaymentService';
import { toast } from 'react-toastify';

// Simple CheckCircle SVG component to replace lucide-react
const CheckCircle = ({ className }) => (
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
    <circle cx="12" cy="12" r="10"></circle>
    <path d="m9 12 2 2 4-4"></path>
  </svg>
);

const PaymentSuccess = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const bookingId = params.get('bookingId');
  
  useEffect(() => {
    const loadBookingDetails = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }
      
      try {
        console.log('Verifying payment for booking ID:', bookingId);
        // Try to get payment status
        const paymentDetails = await paymentService.getPaymentStatus(bookingId);
        console.log('Payment details:', paymentDetails);
        
        // Show success toast
        toast.success('Payment processed successfully!');
        
        // If we got payment details successfully, we don't need to query booking API
        setLoading(false);
      } catch (error) {
        console.error('Error loading payment details:', error);
        setError('Could not verify payment details. Please check your dashboard for booking status.');
        setLoading(false);
      }
    };
    
    loadBookingDetails();
  }, [bookingId]);
  
  const handleGoToDashboard = () => {
    // Navigate to main dashboard
    navigate('/dashboard');
  };
  
  const handleGoToUserMap = () => {
    // Navigate to user map page
    navigate('/dashboard/map');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Processing payment...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Payment Verification</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <button 
            onClick={handleGoToDashboard}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 pt-20">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful!</h1>
          <p className="text-gray-600 mb-6">
            Your payment has been processed successfully. Thank you for using our service!
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={handleGoToUserMap}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Map
            </button>
            
            <button 
              onClick={handleGoToDashboard}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess; 