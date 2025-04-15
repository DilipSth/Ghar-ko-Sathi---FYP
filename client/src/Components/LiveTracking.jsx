import { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SocketContext } from '../context/SocketContext';
import { useAuth } from '../context/authContext';
import PropTypes from 'prop-types';

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
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const providerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

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

const LiveTracking = ({ bookingDetails, showDirections = false, serviceProviders = [], onProviderSelect = null, onPositionUpdate = null, setBookingDetails }) => {
  const [currentPosition, setCurrentPosition] = useState(defaultCenter);
  const [serviceProviderPosition, setServiceProviderPosition] = useState(null);
  const [allServiceProviders, setAllServiceProviders] = useState([]);
  const [selectedProviderId, setSelectedProviderId] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [locationLoading, setLocationLoading] = useState(true);
  const mapZoom = 15;
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

  // Get current position on component mount
  useEffect(() => {
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

    // Function to handle geolocation errors with fallback
    const handleGeolocationError = () => {
      // Use default position as fallback and start simulation
      if (!usingSimulatedLocation) {
        usingSimulatedLocation = true;
        setCurrentPosition(defaultCenter);
        startLocationSimulation();
      }
    };

    // Function to update position and emit if needed
    const updatePosition = (position) => {
      try {
        // Extract coordinates
        const { latitude, longitude } = position.coords;
        
        // Create new position object
        const newPosition = {
          lat: latitude,
          lng: longitude
        };
        
        // Update state with new position
        setCurrentPosition(newPosition);
        
        // Set loading to false once we have a position
        setLocationLoading(false);
        
        // If user is a service provider, emit location update
        if (user?.role === 'serviceProvider' && socket) {
          socket.emit('update-location', {
            userId: user._id,
            location: newPosition
          });
        }
        
        // Call the callback if provided
        if (onPositionUpdate) {
          onPositionUpdate(newPosition);
        }
      } catch {
        handleGeolocationError();
      }
    };

    // Start watching position
    const startWatchingPosition = () => {
      if (navigator.geolocation) {
        try {
          watchIdRef.current = navigator.geolocation.watchPosition(
            updatePosition,
            () => {
              // Only fall back to simulation if we don't have a position yet
              if (!currentPosition || currentPosition === defaultCenter) {
                handleGeolocationError();
              }
            },
            {
              enableHighAccuracy: true,
              maximumAge: 10000,
              timeout: 5000
            }
          );
        } catch {
          handleGeolocationError();
        }
      } else {
        handleGeolocationError();
      }
    };

    // Setup geolocation
    const setupGeolocation = () => {
      if (navigator.geolocation) {
        try {
          // Get initial position
          navigator.geolocation.getCurrentPosition(
            updatePosition,
            handleGeolocationError,
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );

          // Set up watch with very permissive settings
          startWatchingPosition();
        } catch {
          handleGeolocationError();
        }
      } else {
        handleGeolocationError();
      }
    };

    // Start geolocation process
    setupGeolocation();
    
    // Clean up on unmount
    return () => {
      if (watchIdRef.current) {
        try {
          navigator.geolocation.clearWatch(watchIdRef.current);
        } catch (err) {
          // Ignore error
        }
      }
      
      if (movementInterval) {
        clearInterval(movementInterval);
      }
    };
  }, [user, socket, simulateMovement, currentPosition]);

  // Update all service providers from props
  useEffect(() => {
    if (serviceProviders && serviceProviders.length > 0) {
      setAllServiceProviders(serviceProviders);
    }
  }, [serviceProviders]);
  
  // Listen for service provider location updates
  useEffect(() => {
    if (!socket || !user || user?.role === 'serviceProvider') return;

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
      } catch (err) {
        // Ignore error
      }
    };

    socket.on('location-update', handleLocationUpdate);

    return () => {
      socket.off('location-update', handleLocationUpdate);
    };
  }, [socket, bookingDetails, user]);

  // Calculate route when both positions are available and directions are requested
  useEffect(() => {
    if (!showDirections || !serviceProviderPosition || !currentPosition) return;

    // Use OpenStreetMap Routing Machine API (OSRM) to get directions
    const fetchRoute = async () => {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${currentPosition.lng},${currentPosition.lat};${serviceProviderPosition.lng},${serviceProviderPosition.lat}?overview=full&geometries=geojson`
        );
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          // Extract coordinates from the route
          const coordinates = data.routes[0].geometry.coordinates.map(coord => ({
            lat: coord[1],
            lng: coord[0]
          }));
          
          setRoutePath(coordinates);
          
          // Adjust zoom to fit the route
          if (coordinates.length > 0 && mapRef.current) {
            const bounds = L.latLngBounds(coordinates.map(coord => [coord.lat, coord.lng]));
            mapRef.current.fitBounds(bounds);
          }
        } else {
          // If no route found, just connect the two points directly
          setRoutePath([currentPosition, serviceProviderPosition]);
        }
      } catch (error) {
        // If API fails, just connect the two points directly
        setRoutePath([currentPosition, serviceProviderPosition]);
      }
    };

    fetchRoute();
  }, [showDirections, serviceProviderPosition, currentPosition]);

  // State for notifications
  const [notifications, setNotifications] = useState([]);
  const [showAcceptModal, setShowAcceptModal] = useState(false);

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

  // Enhanced booking acceptance handler
  const handleBookingAccept = () => {
    setShowAcceptModal(false);
    socket.emit('booking-accepted', { 
      bookingId: bookingDetails._id,
      serviceProviderId: user._id 
    });
    addNotification('Booking accepted successfully!', 'success');
  };

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
  }, [socket, user]);

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                serviceProviderPosition.lat, serviceProviderPosition.lng
              )} km
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">ETA:</span>
            <span className="font-medium">
              {Math.ceil(calculateDistance(
                currentPosition.lat, currentPosition.lng,
                serviceProviderPosition.lat, serviceProviderPosition.lng
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

  // Custom marker icons
  const createCustomIcon = (color) => {
    return new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };

  const userIcon = createCustomIcon('red');
  const providerIcon = createCustomIcon('blue');
  const selectedProviderIcon = createCustomIcon('violet');

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

  // State for location names
  const [userLocationName, setUserLocationName] = useState('');
  const [providerLocationName, setProviderLocationName] = useState('');

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
  }, [locationNameCache, mockLocationData]);

  // Update location names when positions change, with debounce
  useEffect(() => {
    let isMounted = true;
    const updateLocationNames = async () => {
      if (currentPosition) {
        try {
          const name = await getLocationName(currentPosition.lat, currentPosition.lng);
          if (isMounted) setUserLocationName(name);
        } catch {
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
        } catch {
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

  // Calculate distance between points (in km)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  // We'll show a loading indicator but still render the map container
  // This helps with initialization issues

  return (
    <>
      <NotificationCenter />
      {showAcceptModal && <AcceptBookingModal />}
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
          
          {/* Service provider marker for active booking (only shown to users) */}
          {user?.role !== 'serviceProvider' && serviceProviderPosition && (
            <Marker 
              position={[serviceProviderPosition.lat, serviceProviderPosition.lng]}
              icon={providerIcon}
            >
              <Popup>
                <EnhancedPopup 
                  title={bookingDetails?.providerName || 'Service Provider'}
                  location={providerLocationName}
                  distance={calculateDistance(
                    currentPosition.lat, currentPosition.lng,
                    serviceProviderPosition.lat, serviceProviderPosition.lng
                  )}
                  extraInfo={
                    <div>
                      {bookingDetails?.providerPhone && <p>Phone: {bookingDetails.providerPhone}</p>}
                      <p>ETA: {Math.ceil(calculateDistance(
                        currentPosition.lat, currentPosition.lng,
                        serviceProviderPosition.lat, serviceProviderPosition.lng
                      ) * 3)} mins</p>
                    </div>
                  }
                />
              </Popup>
            </Marker>
          )}
          
          {/* All available service providers (shown when user is not a service provider) */}
          {user?.role !== 'serviceProvider' && allServiceProviders && allServiceProviders.length > 0 && allServiceProviders.map(provider => {
            try {
              if (!provider) {
                return null;
              }
              
              // Safely determine position with fallbacks to prevent crashes
              let position;
              
              if (provider.realTimeLocation && 
                  typeof provider.realTimeLocation.lat === 'number' && 
                  typeof provider.realTimeLocation.lng === 'number') {
                // Use real-time location if available and valid
                position = [
                  provider.realTimeLocation.lat, 
                  provider.realTimeLocation.lng
                ];
              } else if (provider.position && 
                        typeof provider.position.x === 'number' && 
                        typeof provider.position.y === 'number') {
                // Fall back to position coordinates if available
                position = [
                  defaultCenter.lat + (provider.position.x / 1000), 
                  defaultCenter.lng + (provider.position.y / 1000)
                ];
              } else {
                // Last resort: use default center with a small random offset
                const randomOffset = (Math.random() - 0.5) * 0.01;
                position = [
                  defaultCenter.lat + randomOffset, 
                  defaultCenter.lng + randomOffset
                ];
              }
              
              return (
                <Marker 
                  key={provider.id}
                  position={position}
                  icon={provider.id === selectedProviderId ? 
                    selectedProviderIcon : 
                    providerIcon
                  }
                
                eventHandlers={{
                  click: () => {
                    setSelectedProviderId(provider.id);
                    if (onProviderSelect) {
                      onProviderSelect(provider);
                    }
                  }
                }}
              >
                <Popup>
                  <EnhancedPopup 
                    title={provider.name}
                    location={`${provider.realTimeLocation?.lat?.toFixed(4)}, ${provider.realTimeLocation?.lng?.toFixed(4)}`}
                    extraInfo={
                      <div>
                        <p className="text-sm">Rating: {provider.rating}⭐</p>
                        <p className="text-sm">Jobs: {provider.completedJobs}</p>
                        <p className="text-sm">Phone: {provider.phone || 'Not available'}</p>
                        <button 
                          className="mt-2 bg-blue-500 text-white px-3 py-1 rounded text-sm"
                          onClick={() => {
                            if (onProviderSelect) {
                              onProviderSelect(provider);
                            }
                          }}
                        >
                          Book Now
                        </button>
                      </div>
                    }
                  />
                </Popup>
              </Marker>
            );
            } catch (err) {
              return null;
            }
          })}
          
          {/* Show route line if directions are enabled and route exists */}
          {showDirections && routePath.length > 0 && (
            <Polyline 
              positions={routePath.map(point => [point.lat, point.lng])}
              color="#3388ff"
              weight={4}
              opacity={0.7}
              dashArray="10, 10"
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
