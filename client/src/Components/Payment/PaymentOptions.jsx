import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import paymentService from '../../services/PaymentService';
import esewaLogo from '../../assets/esewa-logo.png'; // You need to add this image

const PaymentOptions = ({ booking }) => {
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');
  const navigate = useNavigate();

  // Handle payment method selection
  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
  };

  // Handle payment submission
  const handleSubmitPayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    try {
      setProcessing(true);

      if (selectedMethod === 'cash') {
        const response = await paymentService.markAsCashPayment(booking._id);
        toast.success('Booking marked as paid by cash');
        // After successful cash payment, set localStorage and navigate to dashboard for review
        localStorage.setItem('showReviewForm', 'true');
        localStorage.setItem('reviewBookingId', booking._id);
        // Assuming booking object in PaymentOptions has providerId and name
        if (booking.providerId) {
           localStorage.setItem('reviewProviderId', booking.providerId._id || booking.providerId);
           localStorage.setItem('reviewProviderName', booking.providerId.name || 'Service Provider');
        }
        navigate('/dashboard');
      } else if (selectedMethod === 'esewa') {
        const response = await paymentService.initiateEsewaPayment(booking._id);
        if (response.success) {
          // Submit eSewa payment form
          paymentService.submitEsewaForm(response.paymentUrl, response.formData);
          toast.info('Processing payment with eSewa. Please complete the payment process.');
        } else {
          throw new Error(response.message || 'Failed to initiate eSewa payment');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment processing failed');
    } finally {
      setProcessing(false);
    }
  };

  if (!booking) {
    return <div className="p-4 text-center">No booking information available</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Choose Payment Method</h2>
      
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Service Charge:</span>
          <span className="font-semibold">Rs. {booking.charge || booking.hourlyCharge || 200}</span>
        </div>
        
        {(booking.materialsCost > 0 || booking.materialCost > 0) && (
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Materials Cost:</span>
            <span className="font-semibold">Rs. {booking.materialsCost || booking.materialCost || 0}</span>
          </div>
        )}
        
        {(booking.additionalCharge > 0) && (
          <div className="flex justify-between mb-2">
            <span className="text-gray-600">Additional Charges:</span>
            <span className="font-semibold">Rs. {booking.additionalCharge || 0}</span>
          </div>
        )}
        
        <div className="flex justify-between mt-2 pt-2 border-t border-gray-200">
          <span className="text-gray-700 font-semibold">Total Amount:</span>
          <span className="text-lg font-bold text-blue-600">
            Rs. {booking.totalCharge || booking.maintenancePrice || 
            ((booking.charge || booking.hourlyCharge || 200) + 
            (booking.materialsCost || booking.materialCost || 0) + 
            (booking.additionalCharge || 0))}
          </span>
        </div>
      </div>
      
      <div className="space-y-4 mb-6">
        <div 
          className={`border rounded-lg p-4 cursor-pointer transition-all ${
            selectedMethod === 'cash' 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-200 hover:border-blue-300'
          }`}
          onClick={() => handleSelectMethod('cash')}
        >
          <div className="flex items-center">
            <div className="w-6 h-6 border border-gray-300 rounded-full flex items-center justify-center mr-3">
              {selectedMethod === 'cash' && (
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Cash Payment</h3>
              <p className="text-sm text-gray-500">Pay directly to the service provider</p>
            </div>
          </div>
        </div>
        
        <div 
          className={`border rounded-lg p-4 cursor-pointer transition-all ${
            selectedMethod === 'esewa' 
              ? 'border-green-500 bg-green-50' 
              : 'border-gray-200 hover:border-green-300'
          }`}
          onClick={() => handleSelectMethod('esewa')}
        >
          <div className="flex items-center">
            <div className="w-6 h-6 border border-gray-300 rounded-full flex items-center justify-center mr-3">
              {selectedMethod === 'esewa' && (
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              )}
            </div>
            <div className="flex-1 flex items-center">
              <div>
                <h3 className="font-medium">eSewa</h3>
                <p className="text-sm text-gray-500">Pay online using eSewa</p>
              </div>
              <div className="ml-auto">
                <img 
                  src={esewaLogo || 'https://esewa.com.np/common/images/esewa_logo.png'} 
                  alt="eSewa" 
                  className="h-8"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://esewa.com.np/common/images/esewa_logo.png';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <button
        className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        onClick={handleSubmitPayment}
        disabled={!selectedMethod || processing}
      >
        {processing 
          ? 'Processing...' 
          : selectedMethod === 'esewa' 
            ? 'Pay with eSewa' 
            : selectedMethod === 'cash' 
              ? 'Confirm Cash Payment' 
              : 'Proceed to Payment'}
      </button>
    </div>
  );
};

export default PaymentOptions; 
