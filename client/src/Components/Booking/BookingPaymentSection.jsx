import React from 'react';
import PaymentOptions from '../Payment/PaymentOptions';

const BookingPaymentSection = ({ booking }) => {
  // Check if booking exists and is in the state where payment is needed
  if (!booking) {
    return null;
  }

  // Only show payment options for completed bookings that aren't paid yet
  const isCompletedNotPaid = 
    ['completed', 'completed-by-user', 'completed-by-provider'].includes(booking.status) && 
    booking.paymentStatus !== 'completed';

  if (!isCompletedNotPaid) {
    return null;
  }

  return (
    <div className="mt-6 bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-center">Payment Required</h2>
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
        <p className="text-yellow-800">
          Your service has been completed. Please select a payment method to complete the booking.
        </p>
      </div>
      
      <PaymentOptions booking={booking} />
    </div>
  );
};

export default BookingPaymentSection; 