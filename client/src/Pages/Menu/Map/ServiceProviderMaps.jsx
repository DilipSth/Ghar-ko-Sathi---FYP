import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useAuth } from "../../../context/authContext";
import { SocketContext } from "../../../context/SocketContext";
import { LiveTracking } from "../../../Components";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";

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
  }); // Islington College coordinates
  const [eta, setEta] = useState(null);
  const [distance, setDistance] = useState(null);
  // Add states for maintenance details
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [maintenancePrice, setMaintenancePrice] = useState("");
  const [jobStartTime, setJobStartTime] = useState(null);
  const [jobDuration, setJobDuration] = useState(0); // in hours
  const [materials, setMaterials] = useState([]);
  const [materialName, setMaterialName] = useState("");
  const [materialCost, setMaterialCost] = useState("");
  const [error, setError] = useState(null);
  const mapRef = useRef(null);

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
    const userLocation = request.userLocation || request.details.userLocation || userPosition;
    
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
      
      socket.emit("completeJob", {
        bookingId: currentRequest.bookingId,
        completedBy: "provider",
      });
    }
  };

  const goBackToIdle = () => {
    setCurrentRequest(null);
    setBookingState("idle");
  };

  const handlePositionUpdate = (position) => {
    setCurrentPosition(position);
    // Save position to localStorage whenever it updates
    localStorage.setItem("serviceProviderPosition", JSON.stringify(position));
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
      setMaterialCost("");
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
      
      // Parse additional charges (or default to 0 if invalid)
      const additionalCharge = parseFloat(maintenancePrice) || 0;
      
      // Calculate total maintenance price (hourly charge + material cost + additional charges)
      const maintenanceTotal = hourlyCharge + materialCost + additionalCharge;
      
      const maintenanceDetails = {
        jobDuration,
        hourlyRate,
        hourlyCharge,
        materials,
        materialCost,
        additionalCharge,
        maintenancePrice: maintenanceTotal,
        maintenanceNotes
      };
      
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

  // Send position updates to user
  useEffect(() => {
    let watchId;

    // Define getLocationName function that can be called from successCallback
    const getLocationName = async (latitude, longitude) => {
      try {
        // Add a check to ensure latitude and longitude are valid
        if (latitude === undefined || longitude === undefined) {
          console.error("Invalid coordinates:", latitude, longitude);
          return;
        }
        
        // Use the Nominatim API to get a proper location name from coordinates
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch location name: ${response.status}`);
        }
        
        const data = await response.json();
        const displayName = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        setLocationName(displayName);
      } catch (error) {
        console.error("Error getting location name:", error);
        
        // Only try to format coordinates if they are valid numbers
        if (typeof latitude === 'number' && typeof longitude === 'number') {
          setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } else {
          setLocationName("Unknown location");
        }
      }
    };

    const successCallback = (position) => {
      const { latitude, longitude } = position.coords;
      
      // Set currentPosition as an object with lat/lng properties, not an array
      setCurrentPosition({
        lat: latitude,
        lng: longitude
      });
      
      // Call getLocationName with the coordinates
      getLocationName(latitude, longitude);

      // Only send location updates when there's an active booking
      if (bookingState === "accepted" || bookingState === "confirmed" || bookingState === "ongoing") {
        // Calculate distance and ETA if we have a user booking
        let distanceToUser = null;
        let etaToUser = null;
        
        if (currentRequest && currentRequest.details && currentRequest.details.userLocation) {
          const userLat = currentRequest.details.userLocation.lat;
          const userLng = currentRequest.details.userLocation.lng;
          
          // Calculate distance in kilometers
          distanceToUser = calculateDistance(
            latitude, 
            longitude, 
            userLat, 
            userLng
          );
          
          // Estimate ETA based on average speed (30 km/h)
          const averageSpeedKmPerHour = 30;
          if (distanceToUser) {
            // Time in minutes = (distance in km / speed in km per hour) * 60
            etaToUser = Math.round((distanceToUser / averageSpeedKmPerHour) * 60);
          }
        }
        
        if (socket && currentRequest) {
          socket.emit("location-update", {
            bookingId: currentRequest._id || currentRequest.bookingId,
            location: { lat: latitude, lng: longitude },
            locationName: locationName,
            distance: distanceToUser,
            eta: etaToUser
          });
        }
      }
    };

    const errorCallback = (error) => {
      console.error("Error getting location:", error);
    };

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        successCallback,
        errorCallback,
        { enableHighAccuracy: true }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [bookingState, currentRequest, socket, locationName]);

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
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "history"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("history")}
          >
            Service History
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "earnings"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500"
            }`}
            onClick={() => setActiveTab("earnings")}
          >
            Earnings
          </button>
        </div>
        <div className="flex flex-col h-full">
          {bookingState === "idle" && (
            <>
              <div className="h-2/3 w-full rounded overflow-hidden mb-4">
                {/* Current location indicator at top of map */}
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
                <div className="h-full w-full" style={{ minHeight: "500px", height: "calc(100vh - 300px)" }}>
                  <LiveTracking
                    bookingDetails={currentRequest}
                    showDirections={bookingState === "ongoing"}
                    onPositionUpdate={handlePositionUpdate}
                  />
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
              {activeTab === "history" && (
                <div className="h-1/3 overflow-y-auto">
                  <div className="bg-white rounded-lg shadow-lg p-4">
                    <h4 className="font-semibold mb-4">Service History</h4>
                    {serviceHistory.length > 0 ? (
                      <div className="space-y-3">
                        {serviceHistory.map((service) => (
                          <div
                            key={service.id}
                            className="bg-gray-100 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h5 className="font-medium text-base">
                                  {service.customer.name}
                                </h5>
                                <p className="text-sm text-gray-700">
                                  {service.service} - {service.issue}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {service.date}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium text-lg">
                                  Rs. {service.earnings}
                                </p>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded inline-block mt-1">
                                  Completed
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p>No service history yet</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === "earnings" && (
                <div className="h-1/3 overflow-y-auto">
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
                  </div>
                </div>
              )}
            </>
          )}
          {bookingState === "reviewing" && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
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
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">
                  Waiting for User Confirmation
                </h3>
                
                {/* Location information panel */}
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
                
                <p className="text-gray-600 mb-4">
                  Please wait for the user to confirm the booking.
                </p>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold">Service:</span>{" "}
                    {currentRequest.details.service}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Phone:</span>{" "}
                    {currentRequest.details.userPhone || currentRequest.userPhone}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Location:</span>{" "}
                    {currentRequest.details.userLocationName || currentRequest.userLocationName}
                  </p>
                  {/* Show user's description if available */}
                  {currentRequest.details.description && (
                    <p className="text-sm">
                      <span className="font-semibold">User's Description:</span>{" "}
                      {currentRequest.details.description}
                    </p>
                  )}
                </div>

                <div className="h-48 mb-4 rounded-lg overflow-hidden border border-gray-200">
                  <LiveTracking
                    bookingDetails={{
                      ...currentRequest,
                      userLocation: currentRequest.userLocation,
                      providerId: user.id,
                    }}
                    showDirections={true}
                    onPositionUpdate={handlePositionUpdate}
                  />
                </div>

                {distance && eta && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Distance to user</p>
                        <p className="text-lg font-bold">{distance} km</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Estimated arrival</p>
                        <p className="text-lg font-bold">{eta} minutes</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {bookingState === "confirmed" && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Booking Confirmed</h3>
                
                {/* Location information panel */}
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
                
                <div className="space-y-2 mb-6">
                  <p className="text-sm">
                    <span className="font-semibold">Service:</span>{" "}
                    {currentRequest.details.service}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Phone:</span>{" "}
                    {currentRequest.details.userPhone || currentRequest.userPhone}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Location:</span>{" "}
                    {currentRequest.details.userLocationName || currentRequest.userLocationName}
                  </p>
                  {currentRequest.details.description && (
                    <p className="text-sm">
                      <span className="font-semibold">User&apos;s Description:</span>{" "}
                      {currentRequest.details.description}
                    </p>
                  )}
                </div>

                <div className="h-48 mb-4 rounded-lg overflow-hidden border border-gray-200">
                  <LiveTracking
                    bookingDetails={{
                      ...currentRequest,
                      userLocation: currentRequest.userLocation,
                      providerId: user.id,
                    }}
                    showDirections={true}
                    onPositionUpdate={handlePositionUpdate}
                  />
                </div>

                <div className="flex flex-col space-y-3 mb-4">
                  <button
                    onClick={() => {
                      let destinationQuery = '';
                      
                      // Try different formats to get user's location
                      if (currentRequest.userLocation) {
                        if (typeof currentRequest.userLocation === 'string') {
                          destinationQuery = currentRequest.userLocation;
                        } else if (currentRequest.userLocation.lat && currentRequest.userLocation.lng) {
                          destinationQuery = `${currentRequest.userLocation.lat},${currentRequest.userLocation.lng}`;
                        }
                      } else if (currentRequest.details && currentRequest.details.userLocationName) {
                        destinationQuery = currentRequest.details.userLocationName;
                      }
                      
                      // If we have a location query, open Google Maps
                      if (destinationQuery) {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationQuery)}`, '_blank');
                      } else {
                        // Fallback to a default Google Maps URL if no location is available
                        window.open('https://www.google.com/maps/dir///@27.6955136,85.344256,15z/data=!4m2!4m1!3e0?entry=ttu&g_ep=EgoyMDI1MDQxNC4xIKXMDSoJLDEwMjExNDU1SAFQAw%3D%3D', '_blank');
                      }
                    }}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    Open Google Map for Navigation
                  </button>
                  
                  <button
                    onClick={startJob}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                  >
                    Start Job
                  </button>
                </div>
              </div>
            </div>
          )}
          {bookingState === "ongoing" && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Service in Progress</h3>
                
                {/* Location information panel */}
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
                
                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    <span className="font-semibold">Service:</span>{" "}
                    {currentRequest.details.service}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Phone:</span>{" "}
                    {currentRequest.details.userPhone || currentRequest.userPhone}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Location:</span>{" "}
                    {currentRequest.details.userLocationName || currentRequest.userLocationName}
                  </p>
                  {currentRequest.details.description && (
                    <p className="text-sm">
                      <span className="font-semibold">User's Description:</span>{" "}
                      {currentRequest.details.description}
                    </p>
                  )}
                </div>

                <div className="h-48 mb-4 rounded-lg overflow-hidden border border-gray-200">
                  <LiveTracking
                    bookingDetails={{
                      ...currentRequest,
                      userLocation: currentRequest.userLocation,
                      providerId: user.id,
                    }}
                    showDirections={true}
                    onPositionUpdate={handlePositionUpdate}
                  />
                </div>

                {distance && eta && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Distance to user</p>
                        <p className="text-lg font-bold">{distance} km</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">Estimated arrival</p>
                        <p className="text-lg font-bold">{eta} minutes</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add maintenance details form */}
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
                          onChange={(e) => setMaterialCost(e.target.value)}
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
                        value={maintenancePrice}
                        onChange={(e) => setMaintenancePrice(e.target.value)}
                      />
                    </div>
                    
                    {/* Total Price Display */}
                    <div className="bg-green-50 p-2 rounded">
                      <p className="text-sm font-medium">Total Price</p>
                      <p className="text-lg font-bold">
                        Rs. {(jobDuration * 200) + calculateMaterialCost() + (parseFloat(maintenancePrice) || 0)}
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

                <button
                  onClick={completeJob}
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center"
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
                <h3 className="text-xl font-bold mb-4">Job Completed</h3>
                <p className="text-gray-600 mb-4">Waiting for user review.</p>

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
          {bookingState === "reviewed" && currentRequest && (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4 pointer-events-auto">
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Review Received</h3>
                <div className="space-y-2 mb-6">
                  <p className="text-sm">
                    <span className="font-semibold">Rating:</span>{" "}
                    {currentRequest.review.rating} ★
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Comment:</span>{" "}
                    {currentRequest.review.comment}
                  </p>
                </div>

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
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderMap;