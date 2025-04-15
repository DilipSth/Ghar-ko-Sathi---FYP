import { useState, useRef, useEffect, useContext, useCallback, useMemo } from "react";
import axios from "axios";
import { useAuth } from "../../../context/authContext";
import { SocketContext } from "../../../context/SocketContext";
import LiveTracking from "../../../Components/LiveTracking";
import { useLocation } from "react-router-dom";

const UserMaps = () => {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingState, setBookingState] = useState("idle");
  const [bookingDetails, setBookingDetails] = useState(null);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [currentPosition, setCurrentPosition] = useState({ lat: 27.7172, lng: 85.3238 });
  const [providerEta, setProviderEta] = useState(null);
  const [providerDistance, setProviderDistance] = useState(null);
  const [providerLocation, setProviderLocation] = useState(null);
  const mapContainerRef = useRef(null);
  const { user } = useAuth();
  const { socket } = useContext(SocketContext);
  const location = useLocation();
  const selectedService = location.state?.selectedService || null;

  useEffect(() => {
    if (!socket) return;
    
    // Handle booking accepted by service provider
    socket.on("bookingAccepted", (booking) => {
      console.log('Booking accepted:', booking);
      setBookingState("accepted");
      setBookingDetails(booking);
    });

    // Handle booking declined by service provider
    socket.on("bookingDeclined", (data) => {
      console.log('Booking declined:', data);
      setBookingState("idle");
      setBookingDetails(null);
      setError(data.message || 'Booking was declined by the service provider');
    });

    // Handle booking errors
    socket.on("bookingError", (data) => {
      console.error('Booking error:', data);
      setBookingState("idle");
      setBookingDetails(null);
      setError(data.message || 'An error occurred with your booking');
    });

    // Handle booking confirmed by user
    socket.on("bookingConfirmedByUser", (booking) => {
      console.log('Booking confirmed by user:', booking);
      setBookingState("confirmed");
      setBookingDetails(booking);
    });

    // Handle job started by service provider
    socket.on("jobStarted", (booking) => {
      console.log('Job started:', booking);
      setBookingState("ongoing");
      setBookingDetails(booking);
    });

    // Handle job completed by service provider
    socket.on("providerCompletedJob", (booking) => {
      console.log('Provider completed job:', booking);
      setBookingState("provider-completed");
      setBookingDetails(booking);
    });

    // Handle job completed by both parties
    socket.on("jobCompleted", (booking) => {
      console.log('Job completed:', booking);
      setBookingState("completed");
      setBookingDetails(booking);
    });

    // Handle payment success
    socket.on("paymentSuccess", (data) => {
      console.log('Payment success:', data);
      setBookingState("paid");
      setSuccessMessage(data.message || 'Payment successful');
    });

    // Handle review submitted
    socket.on("reviewSubmitted", (data) => {
      console.log('Review submitted:', data);
      setBookingState("reviewed");
      setSuccessMessage(data.message || 'Review submitted successfully');
    });

    // Handle service provider location updates
    socket.on("location-update", (data) => {
      console.log('Location update:', data);
      if (data && data.location) {
        setProviderLocation(data.location);
        
        // Update ETA if provided
        if (data.eta) {
          setProviderEta(data.eta);
        }
        
        // Update distance if provided
        if (data.distance) {
          setProviderDistance(data.distance);
        }
      }
    });

    return () => {
      // Socket disconnection is handled by SocketProvider
      socket.off("location-update");
    };
  }, [user, socket]);

  const fetchServiceProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      // Add the selected service as a query parameter if it exists
      const url = selectedService
        ? `http://localhost:8000/api/users/serviceProvider?service=${selectedService}`
        : "http://localhost:8000/api/users/serviceProvider";
      
      const response = await axios.get(
        url,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      if (response.data.success) {
        const providers = response.data.serviceProviders.map(
          (provider, index) => {
            // Generate realistic coordinates around Kathmandu for service providers
            // Base coordinates for Kathmandu
            const baseLatitude = 27.7172;
            const baseLongitude = 85.3240;
            
            // Create a small random offset (approximately within 5km)
            const latOffset = (Math.random() - 0.5) * 0.05;
            const lngOffset = (Math.random() - 0.5) * 0.05;
            
            return {
              id: provider._id,
              name: provider.name,
              phone: provider.phoneNo || "N/A",
              services: Array.isArray(provider.services) 
                ? provider.services.map(s => typeof s === 'object' ? s.ser_name : s).join(", ")
                : typeof provider.services === 'string' ? provider.services : "General Services",
              // Add proper map coordinates for the provider
              realTimeLocation: {
                lat: baseLatitude + latOffset,
                lng: baseLongitude + lngOffset
              },
              position: { x: 20 + ((index * 15) % 60), y: 25 + ((index * 10) % 50) },
              hourlyRate: 200,
              image: provider.profileImage
                ? `http://localhost:8000/public/registerImage/${provider.profileImage}`
                : "/api/placeholder/50/50",
              rating: (4 + Math.random()).toFixed(1),
              completedJobs: Math.floor(Math.random() * 200) + 50,
              status: provider.approved ? "Active" : "Pending",
            };
          }
        );
        setServiceProviders(providers);
        console.log("Loaded service providers:", providers);
      }
    } catch (err) {
      console.error("Error fetching service providers:", err);
      setError(
        err.response?.data?.error || "Failed to fetch service providers"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceProviders();
  }, [selectedService]); // Add selectedService as a dependency

  const filteredProviders = serviceProviders.filter((provider) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Available") return provider.status === "Active";
    return false;
  });

  const handleProviderSelect = (provider) => {
    if (bookingState === "idle") {
      setSelectedProvider(provider);
    }
  };

  const handleBooking = () => {
    if (selectedProvider && description) {
      try {
        setBookingState("waiting");
        
        // Create a booking data object with all necessary information
        const bookingData = {
          userId: user._id,
          providerId: selectedProvider.id,
          service: selectedProvider.services, // Send the string of services
          issue: "Repair Needed",
          address: "123 Example St, Kathmandu",
          description,
          // Include location information for better tracking
          userLocation: {
            lat: currentPosition.lat,
            lng: currentPosition.lng
          },
          providerLocation: selectedProvider.realTimeLocation || null
        };

        console.log('Sending booking request:', bookingData);

        if (socket) {
          socket.emit("sendBookingRequest", bookingData);
          setBookingDetails(bookingData);
        } else {
          console.error('Socket not available for booking request');
          setError('Connection error. Please try again.');
          setBookingState("idle");
        }
      } catch (err) {
        console.error('Error sending booking request:', err);
        setError('Failed to send booking request. Please try again.');
        setBookingState("idle");
      }
    } else {
      setError('Please select a service provider and provide a description');
    }
  };

  const confirmBooking = () => {
    if (bookingDetails && socket) {
      socket.emit("confirmBooking", {
        bookingId: bookingDetails.bookingId,
      });
    }
  };

  const completeJob = () => {
    if (bookingDetails && socket) {
      socket.emit("completeJob", {
        bookingId: bookingDetails.bookingId,
        completedBy: "user",
      });
    }
  };

  const submitPayment = () => {
    if (bookingDetails && socket) {
      socket.emit("submitPayment", {
        bookingId: bookingDetails.bookingId,
      });
    }
  };

  const submitReview = () => {
    if (bookingDetails && rating > 0 && socket) {
      socket.emit("submitReview", {
        bookingId: bookingDetails.bookingId,
        rating,
        comment,
      });
      setRating(0);
      setComment("");
    }
  };

  const resetBooking = () => {
    setSelectedProvider(null);
    setBookingState("idle");
    setBookingDetails(null);
    setDescription("");
    setRating(0);
    setComment("");
  };

  // State for location name
  const [locationName, setLocationName] = useState('');

  // Cache for location names to avoid excessive API calls
  const locationNameCache = useRef({});

  // Mock location data for when API is unavailable
  const mockLocationData = useMemo(() => ({
    '27.7172,85.3238': 'Kathmandu, Nepal',
    '27.6933,85.3424': 'Patan, Lalitpur, Nepal',
    '27.6710,85.4298': 'Bhaktapur, Nepal',
    '27.7030,85.3143': 'Kirtipur, Nepal',
    '27.7500,85.3500': 'Budhanilkantha, Nepal',
  }), []);

  // Get location name from coordinates with caching and offline fallback
  const getLocationName = useCallback(async (lat, lng) => {
    // Create a cache key from coordinates (rounded to 4 decimal places for better caching)
    const cacheKey = `${parseFloat(lat).toFixed(4)},${parseFloat(lng).toFixed(4)}`;
    
    // Return from cache if available
    if (locationNameCache.current[cacheKey]) {
      return locationNameCache.current[cacheKey];
    }
    
    // Check if we have mock data for these coordinates (or nearby)
    for (const [mockCoords, mockName] of Object.entries(mockLocationData)) {
      const [mockLat, mockLng] = mockCoords.split(',').map(Number);
      // Check if coordinates are close (within ~1km)
      if (Math.abs(mockLat - lat) < 0.01 && Math.abs(mockLng - lng) < 0.01) {
        locationNameCache.current[cacheKey] = mockName;
        return mockName;
      }
    }
    
    try {
      // First try our own backend if available
      try {
        // This would be your own backend endpoint that might proxy the geocoding request
        // or have its own database of locations
        const response = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
          const data = await response.json();
          if (data.name) {
            locationNameCache.current[cacheKey] = data.name;
            return data.name;
          }
        }
      } catch {
        // Silently fail and try next option
      }
      
      // Try OpenStreetMap API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
          {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Ghar-ko-Sathi-App',
              'Accept-Language': 'en'
            }
          }
        );
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        const locationName = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        
        // Cache the result
        locationNameCache.current[cacheKey] = locationName;
        
        return locationName;
      } catch (err) {
        clearTimeout(timeoutId);
        throw err; // Re-throw to be caught by outer try-catch
      }
    } catch {
      // Fallback to coordinates with area approximation
      let fallbackName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      
      // Try to approximate location based on coordinates
      if (lat > 27.6 && lat < 27.8 && lng > 85.2 && lng < 85.5) {
        fallbackName += ' (Kathmandu Valley)';
      }
      
      // Cache the fallback result too
      locationNameCache.current[cacheKey] = fallbackName;
      
      return fallbackName;
    }
  }, [mockLocationData]);

  // Update location name when position changes, with debounce
  useEffect(() => {
    let isMounted = true;
    
    if (currentPosition) {
      const updateLocationName = async () => {
        try {
          const name = await getLocationName(currentPosition.lat, currentPosition.lng);
          if (isMounted) setLocationName(name);
        } catch {
          // Silently fail and keep previous value
          if (isMounted && !locationName) {
            setLocationName(`${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`);
          }
        }
      };
      
      // Use a timeout to debounce API calls
      const timeoutId = setTimeout(updateLocationName, 1000);
      
      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }
  }, [currentPosition, getLocationName, locationName]);

  return (
    <div className="p-4 h-full">
      <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
        <h3 className="font-bold text-2xl mb-4 text-blue-600">
          Book a Service
        </h3>
        <div className="flex flex-wrap justify-around mb-4">
          {["All", "Available"].map((status) => (
            <div
              key={status}
              className={`flex flex-col items-center mb-2 md:mb-0 md:flex-row md:items-start cursor-pointer hover:text-blue-600 ${
                activeFilter === status ? "text-blue-600 font-semibold" : ""
              }`}
              onClick={() => setActiveFilter(status)}
            >
              <span>{status}</span>
              <span className="text-gray-600 ml-1">
                (
                {status === "All"
                  ? serviceProviders.length
                  : status === "Available"
                  ? serviceProviders.filter((p) => p.status === "Active").length
                  : 0}
                )
              </span>
            </div>
          ))}
        </div>
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
        {!loading && (
          <div className="flex flex-col flex-grow">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
                <p>{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="absolute top-0 right-0 p-2 text-red-700 hover:text-red-900"
                >
                  ×
                </button>
              </div>
            )}
            
            {successMessage && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 relative">
                <p>{successMessage}</p>
                <button
                  onClick={() => setSuccessMessage(null)}
                  className="absolute top-0 right-0 p-2 text-green-700 hover:text-green-900"
                >
                  ×
                </button>
              </div>
            )}
            <div
              ref={mapContainerRef}
              className="h-2/3 rounded overflow-hidden mb-4"
            >
              <LiveTracking 
                bookingDetails={bookingDetails} 
                showDirections={bookingState === "ongoing"} 
                serviceProviders={filteredProviders}
                onProviderSelect={handleProviderSelect}
                onPositionUpdate={(position) => setCurrentPosition(position)}
              />
            </div>
            <div className="h-1/3 overflow-y-auto relative">
              {/* List of active service providers */}
              {bookingState === "idle" && !selectedProvider && (
                <div className="bg-white rounded-lg shadow-md p-4 mb-4">
                  <h3 className="text-lg font-medium text-gray-800 mb-3">Available Service Providers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProviders
                      .filter(provider => provider.status === "Active")
                      .map(provider => (
                        <div 
                          key={provider.id} 
                          className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleProviderSelect(provider)}
                        >
                          <div className="flex items-center mb-2">
                            <img 
                              src={provider.image} 
                              alt={provider.name} 
                              className="w-12 h-12 rounded-full mr-3 object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "https://via.placeholder.com/50";
                              }}
                            />
                            <div>
                              <h4 className="font-semibold">{provider.name}</h4>
                              <div className="flex items-center text-sm text-yellow-500">
                                <span className="mr-1">{provider.rating}</span>
                                <span>★</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Services:</span> {provider.services}</p>
                          <p className="text-sm text-gray-600 mb-2"><span className="font-medium">Jobs:</span> {provider.completedJobs}</p>
                          <p className="text-sm text-gray-600 mb-2"><span className="font-medium">Phone:</span> {provider.phone}</p>
                          <button 
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded text-sm transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleProviderSelect(provider);
                            }}
                          >
                            Book Now
                          </button>
                        </div>
                      ))}
                  </div>
                  {filteredProviders.filter(provider => provider.status === "Active").length === 0 && (
                    <p className="text-center text-gray-500 py-4">No active service providers available at the moment.</p>
                  )}
                </div>
              )}
              
              {/* Selected service provider booking panel */}
              {selectedProvider && bookingState === "idle" && (
                <div
                  className="absolute bg-white rounded-lg shadow-lg p-4"
                  style={{
                    bottom: "20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "350px",
                    pointerEvents: "auto",
                    zIndex: 1000
                  }}
                >
                  <button
                    onClick={resetBooking}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                  <div className="flex items-center mb-3">
                    <img
                      src={selectedProvider.image}
                      alt={selectedProvider.name}
                      className="w-16 h-16 rounded-full mr-3 object-cover border-2 border-blue-500"
                    />
                    <div>
                      <h4 className="font-bold text-lg">{selectedProvider.name}</h4>
                      <div className="flex items-center">
                        <span className="text-yellow-500 mr-1">{selectedProvider.rating}</span>
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm text-gray-500 ml-1">({selectedProvider.completedJobs} jobs)</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {selectedProvider.services}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedProvider.phone}
                      </p>
                    </div>
                  </div>
                  <div className="mb-4 bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm flex justify-between">
                      <span className="font-semibold">Phone:</span>
                      <span>{selectedProvider.phone}</span>
                    </p>
                    <p className="text-sm flex justify-between">
                      <span className="font-semibold">Services:</span>
                      <span className="text-right">{selectedProvider.services}</span>
                    </p>
                    <p className="text-sm flex justify-between">
                      <span className="font-semibold">Rate:</span>
                      <span>Rs {selectedProvider.hourlyRate}/hour</span>
                    </p>
                    <p className="text-sm flex justify-between">
                      <span className="font-semibold">Status:</span>
                      <span className="text-green-500 font-medium">{selectedProvider.status}</span>
                    </p>
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Describe your problem</label>
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-md mb-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Please describe your issue in detail..."
                      rows="3"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={resetBooking}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleBooking}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition duration-200 flex items-center justify-center"
                      disabled={!description}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                      </svg>
                      Book Now
                    </button>
                  </div>
                </div>
              )}
              {bookingState === "waiting" && bookingDetails && (
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
                    <div className="animate-pulse mb-4">
                      <div className="w-16 h-16 mx-auto rounded-full bg-blue-500 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      Waiting for {selectedProvider.name} to Accept
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Your request has been sent and is waiting for confirmation.
                    </p>
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <p className="text-sm flex justify-between">
                        <span className="font-semibold">Services:</span>
                        <span>{selectedProvider.services}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="font-semibold">Description:</span>
                        <span className="text-right">{description}</span>
                      </p>
                      <p className="text-sm flex justify-between">
                        <span className="font-semibold">Phone:</span>
                        <span>{selectedProvider.phone}</span>
                      </p>
                    </div>
                    <button
                      onClick={resetBooking}
                      className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition duration-200 flex items-center justify-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Cancel Request
                    </button>
                  </div>
                </div>
              )}
              {bookingState === "accepted" && bookingDetails && (
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Booking Accepted</h3>
                    <p className="text-gray-600 mb-4">
                      Please confirm to proceed.
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center">
                        <img
                          src={`http://localhost:8000${bookingDetails.details.providerImage}`}
                          alt={bookingDetails.details.providerName}
                          className="w-10 h-10 rounded-full mr-2 object-cover"
                        />
                        <p className="text-sm">
                          <span className="font-semibold">Provider:</span>{" "}
                          {bookingDetails.details.providerName}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">Services:</span>{" "}
                        {bookingDetails.details.providerServices}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Description:</span>{" "}
                        {bookingDetails.description}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Phone:</span>{" "}
                        {bookingDetails.details.providerPhone}
                      </p>
                      
                      {/* ETA Information */}
                      {providerEta && (
                        <div className="bg-blue-50 p-3 rounded-lg mt-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">Service provider is on the way</p>
                              {providerDistance && <p className="text-xs text-gray-600">Distance: {providerDistance} km</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-600">{providerEta} min</p>
                              <p className="text-xs text-gray-600">Estimated arrival time</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={resetBooking}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmBooking}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {bookingState === "confirmed" && bookingDetails && (
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">
                      Booking Confirmed
                    </h3>
                    <p className="text-gray-600 mb-4">
                      The provider will start soon.
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center">
                        <img
                          src={`http://localhost:8000${bookingDetails.details.providerImage}`}
                          alt={bookingDetails.details.providerName}
                          className="w-10 h-10 rounded-full mr-2 object-cover"
                        />
                        <p className="text-sm">
                          <span className="font-semibold">Provider:</span>{" "}
                          {bookingDetails.details.providerName}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">Services:</span>{" "}
                        {bookingDetails.details.providerServices}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Description:</span>{" "}
                        {bookingDetails.description}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Phone:</span>{" "}
                        {bookingDetails.details.providerPhone}
                      </p>
                      
                      {/* ETA Information */}
                      {providerEta && (
                        <div className="bg-blue-50 p-3 rounded-lg mt-3">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">Service provider is on the way</p>
                              {providerDistance && <p className="text-xs text-gray-600">Distance: {providerDistance} km</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-blue-600">{providerEta} min</p>
                              <p className="text-xs text-gray-600">Estimated arrival time</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {bookingState === "ongoing" && bookingDetails && (
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">
                      Service in Progress
                    </h3>
                    <p className="text-gray-600 mb-4">
                      The provider is working on your request.
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center">
                        <img
                          src={`http://localhost:8000${bookingDetails.details.providerImage}`}
                          alt={bookingDetails.details.providerName}
                          className="w-10 h-10 rounded-full mr-2 object-cover"
                        />
                        <p className="text-sm">
                          <span className="font-semibold">Provider:</span>{" "}
                          {bookingDetails.details.providerName}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">Services:</span>{" "}
                        {bookingDetails.details.providerServices}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Description:</span>{" "}
                        {bookingDetails.description}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Phone:</span>{" "}
                        {bookingDetails.details.providerPhone}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {bookingState === "provider-completed" && bookingDetails && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4"
                  style={{ pointerEvents: "auto" }}
                >
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">
                      Provider Completed Job
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Please confirm completion.
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center">
                        <img
                          src={`http://localhost:8000${bookingDetails.details.providerImage}`}
                          alt={bookingDetails.details.providerName}
                          className="w-10 h-10 rounded-full mr-2 object-cover"
                        />
                        <p className="text-sm">
                          <span className="font-semibold">Provider:</span>{" "}
                          {bookingDetails.details.providerName}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">Services:</span>{" "}
                        {bookingDetails.details.providerServices}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Phone:</span>{" "}
                        {bookingDetails.details.providerPhone}
                      </p>
                    </div>
                    <button
                      onClick={completeJob}
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                    >
                      Confirm Completion
                    </button>
                  </div>
                </div>
              )}
              {bookingState === "completed" && bookingDetails && (
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Payment</h3>
                    <p className="text-gray-600 mb-4">
                      Job completed. Please proceed with payment.
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center">
                        <img
                          src={`http://localhost:8000${bookingDetails.details.providerImage}`}
                          alt={bookingDetails.details.providerName}
                          className="w-10 h-10 rounded-full mr-2 object-cover"
                        />
                        <p className="text-sm">
                          <span className="font-semibold">Provider:</span>{" "}
                          {bookingDetails.details.providerName}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">Total (2 hrs):</span> Rs
                        {bookingDetails.details.totalWage}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Method:</span> Cash
                        (Static)
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Phone:</span>{" "}
                        {bookingDetails.details.providerPhone}
                      </p>
                    </div>
                    <button
                      onClick={submitPayment}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              )}
              {bookingState === "paid" && bookingDetails && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4"
                  style={{ pointerEvents: "auto" }}
                >
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Review Service</h3>
                    <div className="mb-4">
                      <p className="text-sm font-semibold mb-2">Rating:</p>
                      <div className="flex space-x-1 text-2xl text-yellow-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            onClick={() => setRating(star)}
                            className={
                              star <= rating
                                ? "cursor-pointer"
                                : "cursor-pointer text-gray-300"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="w-full p-2 border border-gray-300 rounded-md mb-4"
                      placeholder="Leave a comment (optional)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <button
                      onClick={submitReview}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                      disabled={rating === 0}
                    >
                      Submit Review
                    </button>
                    <button
                      onClick={resetBooking}
                      className="w-full mt-2 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
              {bookingState === "reviewed" && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4"
                  style={{ pointerEvents: "auto" }}
                >
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
                    <h3 className="text-xl font-bold mb-4">Thank You!</h3>
                    <p className="text-gray-600 mb-4">
                      Your review has been submitted.
                    </p>
                    <button
                      onClick={resetBooking}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      Back to Map
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMaps;
