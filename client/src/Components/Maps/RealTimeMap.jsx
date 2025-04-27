import React, { useState, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix the default icon issue with leaflet in webpack
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

const LocationMarker = ({ onLocationUpdate, providerLocation }) => {
  const map = useMapEvents({
    click() {
      map.locate();
    },
    locationfound(e) {
      if (onLocationUpdate) {
        onLocationUpdate(e.latlng);
      }
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    map.locate();
  }, [map]);

  return null; // Don't render a marker here since we'll render it in the parent component
};

const RealTimeMap = ({ 
  className = "", 
  onLocationUpdate,
  showUserMarker = false,
  userLocation = null,
  providerLocation = null,
  zoom = 13,
  center = [27.7172, 85.324] // Default to Kathmandu, Nepal
}) => {
  return (
    <div className={`h-full w-full ${className}`}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker 
          onLocationUpdate={onLocationUpdate}
          providerLocation={providerLocation}
        />
        
        {/* Show user marker if enabled and location is provided */}
        {showUserMarker && userLocation && (
          <Marker 
            position={[userLocation.lat, userLocation.lng]}
            icon={new L.Icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowUrl: iconShadow
            })}
          >
            <Popup>User Location</Popup>
          </Marker>
        )}

        {/* Show provider marker if location is provided */}
        {providerLocation && (
          <Marker 
            position={[providerLocation.lat, providerLocation.lng]}
            icon={new L.Icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowUrl: iconShadow
            })}
          >
            <Popup>Your Location</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default RealTimeMap; 