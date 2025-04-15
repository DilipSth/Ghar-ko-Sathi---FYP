import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SocketContext } from '../context/SocketContext';
import { useAuth } from '../context/authContext';
import PropTypes from 'prop-types';

// Fix for Leaflet marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icons for different users
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const providerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Default center (Kathmandu, Nepal)
const defaultCenter = {
  lat: 27.7172,
  lng: 85.3240
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

const LiveTracking = ({ bookingDetails, showDirections = false, serviceProviders = [], onProviderSelect = null }) => {
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

    // Function to handle geolocation errors with fallback
    const handleGeolocationError = (error) => {
      console.warn("Using simulated location due to geolocation error:", error);
      
      // Use default position as fallback and start simulation
      if (!usingSimulatedLocation) {
        usingSimulatedLocation = true;
        setCurrentPosition(defaultCenter);
        
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
      }
      
      setLocationLoading(false);
    };

    // Function to update position and emit if needed
    const updatePosition = (position) => {
      try {
        // Clear simulation if we were using it
        if (usingSimulatedLocation && movementInterval) {
          clearInterval(movementInterval);
          usingSimulatedLocation = false;
        }
        
        const { latitude, longitude } = position.coords;
        const newPosition = {
          lat: latitude,
          lng: longitude
        };
        
        setCurrentPosition(newPosition);

        // If user is a service provider, emit location update
        if (user?.role === 'serviceProvider' && socket) {
          socket.emit('update-location', {
            userId: user._id,
            location: newPosition
          });
        }
      } catch (err) {
        console.error("Error processing position:", err);
        handleGeolocationError(err);
      }
    };

    // Try to get real location, fall back to simulation if needed
    const setupGeolocation = () => {
      if (navigator.geolocation) {
        try {
          // Get initial position
          navigator.geolocation.getCurrentPosition(
            updatePosition,
            handleGeolocationError,
            { 
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 60000
            }
          );

          // Set up watch with very permissive settings
          watchIdRef.current = navigator.geolocation.watchPosition(
            updatePosition,
            (error) => {
              // Don't disrupt experience on watch errors if we already have a position
              console.warn("Watch position error:", error);
              // Only fall back to simulation if we don't have a position yet
              if (!currentPosition || currentPosition === defaultCenter) {
                handleGeolocationError(error);
              }
            },
            { 
              enableHighAccuracy: false,
              maximumAge: 60000,
              timeout: 30000
            }
          );
        } catch (err) {
          console.error("Unexpected geolocation error:", err);
          handleGeolocationError(err);
        }
      } else {
        console.warn("Geolocation not supported, using simulated location");
        handleGeolocationError({ code: 0, message: "Geolocation not supported" });
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
          console.error("Error clearing watch:", err);
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
      // Update booked service provider position
      if (bookingDetails && data.userId === bookingDetails.providerId) {
        console.log('Provider location update received:', data.location);
        setServiceProviderPosition({
          lat: data.location.lat,
          lng: data.location.lng
        });
      }
      
      // Update all service providers' positions
      setAllServiceProviders(prev => {
        return prev.map(provider => {
          if (provider.id === data.userId) {
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
        }
      } catch (error) {
        console.error('Error fetching route:', error);
        // If API fails, just connect the two points directly
        setRoutePath([currentPosition, serviceProviderPosition]);
      }
    };

    fetchRoute();
  }, [showDirections, serviceProviderPosition, currentPosition]);

  if (locationLoading) {
    return <div className="flex items-center justify-center h-full">Loading map...</div>;
  }

  return (
    <div className="h-full w-full">
      <MapContainer 
        center={[currentPosition.lat, currentPosition.lng]} 
        zoom={mapZoom} 
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
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
          icon={user?.role === 'serviceProvider' ? providerIcon : userIcon}
        >
          <Popup>
            You are here
            <br />
            {user?.role === 'serviceProvider' ? 'Service Provider' : 'User'}
          </Popup>
        </Marker>
        
        {/* Service provider marker for active booking (only shown to users) */}
        {user?.role !== 'serviceProvider' && serviceProviderPosition && (
          <Marker 
            position={[serviceProviderPosition.lat, serviceProviderPosition.lng]}
            icon={providerIcon}
          >
            <Popup>
              Service Provider
              <br />
              {bookingDetails?.details?.providerName || 'Your service provider'}
            </Popup>
          </Marker>
        )}

        {/* All available service providers (only in idle state) */}
        {user?.role !== 'serviceProvider' && !bookingDetails && allServiceProviders.map(provider => {
          // Use real-time location if available, otherwise use static position
          const position = provider.realTimeLocation ? 
            [provider.realTimeLocation.lat, provider.realTimeLocation.lng] : 
            [defaultCenter.lat + (Math.random() * 0.01), defaultCenter.lng + (Math.random() * 0.01)];
          
          return (
            <Marker 
              key={provider.id}
              position={position}
              icon={provider.id === selectedProviderId ? 
                new L.Icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                  shadowUrl: iconShadow,
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                }) : 
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
                <div className="text-center">
                  <h3 className="font-bold">{provider.name}</h3>
                  <p className="text-sm">{provider.services}</p>
                  <p className="text-sm">Rating: {provider.rating}⭐</p>
                  <p className="text-sm">Jobs: {provider.completedJobs}</p>
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
              </Popup>
            </Marker>
          );
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
  );
};

LiveTracking.propTypes = {
  bookingDetails: PropTypes.object,
  showDirections: PropTypes.bool,
  serviceProviders: PropTypes.array,
  onProviderSelect: PropTypes.func
};

export default LiveTracking;
