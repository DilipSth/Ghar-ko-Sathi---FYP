import {
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from "react";
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
  const [currentPosition, setCurrentPosition] = useState(() => {
    const stored = localStorage.getItem("userCurrentPosition");
    return stored ? JSON.parse(stored) : { lat: 27.7172, lng: 85.3238 };
  });
  const [providerEta, setProviderEta] = useState(null);
  const [providerDistance, setProviderDistance] = useState(null);
  const [providerLocation, setProviderLocation] = useState(null);
  const { user } = useAuth();
  const { socket } = useContext(SocketContext);
  const location = useLocation();
  const selectedService = location.state?.selectedService || null;

  useEffect(() => {
    if (!socket) return;

    socket.on("bookingAccepted", (booking) => {
      console.log("Booking accepted:", booking);
      setBookingState("accepted");
      setBookingDetails(booking);
    });

    socket.on("bookingDeclined", (data) => {
      console.log("Booking declined:", data);
      setBookingState("idle");
      setBookingDetails(null);
      setError(data.message || "Booking was declined by the service provider");
    });

    socket.on("bookingError", (data) => {
      console.error("Booking error:", data);
      setBookingState("idle");
      setBookingDetails(null);
      setError(data.message || "An error occurred with your booking");
    });

    socket.on("bookingConfirmedByUser", (booking) => {
      console.log("Booking confirmed by user:", booking);
      setBookingState("confirmed");
      setBookingDetails(booking);
    });

    socket.on("jobStarted", (booking) => {
      console.log("Job started:", booking);
      setBookingState("ongoing");
      setBookingDetails({ ...booking, jobStartTime: Date.now() });
    });

    socket.on("providerCompletedJob", (booking) => {
      console.log("Provider completed job:", booking);
      const jobEndTime = Date.now();
      const durationHours = Math.ceil(
        (jobEndTime - booking.jobStartTime) / (1000 * 60 * 60)
      );
      setBookingState("provider-completed");
      setBookingDetails({
        ...booking,
        jobEndTime,
        durationHours,
      });
    });

    socket.on("jobCompleted", (booking) => {
      console.log("Job completed:", booking);
      setBookingState("completed");
      setBookingDetails(booking);
    });

    socket.on("paymentSuccess", (data) => {
      console.log("Payment success:", data);
      setBookingState("paid");
      setSuccessMessage(data.message || "Payment successful");
    });

    socket.on("reviewSubmitted", (data) => {
      console.log("Review submitted:", data);
      setBookingState("reviewed");
      setSuccessMessage(data.message || "Review submitted successfully");
    });

    socket.on("location-update", (data) => {
      console.log("Location update:", data);
      if (data && data.location) {
        setProviderLocation(data.location);
        if (data.eta) {
          setProviderEta(data.eta);
        }
        if (data.distance) {
          setProviderDistance(data.distance);
        }
      }
    });

    socket.on("maintenanceDetailsUpdated", (booking) => {
      console.log("Maintenance details updated:", booking);
      setBookingDetails(booking);
    });

    return () => {
      socket.off("bookingAccepted");
      socket.off("bookingDeclined");
      socket.off("bookingError");
      socket.off("bookingConfirmedByUser");
      socket.off("jobStarted");
      socket.off("providerCompletedJob");
      socket.off("jobCompleted");
      socket.off("paymentSuccess");
      socket.off("reviewSubmitted");
      socket.off("location-update");
      socket.off("maintenanceDetailsUpdated");
    };
  }, [socket]);

  const fetchServiceProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedService
        ? `http://localhost:8000/api/users/serviceProvider?service=${selectedService}`
        : "http://localhost:8000/api/users/serviceProvider";

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (response.data.success) {
        const providers = response.data.serviceProviders.map(
          (provider, index) => {
            const baseLatitude = 27.7172;
            const baseLongitude = 85.324;
            const latOffset = (Math.random() - 0.5) * 0.05;
            const lngOffset = (Math.random() - 0.5) * 0.05;

            return {
              id: provider._id,
              name: provider.name || "Unknown Provider",
              phone: provider.phoneNo || "N/A",
              email: provider.email || "N/A",
              services: Array.isArray(provider.services)
                ? provider.services
                    .map((s) => (typeof s === "object" ? s.ser_name : s))
                    .join(", ")
                : typeof provider.services === "string"
                ? provider.services
                : "General Services",
              realTimeLocation: {
                lat: baseLatitude + latOffset,
                lng: baseLongitude + lngOffset,
              },
              position: {
                x: 20 + ((index * 15) % 60),
                y: 25 + ((index * 10) % 50),
              },
              hourlyRate: 200,
              profileImage: provider.profileImage || null,
              image: provider.profileImage
                ? `http://localhost:8000/public/registerImage/${provider.profileImage}`
                : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23e5e7eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E",
              rating: provider.rating || (4 + Math.random()).toFixed(1),
              completedJobs: provider.completedJobs || Math.floor(Math.random() * 200) + 50,
              status: provider.approved ? "Active" : "Pending",
              experience: provider.question || "Experienced Professional",
              gender: provider.gender || "Not Specified",
              dob: provider.dob ? new Date(provider.dob).toLocaleDateString() : "Not Specified"
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
  }, [selectedService]);

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

        const bookingData = {
          userId: user._id,
          providerId: selectedProvider.id,
          service: selectedProvider.services,
          issue: "Repair Needed",
          address: "123 Example St, Kathmandu",
          description,
          userLocation: {
            lat: currentPosition.lat,
            lng: currentPosition.lng,
          },
          providerLocation: selectedProvider.realTimeLocation || null,
        };

        console.log("Sending booking request:", bookingData);

        if (socket) {
          socket.emit("sendBookingRequest", bookingData);
          setBookingDetails(bookingData);
        } else {
          console.error("Socket not available for booking request");
          setError("Connection error. Please try again.");
          setBookingState("idle");
        }
      } catch (err) {
        console.error("Error sending booking request:", err);
        setError("Failed to send booking request. Please try again.");
        setBookingState("idle");
      }
    } else {
      setError("Please select a service provider and provide a description");
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
        amount: bookingDetails.totalCharge,
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

  const resetBooking = useCallback(() => {
    setSelectedProvider(null);
    setBookingState("idle");
    setBookingDetails(null);
    setDescription("");
    setRating(0);
    setComment("");
    setError(null);
    setSuccessMessage(null);
    setProviderLocation(null);
    setProviderEta(null);
    setProviderDistance(null);
  }, []);

  const [locationName, setLocationName] = useState("");
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

  useEffect(() => {
    let isMounted = true;

    if (currentPosition) {
      const updateLocationName = async () => {
        try {
          const name = await getLocationName(
            currentPosition.lat,
            currentPosition.lng
          );
          if (isMounted) setLocationName(name);
        } catch {
          if (isMounted && !locationName) {
            setLocationName(
              `${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(
                4
              )}`
            );
          }
        }
      };

      const timeoutId = setTimeout(updateLocationName, 1000);

      return () => {
        isMounted = false;
        clearTimeout(timeoutId);
      };
    }
  }, [currentPosition, getLocationName, locationName]);

  return (
    <div className="h-screen flex flex-col">
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4">
        {/* Map Section */}
        <div className="flex-1 overflow-hidden bg-white shadow-md rounded-lg">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
              <p>{error}</p>
            </div>
          )}
          {successMessage && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
              <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg max-w-md">
                <div className="flex items-center mb-2">
                  <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h3 className="font-semibold">Success</h3>
                </div>
                <p className="mb-4">{successMessage}</p>
                <div className="flex justify-end">
                  <button
                    onClick={() => setSuccessMessage(null)}
                    className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="h-full w-full" style={{ minHeight: "70vh", maxHeight: "calc(100vh - 100px)" }}>
            <LiveTracking
              bookingDetails={bookingDetails}
              showDirections={bookingState === "ongoing"}
              serviceProviders={filteredProviders}
              onPositionUpdate={(position) => setCurrentPosition(position)}
              bookingState={bookingState}
              providerLocation={providerLocation}
              providerEta={providerEta}
              providerDistance={providerDistance}
            />
          </div>
        </div>

        {/* Side Panel */}
        <div className="w-full lg:w-[380px] flex flex-col gap-4 overflow-hidden">
          {/* Service Providers List */}
          {bookingState === "idle" && !selectedProvider && (
            <div className="bg-white rounded-lg shadow-lg p-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <div className="sticky top-0 bg-white z-10 pb-2 mb-4 border-b">
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  Available Service Providers
                </h3>
                <div className="flex gap-2">
                  {["All", "Available"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setActiveFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        activeFilter === status
                          ? "bg-blue-500 text-white shadow-sm"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {filteredProviders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <svg className="h-16 w-16 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg text-center">No service providers available.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProviders
                    .filter((provider) => provider.status === "Active")
                    .map((provider) => (
                      <div
                        key={provider.id}
                        className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleProviderSelect(provider)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative w-16 h-16 flex-shrink-0">
                            <img
                              src={provider.image}
                              alt={provider.name}
                              className="w-full h-full rounded-lg object-cover border-2 border-blue-100 bg-gray-100"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23e5e7eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                              }}
                            />
                            <div className="absolute -bottom-1 -right-1">
                              <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full shadow-sm">
                                Active
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold text-gray-900 mb-0.5 truncate">
                              {provider.name}
                            </h4>
                            <div className="flex items-center mb-1">
                              <div className="flex items-center text-yellow-400">
                                {[...Array(5)].map((_, index) => (
                                  <span
                                    key={index}
                                    className={`text-sm ${
                                      index < Math.floor(provider.rating)
                                        ? "text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                              <span className="text-sm font-medium text-gray-700 ml-1">
                                {provider.rating}
                              </span>
                              <span className="text-xs text-gray-500 ml-1">
                                ({provider.completedJobs} jobs)
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-sm text-gray-600 truncate">
                                <span className="font-medium">Services:</span>{" "}
                                {provider.services}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Phone:</span>{" "}
                                {provider.phone}
                              </p>
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Experience:</span>{" "}
                                {provider.experience}
                              </p>
                            </div>
                          </div>
                        </div>
                        <button
                          className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-4 rounded-lg transition-all flex items-center justify-center text-sm font-medium shadow-sm hover:shadow-md"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleProviderSelect(provider);
                          }}
                        >
                          <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Book Now
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Provider Details */}
          {selectedProvider && bookingState === "idle" && (
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in">
              <div className="flex items-start space-x-4 mb-6">
                <img
                  src={selectedProvider.image}
                  alt={selectedProvider.name}
                  className="w-24 h-24 rounded-lg object-cover border-2 border-blue-500"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='none' stroke='%23e5e7eb' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/svg%3E";
                  }}
                />
                <div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">{selectedProvider.name}</h4>
                  <div className="flex items-center mb-2">
                    <div className="flex items-center text-yellow-400">
                      {[...Array(5)].map((_, index) => (
                        <span
                          key={index}
                          className={`text-lg ${
                            index < Math.floor(selectedProvider.rating)
                              ? "text-yellow-400"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-lg font-medium text-gray-700 ml-2">
                      {selectedProvider.rating}
                    </span>
                    <span className="text-gray-600 ml-2 text-lg">
                      ({selectedProvider.completedJobs} jobs)
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-6 bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between text-lg">
                  <span className="font-medium text-gray-700">Services:</span>
                  <span className="text-gray-900">{selectedProvider.services}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-medium text-gray-700">Rate:</span>
                  <span className="text-gray-900">Rs {selectedProvider.hourlyRate}/hour</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="text-green-600 font-medium">
                    {selectedProvider.status}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-lg font-medium text-gray-700 mb-2">
                  Describe your problem
                </label>
                <textarea
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-700 text-lg"
                  placeholder="Please describe your issue in detail..."
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={resetBooking}
                  className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center text-lg font-medium"
                >
                  <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </button>
                <button
                  onClick={handleBooking}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!description}
                >
                  <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Book Now
                </button>
              </div>
            </div>
          )}

          {/* Booking Status Messages */}
          {bookingState !== "idle" && bookingDetails && (
            <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in max-h-[calc(100vh-2rem)] overflow-y-auto">
              {bookingState === "waiting" && (
                <div className="text-center">
                  <div className="animate-pulse mb-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">
                    Waiting for {selectedProvider.name} to Accept
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Your request has been sent and is waiting for confirmation.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <div className="space-y-2">
                      <p className="flex justify-between">
                        <span className="font-semibold">Services:</span>
                        <span>{selectedProvider.services}</span>
                      </p>
                      <p className="flex justify-between">
                        <span className="font-semibold">Description:</span>
                        <span className="text-right">{description}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={resetBooking}
                    className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel Request
                  </button>
                </div>
              )}

              {bookingState === "accepted" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-center">Booking Accepted</h3>
                  <p className="text-gray-600 text-center mb-4">
                    Please confirm to proceed with the service.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center">
                      <img
                        src={bookingDetails.details?.providerImage || "https://via.placeholder.com/50"}
                        alt={bookingDetails.details?.providerName}
                        className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-blue-500"
                      />
                      <div>
                        <p className="font-semibold">{bookingDetails.details?.providerName}</p>
                        <p className="text-sm text-gray-600">{bookingDetails.details?.providerServices}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Description:</span> {bookingDetails.description}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Phone:</span> {bookingDetails.details?.providerPhone}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={resetBooking}
                      className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center"
                    >
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                    <button
                      onClick={confirmBooking}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                    >
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm
                    </button>
                  </div>
                </div>
              )}

              {bookingState === "confirmed" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-center">Service Starting Soon</h3>
                  <p className="text-gray-600 text-center mb-4">
                    The service provider will begin shortly.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center">
                      <img
                        src={bookingDetails.details?.providerImage || "https://via.placeholder.com/50"}
                        alt={bookingDetails.details?.providerName}
                        className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-blue-500"
                      />
                      <div>
                        <p className="font-semibold">{bookingDetails.details?.providerName}</p>
                        <p className="text-sm text-gray-600">{bookingDetails.details?.providerServices}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Description:</span> {bookingDetails.description}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Phone:</span> {bookingDetails.details?.providerPhone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {bookingState === "ongoing" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center animate-spin">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-center">Service in Progress</h3>
                  <p className="text-gray-600 text-center mb-4">
                    The service provider is currently working on your request.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center">
                      <img
                        src={bookingDetails.details?.providerImage || "https://via.placeholder.com/50"}
                        alt={bookingDetails.details?.providerName}
                        className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-blue-500"
                      />
                      <div>
                        <p className="font-semibold">{bookingDetails.details?.providerName}</p>
                        <p className="text-sm text-gray-600">{bookingDetails.details?.providerServices}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Description:</span> {bookingDetails.description}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Phone:</span> {bookingDetails.details?.providerPhone}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {bookingState === "provider-completed" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-center">Service Completed</h3>
                  <p className="text-gray-600 text-center mb-4">
                    The service provider has completed the job. Please confirm.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center">
                      <img
                        src={bookingDetails.details?.providerImage || "https://via.placeholder.com/50"}
                        alt={bookingDetails.details?.providerName}
                        className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-blue-500"
                      />
                      <div>
                        <p className="font-semibold">{bookingDetails.details?.providerName}</p>
                        <p className="text-sm text-gray-600">{bookingDetails.details?.providerServices}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium">Duration:</span> {bookingDetails.jobDuration || bookingDetails.durationHours || 1} hour
                        {(bookingDetails.jobDuration || bookingDetails.durationHours) > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={completeJob}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Completion
                  </button>
                </div>
              )}

              {bookingState === "completed" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-center">Payment Details</h3>
                  <p className="text-gray-600 text-center mb-4">
                    Please review and proceed with payment.
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Service Duration:</span>
                        <span>{bookingDetails.details?.maintenanceDetails?.jobDuration || 1} hour</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Hourly Rate:</span>
                        <span>Rs. {bookingDetails.details?.maintenanceDetails?.hourlyRate || 200}/hour</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Service Charge:</span>
                        <span>Rs. {bookingDetails.details?.maintenanceDetails?.hourlyCharge || 200}</span>
                      </div>
                    </div>

                    {bookingDetails.details?.maintenanceDetails?.materials && bookingDetails.details.maintenanceDetails.materials.length > 0 && (
                      <div className="border-t pt-2">
                        <p className="font-medium mb-2">Materials Used:</p>
                        <div className="space-y-1">
                          {bookingDetails.details.maintenanceDetails.materials.map((material, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{material.name}</span>
                              <span>Rs. {material.cost}</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-medium pt-1 border-t">
                            <span>Total Material Cost:</span>
                            <span>Rs. {bookingDetails.details.maintenanceDetails.materialCost || 0}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-2">
                      <div className="flex justify-between">
                        <span className="font-medium">Additional Charges:</span>
                        <span>Rs. {bookingDetails.details?.maintenanceDetails?.additionalCharge || 0}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t">
                        <span>Total Amount:</span>
                        <span>Rs. {bookingDetails.details?.maintenanceDetails?.maintenancePrice || 
                          ((bookingDetails.details?.maintenanceDetails?.hourlyCharge || 200) + 
                           (bookingDetails.details?.maintenanceDetails?.materialCost || 0) + 
                           (bookingDetails.details?.maintenanceDetails?.additionalCharge || 0))}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={submitPayment}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pay Now
                  </button>
                </div>
              )}

              {bookingState === "paid" && (
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Payment Successful</h3>
                      <p className="text-base text-gray-600 mt-1">
                        Please rate your experience
                      </p>
                    </div>
                    <div className="max-w-md mx-auto space-y-4">
                      <div>
                        <p className="text-base font-medium mb-2">Rating</p>
                        <div className="flex justify-center space-x-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRating(star)}
                              className={`transform transition-all duration-200 ${
                                star <= rating
                                  ? "text-yellow-400 scale-110"
                                  : "text-gray-300 hover:text-yellow-400 hover:scale-110"
                              }`}
                            >
                              <span className="text-3xl">★</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {rating === 0 ? "Select a rating" : `You rated ${rating} star${rating !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <div>
                        <label className="block text-base font-medium mb-2">
                          Your Review
                        </label>
                        <textarea
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-700 text-sm resize-none"
                          rows="3"
                          placeholder="Share your experience..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={resetBooking}
                          className="flex-1 bg-gray-100 text-gray-800 py-2 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center text-sm font-medium"
                        >
                          <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Skip
                        </button>
                        <button
                          onClick={submitReview}
                          disabled={rating === 0}
                          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center text-sm font-medium ${
                            rating > 0
                              ? "bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md"
                              : "bg-gray-200 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          Submit Review
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {bookingState === "reviewed" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
                      <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-center">Thank You!</h3>
                  <p className="text-gray-600 text-center mb-4">
                    Your review has been submitted successfully.
                  </p>
                  <button
                    onClick={resetBooking}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Back to Map
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserMaps;
