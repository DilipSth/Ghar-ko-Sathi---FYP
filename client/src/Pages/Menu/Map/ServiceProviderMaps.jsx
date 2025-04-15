import { useState, useEffect, useContext } from 'react';
import { useAuth } from '../../../context/authContext';
import { SocketContext } from '../../../context/SocketContext';
import LiveTracking from '../../../Components/LiveTracking';

const ServiceProviderMap = () => {
  const [activeTab, setActiveTab] = useState('available');
  const [currentRequest, setCurrentRequest] = useState(null);
  const [bookingState, setBookingState] = useState('idle');
  const [serviceHistory, setServiceHistory] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [locationName, setLocationName] = useState('');
  const [currentPosition, setCurrentPosition] = useState(null);
  const [userPhone, setUserPhone] = useState('');
  const { user } = useAuth();
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    if (!socket) return;

    socket.on("newBookingRequest", (booking) => {
      setPendingRequests((prev) => [...prev, booking]);
    });

    socket.on("bookingConfirmed", (booking) => {
      setBookingState('accepted');
      setCurrentRequest(booking);
    });

    socket.on("bookingConfirmedByUser", (booking) => {
      setBookingState('confirmed');
      setCurrentRequest(booking);
    });

    socket.on("problemDescriptionReceived", (booking) => {
      setBookingState('confirmed');
      setCurrentRequest(booking);
    });

    socket.on("jobStartedSuccess", (booking) => {
      setBookingState('ongoing');
      setCurrentRequest(booking);
    });

    socket.on("userCompletedJob", (booking) => {
      setBookingState('user-completed');
      setCurrentRequest(booking);
    });

    socket.on("jobCompleted", (booking) => {
      setBookingState('completed');
      setCurrentRequest(booking);
      setServiceHistory((prev) => [
        {
          id: booking.bookingId,
          customer: { name: booking.details.address.split(',')[0] },
          service: booking.details.service,
          issue: booking.details.issue,
          requestTime: new Date(booking.details.requestTime).toLocaleTimeString(),
          status: "completed",
          earnings: 75,
          date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        },
        ...prev,
      ]);
    });

    socket.on("reviewReceived", (booking) => {
      setBookingState('reviewed');
      setCurrentRequest(booking);
    });

    return () => {
      // Socket disconnection is handled by SocketProvider
    };
  }, [user, socket]);

  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
  };

  const viewRequest = (request) => {
    setCurrentRequest(request);
    setBookingState('reviewing');
  };

  const acceptRequest = () => {
    if (currentRequest && socket) {
      socket.emit("acceptBooking", { bookingId: currentRequest.bookingId });
      setPendingRequests(pendingRequests.filter(req => req.bookingId !== currentRequest.bookingId));
    }
  };

  const declineRequest = () => {
    if (currentRequest && socket) {
      socket.emit("declineBooking", { bookingId: currentRequest.bookingId });
      setPendingRequests(pendingRequests.filter(req => req.bookingId !== currentRequest.bookingId));
      setCurrentRequest(null);
      setBookingState('idle');
    }
  };

  const startJob = () => {
    if (currentRequest && socket) {
      socket.emit("startJob", { bookingId: currentRequest.bookingId });
    }
  };

  const completeJob = () => {
    if (currentRequest && socket) {
      socket.emit("completeJob", {
        bookingId: currentRequest.bookingId,
        completedBy: "provider",
      });
    }
  };

  const goBackToIdle = () => {
    setCurrentRequest(null);
    setBookingState('idle');
  };

  const handlePositionUpdate = (position) => {
    setCurrentPosition(position);
  };

  useEffect(() => {
    if (currentPosition) {
      const getLocationName = async () => {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentPosition.lat}&lon=${currentPosition.lng}`
          );
          const data = await response.json();
          setLocationName(data.display_name || `${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`);
        } catch (error) {
          setLocationName(`${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`);
        }
      };

      getLocationName();
    }
  }, [currentPosition]);

  return (
    <div className="p-4 h-full">
      <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-2xl">Service Provider Dashboard</h3>
          <div className="flex items-center">
            <span className="mr-2 text-sm">Status:</span>
            <button onClick={toggleAvailability} className={`px-3 py-1 rounded-full text-sm ${isAvailable ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
              {isAvailable ? 'Available' : 'Unavailable'}
            </button>
          </div>
        </div>
        <div className="flex border-b mb-4">
          <button className={`py-2 px-4 font-medium ${activeTab === 'available' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('available')}>
            Available Jobs
          </button>
          <button className={`py-2 px-4 font-medium ${activeTab === 'history' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('history')}>
            Service History
          </button>
          <button className={`py-2 px-4 font-medium ${activeTab === 'earnings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('earnings')}>
            Earnings
          </button>
        </div>
        <div className="flex flex-col h-full">
          {bookingState === 'idle' && (
            <>
              <div className="h-2/3 w-full rounded overflow-hidden mb-4">
                <LiveTracking bookingDetails={currentRequest} showDirections={bookingState === 'ongoing'} onPositionUpdate={handlePositionUpdate} />
              </div>
              {activeTab === 'available' && (
                <div className="h-1/3 overflow-y-auto">
                  <div className="bg-white rounded-lg shadow-lg p-4">
                    <h4 className="font-semibold mb-4">Available Requests</h4>
                    {pendingRequests.length > 0 ? (
                      <div className="space-y-3">
                        {pendingRequests.map(request => (
                          <div key={request.bookingId} className="bg-gray-100 p-3 rounded-lg">
                            <div className="flex justify-between">
                              <div className="flex items-start">
                                <div>
                                  <h5 className="font-medium">{request.details.address.split(',')[0]}</h5>
                                  <p className="text-xs text-gray-600">{request.details.service} - {request.details.issue}</p>
                                  <p className="text-xs text-gray-600">{new Date(request.details.requestTime).toLocaleTimeString()}</p>
                                  <p className="text-xs text-gray-600">Phone: {request.userPhone}</p>
                                  <p className="text-xs text-gray-600">Location: {request.userLocationName}</p>
                                </div>
                              </div>
                              <button onClick={() => viewRequest(request)} className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700">View Details</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <p>No available requests at the moment</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'history' && (
                <div className="h-1/3 overflow-y-auto">
                  <div className="bg-white rounded-lg shadow-lg p-4">
                    <h4 className="font-semibold mb-4">Service History</h4>
                    {serviceHistory.length > 0 ? (
                      <div className="space-y-3">
                        {serviceHistory.map(service => (
                          <div key={service.id} className="bg-gray-100 p-3 rounded-lg">
                            <div className="flex justify-between">
                              <div>
                                <h5 className="font-medium">{service.customer.name}</h5>
                                <p className="text-xs text-gray-600">{service.service} - {service.issue}</p>
                                <p className="text-xs text-gray-600">{service.date}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">Rs{service.earnings}</p>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Completed</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <p>No service history yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'earnings' && (
                <div className="h-1/3 overflow-y-auto">
                  <div className="bg-white rounded-lg shadow-lg p-4">
                    <h4 className="font-semibold mb-4">Earnings Summary</h4>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="text-gray-600 text-xs">Today</p>
                        <p className="font-bold text-xl">Rs135</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="text-gray-600 text-xs">This Week</p>
                        <p className="font-bold text-xl">Rs560</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="text-gray-600 text-xs">This Month</p>
                        <p className="font-bold text-xl">Rs2,240</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          {bookingState === 'reviewing' && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Service Request</h3>
                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm font-semibold">Issue</p>
                    <p>{currentRequest.details.issue}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Address</p>
                    <p>{currentRequest.details.address}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Service</p>
                    <p>{currentRequest.details.service}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Phone</p>
                    <p>{currentRequest.userPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Location</p>
                    <p>{currentRequest.userLocationName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={declineRequest} className="py-2 border border-gray-300 rounded-lg hover:bg-gray-100">Decline</button>
                  <button onClick={acceptRequest} className="py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Accept</button>
                </div>
              </div>
            </div>
          )}
          {bookingState === 'accepted' && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Waiting for User Confirmation</h3>
                <p className="text-gray-600 mb-4">Please wait for the user to confirm the booking.</p>
                <div className="space-y-2">
                  <p className="text-sm"><span className="font-semibold">Service:</span> {currentRequest.details.service}</p>
                  <p className="text-sm"><span className="font-semibold">Address:</span> {currentRequest.details.address}</p>
                  <p className="text-sm"><span className="font-semibold">Phone:</span> {currentRequest.userPhone}</p>
                  <p className="text-sm"><span className="font-semibold">Location:</span> {currentRequest.userLocationName}</p>
                </div>
              </div>
            </div>
          )}
          {bookingState === 'confirmed' && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Booking Confirmed</h3>
                <div className="space-y-2 mb-6">
                  <p className="text-sm"><span className="font-semibold">Service:</span> {currentRequest.details.service}</p>
                  <p className="text-sm"><span className="font-semibold">Address:</span> {currentRequest.details.address}</p>
                  <p className="text-sm"><span className="font-semibold">Phone:</span> {currentRequest.userPhone}</p>
                  <p className="text-sm"><span className="font-semibold">Location:</span> {currentRequest.userLocationName}</p>
                  {currentRequest.details.description && (
                    <p className="text-sm"><span className="font-semibold">Description:</span> {currentRequest.details.description}</p>
                  )}
                </div>
                <button onClick={startJob} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">Start Job</button>
              </div>
            </div>
          )}
          {bookingState === 'ongoing' && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Service in Progress</h3>
                <div className="space-y-2 mb-4">
                  <p className="text-sm"><span className="font-semibold">Service:</span> {currentRequest.details.service}</p>
                  <p className="text-sm"><span className="font-semibold">Address:</span> {currentRequest.details.address}</p>
                  <p className="text-sm"><span className="font-semibold">Phone:</span> {currentRequest.userPhone}</p>
                  <p className="text-sm"><span className="font-semibold">Location:</span> {currentRequest.userLocationName}</p>
                  <p className="text-sm"><span className="font-semibold">Description:</span> {currentRequest.details.description}</p>
                </div>
                <div className="h-48 mb-4 rounded-lg overflow-hidden border border-gray-200">
                  <LiveTracking bookingDetails={currentRequest} showDirections={true} />
                </div>
                <button onClick={completeJob} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Complete Job
                </button>
              </div>
            </div>
          )}
          {bookingState === 'user-completed' && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">User Confirmed Completion</h3>
                <p className="text-gray-600 mb-4">The user has confirmed the job is complete.</p>
                <button onClick={goBackToIdle} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Back to Dashboard</button>
              </div>
            </div>
          )}
          {bookingState === 'completed' && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Job Completed</h3>
                <p className="text-gray-600 mb-4">Waiting for user review.</p>
                <button onClick={goBackToIdle} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Back to Dashboard</button>
              </div>
            </div>
          )}
          {bookingState === 'reviewed' && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Review Received</h3>
                <div className="space-y-2 mb-6">
                  <p className="text-sm"><span className="font-semibold">Rating:</span> {currentRequest.review.rating} ★</p>
                  <p className="text-sm"><span className="font-semibold">Comment:</span> {currentRequest.review.comment}</p>
                </div>
                <button onClick={goBackToIdle} className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Back to Dashboard</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderMap;