import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useAuth } from "../../../context/authContext";
import { SocketContext } from "../../../context/SocketContext";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate } from "react-router-dom";

// Fix the default icon issue with leaflet in webpack
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom marker component to handle provider and user locations
const DynamicMarkers = ({ providerPosition, userPosition, bookingState }) => {
  const map = useMapEvents({
    // Optional: recenter map on provider location when idle
     locationfound(e) {
       if (bookingState === 'idle') {
         // Prevent re-centering on every position update if already centered
         const center = map.getCenter();
         const distanceToCenter = center.distanceTo(e.latlng);
         if (distanceToCenter > 50) { // Recenter if more than 50 meters away
             map.flyTo(e.latlng, map.getZoom());
         }
       }
    },
  });

  useEffect(() => {
    // Attempt to locate provider when map is idle or during a booking
    if (bookingState === 'idle' || bookingState === 'accepted' || bookingState === 'confirmed' || bookingState === 'ongoing') {
       map.locate({ enableHighAccuracy: true, watch: true, timeout: 5000 });
    }

    // Fit bounds to include both markers if both are available and a booking is active
    if ((bookingState === 'accepted' || bookingState === 'confirmed' || bookingState === 'ongoing') && providerPosition && userPosition) {
      const bounds = L.latLngBounds([providerPosition, userPosition]);
      map.fitBounds(bounds, { padding: [50, 50] }); // Add some padding
    } else if (providerPosition && bookingState === 'idle') {
       map.setView(providerPosition, map.getZoom() || 13); // Center on provider in idle
    }

    // Cleanup function to stop watching location on component unmount or state change
    return () => {
      map.stopLocate();
    };
  }, [map, bookingState, providerPosition, userPosition]);

  // Render markers based on booking state
  return (
    <>
      {providerPosition && (
        <Marker position={providerPosition}>
          <Popup>Your Location</Popup>
        </Marker>
      )}
      {(bookingState === 'accepted' || bookingState === 'confirmed' || bookingState === 'ongoing') && userPosition && (
        <Marker position={userPosition}>
          <Popup>User Location</Popup>
        </Marker>
      )}
    </>
  );
};

const ServiceProviderMap = () => {
  const { user } = useAuth();
  const { socket } = useContext(SocketContext);
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("available");
  const [currentRequest, setCurrentRequest] = useState(null);
  const [bookingState, setBookingState] = useState("idle");
  const [serviceHistory, setServiceHistory] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [locationName, setLocationName] = useState("Loading...");
  // Initialize currentPosition from localStorage if available
  const [currentPosition, setCurrentPosition] = useState(() => {
    const savedPosition = localStorage.getItem("serviceProviderPosition");
    return savedPosition ? JSON.parse(savedPosition) : null;
  });
  const [userPosition, setUserPosition] = useState({
    lat: 27.7172,
    lng: 85.324,
  }); // Default to Islington College coordinates
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  // Add states for maintenance details
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [maintenancePrice, setMaintenancePrice] = useState("");
  const [jobStartTime, setJobStartTime] = useState(null);
  const [jobDuration, setJobDuration] = useState(0); // in hours
  const [materials, setMaterials] = useState([]);
  const [materialName, setMaterialName] = useState("");
  const [materialCost, setMaterialCost] = useState(0);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  // State for additional charges specifically
  const [additionalChargeValue, setAdditionalChargeValue] = useState(0);
  // State to manage the step in the ongoing job popup
  const [ongoingStep, setOngoingStep] = useState('details'); // 'details' or 'maintenance'

  // Calculate distance between two points in kilometers
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;

    const R = 6371; // Radius of the earth in km
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

  // Calculate ETA based on distance
  const calculateETA = useCallback((distanceInKm) => {
    // Assuming average speed of 30 km/h in city traffic
    return Math.ceil(distanceInKm * (60 / 30)); // Minutes
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Create a stable reference to the event handlers
    const handleNewBookingRequest = (booking) => {
      // If the booking includes user location, use it
      const enhancedBooking = {
        ...booking,
        details: {
          ...booking.details,
          userLocationName: booking.details.userLocationName || locationName || "Current Location",
        }
      };
      
      setPendingRequests((prev) => [...prev, enhancedBooking]);
    };

    const handleBookingConfirmed = (booking) => {
      setBookingState("accepted");
      setCurrentRequest(booking);
    };

    const handleBookingConfirmedByUser = (booking) => {
      setBookingState("confirmed");
      setCurrentRequest(booking);
    };

    const handleProblemDescriptionReceived = (booking) => {
      setBookingState("confirmed");
      setCurrentRequest(booking);
    };

    const handleJobStartedSuccess = (booking) => {
      setBookingState("ongoing");
      setCurrentRequest(booking);
    };

    const handleUserCompletedJob = (booking) => {
      setBookingState("user-completed");
      setCurrentRequest(booking);
    };

    const handleJobCompleted = (booking) => {
      setBookingState("completed");
      setCurrentRequest(booking);
      setServiceHistory((prev) => [
        {
          id: booking.bookingId,
          customer: { name: booking.details.userName || "Unknown User" },
          service: booking.details.service,
          issue: booking.details.issue,
          requestTime: new Date(
            booking.details.requestTime
          ).toLocaleTimeString(),
          status: "completed",
          earnings: 75,
          date: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        },
        ...prev,
      ]);
    };

    const handleReviewReceived = (booking) => {
      setBookingState("reviewed");
      setCurrentRequest(booking);
    };

    // Register all event listeners
    socket.on("newBookingRequest", handleNewBookingRequest);
    socket.on("bookingConfirmed", handleBookingConfirmed);
    socket.on("bookingConfirmedByUser", handleBookingConfirmedByUser);
    socket.on("problemDescriptionReceived", handleProblemDescriptionReceived);
    socket.on("jobStartedSuccess", handleJobStartedSuccess);
    socket.on("userCompletedJob", handleUserCompletedJob);
    socket.on("jobCompleted", handleJobCompleted);
    socket.on("reviewReceived", handleReviewReceived);

    return () => {
      // Clean up all event listeners
      socket.off("newBookingRequest", handleNewBookingRequest);
      socket.off("bookingConfirmed", handleBookingConfirmed);
      socket.off("bookingConfirmedByUser", handleBookingConfirmedByUser);
      socket.off(
        "problemDescriptionReceived",
        handleProblemDescriptionReceived
      );
      socket.off("jobStartedSuccess", handleJobStartedSuccess);
      socket.off("userCompletedJob", handleUserCompletedJob);
      socket.off("jobCompleted", handleJobCompleted);
      socket.off("reviewReceived", handleReviewReceived);
    };
  }, [socket]); // Only depend on socket, not user

  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
  };

  const viewRequest = (request) => {
    // Get the real user location from the request data
    const userLocation = request.userLocation || request.details.userLocation;
    
    if (userLocation) {
      setUserPosition(userLocation);
    } else {
       // Fallback to default or previous user position if not available in request
       // Keep the existing userPosition state value if request.userLocation is null/undefined
       console.warn("User location not found in booking request.");
    }

    // When we receive a booking request, first try to get the current location
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const providerLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        // Save current position to localStorage
        localStorage.setItem("serviceProviderPosition", JSON.stringify(providerLocation));
        
        // Update current position state
        setCurrentPosition(providerLocation);
        
        // Now set the current request with all location information
        setCurrentRequest({
          ...request,
          userLocationName: request.details.userLocationName || "Current Location",
          userLocation: userLocation,
          providerLocation: providerLocation
        });
        
        setBookingState("reviewing");
      },
      (error) => {
        console.error("Error getting provider location:", error);
        // Fall back to last known position if geolocation fails
        setCurrentRequest({
          ...request,
          userLocationName: request.details.userLocationName || "Current Location",
          userLocation: userLocation
        });
        
        setBookingState("reviewing");
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const acceptRequest = () => {
    if (currentRequest && socket) {
      // Extract user position from the request
      if (currentRequest.userLocation) {
        setUserPosition(currentRequest.userLocation);

        // Calculate distance and ETA
        if (currentPosition) {
          const dist = calculateDistance(
            currentPosition.lat,
            currentPosition.lng,
            currentRequest.userLocation.lat,
            currentRequest.userLocation.lng
          );
          setDistance(dist);
          setEta(calculateETA(dist));
        }
      }

      // Accept the booking
      socket.emit("acceptBooking", { bookingId: currentRequest.bookingId });
      setPendingRequests(
        pendingRequests.filter(
          (req) => req.bookingId !== currentRequest.bookingId
        )
      );
    }
  };

  const declineRequest = () => {
    if (currentRequest && socket) {
      socket.emit("declineBooking", { bookingId: currentRequest.bookingId });
      setPendingRequests(
        pendingRequests.filter(
          (req) => req.bookingId !== currentRequest.bookingId
        )
      );
      setCurrentRequest(null);
      setBookingState("idle");
    }
  };

  const startJob = () => {
    if (currentRequest && socket) {
      // Record job start time
      const startTime = new Date();
      setJobStartTime(startTime);
      socket.emit("startJob", { bookingId: currentRequest.bookingId });
    }
  };

  const completeJob = () => {
    if (currentRequest && socket) {
      // Calculate job duration if job start time exists
      if (jobStartTime) {
        const endTime = new Date();
        const durationMs = endTime - jobStartTime;
        const durationHours = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
        setJobDuration(durationHours);
      }

      // Reset the ongoing step when completing the job
      setOngoingStep('details');

      socket.emit("completeJob", {
        bookingId: currentRequest.bookingId,
        completedBy: "provider",
      });
    }
  };

  const goBackToIdle = () => {
    if (bookingState === "reviewed") {
      navigate("/services"); // Redirect to services page after review
    } else {
      setCurrentRequest(null);
      setBookingState("idle");
    }
  };

  const handleLocationUpdate = (location) => {
    setCurrentPosition({
      lat: location.lat,
      lng: location.lng
    });
    
    // Save position to localStorage whenever it updates
    localStorage.setItem("serviceProviderPosition", JSON.stringify({
      lat: location.lat,
      lng: location.lng
    }));

    // Only send location updates when there's an active booking
    if (bookingState === "accepted" || bookingState === "confirmed" || bookingState === "ongoing") {
      if (socket && currentRequest) {
        socket.emit("location-update", {
          bookingId: currentRequest._id || currentRequest.bookingId,
          location: { lat: location.lat, lng: location.lng },
          locationName: locationName,
          distance: distanceToUser,
          eta: etaToUser
        });
      }
    }
  };

  // Separate useEffect for location name to prevent infinite loops
  useEffect(() => {
    if (!currentPosition) return;

    const getLocationName = async () => {
      try {
        // Add validation to ensure coordinates are defined
        if (!currentPosition.lat || !currentPosition.lng) {
          console.error("Invalid coordinates:", currentPosition);
          setLocationName("Unknown location");
          return;
        }
        
        // Use the Nominatim API to get a proper location name from coordinates
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentPosition.lat}&lon=${currentPosition.lng}&zoom=18&addressdetails=1`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch location name: ${response.status}`);
        }
        
        const data = await response.json();
        const displayName = data.display_name || 
          `${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`;
        
        setLocationName(displayName);
      } catch (error) {
        console.error("Error getting location name:", error);
        
        // Only try to format coordinates if they are valid
        if (typeof currentPosition.lat === 'number' && typeof currentPosition.lng === 'number') {
          setLocationName(`${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`);
        } else {
          setLocationName("Unknown location");
        }
      }
    };

    // Use a debounce mechanism to prevent too many API calls
    const timeoutId = setTimeout(getLocationName, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentPosition]);

  // Function to add a material to the list
  const addMaterial = () => {
    if (materialName && materialCost) {
      const newMaterial = {
        name: materialName,
        cost: parseFloat(materialCost) || 0,
      };
      setMaterials([...materials, newMaterial]);
      setMaterialName("");
      setMaterialCost(0);
    }
  };

  // Function to remove a material from the list
  const removeMaterial = (index) => {
    const updatedMaterials = [...materials];
    updatedMaterials.splice(index, 1);
    setMaterials(updatedMaterials);
  };

  // Calculate total material cost
  const calculateMaterialCost = () => {
    return materials.reduce((total, material) => total + material.cost, 0);
  };

  // Function to handle maintenance details submission
  const handleMaintenanceSubmit = () => {
    if (currentRequest && socket) {
      // Calculate hourly charge based on job duration (200 Rs per hour)
      const hourlyRate = 200;
      const hourlyCharge = jobDuration * hourlyRate;
      
      // Calculate total material cost
      const materialCost = calculateMaterialCost();
      
      // Calculate total maintenance price (hourly charge + material cost + additional charges)
      const maintenanceTotal = hourlyCharge + materialCost + additionalChargeValue;
      
      const maintenanceDetails = {
        jobDuration,
        hourlyRate,
        hourlyCharge,
        materials,
        materialCost,
        additionalCharge: additionalChargeValue,
        maintenancePrice: maintenanceTotal,
        maintenanceNotes
      };
      
      console.log("Sending maintenance details:", maintenanceDetails);
      socket.emit("updateMaintenanceDetails", {
        bookingId: currentRequest.bookingId,
        ...maintenanceDetails
      });

      // Update the current request with maintenance details
      setCurrentRequest((prev) => ({
        ...prev,
        maintenanceDetails
      }));
    }
  };

  // Add these helper functions before the return statement
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  }

  // Calculate current distance and ETA
  const [distanceToUser, setDistanceToUser] = useState(null);
  const [etaToUser, setEtaToUser] = useState(null);

  // Update distance and ETA whenever position changes
  useEffect(() => {
    if (currentPosition && currentRequest?.details?.userLocation) {
      const userLat = currentRequest.details.userLocation.lat;
      const userLng = currentRequest.details.userLocation.lng;
      
      // Use currentPosition.lat and currentPosition.lng instead of array indices
      const distance = calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        userLat,
        userLng
      );
      
      setDistanceToUser(distance);
      
      // Estimate ETA based on average speed (30 km/h)
      const averageSpeedKmPerHour = 30;
      if (distance) {
        // Time in minutes = (distance in km / speed in km per hour) * 60
        setEtaToUser(Math.round((distance / averageSpeedKmPerHour) * 60));
      }
    }
  }, [currentPosition, currentRequest, calculateDistance]);

  const handleBookingAction = async (booking, action) => {
    if (!booking || !action) return;
    
    try {
      let endpoint = "";
      let requestData = { bookingId: booking._id };
      
      switch (action) {
        case "accept":
          endpoint = "http://localhost:8000/api/bookings/accept";
          break;
        case "reject":
          endpoint = "http://localhost:8000/api/bookings/reject";
          break;
        case "start":
          endpoint = "http://localhost:8000/api/bookings/start";
          break;
        case "complete":
          endpoint = "http://localhost:8000/api/bookings/complete";
          break;
        default:
          setError("Invalid action");
          return;
      }
      
      // API call code would go here
      
      // Placeholder instead of calling undefined functions
      console.log(`Would call endpoint: ${endpoint} with booking ID: ${requestData.bookingId}`);
    } catch (error) {
      console.error(`Error ${action}ing booking:`, error);
      setError(`Failed to ${action} booking`);
    }
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
              className={`px-3 py-1 rounded-full text-sm ${
                isAvailable
                  ? "bg-green-500 text-white"
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              {isAvailable ? "Available" : "Unavailable"}
            </button>
          </div>
        </div>
        <div className="flex border-b mb-4">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "available"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("available")}
          >
            Available Jobs
          </button>
        </div>
        <div className="flex flex-col h-full">
          {bookingState === "idle" && (
            <>
              <div className="h-2/3 w-full rounded overflow-hidden mb-4">
                {/* Current location indicator */}
                <div className="p-3 bg-gray-50 mb-3 rounded-lg shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div className="flex items-center mb-2 sm:mb-0">
                      <div className="bg-blue-500 text-white p-2 rounded-full mr-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Your Current Location</p>
                        <p className="text-sm font-medium">{locationName || "Detecting location..."}</p>
                      </div>
                    </div>
                    <div className="flex items-center bg-gray-100 px-3 py-1.5 rounded-full">
                      <div className={`h-3 w-3 rounded-full ${isAvailable ? "bg-green-500" : "bg-gray-400"} mr-2`}></div>
                      <span className="text-sm font-medium">{isAvailable ? "Available for bookings" : "Unavailable"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 relative" style={{ height: "400px", minHeight: "200px" }}>
                  <MapContainer
                    center={currentPosition || [27.7172, 85.324]} // Default to Kathmandu
                    zoom={15}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <DynamicMarkers
                      providerPosition={currentPosition}
                      userPosition={currentRequest?.userLocation}
                      bookingState={bookingState}
                    />
                  </MapContainer>
                </div>
              </div>
              {activeTab === "available" && (
                <div className="h-1/3 overflow-y-auto">
                  <div className="bg-white rounded-lg shadow-lg p-4">
                    <h4 className="font-semibold mb-4">Available Requests</h4>
                    {pendingRequests.length > 0 ? (
                      <div className="space-y-3">
                        {pendingRequests.map((request) => (
                          <div
                            key={request.bookingId}
                            className="bg-gray-100 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-base">
                                  {request.details.userName || "Unknown User"}
                                </h5>
                                <p className="text-sm text-gray-700 mb-1">
                                  {request.details.service} - {request.details.issue}
                                </p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600">
                                  <p>
                                    <span className="font-medium">Time:</span>{" "}
                                    {new Date(request.details.requestTime).toLocaleTimeString()}
                                  </p>
                                  <p className="col-span-2">
                                    <span className="font-medium">Location:</span>{" "}
                                    {request.details.userLocationName || "Location unavailable"}
                                  </p>
                                  {request.details.description && (
                                    <p className="col-span-2 mt-1 bg-white p-2 rounded">
                                      <span className="font-medium block">Description:</span>{" "}
                                      <span className="line-clamp-2">{request.details.description}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 sm:mt-0 sm:ml-4 flex sm:flex-col justify-end">
                                <button
                                  onClick={() => viewRequest(request)}
                                  className="bg-blue-600 text-white text-sm px-4 py-2 rounded hover:bg-blue-700 w-full"
                                >
                                  View Details
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p>No available requests at the moment</p>
                        <p className="text-sm mt-1">New requests will appear here</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {bookingState === "reviewing" && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Service Request</h3>
                
                {/* Location information at top of booking dialog */}
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <div className="flex items-center mb-2">
                    <div className="bg-blue-500 text-white p-1 rounded-full mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Your Location:</p>
                      <p className="text-sm font-medium">{locationName || "Detecting location..."}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="bg-green-500 text-white p-1 rounded-full mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">User Location:</p>
                      <p className="text-sm font-medium">
                        {currentRequest.details.userLocationName || "Current Location"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm font-semibold">Issue</p>
                    <p>{currentRequest.details.issue}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Service</p>
                    <p>{currentRequest.details.service}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Phone</p>
                    <p>{currentRequest.details.userPhone || currentRequest.userPhone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Location</p>
                    <p>
                      {currentRequest.details.userLocationName || currentRequest.userLocationName}
                    </p>
                  </div>
                  {/* Show user's description if available */}
                  {currentRequest.details.description && (
                    <div>
                      <p className="text-sm font-semibold">
                        User's Description
                      </p>
                      <p className="bg-gray-50 p-2 rounded">
                        {currentRequest.details.description}
                      </p>
                    </div>
                  )}
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
          {bookingState === "accepted" && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Job Accepted</h3>
                {/* Location Name Display */}
                {currentRequest.details?.userLocationName && (
                    <p className="text-lg font-medium mb-4">Location: {currentRequest.details.userLocationName}</p>
                )}
                <div className="h-48 mb-4 rounded-lg overflow-hidden border border-gray-200">
                    <MapContainer center={userPosition} zoom={13} className="w-full h-full">
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <DynamicMarkers providerPosition={currentPosition} userPosition={userPosition} bookingState={bookingState} />
                    </MapContainer>
                </div>
                <p className="text-gray-700 mb-2">
                    Distance: {distance !== null ? `${distance} km` : "Calculating..."}
                </p>
                <p className="text-gray-700 mb-4">
                    ETA: {eta !== null ? `${eta} minutes` : "Calculating..."}
                </p>
                <button
                    onClick={startJob}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                    Start Job
                </button>
              </div>
            </div>
          )}
          {bookingState === "confirmed" && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Booking Confirmed</h3>
                {/* Location Name Display */}
                {currentRequest.details?.userLocationName && (
                    <p className="text-lg font-medium mb-4">Location: {currentRequest.details.userLocationName}</p>
                )}
                <div className="h-48 mb-4 rounded-lg overflow-hidden border border-gray-200">
                    <MapContainer center={userPosition} zoom={13} className="w-full h-full">
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <DynamicMarkers providerPosition={currentPosition} userPosition={userPosition} bookingState={bookingState} />
                    </MapContainer>
                </div>
                <p className="text-gray-700 mb-4">Problem: {currentRequest.details.issue}</p>
                <button
                    onClick={startJob}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                >
                    Start Job
                </button>
              </div>
            </div>
          )}
          {bookingState === "ongoing" && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-sm bg-white rounded-lg shadow-lg p-6">
                {/* Display only Maintenance Details Form */}
                <div className="flex-1 overflow-y-auto pr-4 -mr-4">
                    {/* Maintenance Details Form */}
                    <div className="border rounded-lg p-3 mb-4">
                        <h4 className="font-medium mb-2">Maintenance Details</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Service Notes
                                </label>
                                <textarea
                                    className="w-full border rounded-lg p-2 text-sm"
                                    rows="3"
                                    placeholder="Enter details about the service performed"
                                    value={maintenanceNotes}
                                    onChange={(e) => setMaintenanceNotes(e.target.value)}
                                ></textarea>
                            </div>

                            {/* Hourly Charge Display */}
                            <div className="bg-blue-50 p-2 rounded">
                                <p className="text-sm font-medium">Hourly Charge</p>
                                <p className="text-sm">
                                    {jobDuration} {jobDuration === 1 ? "hour" : "hours"} × Rs. 200 = Rs. {jobDuration * 200}
                                </p>
                            </div>

                            {/* Materials Section */}
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Materials Used
                                </label>
                                <div className="flex space-x-2 mb-2">
                                    <input
                                        type="text"
                                        className="flex-1 border rounded-lg p-2 text-sm"
                                        placeholder="Material name"
                                        value={materialName}
                                        onChange={(e) => setMaterialName(e.target.value)}
                                    />
                                    <input
                                        type="number"
                                        className="w-24 border rounded-lg p-2 text-sm"
                                        placeholder="Cost"
                                        value={materialCost}
                                        onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0)}
                                    />
                                    <button
                                        onClick={addMaterial}
                                        className="bg-green-500 text-white px-2 rounded-lg hover:bg-green-600 text-sm"
                                    >
                                        Add
                                    </button>
                                </div>

                                {/* Materials List */}
                                {materials.length > 0 && (
                                    <div className="mb-2 border rounded-lg p-2 bg-gray-50">
                                        <p className="text-sm font-medium mb-1">Added Materials:</p>
                                        <ul className="space-y-1">
                                            {materials.map((material, index) => (
                                                <li key={index} className="flex justify-between text-sm">
                                                    <span>{material.name}</span>
                                                    <div className="flex space-x-2">
                                                        <span>Rs. {material.cost}</span>
                                                        <button
                                                            onClick={() => removeMaterial(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                            <li className="pt-1 border-t text-sm font-medium">
                                                <div className="flex justify-between">
                                                    <span>Total Material Cost:</span>
                                                    <span>Rs. {calculateMaterialCost()}</span>
                                                </div>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm text-gray-600 mb-1">
                                    Additional Charges (Rs)
                                </label>
                                <input
                                    type="number"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    placeholder="Enter additional charges if any"
                                    value={additionalChargeValue}
                                    onChange={(e) => setAdditionalChargeValue(parseFloat(e.target.value) || 0)}
                                />
                            </div>

                            {/* Total Price Display */}
                            <div className="bg-green-50 p-2 rounded">
                                <p className="text-sm font-medium">Total Price</p>
                                <p className="text-lg font-bold">
                                    Rs. {(jobDuration * 200) + calculateMaterialCost() + additionalChargeValue}
                                </p>
                            </div>

                            <button
                                onClick={handleMaintenanceSubmit}
                                className="w-full bg-blue-500 text-white py-1 rounded-lg hover:bg-blue-600 text-sm"
                            >
                                Save Details
                            </button>
                        </div>
                    </div>

                    {/* Complete Job Button */}
                    <button
                        onClick={completeJob}
                        className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center mt-4"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                        >
                            <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                            />
                        </svg>
                        Complete Job
                    </button>
                </div>
              </div>
            </div>
          )}
          {bookingState === "user-completed" && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">
                  User Confirmed Completion
                </h3>
                <p className="text-gray-600 mb-4">
                  The user has confirmed the job is complete.
                </p>

                {/* Display maintenance details if available */}
                {(currentRequest.maintenanceNotes ||
                  currentRequest.maintenancePrice) && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <h4 className="font-medium mb-2">Service Details</h4>
                    {currentRequest.maintenanceNotes && (
                      <div className="mb-2">
                        <p className="text-sm font-semibold">Service Notes:</p>
                        <p className="text-sm">
                          {currentRequest.maintenanceNotes}
                        </p>
                      </div>
                    )}
                    {currentRequest.maintenancePrice && (
                      <div>
                        <p className="text-sm font-semibold">Price:</p>
                        <p className="text-lg font-bold">
                          Rs. {currentRequest.maintenancePrice}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={goBackToIdle}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
          {bookingState === "completed" && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-500 rounded-full mx-auto flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Job Completed Successfully!</h3>
                  <p className="text-gray-600">Waiting for user review.</p>
                </div>

                {/* Display maintenance details if available */}
                {(currentRequest.maintenanceNotes ||
                  currentRequest.maintenancePrice) && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 className="font-medium mb-3">Service Details</h4>
                    {currentRequest.maintenanceNotes && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700">Service Notes:</p>
                        <p className="text-sm text-gray-600">
                          {currentRequest.maintenanceNotes}
                        </p>
                      </div>
                    )}
                    {currentRequest.maintenancePrice && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Price:</p>
                        <p className="text-lg font-bold text-green-600">
                          Rs. {currentRequest.maintenancePrice}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={goBackToIdle}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
          {bookingState === "reviewed" && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-yellow-400 rounded-full mx-auto flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">Review Received!</h3>
                  <p className="text-gray-600 mb-4">The user has submitted their feedback.</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-center mb-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-6 h-6 ${
                            star <= currentRequest.review.rating
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <p className="text-center text-gray-700 font-medium">
                      Rating: {currentRequest.review.rating} out of 5
                    </p>
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-sm font-semibold text-gray-700 mb-1">Feedback:</p>
                      <p className="text-gray-600 italic">"{currentRequest.review.comment}"</p>
                    </div>
                  </div>
                </div>

                {/* Display maintenance details if available */}
                {(currentRequest.maintenanceNotes ||
                  currentRequest.maintenancePrice) && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-6">
                    <h4 className="font-medium mb-3">Service Details</h4>
                    {currentRequest.maintenanceNotes && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-gray-700">Service Notes:</p>
                        <p className="text-sm text-gray-600">
                          {currentRequest.maintenanceNotes}
                        </p>
                      </div>
                    )}
                    {currentRequest.maintenancePrice && (
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Price:</p>
                        <p className="text-lg font-bold text-green-600">
                          Rs. {currentRequest.maintenancePrice}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={goBackToIdle}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium flex items-center justify-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
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