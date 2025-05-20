import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import paymentService from '../../services/PaymentService';
import { toast } from 'react-toastify';
import axios from 'axios';
import PropTypes from 'prop-types';

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

CheckCircle.propTypes = {
  className: PropTypes.string
};

const PaymentSuccess = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  
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
        
        // Get booking details to show provider information
        try {
          const response = await axios.get(
            `/api/bookings/${bookingId}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          console.log("Booking details response:", response.data);
          const fetchedBookingDetails = response.data.booking;
          setBookingDetails(fetchedBookingDetails);

          // Set localStorage flags and navigate to dashboard to show review form
          localStorage.setItem('showReviewForm', 'true');
          localStorage.setItem('reviewBookingId', bookingId);

          if (fetchedBookingDetails?.providerId?._id) {
            localStorage.setItem('reviewProviderId', fetchedBookingDetails.providerId._id);
            localStorage.setItem('reviewProviderName', fetchedBookingDetails.providerId.name || 'Service Provider');
          } else if (fetchedBookingDetails?.providerId) {
            localStorage.setItem('reviewProviderId', fetchedBookingDetails.providerId);
            localStorage.setItem('reviewProviderName', 'Service Provider');
          }

          // Navigate to dashboard with the review tab active
          navigate('/dashboard?showReview=true');

          // Show success toast (optional, might happen before navigation)
          toast.success('Payment processed successfully!');

          // No need to set loading to false here as we are navigating away
          // setLoading(false);

        } catch (err) {
          console.error('Error fetching booking details after payment success:', err);
          // Even if booking details fetch fails, redirect to dashboard
          toast.success('Payment processed, but could not fetch booking details for review.');
          navigate('/dashboard'); // Redirect to dashboard without showing review form
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading payment details:', error);
        setError('Could not verify payment details. Please check your dashboard for booking status.');
        setLoading(false);
      }
    };
    
    loadBookingDetails();
  }, [bookingId, navigate]);
  
  const handleGoToDashboard = () => {
    // Navigate to main dashboard (not in a new page)
    navigate('/dashboard');
  };
  
  const handleGoToUserMap = () => {
    // Navigate to user map page (not in a new page)
    navigate('/dashboard/menu/maps');
  };
  
  const handleGoToReview = () => {
    // Save the booking information to state or localStorage so that 
    // the dashboard can access and display the review form
    localStorage.setItem('showReviewForm', 'true');
    localStorage.setItem('reviewBookingId', bookingId);
    
    if (bookingDetails?.providerId?._id) {
      localStorage.setItem('reviewProviderId', bookingDetails.providerId._id);
      localStorage.setItem('reviewProviderName', bookingDetails.providerId.name || 'Service Provider');
    } else if (bookingDetails?.providerId) {
      localStorage.setItem('reviewProviderId', bookingDetails.providerId);
      localStorage.setItem('reviewProviderName', 'Service Provider');
    }
    
    // Navigate to dashboard with the review tab active
    navigate('/dashboard?showReview=true');
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
              onClick={handleGoToReview}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Write a Review
            </button>
            
            <button 
              onClick={handleGoToDashboard}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
            >
              Go to Dashboard
            </button>
            
            <button 
              onClick={handleGoToUserMap}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Go to Map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess; 