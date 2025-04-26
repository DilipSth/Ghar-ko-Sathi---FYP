import React, { useState, useEffect } from 'react';

const [maintenanceDetails, setMaintenanceDetails] = useState(null);

useEffect(() => {
  if (!socket) return;

  socket.on("maintenanceDetailsUpdated", (data) => {
    console.log("Received maintenance details:", data);
    setMaintenanceDetails(data.maintenanceDetails);
    // Also update booking details
    setBookingDetails(prev => ({
      ...prev,
      maintenanceDetails: data.maintenanceDetails
    }));
  });

  return () => {
    socket.off("maintenanceDetailsUpdated");
  };
}, [socket]);

{bookingState === "completed" && (
  <div className="space-y-4">
    <div className="flex items-center justify-center mb-4">
      <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
    <h3 className="text-xl font-bold text-center">Payment Details</h3>
    <p className="text-gray-600 text-center mb-4">
      Please review and proceed with payment.
    </p>

    {/* Show loading state if maintenance details haven't arrived yet */}
    {!maintenanceDetails && !bookingDetails?.maintenanceDetails ? (
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-center space-x-2">
          <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Waiting for service provider to send maintenance details...</span>
        </div>
      </div>
    ) : (
      <div className="bg-gray-50 p-4 rounded-lg space-y-4">
        {/* Service Details */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h4 className="font-medium text-lg mb-3">Service Details</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{(maintenanceDetails || bookingDetails?.maintenanceDetails)?.jobDuration || 1} hour(s)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Rate per Hour:</span>
              <span className="font-medium">Rs. {(maintenanceDetails || bookingDetails?.maintenanceDetails)?.hourlyRate || 200}</span>
            </div>
            <div className="flex justify-between items-center text-blue-600">
              <span className="font-medium">Service Charge:</span>
              <span className="font-medium">Rs. {(maintenanceDetails || bookingDetails?.maintenanceDetails)?.hourlyCharge || 200}</span>
            </div>
          </div>
        </div>

        {/* Materials Used */}
        {((maintenanceDetails || bookingDetails?.maintenanceDetails)?.materials?.length > 0) && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-lg mb-3">Materials Used</h4>
            <div className="space-y-2">
              {(maintenanceDetails || bookingDetails?.maintenanceDetails).materials.map((material, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{material.name}</span>
                  <span className="font-medium">Rs. {material.cost}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t text-blue-600">
                <span className="font-medium">Total Materials:</span>
                <span className="font-medium">Rs. {(maintenanceDetails || bookingDetails?.maintenanceDetails)?.materialCost || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Additional Charges */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h4 className="font-medium text-lg mb-3">Additional Charges</h4>
          <div className="flex justify-between items-center text-blue-600">
            <span className="font-medium">Extra Charges:</span>
            <span className="font-medium">Rs. {(maintenanceDetails || bookingDetails?.maintenanceDetails)?.additionalCharge || 0}</span>
          </div>
        </div>

        {/* Service Notes */}
        {(maintenanceDetails || bookingDetails?.maintenanceDetails)?.maintenanceNotes && (
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h4 className="font-medium text-lg mb-2">Service Notes</h4>
            <p className="text-gray-600 text-sm">
              {(maintenanceDetails || bookingDetails?.maintenanceDetails).maintenanceNotes}
            </p>
          </div>
        )}

        {/* Total Amount */}
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex justify-between items-center text-lg">
            <span className="font-bold text-gray-900">Total Amount:</span>
            <span className="font-bold text-green-600">Rs. {
              (maintenanceDetails || bookingDetails?.maintenanceDetails)?.maintenancePrice || 
              ((maintenanceDetails || bookingDetails?.maintenanceDetails)?.hourlyCharge || 200) +
              ((maintenanceDetails || bookingDetails?.maintenanceDetails)?.materialCost || 0) +
              ((maintenanceDetails || bookingDetails?.maintenanceDetails)?.additionalCharge || 0)
            }</span>
          </div>
        </div>
      </div>
    )}
    
    {/* Payment Options */}
    <div className="space-y-3">
      <h4 className="font-medium text-center">Select Payment Method</h4>
      
      {/* Cash Payment Option */}
      <button
        onClick={() => submitPayment('cash')}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium disabled:opacity-70 disabled:cursor-not-allowed"
        disabled={isProcessingPayment || (!maintenanceDetails && !bookingDetails?.maintenanceDetails)}
      >
        {isProcessingPayment ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Pay with Cash
          </>
        )}
      </button>
      
      {/* eSewa Payment Option */}
      <button
        onClick={() => submitPayment('esewa')}
        className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center font-medium disabled:opacity-70 disabled:cursor-not-allowed"
        disabled={isProcessingPayment || (!maintenanceDetails && !bookingDetails?.maintenanceDetails)}
      >
        {isProcessingPayment ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Pay with eSewa
          </>
        )}
      </button>
    </div>
  </div>
)} 