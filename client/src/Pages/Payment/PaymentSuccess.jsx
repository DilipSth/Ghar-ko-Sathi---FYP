import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import paymentService from '../../services/PaymentService';
import bookingService from '../../services/BookingService';

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
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
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
        // Get booking details
        const bookingDetails = await bookingService.getBookingById(bookingId);
        setBooking(bookingDetails);
        
        // Get payment status
        const paymentDetails = await paymentService.getPaymentStatus(bookingId);
        console.log('Payment details:', paymentDetails);
      } catch (error) {
        console.error('Error loading booking details:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadBookingDetails();
  }, [bookingId]);
  
  const handleGoToBooking = () => {
    navigate(`/booking/${bookingId}`);
  };
  
  const handleGoHome = () => {
    navigate('/');
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }
  
  if (!bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Missing Booking Information</h1>
          <p className="text-gray-600 mb-8">We couldn't find the booking details for this payment.</p>
          <button 
            onClick={handleGoHome}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Home
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
          
          {booking && (
            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <h2 className="font-semibold text-lg mb-2">Payment Details</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID:</span>
                  <span>{booking._id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="capitalize">{booking.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span>Rs. {booking.totalCharge}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-green-600 font-medium">Completed</span>
                </div>
                {booking.paymentDetails?.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paid On:</span>
                    <span>{new Date(booking.paymentDetails.paidAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button 
              onClick={handleGoToBooking}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              View Booking Details
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

export default PaymentSuccess; 