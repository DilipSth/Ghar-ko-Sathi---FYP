import {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SocketContext } from "../context/SocketContext";
import { useAuth } from "../context/authContext";
import PropTypes from "prop-types";
import axios from "axios";

// Fix for Leaflet marker icons
const iconUrl = "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png";
const shadowUrl =
  "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

const createCustomIcon = (color, size = "normal") => {
  const sizeMultiplier = size === "large" ? 1.3 : size === "small" ? 0.8 : 1;
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25 * sizeMultiplier, 41 * sizeMultiplier],
    iconAnchor: [12 * sizeMultiplier, 41 * sizeMultiplier],
    popupAnchor: [1, -34],
    shadowSize: [41 * sizeMultiplier, 41 * sizeMultiplier],
  });
};

const userIcon = createCustomIcon("red");
const providerIcon = createCustomIcon("blue", "large");
const historyIcon = createCustomIcon("gray", "small");

const defaultCenter = {
  lat: 27.7172,
  lng: 85.3238,
};

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
  zoom: PropTypes.number,
};

const LiveTracking = ({
  bookingDetails,
  showDirections: initialShowDirections = false,
  serviceProviders = [],
  onPositionUpdate = null,
  setBookingDetails,
  bookingState,
}) => {
  const [currentPosition, setCurrentPosition] = useState(() => {
    const stored = localStorage.getItem("userCurrentPosition");
    return stored ? JSON.parse(stored) : defaultCenter;
  });
  const [serviceProviderPosition, setServiceProviderPosition] = useState(() => {
    const stored = localStorage.getItem("activeServiceProviderLocation");
    return stored ? JSON.parse(stored) : null;
  });
  const [routePath, setRoutePath] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showDirections, setShowDirections] = useState(initialShowDirections);
  const [notifications, setNotifications] = useState([]);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState("idle");
  const [previousPositions, setPreviousPositions] = useState([]);
  const [bookingAccepted, setBookingAccepted] = useState(false);
  const [forceLocationUpdate, setForceLocationUpdate] = useState(false);

  const markerRef = useRef(null);
  const routeFetchTimeoutRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastReconnectAttemptRef = useRef(0);
  const retryCountRef = useRef(0);
  const lastProviderPositionRef = useRef(null);
  const hasProcessedStoredPositionRef = useRef(true);

  const { socket } = useContext(SocketContext) || {};
  const { user } = useAuth() || {};
  const mapRef = useRef(null);

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  }, []);

  const addNotification = (message, type = "info") => {
    const newNotification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString(),
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 5));

    setTimeout(() => {
      setNotifications((prev) =>
        prev.filter((n) => n.id !== newNotification.id)
      );
    }, 5000);
  };

  const NotificationCenter = () => (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg shadow-lg ${
            notification.type === "error"
              ? "bg-red-100"
              : notification.type === "success"
              ? "bg-green-100"
              : "bg-blue-100"
          }`}
        >
          <p>{notification.message}</p>
          <p className="text-xs text-gray-500">{notification.timestamp}</p>
        </div>
      ))}
    </div>
  );

  const [userLocationName, setUserLocationName] = useState("");
  const [providerLocationName, setProviderLocationName] = useState("");

  const locationNameCache = useRef({});

  const mockLocationData = useMemo(
    () => ({
      "27.7172,85.3238": "Kathmandu, Nepal",
      "27.6933,85.3424": "Patan, Lalitpur, Nepal",
      "27.6710,85.4298": "Bhaktapur, Nepal",
      "27.7030,85.3143": "Kirtipur, Nepal",
      "27.7500,85.3500": "Budhanilkantha, Nepal",
    }),
    []
  );

  const getLocationName = useCallback(
    async (lat, lng) => {
      const cacheKey = `${parseFloat(lat).toFixed(4)},${parseFloat(lng).toFixed(
        4
      )}`;

      if (locationNameCache.current[cacheKey]) {
        return locationNameCache.current[cacheKey];
      }

      for (const [mockCoords, mockName] of Object.entries(mockLocationData)) {
        const [mockLat, mockLng] = mockCoords.split(",").map(Number);
        if (Math.abs(mockLat - lat) < 0.01 && Math.abs(mockLng - lng) < 0.01) {
          locationNameCache.current[cacheKey] = mockName;
          return mockName;
        }
      }

      let fallbackName = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;

      if (lat > 27.6 && lat < 27.8 && lng > 85.2 && lng < 85.5) {
        fallbackName += " (Kathmandu Valley)";
      }

      locationNameCache.current[cacheKey] = fallbackName;
      return fallbackName;
    },
    [mockLocationData]
  );

  const updatePosition = useCallback(
    (position) => {
      try {
        const { latitude, longitude, accuracy, heading, speed } =
          position.coords;

        if (
          !latitude ||
          !longitude ||
          isNaN(latitude) ||
          isNaN(longitude) ||
          latitude < -90 ||
          latitude > 90 ||
          longitude < -180 ||
          longitude > 180
        ) {
          console.warn("Invalid coordinates received:", latitude, longitude);
          return;
        }

        const newPosition = {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy,
          heading: heading || 0,
          speed: speed || 0,
          timestamp: new Date().getTime(),
        };

        const lastPosition = localStorage.getItem("userCurrentPosition");
        let hasChanged = true;

        if (lastPosition) {
          try {
            const parsedLastPosition = JSON.parse(lastPosition);
            const distance = calculateDistance(
              parsedLastPosition.lat,
              parsedLastPosition.lng,
              latitude,
              longitude
            );

            hasChanged = distance > 0.01;

            if (!hasChanged) {
              console.log(
                "Position hasn't changed significantly, skipping update"
              );
              return;
            }
          } catch (e) {
            console.error("Error comparing with last position:", e);
          }
        }

        console.log("Real-time position updated:", newPosition);

        setCurrentPosition(newPosition);

        localStorage.setItem(
          "userCurrentPosition",
          JSON.stringify(newPosition)
        );

        setLocationLoading(false);

        if (user?.role === "serviceProvider" && socket && socket.connected) {
          console.log("Emitting location update to server");
          socket.emit("update-location", {
            userId: user._id,
            location: newPosition,
            timestamp: new Date().getTime(),
          });

          localStorage.setItem(
            "serviceProviderPosition",
            JSON.stringify(newPosition)
          );
        }

        setLastUpdateTime(new Date().toLocaleTimeString());

        if (onPositionUpdate) {
          onPositionUpdate(newPosition);
        }

        retryCountRef.current = 0;
      } catch (error) {
        console.error("Error updating position:", error);
      }
    },
    [user, socket, onPositionUpdate, calculateDistance]
  );

  const handleGeolocationError = useCallback((error) => {
    console.warn("Geolocation error:", error.message);
    setLocationLoading(false);
  }, []);

  useEffect(() => {
    if (
      bookingState === "accepted" ||
      bookingState === "confirmed" ||
      bookingState === "ongoing"
    ) {
      setForceLocationUpdate(true);
    }
  }, [bookingState]);

  useEffect(() => {
    let isActive = true;

    const attemptGeolocation = () => {
      if (!navigator.geolocation || !isActive) return;

      setLocationLoading(true);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!isActive) return;
          updatePosition(position);
          watchIdRef.current = navigator.geolocation.watchPosition(
            updatePosition,
            handleGeolocationError,
            {
              enableHighAccuracy: true,
              maximumAge: 10000,
              timeout: 15000,
            }
          );
        },
        handleGeolocationError,
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 30000,
        }
      );
    };

    if (forceLocationUpdate) {
      attemptGeolocation();
      setForceLocationUpdate(false);
    }

    return () => {
      isActive = false;
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [forceLocationUpdate, updatePosition, handleGeolocationError]);

  useEffect(() => {
    let isMounted = true;

    const updateLocationNames = async () => {
      if (currentPosition) {
        try {
          const name = await getLocationName(
            currentPosition.lat,
            currentPosition.lng
          );
          if (isMounted && name !== userLocationName) {
            setUserLocationName(name);
          }
        } catch (error) {
          console.error("Error getting user location name:", error);
        }
      }

      if (serviceProviderPosition) {
        try {
          const name = await getLocationName(
            serviceProviderPosition.lat,
            serviceProviderPosition.lng
          );
          if (isMounted && name !== providerLocationName) {
            setProviderLocationName(name);
          }
        } catch (error) {
          console.error("Error getting provider location name:", error);
        }
      }
    };

    const timeoutId = setTimeout(updateLocationNames, 1000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [
    currentPosition,
    serviceProviderPosition,
    getLocationName,
    userLocationName,
    providerLocationName,
  ]);

  useEffect(() => {
    if (!socket || !user || user?.role === "serviceProvider") return;

    const handleLocationUpdate = (data) => {
      try {
        if (
          !data ||
          !data.location ||
          typeof data.location.lat !== "number" ||
          typeof data.location.lng !== "number"
        ) {
          return;
        }

        if (
          bookingDetails?.providerId &&
          data.userId === bookingDetails.providerId
        ) {
          const newPosition = {
            lat: data.location.lat,
            lng: data.location.lng,
          };

          if (lastProviderPositionRef.current) {
            const distance = calculateDistance(
              lastProviderPositionRef.current.lat,
              lastProviderPositionRef.current.lng,
              newPosition.lat,
              newPosition.lng
            );
            if (distance < 0.01) {
              return;
            }
          }

          setServiceProviderPosition(newPosition);
          lastProviderPositionRef.current = newPosition;
          localStorage.setItem(
            "activeServiceProviderLocation",
            JSON.stringify(newPosition)
          );
        }
      } catch (error) {
        console.error("Error handling location update:", error);
      }
    };

    socket.on("location-update", handleLocationUpdate);

    return () => {
      socket.off("location-update", handleLocationUpdate);
    };
  }, [socket, user, bookingDetails?.providerId, calculateDistance]);

  useEffect(() => {
    if (
      !showDirections &&
      !bookingAccepted &&
      bookingState !== "confirmed" &&
      bookingState !== "ongoing"
    )
      return;
    if (!currentPosition || !serviceProviderPosition) return;

    const fetchRoute = async () => {
      try {
        const response = await axios.get(
          `https://router.project-osrm.org/route/v1/driving/${currentPosition.lng},${currentPosition.lat};${serviceProviderPosition.lng},${serviceProviderPosition.lat}?overview=full&geometries=geojson`
        );

        const data = response.data;

        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates.map(
            (coord) => ({
              lat: coord[1],
              lng: coord[0],
            })
          );

          setRoutePath(coordinates);

          if (data.routes[0].distance) {
            const distanceInKm = (data.routes[0].distance / 1000).toFixed(1);
            setDistance(distanceInKm);

            const estimatedMinutes = Math.ceil(
              (data.routes[0].distance / 1000) * (60 / 30)
            );
            setEta(estimatedMinutes);
          }

          if (coordinates.length > 0 && mapRef.current) {
            const bounds = L.latLngBounds(
              coordinates.map((coord) => [coord.lat, coord.lng])
            );
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      } catch (error) {
        console.error("Error fetching route:", error);
        setRoutePath([currentPosition, serviceProviderPosition]);
      }
    };

    if (routeFetchTimeoutRef.current) {
      clearTimeout(routeFetchTimeoutRef.current);
    }
    routeFetchTimeoutRef.current = setTimeout(fetchRoute, 3000);

    return () => {
      if (routeFetchTimeoutRef.current) {
        clearTimeout(routeFetchTimeoutRef.current);
      }
    };
  }, [
    showDirections,
    bookingAccepted,
    serviceProviderPosition,
    currentPosition,
    user,
    bookingState,
  ]);

  const EnhancedPopup = ({ title, location, distance, extraInfo }) => (
    <div className="min-w-[200px]">
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      {location && <p className="text-sm text-gray-600 mb-1">{location}</p>}
      {distance && <p className="text-sm">Distance: {distance} km</p>}
      {extraInfo && <div className="mt-2">{extraInfo}</div>}
    </div>
  );

  EnhancedPopup.propTypes = {
    title: PropTypes.string.isRequired,
    location: PropTypes.string,
    distance: PropTypes.string,
    extraInfo: PropTypes.node,
  };

  EnhancedPopup.defaultProps = {
    location: "",
    distance: "",
    extraInfo: null,
  };

  const handleBookingAccept = () => {
    setShowAcceptModal(false);
    socket.emit("booking-accepted", {
      bookingId: bookingDetails._id,
      serviceProviderId: user._id,
    });
    setBookingAccepted(true);
    setShowDirections(true);
    setForceLocationUpdate(true);
    addNotification("Booking accepted successfully!", "success");
  };

  const AcceptBookingModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg max-w-md w-full shadow-xl">
        <div className="flex items-start mb-4">
          <div className="bg-blue-100 p-3 rounded-full mr-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">
              New Booking Request
            </h3>
            <p className="text-sm text-gray-500">
              From: {bookingDetails?.userName}
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">Service:</span>
            <span className="font-medium">{bookingDetails?.serviceType}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone:</span>
            <span className="font-medium">
              {bookingDetails?.userPhone || "Not available"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Location:</span>
            <span className="font-medium text-right">
              {userLocationName || "Loading..."}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Distance:</span>
            <span className="font-medium">
              {calculateDistance(
                currentPosition.lat,
                currentPosition.lng,
                serviceProviderPosition?.lat || currentPosition.lat,
                serviceProviderPosition?.lng || currentPosition.lng
              )}{" "}
              km
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">ETA:</span>
            <span className="font-medium">
              {Math.ceil(
                calculateDistance(
                  currentPosition.lat,
                  currentPosition.lng,
                  serviceProviderPosition?.lat || currentPosition.lat,
                  serviceProviderPosition?.lng || currentPosition.lng
                ) * 3
              )}{" "}
              mins
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Requested at:</span>
            <span className="font-medium">
              {new Date().toLocaleTimeString()}
            </span>
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Accept
          </button>
        </div>
      </div>
    </div>
  );

  useEffect(() => {
    if (!socket) return;

    const handleBookingAcceptedByProvider = (data) => {
      setBookingAccepted(true);
      setShowDirections(true);
      setTrackingStatus("active");
      addNotification(
        "Your booking has been accepted! Service provider is on the way.",
        "success"
      );
    };

    socket.on("booking-accepted-confirmation", handleBookingAcceptedByProvider);

    return () => {
      socket.off(
        "booking-accepted-confirmation",
        handleBookingAcceptedByProvider
      );
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !user?.isServiceProvider) return;

    socket.on("booking-request", (data) => {
      if (typeof setBookingDetails === "function") {
        setBookingDetails(data);
      }
      setShowAcceptModal(true);
      addNotification(`New booking request from ${data.userName}`, "info");
    });

    return () => {
      socket.off("booking-request");
    };
  }, [socket, user, setBookingDetails]);

  return (
    <>
      <NotificationCenter />
      {showAcceptModal && <AcceptBookingModal />}

      {user?.role !== "serviceProvider" && serviceProviderPosition && (
        <div className="fixed top-4 left-0 right-0 mx-auto max-w-md z-50 bg-white p-3 rounded-lg shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  isMoving ? "bg-green-500 animate-pulse" : "bg-yellow-500"
                }`}
              ></div>
              <span className="font-medium">
                {trackingStatus === "arriving"
                  ? "Service provider arriving"
                  : trackingStatus === "active"
                  ? "Service provider on the way"
                  : "Tracking service provider"}
              </span>
            </div>
            <div>
              {distance && <span className="text-sm mr-2">{distance} km</span>}
              {eta && (
                <span className="text-sm bg-blue-100 px-2 py-1 rounded">
                  {eta} min ETA
                </span>
              )}
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
          zoom={15}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
          whenCreated={(map) => {
            setTimeout(() => {
              map.invalidateSize();
            }, 250);
          }}
        >
          <TileLayer
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapUpdater position={currentPosition} zoom={15} />

          <Marker
            position={[currentPosition.lat, currentPosition.lng]}
            icon={userIcon}
          >
            <Popup>
              <EnhancedPopup
                title={user?.name || "You"}
                location={userLocationName}
                extraInfo={
                  <div>
                    <p>
                      Role:{" "}
                      {user?.role === "serviceProvider"
                        ? "Service Provider"
                        : "User"}
                    </p>
                    {user?.phone && <p>Phone: {user.phone}</p>}
                  </div>
                }
              />
            </Popup>
          </Marker>

          {user?.role !== "serviceProvider" &&
            previousPositions.map((pos, index) => (
              <Marker
                key={`history-${index}`}
                position={[pos.lat, pos.lng]}
                icon={historyIcon}
                opacity={0.5 - index * 0.1}
              />
            ))}

          {user?.role !== "serviceProvider" && serviceProviderPosition && (
            <Marker
              position={[
                serviceProviderPosition.lat,
                serviceProviderPosition.lng,
              ]}
              icon={providerIcon}
              ref={markerRef}
              className={isMoving ? "animated-marker" : ""}
            >
              <Popup>
                <EnhancedPopup
                  title={bookingDetails?.providerName || "Service Provider"}
                  location={providerLocationName}
                  distance={distance}
                  extraInfo={
                    <div>
                      {bookingDetails?.providerPhone && (
                        <p>Phone: {bookingDetails.providerPhone}</p>
                      )}
                      <p>ETA: {eta || "..."} mins</p>
                      <p>Status: {isMoving ? "Moving" : "Stationary"}</p>
                    </div>
                  }
                />
              </Popup>
            </Marker>
          )}

          {user?.role !== "serviceProvider" &&
            (showDirections || bookingAccepted) &&
            routePath.length > 0 && (
              <Polyline
                positions={routePath.map((point) => [point.lat, point.lng])}
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
  onPositionUpdate: PropTypes.func,
  setBookingDetails: PropTypes.func,
  bookingState: PropTypes.string,
};

export default LiveTracking;
