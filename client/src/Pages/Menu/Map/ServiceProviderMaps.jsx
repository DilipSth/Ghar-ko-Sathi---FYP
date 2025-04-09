import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../../../context/authContext';

const ServiceProviderMap = () => {
  const [activeTab, setActiveTab] = useState('available');
  const [currentRequest, setCurrentRequest] = useState(null);
  const [bookingState, setBookingState] = useState('idle');
  const [serviceHistory, setServiceHistory] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const { user } = useAuth();
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:8000', {
      auth: { token: localStorage.getItem("token") },
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("register", { userId: user._id, role: user.role });
    });

    socketRef.current.on("newBookingRequest", (booking) => {
      setPendingRequests((prev) => [...prev, booking]);
    });

    socketRef.current.on("bookingConfirmed", (booking) => {
      setBookingState('accepted');
      setCurrentRequest(booking);
    });

    socketRef.current.on("bookingConfirmedByUser", (booking) => {
      setBookingState('confirmed');
      setCurrentRequest(booking);
    });

    socketRef.current.on("problemDescriptionReceived", (booking) => {
      setBookingState('confirmed');
      setCurrentRequest(booking);
    });

    socketRef.current.on("jobStartedSuccess", (booking) => {
      setBookingState('ongoing');
      setCurrentRequest(booking);
    });

    socketRef.current.on("userCompletedJob", (booking) => {
      setBookingState('user-completed');
      setCurrentRequest(booking);
    });

    socketRef.current.on("jobCompleted", (booking) => {
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

    socketRef.current.on("reviewReceived", (booking) => {
      setBookingState('reviewed');
      setCurrentRequest(booking);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [user]);

  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
  };

  const viewRequest = (request) => {
    setCurrentRequest(request);
    setBookingState('reviewing');
  };

  const acceptRequest = () => {
    if (currentRequest) {
      socketRef.current.emit("acceptBooking", { bookingId: currentRequest.bookingId });
      setPendingRequests(pendingRequests.filter(req => req.bookingId !== currentRequest.bookingId));
    }
  };

  const declineRequest = () => {
    if (currentRequest) {
      socketRef.current.emit("declineBooking", { bookingId: currentRequest.bookingId });
      setPendingRequests(pendingRequests.filter(req => req.bookingId !== currentRequest.bookingId));
      setCurrentRequest(null);
      setBookingState('idle');
    }
  };

  const startJob = () => {
    if (currentRequest) {
      socketRef.current.emit("startJob", { bookingId: currentRequest.bookingId });
    }
  };

  const completeJob = () => {
    if (currentRequest) {
      socketRef.current.emit("completeJob", {
        bookingId: currentRequest.bookingId,
        completedBy: "provider",
      });
    }
  };

  const goBackToIdle = () => {
    setCurrentRequest(null);
    setBookingState('idle');
  };

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
        <div className="flex-grow rounded overflow-hidden relative">
          {bookingState === 'idle' && (
            <>
              <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.856520737962!2d85.324!3d27.7031!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb191e9c5b5c5b%3A0x9c8dc9e8b8f8b8e6!2sKathmandu%2C%20Nepal!5e0!3m2!1sen!2sus!4v1634930201234!5m2!1sen!2sus" width="100%" height="100%" style={{ border: 0 }} allowFullScreen="" loading="lazy"></iframe>
              <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-xs">You</div>
                  <div className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-blue-500 opacity-30 animate-ping"></div>
                </div>
              </div>
              {activeTab === 'available' && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white rounded-lg shadow-lg p-4 max-h-64 overflow-y-auto">
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
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white rounded-lg shadow-lg p-4 max-h-64 overflow-y-auto">
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
                <div className="absolute bottom-4 left-4 right-4">
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
                <div className="space-y-2 mb-6">
                  <p className="text-sm"><span className="font-semibold">Service:</span> {currentRequest.details.service}</p>
                  <p className="text-sm"><span className="font-semibold">Address:</span> {currentRequest.details.address}</p>
                  <p className="text-sm"><span className="font-semibold">Description:</span> {currentRequest.details.description}</p>
                </div>
                <button onClick={completeJob} className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">Complete Job</button>
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