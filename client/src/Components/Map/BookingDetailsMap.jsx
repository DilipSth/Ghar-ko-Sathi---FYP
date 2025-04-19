import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { toast } from 'react-toastify';
import { useAuth } from '../../context/authContext';
import { BookingPaymentSection } from '../Booking';

// Fix for Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png"
});

// Custom marker icons
const providerIcon = new L.Icon({
  iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: "https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Map view center updater component
const MapCenterUpdater = ({ center }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  
  return null;
};

const BookingDetailsMap = ({ booking, onStartJob }) => {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState(null);
  const [providerLocation, setProviderLocation] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Extract locations from booking data
    if (booking) {
      // Try to get user location from booking
      if (booking.userLocation) {
        if (typeof booking.userLocation === 'string') {
          // It's an address string, not coordinates
          setUserLocation({
            address: booking.userLocation,
            coordinates: null
          });
        } else if (booking.userLocation.lat && booking.userLocation.lng) {
          // It's coordinates
          setUserLocation({
            address: booking.userLocationName || 'User Location',
            coordinates: [booking.userLocation.lat, booking.userLocation.lng]
          });
        }
      } else if (booking.location) {
        // Try alternative location format
        if (booking.location.address) {
          setUserLocation({
            address: booking.location.address,
            coordinates: booking.location.coordinates ? 
              [booking.location.coordinates.lat, booking.location.coordinates.lng] : null
          });
        }
      }

      // Set service provider's location if available
      if (booking.providerLocation) {
        setProviderLocation({
          address: booking.providerLocationName || 'Your Location',
          coordinates: [booking.providerLocation.lat, booking.providerLocation.lng]
        });
      }
    }
  }, [booking]);

  const openGoogleMapsNavigation = () => {
    let destinationQuery = '';
    
    // Try different possible location formats to get the user's location
    if (userLocation) {
      if (userLocation.coordinates) {
        destinationQuery = `${userLocation.coordinates[0]},${userLocation.coordinates[1]}`;
      } else if (userLocation.address) {
        destinationQuery = userLocation.address;
      }
    } else if (booking.userLocation) {
      if (typeof booking.userLocation === 'string') {
        destinationQuery = booking.userLocation;
      } else if (booking.userLocation.lat && booking.userLocation.lng) {
        destinationQuery = `${booking.userLocation.lat},${booking.userLocation.lng}`;
      }
    } else if (booking.location) {
      if (booking.location.address) {
        destinationQuery = booking.location.address;
      } else if (booking.location.coordinates && booking.location.coordinates.lat) {
        destinationQuery = `${booking.location.coordinates.lat},${booking.location.coordinates.lng}`;
      }
    }
    
    // If we still don't have a destination, show an error
    if (!destinationQuery) {
      toast.error('User location not available for navigation');
      return;
    }
    
    // Encode the destination for the URL
    const encodedDestination = encodeURIComponent(destinationQuery);
    
    // Open Google Maps with the destination - using directions mode for navigation
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedDestination}`, '_blank');
  };

  const getMapCenter = () => {
    if (userLocation && userLocation.coordinates) {
      return userLocation.coordinates;
    } else if (providerLocation && providerLocation.coordinates) {
      return providerLocation.coordinates;
    } else {
      return [27.7172, 85.3238]; // Default location (Kathmandu)
    }
  };

  const mapCenter = getMapCenter();

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <h2 className="text-xl font-bold mb-4">Booking Confirmed</h2>
      
      <div className="mb-6 bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center mb-3">
          <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-full mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-600">Your Location:</p>
            <p className="font-medium">
              {providerLocation?.address || booking?.providerLocationName || "Current Location"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center">
          <div className="w-8 h-8 flex items-center justify-center bg-green-100 rounded-full mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-gray-600">User Location:</p>
            <p className="font-medium">
              {userLocation?.address || booking?.userLocationName || booking?.userAddress || "User Location"}
            </p>
          </div>
        </div>
      </div>
      
      <div className="mb-4 space-y-2">
        <div>
          <span className="font-medium">Service:</span> {booking?.service || booking?.details?.service}
        </div>
        <div>
          <span className="font-medium">Phone:</span> {booking?.userPhone || booking?.details?.userPhone}
        </div>
        <div>
          <span className="font-medium">Location:</span> {userLocation?.address || booking?.userLocationName || booking?.userAddress}
        </div>
        <div>
          <span className="font-medium">User's Description:</span> {booking?.description || booking?.details?.description}
        </div>
      </div>
      
      {/* Map View */}
      <div className="mb-5 rounded overflow-hidden h-64 border border-gray-300">
        <MapContainer
          center={mapCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapCenterUpdater center={mapCenter} />
          
          {userLocation && userLocation.coordinates && (
            <Marker position={userLocation.coordinates} icon={userIcon}>
              <Popup>
                User Location: {userLocation.address}
              </Popup>
            </Marker>
          )}
          
          {providerLocation && providerLocation.coordinates && (
            <Marker position={providerLocation.coordinates} icon={providerIcon}>
              <Popup>
                Your Location: {providerLocation.address}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      
      <div className="flex space-x-3">
        <button
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-md hover:bg-indigo-700 transition-colors"
          onClick={openGoogleMapsNavigation}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Open in Google Maps
        </button>
        
        <button
          className="flex-1 bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition-colors"
          onClick={onStartJob}
        >
          Start Job
        </button>
      </div>
      
      {/* Payment Section for Users */}
      {user.role === 'user' && (
        <BookingPaymentSection booking={booking} />
      )}
    </div>
  );
};

export default BookingDetailsMap; 