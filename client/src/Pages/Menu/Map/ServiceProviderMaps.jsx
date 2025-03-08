import { useState } from 'react';

const ServiceProviderMap = () => {
  const [activeTab, setActiveTab] = useState('available');
  const [currentRequest, setCurrentRequest] = useState(null);
  const [bookingState, setBookingState] = useState('idle'); // idle, reviewing, accepted, ongoing, completed
  const [serviceHistory, setServiceHistory] = useState([
    {
      id: 1001,
      customer: {
        name: "Alex Thompson",
        address: "56 Park Avenue, Kathmandu",
        phone: "+977-9801122334",
        image: "/api/placeholder/50/50"
      },
      service: "Plumbing",
      issue: "Leaking faucet repair",
      requestTime: "09:15 AM",
      status: "completed",
      earnings: 75,
      date: "Feb 28, 2025"
    },
    {
      id: 1002,
      customer: {
        name: "Sarah Johnson",
        address: "123 Main Street, Kathmandu",
        phone: "+977-9802233445",
        image: "/api/placeholder/50/50"
      },
      service: "Plumbing",
      issue: "Clogged drain",
      requestTime: "02:30 PM",
      status: "completed",
      earnings: 60,
      date: "Feb 27, 2025"
    }
  ]);
  
  // Pending service requests
  const [pendingRequests, setPendingRequests] = useState([
    {
      id: 1003,
      customer: {
        name: "Michael Brown",
        address: "789 Oak Road, Kathmandu",
        phone: "+977-9803344556",
        image: "/api/placeholder/50/50"
      },
      service: "Plumbing",
      issue: "Toilet installation",
      requestTime: "10:45 AM",
      estimatedEarnings: 120,
      distance: "2.3 km",
      estimatedDuration: "1-2 hours"
    }
  ]);
  
  // Toggle availability status
  const [isAvailable, setIsAvailable] = useState(true);
  
  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
  };
  
  // Handle viewing a request
  const viewRequest = (request) => {
    setCurrentRequest(request);
    setBookingState('reviewing');
  };
  
  // Accept a service request
  const acceptRequest = () => {
    if (currentRequest) {
      setBookingState('accepted');
      setPendingRequests(pendingRequests.filter(req => req.id !== currentRequest.id));
      
      // Add notification here in a real app
    }
  };
  
  // Decline a service request
  const declineRequest = () => {
    if (currentRequest) {
      setPendingRequests(pendingRequests.filter(req => req.id !== currentRequest.id));
      setCurrentRequest(null);
      setBookingState('idle');
      
      // Add notification here in a real app
    }
  };
  
  // Start service
  const startService = () => {
    setBookingState('ongoing');
  };
  
  // Complete service
  const completeService = () => {
    setBookingState('completed');
    // Add the job to history
    setServiceHistory([
      {
        id: currentRequest.id,
        customer: currentRequest.customer,
        service: currentRequest.service,
        issue: currentRequest.issue,
        requestTime: currentRequest.requestTime,
        status: "completed",
        earnings: currentRequest.estimatedEarnings,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      },
      ...serviceHistory
    ]);
  };
  
  // Reset to idle state
  const goBackToIdle = () => {
    setCurrentRequest(null);
    setBookingState('idle');
  };
  
  // Simulate incoming request
  const simulateNewRequest = () => {
    const newRequest = {
      id: 1004 + pendingRequests.length,
      customer: {
        name: "Emma Wilson",
        address: "456 Pine Street, Kathmandu",
        phone: "+977-9804455667",
        image: "/api/placeholder/50/50"
      },
      service: "Plumbing",
      issue: "Water heater repair",
      requestTime: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      estimatedEarnings: 85,
      distance: "1.8 km",
      estimatedDuration: "1 hour"
    };
    
    setPendingRequests([...pendingRequests, newRequest]);
  };

  return (
    <div className="p-4 h-full">
      <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-2xl">Service Provider Dashboard</h3>
          <div className="flex items-center">
            <span className="mr-2 text-sm">Status:</span>
            <button 
              onClick={toggleAvailability}
              className={`px-3 py-1 rounded-full text-sm Rs{isAvailable 
                ? 'bg-green-500 text-white' 
                : 'bg-gray-300 text-gray-700'}`}
            >
              {isAvailable ? 'Available' : 'Unavailable'}
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button 
            className={`py-2 px-4 font-medium Rs{activeTab === 'available' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500'}`}
            onClick={() => setActiveTab('available')}
          >
            Available Jobs
          </button>
          <button 
            className={`py-2 px-4 font-medium Rs{activeTab === 'history' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500'}`}
            onClick={() => setActiveTab('history')}
          >
            Service History
          </button>
          <button 
            className={`py-2 px-4 font-medium Rs{activeTab === 'earnings' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-gray-500'}`}
            onClick={() => setActiveTab('earnings')}
          >
            Earnings
          </button>
        </div>
        
        {/* Map Container */}
        <div className="flex-grow rounded overflow-hidden relative">
          {/* Only show map if no active booking process is happening */}
          {bookingState === 'idle' && (
            <>
              {/* Google Map Embed */}
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.856520737962!2d85.324!3d27.7031!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb191e9c5b5c5b%3A0x9c8dc9e8b8f8b8e6!2sKathmandu%2C%20Nepal!5e0!3m2!1sen!2sus!4v1634930201234!5m2!1sen!2sus"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
              
              {/* Your Position Marker */}
              <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-white text-xs">
                    You
                  </div>
                  <div className="absolute -top-1 -left-1 w-8 h-8 rounded-full bg-blue-500 opacity-30 animate-ping"></div>
                </div>
              </div>
              
              {/* Active Tab Content */}
              {activeTab === 'available' && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-white rounded-lg shadow-lg p-4 max-h-64 overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">Available Requests</h4>
                      <button 
                        onClick={simulateNewRequest}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded"
                      >
                        Simulate New Request
                      </button>
                    </div>
                    
                    {pendingRequests.length > 0 ? (
                      <div className="space-y-3">
                        {pendingRequests.map(request => (
                          <div key={request.id} className="bg-gray-100 p-3 rounded-lg">
                            <div className="flex justify-between">
                              <div className="flex items-start">
                                <img 
                                  src={request.customer.image} 
                                  alt={request.customer.name}
                                  className="w-10 h-10 rounded-full mr-3 object-cover"
                                />
                                <div>
                                  <h5 className="font-medium">{request.customer.name}</h5>
                                  <p className="text-xs text-gray-600">{request.service} - {request.issue}</p>
                                  <p className="text-xs text-gray-600">{request.distance} away</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">Rs{request.estimatedEarnings}</p>
                                <p className="text-xs text-gray-600">{request.estimatedDuration}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex justify-end">
                              <button 
                                onClick={() => viewRequest(request)}
                                className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <p>No available requests at the moment</p>
                        <p className="text-xs mt-1">New requests will appear here</p>
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
                              <div className="flex items-start">
                                <img 
                                  src={service.customer.image} 
                                  alt={service.customer.name}
                                  className="w-10 h-10 rounded-full mr-3 object-cover"
                                />
                                <div>
                                  <h5 className="font-medium">{service.customer.name}</h5>
                                  <p className="text-xs text-gray-600">{service.service} - {service.issue}</p>
                                  <p className="text-xs text-gray-600">{service.date}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">Rs{service.earnings}</p>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  Completed
                                </span>
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
                    
                    <div className="border-t pt-3">
                      <h5 className="font-medium mb-2">Recent Earnings</h5>
                      <div className="space-y-2">
                        {serviceHistory.slice(0, 3).map(service => (
                          <div key={service.id} className="flex justify-between text-sm">
                            <span>{service.date} - {service.customer.name}</span>
                            <span className="font-medium">Rs{service.earnings}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {/* Request Review Overlay */}
          {bookingState === 'reviewing' && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Service Request</h3>
                
                <div className="flex items-center mb-4 pb-4 border-b border-gray-200">
                  <img 
                    src={currentRequest.customer.image} 
                    alt={currentRequest.customer.name}
                    className="w-14 h-14 rounded-full mr-4 object-cover"
                  />
                  <div>
                    <h4 className="font-bold">{currentRequest.customer.name}</h4>
                    <p className="text-sm text-gray-600">{currentRequest.service}</p>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-2">★ 4.8</span>
                      <span>(12 reviews)</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm font-semibold">Issue</p>
                    <p>{currentRequest.issue}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold">Address</p>
                    <p>{currentRequest.customer.address}</p>
                  </div>
                  
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm font-semibold">Distance</p>
                      <p>{currentRequest.distance}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Estimated Duration</p>
                      <p>{currentRequest.estimatedDuration}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold">Estimated Earnings</p>
                    <p className="text-xl font-bold text-green-600">Rs{currentRequest.estimatedEarnings}</p>
                  </div>
                </div>
                
                {/* Map snippet showing route */}
                <div className="mb-6 rounded-lg overflow-hidden h-40 bg-gray-200">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.856520737962!2d85.324!3d27.7031!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb191e9c5b5c5b%3A0x9c8dc9e8b8f8b8e6!2sKathmandu%2C%20Nepal!5e0!3m2!1sen!2sus!4v1634930201234!5m2!1sen!2sus"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                  ></iframe>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={declineRequest}
                    className="py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Decline
                  </button>
                  <button 
                    onClick={acceptRequest}
                    className="py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Accept
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Request Accepted - Navigation */}
          {bookingState === 'accepted' && currentRequest && (
            <div className="absolute inset-0 bg-white flex flex-col">
              <div className="bg-blue-600 text-white p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Navigate to Customer</h3>
                  <span className="text-sm">{currentRequest.distance}</span>
                </div>
                <p className="text-sm">{currentRequest.customer.address}</p>
              </div>
              
              {/* Full map for navigation */}
              <div className="flex-grow">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.856520737962!2d85.324!3d27.7031!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb191e9c5b5c5b%3A0x9c8dc9e8b8f8b8e6!2sKathmandu%2C%20Nepal!5e0!3m2!1sen!2sus!4v1634930201234!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                ></iframe>
              </div>
              
              {/* Customer details and actions */}
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex items-center mb-3">
                  <img 
                    src={currentRequest.customer.image} 
                    alt={currentRequest.customer.name}
                    className="w-12 h-12 rounded-full mr-3 object-cover"
                  />
                  <div>
                    <h4 className="font-bold">{currentRequest.customer.name}</h4>
                    <p className="text-sm text-gray-600">{currentRequest.service} - {currentRequest.issue}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    className="py-2 border border-gray-300 rounded-lg hover:bg-gray-100 flex items-center justify-center"
                  >
                    <span>Call Customer</span>
                  </button>
                  <button 
                    onClick={startService}
                    className="py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Start Service
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Service in Progress */}
          {bookingState === 'ongoing' && currentRequest && (
            <div className="absolute inset-0 bg-white flex flex-col">
              <div className="bg-green-600 text-white p-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Service in Progress</h3>
                  <div className="text-sm bg-white text-green-600 px-2 py-1 rounded-full">
                    00:45:32
                  </div>
                </div>
                <p className="text-sm">{currentRequest.issue}</p>
              </div>
              
              <div className="p-4 flex-grow">
                <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                  <h4 className="font-semibold mb-3">Customer Details</h4>
                  <div className="flex items-start mb-3">
                    <img 
                      src={currentRequest.customer.image} 
                      alt={currentRequest.customer.name}
                      className="w-12 h-12 rounded-full mr-3 object-cover"
                    />
                    <div>
                      <h5 className="font-medium">{currentRequest.customer.name}</h5>
                      <p className="text-sm">{currentRequest.customer.address}</p>
                      <p className="text-sm">{currentRequest.customer.phone}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                  <h4 className="font-semibold mb-3">Service Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Service Type</span>
                      <span>{currentRequest.service}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Issue</span>
                      <span>{currentRequest.issue}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Duration</span>
                      <span>{currentRequest.estimatedDuration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Earnings</span>
                      <span className="font-medium">Rs{currentRequest.estimatedEarnings}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                  <h4 className="font-semibold mb-3">Parts & Materials Used</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span>PVC Pipe (2 meters)</span>
                      <span className="ml-auto">Rs12</span>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span>Pipe Connector</span>
                      <span className="ml-auto">Rs8</span>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span>Sealing Tape</span>
                      <span className="ml-auto">Rs5</span>
                    </div>
                    <div className="flex items-center">
                      <input type="checkbox" className="mr-2" />
                      <span>Other Materials</span>
                      <span className="ml-auto">Rs10</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    className="py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  >
                    Report Issue
                  </button>
                  <button 
                    onClick={completeService}
                    className="py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Complete Service
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Service Completed Summary */}
          {bookingState === 'completed' && currentRequest && (
            <div className="absolute inset-0 bg-white flex flex-col">
              <div className="bg-green-600 text-white p-4">
                <h3 className="font-bold">Service Completed</h3>
                <p className="text-sm">Great job! Service completed successfully.</p>
              </div>
              
              <div className="p-4 flex-grow">
                <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-2xl">✓</span>
                    </div>
                    <h4 className="font-bold mt-2">Service Completed Successfully</h4>
                    <p className="text-sm text-gray-600">Total time: 1 hour 23 minutes</p>
                  </div>
                  
                  <div className="border-t border-b border-gray-200 py-3 mb-3">
                    <div className="flex justify-between mb-1">
                      <span>Service Fee</span>
                      <span>Rs{currentRequest.estimatedEarnings}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Platform Fee (10%)</span>
                      <span>-Rs{(currentRequest.estimatedEarnings * 0.1).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between font-bold">
                    <span>Your Earnings</span>
                    <span>Rs{(currentRequest.estimatedEarnings * 0.9).toFixed(2)}</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                  <h4 className="font-semibold mb-3">Customer Feedback</h4>
                  <div className="text-center">
                    <div className="flex justify-center text-yellow-400 text-2xl mb-2">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p className="text-gray-700 italic">
                      "Great service! Very professional and fixed the issue quickly."
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-white border-t border-gray-200">
                <button 
                  onClick={goBackToIdle}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderMap;