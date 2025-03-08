import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const Maps = () => {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingState, setBookingState] = useState('idle'); // idle, waiting, accepted, ongoing, completed
  const [bookingDetails, setBookingDetails] = useState(null);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const mapContainerRef = useRef(null);
  
  // Fetch service providers from API
  const fetchServiceProviders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        "http://localhost:8000/api/users/serviceProvider",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      
      if (response.data.success) {
        // Transform the data and assign random positions on the map
        // In a real app, you would use actual GPS coordinates
        const providers = response.data.serviceProviders.map((provider, index) => {
          // Generate somewhat random positions across the map
          const randomX = 20 + (index * 15) % 60; // Keep within 20-80% range
          const randomY = 25 + (index * 10) % 50; // Keep within 25-75% range
          
          return {
            id: provider._id,
            name: provider.name,
            phone: provider.phoneNo || "N/A",
            service: provider.role || "Service Provider",
            position: { x: randomX, y: randomY },
            hourlyRate: 25 + Math.floor(Math.random() * 10), // Demo hourly rate
            image: provider.profileImage 
              ? `http://localhost:8000/public/registerImage/${provider.profileImage}`
              : "/api/placeholder/50/50",
            rating: (4 + Math.random()).toFixed(1),
            completedJobs: Math.floor(Math.random() * 200) + 50,
            status: "Active" // Assuming all are active
          };
        });
        
        setServiceProviders(providers);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch service providers");
      console.error("Error fetching service providers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceProviders();
  }, []);

  // Filter providers based on selected filter
  const filteredProviders = serviceProviders.filter(provider => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Available") return provider.status === "Active";
    return false; // For "Users" filter (if implemented)
  });

  // Function to handle map click and display provider info
  const handleMapClick = (providerId) => {
    if (bookingState === 'idle') {
      const provider = serviceProviders.find(p => p.id === providerId);
      setSelectedProvider(provider);
    }
  };

  // Function to handle booking
  const handleBooking = () => {
    if (selectedProvider) {
      setBookingState('waiting');
      setBookingDetails({
        provider: selectedProvider,
        requestTime: new Date().toLocaleTimeString(),
        estimatedArrival: "25-30 minutes",
        address: "123 Example St, Kathmandu",
        issue: "Emergency repair needed"
      });
      
      // Simulate provider accepting after 5 seconds
      setTimeout(() => {
        setBookingState('accepted');
      }, 5000);
    }
  };

  // Function to close booking info
  const closeBookingInfo = () => {
    setSelectedProvider(null);
  };
  
  // Function to confirm and start service
  const confirmService = () => {
    setBookingState('ongoing');
  };
  
  // Function to complete service
  const completeService = () => {
    setBookingState('completed');
  };
  
  // Function to reset the booking flow
  const resetBooking = () => {
    setSelectedProvider(null);
    setBookingState('idle');
    setBookingDetails(null);
  };

  return (
    <div className="p-4 h-full">
      <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
        <h3 className="font-bold text-2xl mb-4">Service Providers Map</h3>
        
        {/* Status Filters */}
        <div className="flex flex-wrap justify-around mb-4">
          {["All", "Users", "Available"].map((status) => (
            <div
              key={status}
              className={`flex flex-col items-center mb-2 md:mb-0 md:flex-row md:items-start cursor-pointer hover:text-blue-600 ${
                activeFilter === status ? "text-blue-600 font-semibold" : ""
              }`}
              onClick={() => setActiveFilter(status)}
            >
              <span>{status}</span>
              <span className="text-gray-600 ml-1">
                ({status === "All" ? serviceProviders.length : 
                  status === "Available" ? serviceProviders.filter(p => p.status === "Active").length : 
                  0})
              </span>
            </div>
          ))}
        </div>
        
        {/* Loading and Error States */}
        {loading && (
          <div className="flex-grow flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <div className="flex-grow flex items-center justify-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
              <button 
                onClick={fetchServiceProviders}
                className="mt-2 bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Map Container */}
        {!loading && !error && (
          <div ref={mapContainerRef} className="flex-grow rounded overflow-hidden relative">
            {/* Google Map Embed */}
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.856520737962!2d85.324!3d27.7031!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb191e9c5b5c5b%3A0x9c8dc9e8b8f8b8e6!2sKathmandu%2C%20Nepal!5e0!3m2!1sen!2sus!4v1634930201234!5m2!1sen!2sus"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
            ></iframe>
            
            {/* Absolute positioned overlay to handle interactions */}
            <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
              {/* Service Provider Markers - Only show if not in middle of booking process */}
              {bookingState === 'idle' && (
                <div className="w-full h-full">
                  {filteredProviders.map((provider) => (
                    <div 
                      key={provider.id}
                      className="absolute cursor-pointer"
                      style={{ 
                        top: `${provider.position.y}%`, 
                        left: `${provider.position.x}%`,
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'auto'
                      }}
                      onClick={() => handleMapClick(provider.id)}
                    >
                      <div className="relative">
                        <img 
                          src={provider.image} 
                          alt={provider.name}
                          className="rounded-full border-2 border-blue-500 w-12 h-12 object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/api/placeholder/50/50";
                          }}
                        />
                        <span className="absolute bottom-0 right-0 bg-green-500 rounded-full w-3 h-3"></span>
                      </div>
                      <div className="bg-white text-xs p-1 rounded shadow mt-1 text-center">
                        {provider.service}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Booking Info Popup - Initial state */}
              {selectedProvider && bookingState === 'idle' && (
                <div 
                  className="absolute bg-white rounded-lg shadow-lg p-4"
                  style={{ 
                    bottom: '20px',
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    width: '250px',
                    pointerEvents: 'auto'
                  }}
                >
                  <button 
                    onClick={closeBookingInfo}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                    style={{ pointerEvents: 'auto' }}
                  >
                    ×
                  </button>
                  <div className="flex items-center mb-3">
                    <img 
                      src={selectedProvider.image} 
                      alt={selectedProvider.name}
                      className="w-12 h-12 rounded-full mr-3 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/api/placeholder/50/50";
                      }}
                    />
                    <div>
                      <h4 className="font-bold">{selectedProvider.name}</h4>
                      <p className="text-sm text-gray-600">{selectedProvider.service}</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm"><span className="font-semibold">Phone:</span> {selectedProvider.phone}</p>
                    <p className="text-sm"><span className="font-semibold">Rate:</span> Rs{selectedProvider.hourlyRate}/hour</p>
                    <p className="text-sm"><span className="font-semibold">Rating:</span> {selectedProvider.rating} ★ ({selectedProvider.completedJobs} jobs)</p>
                  </div>
                  <button 
                    onClick={handleBooking}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    style={{ pointerEvents: 'auto' }}
                  >
                    Book Now
                  </button>
                </div>
              )}
            </div>
            
            {/* Waiting Page Overlay */}
            {bookingState === 'waiting' && bookingDetails && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
                <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
                  <div className="animate-pulse mb-4">
                    <div className="w-12 h-12 mx-auto rounded-full bg-blue-500"></div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Waiting for {bookingDetails.provider.name} to accept</h3>
                  <p className="text-gray-600 mb-4">Your request has been sent. Please wait while the service provider reviews your request.</p>
                  
                  <div className="flex flex-col items-start text-left space-y-2 mb-6 mx-auto max-w-xs">
                    <p className="text-sm"><span className="font-semibold">Service:</span> {bookingDetails.provider.service}</p>
                    <p className="text-sm"><span className="font-semibold">Request Time:</span> {bookingDetails.requestTime}</p>
                    <p className="text-sm"><span className="font-semibold">Est. Arrival:</span> {bookingDetails.estimatedArrival}</p>
                    <p className="text-sm"><span className="font-semibold">Address:</span> {bookingDetails.address}</p>
                  </div>
                  
                  <button 
                    onClick={resetBooking}
                    className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
                  >
                    Cancel Request
                  </button>
                </div>
              </div>
            )}
            
            {/* Offer Accepted Page */}
            {bookingState === 'accepted' && bookingDetails && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
                <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
                      <span className="text-green-500 text-2xl">✓</span>
                    </div>
                    <h3 className="text-xl font-bold">Request Accepted!</h3>
                    <p className="text-gray-600">Your service provider is on the way</p>
                  </div>
                  
                  <div className="flex items-center mb-4 pb-4 border-b border-gray-200">
                    <img 
                      src={bookingDetails.provider.image} 
                      alt={bookingDetails.provider.name}
                      className="w-14 h-14 rounded-full mr-4 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/api/placeholder/50/50";
                      }}
                    />
                    <div>
                      <h4 className="font-bold">{bookingDetails.provider.name}</h4>
                      <p className="text-sm text-gray-600">{bookingDetails.provider.service} • Rs{bookingDetails.provider.hourlyRate}/hr</p>
                      <p className="text-sm text-gray-600">{bookingDetails.provider.rating} ★ ({bookingDetails.provider.completedJobs} jobs)</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <p className="text-sm"><span className="font-semibold">Estimated Arrival:</span> {bookingDetails.estimatedArrival}</p>
                    <p className="text-sm"><span className="font-semibold">Your Address:</span> {bookingDetails.address}</p>
                    <p className="text-sm"><span className="font-semibold">Issue:</span> {bookingDetails.issue}</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={confirmService}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      Confirm & Start
                    </button>
                    <button 
                      onClick={resetBooking}
                      className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Service Ongoing Page */}
            {bookingState === 'ongoing' && bookingDetails && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
                <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-3">
                      <span className="text-blue-500 text-2xl">⚒️</span>
                    </div>
                    <h3 className="text-xl font-bold">Service in Progress</h3>
                    <p className="text-gray-600">{bookingDetails.provider.name} is working on your request</p>
                  </div>
                  
                  <div className="mb-6">
                    <div className="flex justify-between mb-2">
                      <span>Service Progress</span>
                      <span>In progress</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full w-1/2"></div>
                    </div>
                  </div>
                  
                  <div className="border-t border-b border-gray-200 py-4 mb-6">
                    <h4 className="font-semibold mb-2">Service Details</h4>
                    <div className="space-y-2">
                      <p className="text-sm"><span className="font-semibold">Service:</span> {bookingDetails.provider.service}</p>
                      <p className="text-sm"><span className="font-semibold">Started at:</span> {bookingDetails.requestTime}</p>
                      <p className="text-sm"><span className="font-semibold">Rate:</span> Rs{bookingDetails.provider.hourlyRate}/hour</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={completeService}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                    >
                      Complete Service
                    </button>
                    <button 
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      Contact Provider
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Service Completed Page */}
            {bookingState === 'completed' && bookingDetails && (
              <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
                <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-3">
                      <span className="text-green-500 text-2xl">✓</span>
                    </div>
                    <h3 className="text-xl font-bold">Service Completed</h3>
                    <p className="text-gray-600">Thank you for using our service!</p>
                  </div>
                  
                  <div className="flex items-center mb-4 pb-4 border-b border-gray-200">
                    <img 
                      src={bookingDetails.provider.image} 
                      alt={bookingDetails.provider.name}
                      className="w-14 h-14 rounded-full mr-4 object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "/api/placeholder/50/50";
                      }}
                    />
                    <div>
                      <h4 className="font-bold">{bookingDetails.provider.name}</h4>
                      <p className="text-sm text-gray-600">{bookingDetails.provider.service}</p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">Service Summary</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Service Fee (2 hours)</span>
                        <span>Rs{bookingDetails.provider.hourlyRate * 2}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Parts & Materials</span>
                        <span>Rs35.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Service Fee</span>
                        <span>Rs15.00</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span>Rs{(bookingDetails.provider.hourlyRate * 2) + 35 + 15}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">Rate your experience</h4>
                    <div className="flex space-x-1 text-2xl text-yellow-400 mb-2">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <textarea 
                      className="w-full p-2 border border-gray-300 rounded-md" 
                      placeholder="Leave a comment (optional)"
                      rows="2"
                    ></textarea>
                  </div>
                  
                  <button 
                    onClick={resetBooking}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Maps;