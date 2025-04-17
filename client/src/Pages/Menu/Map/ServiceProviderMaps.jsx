import { useState, useEffect, useContext, useCallback } from "react";
import { useAuth } from "../../../context/authContext";
import { SocketContext } from "../../../context/SocketContext";
import LiveTracking from "../../../Components/LiveTracking";
import axios from "axios";

const ServiceProviderMap = () => {
  const [activeTab, setActiveTab] = useState("available");
  const [currentRequest, setCurrentRequest] = useState(null);
  const [bookingState, setBookingState] = useState("idle");
  const [serviceHistory, setServiceHistory] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [locationName, setLocationName] = useState("");
  // Initialize currentPosition from localStorage if available
  const [currentPosition, setCurrentPosition] = useState(() => {
    const savedPosition = localStorage.getItem("serviceProviderPosition");
    return savedPosition ? JSON.parse(savedPosition) : null;
  });
  const [userPhone, setUserPhone] = useState("9812345678"); // Default user phone number
  const [userPosition, setUserPosition] = useState({
    lat: 27.7172,
    lng: 85.324,
  }); // Islington College coordinates
  const [routeToUser, setRouteToUser] = useState([]);
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
  const { user } = useAuth();
  const { socket } = useContext(SocketContext);

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
      setPendingRequests((prev) => [...prev, booking]);
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
          customer: { name: booking.details.address.split(",")[0] },
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
    setCurrentRequest({
      ...request,
      userPhone: userPhone,
      userLocationName: "Islington College, Kamal Marg, Kathmandu",
      userLocation: userPosition,
    });
    setBookingState("reviewing");
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

      // Calculate route to user
      calculateRouteToUser();

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
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${currentPosition.lat}&lon=${currentPosition.lng}`
        );
        const data = await response.json();
        setLocationName(
          data.display_name ||
            `${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(
              4
            )}`
        );
      } catch (error) {
        setLocationName(
          `${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`
        );
      }
    };

    // Use a debounce mechanism to prevent too many API calls
    const timeoutId = setTimeout(getLocationName, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentPosition]);

  // Separate useEffect for route calculation to prevent infinite loops
  const calculateRouteToUser = useCallback(async () => {
    if (!currentPosition || !userPosition) return;

    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${currentPosition.lng},${currentPosition.lat};${userPosition.lng},${userPosition.lat}?overview=full&geometries=geojson`
      );
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const coordinates = data.routes[0].geometry.coordinates.map(
          (coord) => ({
            lat: coord[1],
            lng: coord[0],
          })
        );

        setRouteToUser(coordinates);

        // Update distance and ETA based on the route
        const distanceInKm = (data.routes[0].distance / 1000).toFixed(1);
        setDistance(distanceInKm);
        setEta(calculateETA(distanceInKm));
      }
    } catch (error) {
      console.error("Error calculating route:", error);
      // Fallback to direct line if route calculation fails
      setRouteToUser([currentPosition, userPosition]);

      // Calculate straight-line distance as fallback
      const dist = calculateDistance(
        currentPosition.lat,
        currentPosition.lng,
        userPosition.lat,
        userPosition.lng
      );
      setDistance(dist);
      setEta(calculateETA(dist));
    }
  }, [currentPosition, userPosition, calculateDistance, calculateETA]);

  // Call route calculation when positions change
  useEffect(() => {
    if (bookingState === "accepted" || bookingState === "confirmed") {
      calculateRouteToUser();
    }
  }, [bookingState, calculateRouteToUser]);

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
      
      // Calculate total price (hourly charge + material cost + any additional charges)
      const additionalCharge = parseFloat(maintenancePrice) || 0;
      const totalPrice = hourlyCharge + materialCost + additionalCharge;
      
      socket.emit("updateMaintenanceDetails", {
        bookingId: currentRequest.bookingId,
        maintenanceNotes,
        maintenancePrice: totalPrice,
        hourlyCharge,
        materialCost,
        additionalCharge,
        jobDuration,
        materials,
      });

      // Update the current request with maintenance details
      setCurrentRequest((prev) => ({
        ...prev,
        maintenanceNotes,
        maintenancePrice: totalPrice.toString(),
        hourlyCharge,
        materialCost,
        additionalCharge,
        jobDuration,
        materials,
      }));
    }
  };

  // Update route when position changes
  useEffect(() => {
    if (
      bookingState === "accepted" ||
      bookingState === "confirmed" ||
      bookingState === "ongoing"
    ) {
      calculateRouteToUser();
    }
  }, [currentPosition, bookingState]);

  // Send position updates to user
  useEffect(() => {
    if (!socket || !currentPosition || bookingState === "idle") return;

    const intervalId = setInterval(() => {
      if (currentRequest?.bookingId) {
        // Save position to localStorage before sending update
        localStorage.setItem(
          "serviceProviderPosition",
          JSON.stringify(currentPosition)
        );

        socket.emit("location-update", {
          userId: user.id,
          bookingId: currentRequest.bookingId,
          location: currentPosition,
          eta: eta,
        });
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(intervalId);
  }, [socket, currentPosition, currentRequest, bookingState, user, eta]);

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
                <LiveTracking
                  bookingDetails={currentRequest}
                  showDirections={bookingState === "ongoing"}
                  onPositionUpdate={handlePositionUpdate}
                />
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
                            className="bg-gray-100 p-3 rounded-lg"
                          >
                            <div className="flex justify-between">
                              <div className="flex items-start">
                                <div>
                                  <h5 className="font-medium">
                                    {request.details.address.split(",")[0]}
                                  </h5>
                                  <p className="text-xs text-gray-600">
                                    {request.details.service} -{" "}
                                    {request.details.issue}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {new Date(
                                      request.details.requestTime
                                    ).toLocaleTimeString()}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Phone: {request.userPhone}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    Location: {request.userLocationName}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => viewRequest(request)}
                                className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <p>No available requests at the moment</p>
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
                            className="bg-gray-100 p-3 rounded-lg"
                          >
                            <div className="flex justify-between">
                              <div>
                                <h5 className="font-medium">
                                  {service.customer.name}
                                </h5>
                                <p className="text-xs text-gray-600">
                                  {service.service} - {service.issue}
                                </p>
                                <p className="text-xs text-gray-600">
                                  {service.date}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  Rs{service.earnings}
                                </p>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                  Completed
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
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
                <div className="space-y-3 mb-6">
                  <div>
                    <p className="text-sm font-semibold">Issue</p>
                    <p>{currentRequest.details.issue}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Address</p>
                    <p>{currentRequest.details.address}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Service</p>
                    <p>{currentRequest.details.service}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Phone</p>
                    <p>{currentRequest.userPhone || "9812345678"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Location</p>
                    <p>
                      {currentRequest.userLocationName ||
                        "Islington College, Kamal Marg, Kathmandu"}
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
                <p className="text-gray-600 mb-4">
                  Please wait for the user to confirm the booking.
                </p>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold">Service:</span>{" "}
                    {currentRequest.details.service}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Address:</span>{" "}
                    {currentRequest.details.address}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Phone:</span>{" "}
                    {currentRequest.userPhone || "9812345678"}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Location:</span>{" "}
                    {currentRequest.userLocationName ||
                      "Islington College, Kamal Marg, Kathmandu"}
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
                <div className="space-y-2 mb-6">
                  <p className="text-sm">
                    <span className="font-semibold">Service:</span>{" "}
                    {currentRequest.details.service}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Address:</span>{" "}
                    {currentRequest.details.address}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Phone:</span>{" "}
                    {currentRequest.userPhone || "9812345678"}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Location:</span>{" "}
                    {currentRequest.userLocationName ||
                      "Islington College, Kamal Marg, Kathmandu"}
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
              <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">Service in Progress</h3>
                <div className="space-y-2 mb-4">
                  <p className="text-sm">
                    <span className="font-semibold">Service:</span>{" "}
                    {currentRequest.details.service}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Address:</span>{" "}
                    {currentRequest.details.address}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Phone:</span>{" "}
                    {currentRequest.userPhone || "9812345678"}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Location:</span>{" "}
                    {currentRequest.userLocationName ||
                      "Islington College, Kamal Marg, Kathmandu"}
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