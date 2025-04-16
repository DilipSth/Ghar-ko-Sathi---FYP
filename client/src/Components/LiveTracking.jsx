import { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SocketContext } from '../context/SocketContext';
import { useAuth } from '../context/authContext';
import PropTypes from 'prop-types';
import axios from 'axios'; // Import axios

// Fix for Leaflet marker icons
// Use direct URLs instead of imports to ensure icons load properly
const iconUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png';

// Set up default icon
let DefaultIcon = L.icon({
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Set default icon for all markers
L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for different users
const createCustomIcon = (color, size = 'normal') => {
  const sizeMultiplier = size === 'large' ? 1.3 : size === 'small' ? 0.8 : 1;
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25 * sizeMultiplier, 41 * sizeMultiplier],
    iconAnchor: [12 * sizeMultiplier, 41 * sizeMultiplier],
    popupAnchor: [1, -34],
    shadowSize: [41 * sizeMultiplier, 41 * sizeMultiplier]
  });
};

const userIcon = createCustomIcon('red');
const providerIcon = createCustomIcon('blue', 'large');
const selectedProviderIcon = createCustomIcon('violet');
const historyIcon = createCustomIcon('gray', 'small');

// Default center (Kathmandu, Nepal)
const defaultCenter = {
  lat: 27.7172,
  lng: 85.3238
};

// Component to automatically update map view when positions change
function MapUpdater({ position, zoom }) {
  const map = useMap();
  
  useEffect(() => {
    if (position) {
      map.setView(position, zoom);
    }
  }, [map, position, zoom]);
  
  return null;
}

MapUpdater.propTypes = {
  position: PropTypes.object,
  zoom: PropTypes.number
};

const LiveTracking = ({ bookingDetails, showDirections: initialShowDirections = false, serviceProviders = [], onProviderSelect = null, onPositionUpdate = null, setBookingDetails }) => {
  const [currentPosition, setCurrentPosition] = useState(defaultCenter);
  const [serviceProviderPosition, setServiceProviderPosition] = useState(null);
  const [allServiceProviders, setAllServiceProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const [mapZoom, setMapZoom] = useState(15);
  const [showDirections, setShowDirections] = useState(initialShowDirections);
  const [bookingId, setBookingId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState('idle'); // idle, active, arriving, completed
  const [previousPositions, setPreviousPositions] = useState([]);
  const [bookingAccepted, setBookingAccepted] = useState(false);

  // Marker ref for smooth marker movement
  const markerRef = useRef(null);

  // Calculate distance between points (in km)
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  }, []);

  // Notification handler
  const addNotification = (message, type = 'info') => {
    const newNotification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setNotifications(prev => [newNotification, ...prev].slice(0, 5));
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
  };

  // UI for notifications
  const NotificationCenter = () => (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <div 
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg ${notification.type === 'error' ? 'bg-red-100' : notification.type === 'success' ? 'bg-green-100' : 'bg-blue-100'}`}
        >
          <p>{notification.message}</p>
          <p className="text-xs text-gray-500">{notification.timestamp}</p>
        </div>
      ))}
    </div>
  );

  // Enhanced booking acceptance modal
  const AcceptBookingModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-xl">
        <div className="flex items-start mb-4">
          <div className="bg-blue-100 p-3 rounded-full mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">New Booking Request</h3>
            <p className="text-sm text-gray-500">From: {bookingDetails?.userName}</p>
          </div>
        </div>
        
        <div className="space-y-3 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Service:</span>
            <span className="font-medium">{bookingDetails?.serviceType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone:</span>
            <span className="font-medium">{bookingDetails?.userPhone || 'Not available'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Location:</span>
            <span className="font-medium text-right">{userLocationName || 'Loading...'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Distance:</span>
            <span className="font-medium">
              {calculateDistance(
                currentPosition.lat, currentPosition.lng,
                serviceProviderPosition?.lat || currentPosition.lat, 
                serviceProviderPosition?.lng || currentPosition.lng
              )} km
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">ETA:</span>
            <span className="font-medium">
              {Math.ceil(calculateDistance(
                currentPosition.lat, currentPosition.lng,
                serviceProviderPosition?.lat || currentPosition.lat, 
                serviceProviderPosition?.lng || currentPosition.lng
              ) * 3)} mins
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Requested at:</span>
            <span className="font-medium">{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button 
            onClick={() => setShowAcceptModal(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Decline
          </button>
          <button 
            onClick={handleBookingAccept}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Accept
          </button>
        </div>
      </div>
    </div>
  );

  const { socket } = useContext(SocketContext) || {};
  const { user } = useAuth() || {};
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);

  // Simulate movement for testing when geolocation fails
  const simulateMovement = useCallback((basePosition) => {
    // Small random movement to simulate real-time updates
    const randomLat = (Math.random() - 0.5) * 0.0005;
    const randomLng = (Math.random() - 0.5) * 0.0005;
    
    return {
      lat: basePosition.lat + randomLat,
      lng: basePosition.lng + randomLng
    };
  }, []);

  // Function to update position and emit if needed
  const updatePosition = useCallback((position) => {
    try {
      // Extract coordinates with additional data
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      
      // Validate coordinates (some devices may return invalid values)
      if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude) ||
          latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        console.error("Invalid coordinates received:", latitude, longitude);
        // Try to use last known valid position
        const lastPosition = localStorage.getItem('userCurrentPosition');
        if (lastPosition) {
          try {
            const parsedPosition = JSON.parse(lastPosition);
            console.log("Using last known valid position:", parsedPosition);
            setCurrentPosition(parsedPosition);
            setLocationLoading(false);
            return;
          } catch (e) {
            console.error("Error parsing last position:", e);
          }
        }
        return;
      }
      
      // Create new position object with enhanced data
      const newPosition = {
        lat: latitude,
        lng: longitude,
        accuracy: accuracy,
        heading: heading || 0,
        speed: speed || 0,
        timestamp: new Date().getTime()
      };
      
      // Check if position has actually changed significantly (to avoid unnecessary updates)
      const lastPosition = localStorage.getItem('userCurrentPosition');
      let hasChanged = true;
      
      if (lastPosition) {
        try {
          const parsedLastPosition = JSON.parse(lastPosition);
          const distance = calculateDistance(
            parsedLastPosition.lat, parsedLastPosition.lng,
            latitude, longitude
          );
          
          // Only consider it changed if moved more than 10 meters
          hasChanged = distance > 0.01; // 0.01 km = 10 meters
          
          if (!hasChanged) {
            console.log("Position hasn't changed significantly, skipping update");
            // Still update the timestamp to keep it fresh
            parsedLastPosition.timestamp = new Date().getTime();
            localStorage.setItem('userCurrentPosition', JSON.stringify(parsedLastPosition));
            return;
          }
        } catch (e) {
          console.error("Error comparing with last position:", e);
        }
      }
      
      console.log("Real-time position updated:", newPosition);
      
      // Update state with new position
      setCurrentPosition(newPosition);
      
      // Store position in localStorage for persistence
      localStorage.setItem('userCurrentPosition', JSON.stringify(newPosition));
      
      // Set loading to false once we have a position
      setLocationLoading(false);
      
      // If user is a service provider, emit location update
      if (user?.role === 'serviceProvider' && socket && socket.connected) {
        console.log("Emitting location update to server");
        socket.emit('update-location', {
          userId: user._id,
          location: newPosition,
          timestamp: new Date().getTime()
        });
        
        // Store service provider position separately
        localStorage.setItem('serviceProviderPosition', JSON.stringify(newPosition));
      }
      
      // Update last update time for UI
      setLastUpdateTime(new Date().toLocaleTimeString());
      
      // Call the callback if provided
      if (onPositionUpdate) {
        onPositionUpdate(newPosition);
      }
    } catch (error) {
      console.error("Error updating position:", error);
      // Try to use last known position before falling back to default
      const lastPosition = localStorage.getItem('userCurrentPosition');
      if (lastPosition) {
        try {
          const parsedPosition = JSON.parse(lastPosition);
          console.log("Using last known position after error:", parsedPosition);
          setCurrentPosition(parsedPosition);
          setLocationLoading(false);
          return;
        } catch (e) {
          console.error("Error parsing last position:", e);
        }
      }
      
      // Use default center as last resort fallback
      setCurrentPosition(defaultCenter);
      setLocationLoading(false);
    }
  }, [user, socket, onPositionUpdate, defaultCenter, calculateDistance]);

  // Function to handle geolocation errors with fallback
  const handleGeolocationError = useCallback((error) => {
    console.log("Handling geolocation error, using fallback position", error?.message || 'Unknown error');
    // Try to get stored position first before falling back to default
    const storedPosition = localStorage.getItem('userCurrentPosition');
    if (storedPosition) {
      try {
        const parsedPosition = JSON.parse(storedPosition);
        console.log("Using stored position as fallback:", parsedPosition);
        setCurrentPosition(parsedPosition);
        setLocationLoading(false);
        return true; // Successfully used stored position
      } catch (e) {
        console.error("Error parsing stored position:", e);
      }
    }
    // If no stored position or parsing failed, use default center
    setCurrentPosition(defaultCenter);
    setLocationLoading(false);
    return false; // Had to use default position
  }, [defaultCenter]);

  // Get current position on component mount
  useEffect(() => {
    // Try to get stored position first
    const storedPosition = localStorage.getItem('userCurrentPosition');
    if (storedPosition) {
      try {
        const parsedPosition = JSON.parse(storedPosition);
        // Check if stored position is recent (within last 5 minutes)
        const now = new Date().getTime();
        const positionTime = parsedPosition.timestamp || 0;
        const isRecent = (now - positionTime) < 5 * 60 * 1000; // 5 minutes
        
        if (isRecent) {
          console.log("Using recent stored position:", parsedPosition);
          setCurrentPosition(parsedPosition);
          setLocationLoading(false);
          
          // If callback provided, call it with stored position
          if (onPositionUpdate) {
            onPositionUpdate(parsedPosition);
          }
        } else {
          console.log("Stored position is too old, will get fresh position");
        }
      } catch (e) {
        console.error("Error parsing stored position:", e);
      }
    }
    
    // Flag to track if we're using simulated location
    let usingSimulatedLocation = false;
    let movementInterval = null;

    // Function to simulate movement
    const startLocationSimulation = () => {
      // Simulate movement every 3 seconds
      movementInterval = setInterval(() => {
        setCurrentPosition(prev => simulateMovement(prev));
        
        // If user is a service provider, emit simulated location
        if (user?.role === 'serviceProvider' && socket) {
          const simulatedPosition = simulateMovement(currentPosition);
          socket.emit('update-location', {
            userId: user._id,
            location: simulatedPosition
          });
        }
      }, 3000);
      
      // Set loading to false with a slight delay to ensure map is initialized
      setTimeout(() => {
        setLocationLoading(false);
      }, 500);
    };

    // Local function to handle geolocation errors with fallback
    const localHandleGeolocationError = (error) => {
      // Try to use stored position first
      const storedPosition = localStorage.getItem('userCurrentPosition');
      if (storedPosition) {
        try {
          const parsedPosition = JSON.parse(storedPosition);
          console.log("Using stored position after error:", parsedPosition);
          setCurrentPosition(parsedPosition);
          setLocationLoading(false);
          
          // If we have a stored position, don't start simulation yet
          // Instead, retry geolocation after a short delay
          setTimeout(() => {
            console.log("Retrying geolocation after using stored position");
            setupGeolocation();
          }, 5000);
          
          return;
        } catch (e) {
          console.error("Error parsing stored position:", e);
        }
      }
      
      // If no stored position or parsing failed, start simulation
      if (!usingSimulatedLocation) {
        console.log("Starting location simulation due to error:", error?.message || 'Unknown error');
        usingSimulatedLocation = true;
        setCurrentPosition(defaultCenter);
        startLocationSimulation();
      }
    };

    // Setup geolocation
    const setupGeolocation = () => {
      if (navigator.geolocation) {
        try {
          // Show loading indicator
          setLocationLoading(true);
          
          // Get initial position with high accuracy
          navigator.geolocation.getCurrentPosition(
            (position) => {
              console.log("Initial position obtained:", position.coords);
              updatePosition(position);
              
              // Start watching for position changes after getting initial position
              if (navigator.geolocation) {
                try {
                  // Clear any existing watch
                  if (watchIdRef.current) {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                  }
                  
                  // Set up a new watch with improved settings
                  watchIdRef.current = navigator.geolocation.watchPosition(
                    updatePosition,
                    (error) => {
                      console.error("Geolocation watch error:", error.message, error.code);
                      
                      // For TIMEOUT errors, try to use last known position and retry
                      if (error.code === error.TIMEOUT) {
                        const lastPosition = localStorage.getItem('userCurrentPosition');
                        if (lastPosition) {
                          try {
                            const parsedPosition = JSON.parse(lastPosition);
                            console.log("Using last known position after timeout:", parsedPosition);
                            setCurrentPosition(parsedPosition);
                          } catch (e) {
                            console.error("Error parsing last position:", e);
                          }
                        }
                        // Continue watching - don't invoke error handler
                        return;
                      }
                      
                      // For other errors, use the error handler
                      localHandleGeolocationError(error);
                    },
                    {
                      enableHighAccuracy: true,
                      maximumAge: 10000, // Allow positions up to 10 seconds old
                      timeout: 15000 // Longer timeout for better accuracy
                    }
                  );
                  
                  console.log("Started watching position with ID:", watchIdRef.current);
                } catch (error) {
                  console.error("Error setting up geolocation watch:", error);
                  localHandleGeolocationError(error);
                }
              }
            },
            (error) => {
              console.error("Error getting initial position:", error.message, error.code);
              localHandleGeolocationError(error);
            },
            { 
              enableHighAccuracy: true, 
              timeout: 20000, // Extended timeout for initial position
              maximumAge: 30000 // Allow positions up to 30 seconds old for initial position
            }
          );
        } catch (error) {
          console.error("Exception in setupGeolocation:", error);
          localHandleGeolocationError();
        }
      } else {
        console.error("Geolocation not supported by browser");
        localHandleGeolocationError();
      }
    };

    // Start geolocation process
    setupGeolocation();
    
    // Clean up on unmount
    return () => {
      // Clear geolocation watch
      if (watchIdRef.current) {
        console.log("Clearing geolocation watch:", watchIdRef.current);
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      
      // Clear simulation interval
      if (movementInterval) {
        console.log("Clearing movement simulation interval");
        clearInterval(movementInterval);
        movementInterval = null;
      }
    };
  }, [user, socket, simulateMovement, currentPosition, onPositionUpdate, updatePosition, defaultCenter]);

  // Update all service providers from props
  useEffect(() => {
    if (serviceProviders && serviceProviders.length > 0) {
      setAllServiceProviders(serviceProviders);
    }
  }, [serviceProviders]);
  
  // Listen for service provider location updates
  useEffect(() => {
    if (!socket || !user) return;
    
    // Only users should listen for service provider updates
    // Service providers should not listen for their own updates
    if (user?.role === 'serviceProvider') return;

    const handleLocationUpdate = (data) => {
      try {
        // Validate location data
        if (!data || !data.location || typeof data.location.lat !== 'number' || typeof data.location.lng !== 'number') {
          return;
        }

        // Update booked service provider position
        if (bookingDetails && data.userId === bookingDetails.providerId) {
          setServiceProviderPosition({
            lat: data.location.lat,
            lng: data.location.lng
          });
        }
        
        // Update all service providers' positions
        setAllServiceProviders(prev => {
          if (!Array.isArray(prev)) return [];
          
          return prev.map(provider => {
            if (provider && provider.id === data.userId) {
              return {
                ...provider,
                realTimeLocation: {
                  lat: data.location.lat,
                  lng: data.location.lng
                }
              };
            }
            return provider;
          });
        });
      } catch (error) {
        void error; // Explicitly ignore error
        // Ignore error
      }
    };

    socket.on('location-update', handleLocationUpdate);

    return () => {
      socket.off('location-update', handleLocationUpdate);
    };
  }, [socket, bookingDetails, user]);

  // Listen for service provider location updates with animation
  useEffect(() => {
    if (!socket || !user) return;
    
    // Only users should listen for service provider updates with animation
    // Service providers should not listen for their own updates
    if (user?.role === 'serviceProvider') return;
    
    const handleLocationUpdate = (data) => {
      if (data && data.location && bookingDetails?.details?.providerId === data.userId) {
        console.log("Received location update from service provider:", data);
        
        // Store the service provider's location for persistence
        localStorage.setItem('activeServiceProviderLocation', JSON.stringify(data.location));
        
        setServiceProviderPosition(data.location);
        setPreviousPositions(prev => {
          const newPositions = [data.location, ...prev];
          return newPositions.slice(0, 5); // Keep only last 5 positions
        });
        
        // Calculate if provider is moving
        if (previousPositions.length > 0) {
          const prevPos = previousPositions[0];
          const currentPos = data.location;
          const distance = calculateDistance(prevPos.lat, prevPos.lng, currentPos.lat, currentPos.lng);
          setIsMoving(distance > 0.005); // Moving if more than 5 meters
        }
        
        // Update last update time
        setLastUpdateTime(new Date().getTime());
      }
    };
    
    // Try to get stored service provider location first
    const storedProviderLocation = localStorage.getItem('activeServiceProviderLocation');
    if (storedProviderLocation && bookingDetails) {
      try {
        const parsedPosition = JSON.parse(storedProviderLocation);
        console.log("Using stored service provider position:", parsedPosition);
        setServiceProviderPosition(parsedPosition);
      } catch (e) {
        console.error("Error parsing stored service provider position:", e);
      }
    }
    
    socket.on('location-update', handleLocationUpdate);
    
    return () => {
      socket.off('location-update', handleLocationUpdate);
    };
  }, [socket, user, bookingDetails, previousPositions, calculateDistance]);

  // State for location names
  const [userLocationName, setUserLocationName] = useState('');
  const [providerLocationName, setProviderLocationName] = useState('');

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
        const response = await axios.get(`/api/geocode?lat=${lat}&lng=${lng}`, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
          const data = await response.json();
          if (data.name) {
            locationNameCache.current[cacheKey] = data.name;
            return data.name;
          }
        }
      } catch (error) {
        void error; // Explicitly ignore error
        // Silently fail and try next option
      }
      
      // Try OpenStreetMap API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await axios(
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
      } catch (error) {
        clearTimeout(timeoutId);
        throw error; // Re-throw to be caught by outer try-catch
      }
    } catch (error) {
      void error; // Explicitly ignore error
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
  }, [locationNameCache, mockLocationData]);

  // Update location names when positions change, with debounce
  useEffect(() => {
    let isMounted = true;
    const updateLocationNames = async () => {
      if (currentPosition) {
        try {
          const name = await getLocationName(currentPosition.lat, currentPosition.lng);
          if (isMounted) setUserLocationName(name);
        } catch (error) {
          void error; // Explicitly ignore error
          // Silently fail and keep previous value
          if (isMounted && !userLocationName) {
            setUserLocationName(`${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`);
          }
        }
      }
      
      if (serviceProviderPosition) {
        try {
          const name = await getLocationName(serviceProviderPosition.lat, serviceProviderPosition.lng);
          if (isMounted) setProviderLocationName(name);
        } catch (error) {
          void error; // Explicitly ignore error
          // Silently fail and keep previous value
          if (isMounted && !providerLocationName) {
            setProviderLocationName(`${serviceProviderPosition.lat.toFixed(4)}, ${serviceProviderPosition.lng.toFixed(4)}`);
          }
        }
      }
    };
    
    // Use a timeout to debounce API calls
    const timeoutId = setTimeout(updateLocationNames, 1000);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [currentPosition, serviceProviderPosition, getLocationName, userLocationName, providerLocationName]);

  // Enhanced Popup component
  const EnhancedPopup = ({ title, location, distance, extraInfo }) => (
    <div className="min-w-[200px]">
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      {location && <p className="text-sm text-gray-600 mb-1">{location}</p>}
      {distance && <p className="text-sm">Distance: {distance} km</p>}
      {extraInfo && <div className="mt-2">{extraInfo}</div>}
    </div>
  );

  // Add PropTypes validation
  EnhancedPopup.propTypes = {
    title: PropTypes.string.isRequired,
    location: PropTypes.string,
    distance: PropTypes.string,
    extraInfo: PropTypes.node
  };

  // Set default props
  EnhancedPopup.defaultProps = {
    location: '',
    distance: '',
    extraInfo: null
  };

  // We'll show a loading indicator but still render the map container
  // This helps with initialization issues

  // Enhanced booking acceptance handler
  const handleBookingAccept = () => {
    setShowAcceptModal(false);
    socket.emit('booking-accepted', { 
      bookingId: bookingDetails._id,
      serviceProviderId: user._id 
    });
    setBookingAccepted(true);
    // Automatically show directions when booking is accepted
    setShowDirections(true);
    addNotification('Booking accepted successfully!', 'success');
  };

  // Listen for booking acceptance confirmation
  useEffect(() => {
    if (!socket) return;
    
    // For users: listen for when their booking is accepted
    const handleBookingAcceptedByProvider = (data) => {
      if (data.bookingId === bookingId) {
        setBookingAccepted(true);
        setShowDirections(true);
        setTrackingStatus('active');
        addNotification('Your booking has been accepted! Service provider is on the way.', 'success');
      }
    };
    
    socket.on('booking-accepted-confirmation', handleBookingAcceptedByProvider);
    
    return () => {
      socket.off('booking-accepted-confirmation', handleBookingAcceptedByProvider);
    };
  }, [socket, bookingId]);

  // Listen for booking requests
  useEffect(() => {
    if (!socket || !user?.isServiceProvider) return;

    socket.on('booking-request', (data) => {
      // Make sure bookingDetails is updated
      if (typeof setBookingDetails === 'function') {
        setBookingDetails(data);
      }
      setShowAcceptModal(true);
      addNotification(`New booking request from ${data.userName}`, 'info');
    });

    return () => {
      socket.off('booking-request');
    };
  }, [socket, user, setBookingDetails]);

  // Calculate route when service provider accepts the booking or when positions change
  useEffect(() => {
    // Only calculate routes for users, not service providers
    if (user?.role === 'serviceProvider') return;
    
    if (!showDirections && !bookingAccepted) return;
    if (!currentPosition || !serviceProviderPosition) return;
    
    const fetchRoute = async () => {
      try {
        // Use OSRM for route calculation
        const response = await axios.get(
          `https://router.project-osrm.org/route/v1/driving/${currentPosition.lng},${currentPosition.lat};${serviceProviderPosition.lng},${serviceProviderPosition.lat}?overview=full&geometries=geojson`
        );
        
        const data = response.data;
        
        if (data.routes && data.routes.length > 0) {
          // Extract coordinates from the route
          const coordinates = data.routes[0].geometry.coordinates.map(coord => ({
            lat: coord[1],
            lng: coord[0]
          }));
          
          setRoutePath(coordinates);
          
          // Calculate distance and ETA based on route
          if (data.routes[0].distance) {
            const distanceInKm = (data.routes[0].distance / 1000).toFixed(1);
            setDistance(distanceInKm);
            
            // Estimate time: average speed 30 km/h in city traffic
            const estimatedMinutes = Math.ceil((data.routes[0].distance / 1000) * (60 / 30));
            setEta(estimatedMinutes);
          }
          
          // Adjust zoom to fit the route
          if (coordinates.length > 0 && mapRef.current) {
            const bounds = L.latLngBounds(coordinates.map(coord => [coord.lat, coord.lng]));
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        } else {
          // If no route found, just connect the two points directly
          setRoutePath([currentPosition, serviceProviderPosition]);
        }
      } catch (error) {
        void error; // Explicitly ignore error
        // If API fails, just connect the two points directly
        setRoutePath([currentPosition, serviceProviderPosition]);
      }
    };

    fetchRoute();
  }, [showDirections, bookingAccepted, serviceProviderPosition, currentPosition, user]);

  // Add a new effect to handle socket reconnection
  useEffect(() => {
    if (socket) {
      const handleReconnect = () => {
        console.log('Socket reconnected, restarting position watch');
        // Restart position watching when socket reconnects
        if (navigator.geolocation && watchIdRef.current === null) {
          // Setup geolocation again
          if (navigator.geolocation) {
            try {
              // Show loading indicator
              setLocationLoading(true);
              
              // Get initial position with high accuracy
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  console.log("Initial position obtained after reconnect:", position.coords);
                  // Update position
                  try {
                    const { latitude, longitude, accuracy, heading, speed } = position.coords;
                    
                    const newPosition = {
                      lat: latitude,
                      lng: longitude,
                      accuracy: accuracy,
                      heading: heading || 0,
                      speed: speed || 0,
                      timestamp: new Date().getTime()
                    };
                    
                    console.log("Position updated after reconnect:", newPosition);
                    
                    // Update state with new position
                    setCurrentPosition(newPosition);
                    setLocationLoading(false);
                    
                    // If user is a service provider, emit location update
                    if (user?.role === 'serviceProvider' && socket && socket.connected) {
                      socket.emit('update-location', {
                        userId: user._id,
                        location: newPosition,
                        timestamp: new Date().getTime()
                      });
                    }
                    
                    // Call the callback if provided
                    if (onPositionUpdate) {
                      onPositionUpdate(newPosition);
                    }
                  } catch (error) {
                    console.error("Error updating position after reconnect:", error);
                    handleGeolocationError();
                  }
                  
                  // Start watching for position changes
                  if (navigator.geolocation) {
                    try {
                      // Clear any existing watch
                      if (watchIdRef.current) {
                        navigator.geolocation.clearWatch(watchIdRef.current);
                      }
                      
                      // Set up a new watch with improved settings
                      watchIdRef.current = navigator.geolocation.watchPosition(
                        updatePosition,
                        (error) => {
                          console.error("Geolocation error after reconnect:", error.message);
                        },
                        {
                          enableHighAccuracy: true,
                          maximumAge: 0, // Always get fresh position
                          timeout: 10000 // Longer timeout for better accuracy
                        }
                      );
                      
                      console.log("Restarted watching position with ID:", watchIdRef.current);
                    } catch (error) {
                      console.error("Error restarting geolocation watch:", error);
                      handleGeolocationError();
                    }
                  }
                },
                (error) => {
                  console.error("Error getting initial position after reconnect:", error.message);
                  handleGeolocationError();
                },
                { 
                  enableHighAccuracy: true, 
                  timeout: 15000, // Longer initial timeout
                  maximumAge: 0 // Always get fresh position
                }
              );
            } catch (error) {
              console.error("Exception in reconnect geolocation setup:", error);
              handleGeolocationError();
            }
          }
        }
      };
      
      socket.on('connect', handleReconnect);
      
      return () => {
        socket.off('connect', handleReconnect);
      };
    }
  }, [socket, user, onPositionUpdate, updatePosition, handleGeolocationError]);

  return (
    <>
      <NotificationCenter />
      {showAcceptModal && <AcceptBookingModal />}
      
      {/* Tracking status bar - only show to users, not service providers */}
      {user?.role !== 'serviceProvider' && serviceProviderPosition && (
        <div className="fixed top-4 left-0 right-0 mx-auto max-w-md z-50 bg-white p-3 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isMoving ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
              <span className="font-medium">
                {trackingStatus === 'arriving' ? 'Service provider arriving' : 
                 trackingStatus === 'active' ? 'Service provider on the way' : 
                 'Tracking service provider'}
              </span>
            </div>
            <div>
              {distance && <span className="text-sm mr-2">{distance} km</span>}
              {eta && <span className="text-sm bg-blue-100 px-2 py-1 rounded">{eta} min ETA</span>}
            </div>
          </div>
          {lastUpdateTime && (
            <div className="text-xs text-gray-500 mt-1">
              Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
      
      <div className="h-full w-full relative">
        {locationLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading map...</p>
            </div>
          </div>
        )}
        <MapContainer 
          center={[currentPosition.lat, currentPosition.lng]} 
          zoom={mapZoom} 
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
          whenCreated={(map) => {
            // Force map to invalidate size after creation
            setTimeout(() => {
              map.invalidateSize();
            }, 250);
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Update map view when position changes */}
          <MapUpdater 
            position={currentPosition} 
            zoom={mapZoom} 
          />
          
          {/* Current user marker */}
          <Marker 
            position={[currentPosition.lat, currentPosition.lng]}
            icon={userIcon}
          >
            <Popup>
              <EnhancedPopup 
                title={user?.name || 'You'} 
                location={userLocationName}
                extraInfo={
                  <div>
                    <p>Role: {user?.role === 'serviceProvider' ? 'Service Provider' : 'User'}</p>
                    {user?.phone && <p>Phone: {user.phone}</p>}
                  </div>
                }
              />
            </Popup>
          </Marker>
          
          {/* Previous positions trail for service provider - only shown to users */}
          {user?.role !== 'serviceProvider' && previousPositions.map((pos, index) => (
            <Marker 
              key={`history-${index}`}
              position={[pos.lat, pos.lng]}
              icon={historyIcon}
              opacity={0.5 - (index * 0.1)}
            />
          ))}
          
          {/* Service provider marker for active booking (only shown to users) */}
          {user?.role !== 'serviceProvider' && serviceProviderPosition && (
            <Marker 
              position={[serviceProviderPosition.lat, serviceProviderPosition.lng]}
              icon={providerIcon}
              ref={markerRef}
              className={isMoving ? 'animated-marker' : ''}
            >
              <Popup>
                <EnhancedPopup 
                  title={bookingDetails?.providerName || 'Service Provider'}
                  location={providerLocationName}
                  distance={distance}
                  extraInfo={
                    <div>
                      {bookingDetails?.providerPhone && <p>Phone: {bookingDetails.providerPhone}</p>}
                      <p>ETA: {eta || '...'} mins</p>
                      <p>Status: {isMoving ? 'Moving' : 'Stationary'}</p>
                    </div>
                  }
                />
              </Popup>
            </Marker>
          )}
          
          {/* Show route line if directions are enabled and route exists - only for users */}
          {user?.role !== 'serviceProvider' && (showDirections || bookingAccepted) && routePath.length > 0 && (
            <Polyline 
              positions={routePath.map(point => [point.lat, point.lng])}
              color="#0066CC"
              weight={5}
              opacity={0.8}
              dashArray="15, 10"
              className="animated-dash"
            />
          )}
        </MapContainer>
      </div>
    </>
  );
};

LiveTracking.propTypes = {
  bookingDetails: PropTypes.object,
  showDirections: PropTypes.bool,
  serviceProviders: PropTypes.array,
  onProviderSelect: PropTypes.func,
  onPositionUpdate: PropTypes.func,
  setBookingDetails: PropTypes.func
};

export default LiveTracking;
