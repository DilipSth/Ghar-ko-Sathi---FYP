import { useState, useRef, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";
import { useAuth } from "../../../context/authContext";

const UserMaps = () => {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingState, setBookingState] = useState("idle");
  const [bookingDetails, setBookingDetails] = useState(null);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const mapContainerRef = useRef(null);
  const socketRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    socketRef.current = io("http://localhost:8000", {
      auth: { token: localStorage.getItem("token") },
    });

    socketRef.current.on("connect", () => {
      socketRef.current.emit("register", { userId: user._id, role: user.role });
    });

    socketRef.current.on("bookingAccepted", (booking) => {
      setBookingState("accepted");
      setBookingDetails(booking);
    });

    socketRef.current.on("bookingDeclined", (data) => {
      setBookingState("idle");
      setBookingDetails(null);
      alert(data.message);
    });

    socketRef.current.on("bookingError", (data) => {
      setBookingState("idle");
      setBookingDetails(null);
      alert(data.message);
    });

    socketRef.current.on("bookingConfirmedByUser", (booking) => {
      setBookingState("confirmed");
      setBookingDetails(booking);
    });

    socketRef.current.on("jobStarted", (booking) => {
      setBookingState("ongoing");
      setBookingDetails(booking);
    });

    socketRef.current.on("providerCompletedJob", (booking) => {
      setBookingState("provider-completed");
      setBookingDetails(booking);
    });

    socketRef.current.on("jobCompleted", (booking) => {
      setBookingState("completed");
      setBookingDetails(booking);
    });

    socketRef.current.on("paymentSuccess", (data) => {
      setBookingState("paid");
      alert(data.message);
    });

    socketRef.current.on("reviewSubmitted", (data) => {
      setBookingState("reviewed");
      alert(data.message);
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [user]);

  const fetchServiceProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        "http://localhost:8000/api/users/serviceProvider",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      if (response.data.success) {
        const providers = response.data.serviceProviders.map(
          (provider, index) => {
            const randomX = 20 + ((index * 15) % 60);
            const randomY = 25 + ((index * 10) % 50);
            return {
              id: provider._id,
              name: provider.name,
              phone: provider.phoneNo || "N/A",
              services:
                provider.services.map((s) => s.ser_name).join(", ") ||
                "General Services",
              position: { x: randomX, y: randomY },
              hourlyRate: 200,
              image: provider.profileImage
                ? `http://localhost:8000/public/registerImage/${provider.profileImage}`
                : "/api/placeholder/50/50",
              rating: (4 + Math.random()).toFixed(1),
              completedJobs: Math.floor(Math.random() * 200) + 50,
              status: provider.approved ? "Active" : "Pending",
            };
          }
        );
        setServiceProviders(providers);
      }
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to fetch service providers"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceProviders();
  }, []);

  const filteredProviders = serviceProviders.filter((provider) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Available") return provider.status === "Active";
    return false;
  });

  const handleMapClick = (providerId) => {
    if (bookingState === "idle") {
      const provider = serviceProviders.find((p) => p.id === providerId);
      setSelectedProvider(provider);
    }
  };

  const handleBooking = () => {
    if (selectedProvider && description) {
      setBookingState("waiting");
      const bookingData = {
        userId: user._id,
        providerId: selectedProvider.id,
        service: selectedProvider.services, // Send the string of services
        issue: "Repair Needed",
        address: "123 Example St, Kathmandu",
        description,
      };
      socketRef.current.emit("sendBookingRequest", bookingData);
      setBookingDetails(bookingData);
    } else {
      alert("Please enter a problem description.");
    }
  };

  const confirmBooking = () => {
    if (bookingDetails) {
      socketRef.current.emit("confirmBooking", {
        bookingId: bookingDetails.bookingId,
      });
    }
  };

  const completeJob = () => {
    if (bookingDetails) {
      socketRef.current.emit("completeJob", {
        bookingId: bookingDetails.bookingId,
        completedBy: "user",
      });
    }
  };

  const submitPayment = () => {
    if (bookingDetails) {
      socketRef.current.emit("submitPayment", {
        bookingId: bookingDetails.bookingId,
      });
    }
  };

  const submitReview = () => {
    if (bookingDetails && rating > 0) {
      socketRef.current.emit("submitReview", {
        bookingId: bookingDetails.bookingId,
        rating,
        comment,
      });
      setRating(0);
      setComment("");
    }
  };

  const resetBooking = () => {
    setSelectedProvider(null);
    setBookingState("idle");
    setBookingDetails(null);
    setDescription("");
    setRating(0);
    setComment("");
  };

  return (
    <div className="p-4 h-full">
      <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
        <h3 className="font-bold text-2xl mb-4 text-blue-600">
          Book a Service
        </h3>
        <div className="flex flex-wrap justify-around mb-4">
          {["All", "Available"].map((status) => (
            <div
              key={status}
              className={`flex flex-col items-center mb-2 md:mb-0 md:flex-row md:items-start cursor-pointer hover:text-blue-600 ${
                activeFilter === status ? "text-blue-600 font-semibold" : ""
              }`}
              onClick={() => setActiveFilter(status)}
            >
              <span>{status}</span>
              <span className="text-gray-600 ml-1">
                (
                {status === "All"
                  ? serviceProviders.length
                  : status === "Available"
                  ? serviceProviders.filter((p) => p.status === "Active").length
                  : 0}
                )
              </span>
            </div>
          ))}
        </div>
        {loading && (
          <div className="flex-grow flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}
        {error && (
          <div className="flex-grow flex items-center justify-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p>{error}</p>
              <button
                onClick={fetchServiceProviders}
                className="mt-2 bg-red-600 text-white py-1 px-3 rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        {!loading && !error && (
          <div
            ref={mapContainerRef}
            className="flex-grow rounded overflow-hidden relative"
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.856520737962!2d85.324!3d27.7031!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb191e9c5b5c5b%3A0x9c8dc9e8b8f8b8e6!2sKathmandu%2C%20Nepal!5e0!3m2!1sen!2sus!4v1634930201234!5m2!1sen!2sus"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
            ></iframe>
            <div className="absolute inset-0" style={{ pointerEvents: "none" }}>
              {bookingState === "idle" && (
                <div className="w-full h-full">
                  {filteredProviders.map((provider) => (
                    <div
                      key={provider.id}
                      className="absolute cursor-pointer"
                      style={{
                        top: `${provider.position.y}%`,
                        left: `${provider.position.x}%`,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "auto",
                      }}
                      onClick={() => handleMapClick(provider.id)}
                    >
                      <div className="relative">
                        <img
                          src={provider.image}
                          alt={provider.name}
                          className="rounded-full border-2 border-blue-500 w-12 h-12 object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/api/placeholder/50/50";
                          }}
                        />
                        <span className="absolute bottom-0 right-0 bg-green-500 rounded-full w-3 h-3"></span>
                      </div>
                      <div className="bg-white text-xs p-1 rounded shadow mt-1 text-center">
                        {provider.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedProvider && bookingState === "idle" && (
                <div
                  className="absolute bg-white rounded-lg shadow-lg p-4"
                  style={{
                    bottom: "20px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "300px",
                    pointerEvents: "auto",
                  }}
                >
                  <button
                    onClick={resetBooking}
                    className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                  <div className="flex items-center mb-3">
                    <img
                      src={selectedProvider.image}
                      alt={selectedProvider.name}
                      className="w-12 h-12 rounded-full mr-3 object-cover"
                    />
                    <div>
                      <h4 className="font-bold">{selectedProvider.name}</h4>
                      <p className="text-sm text-gray-600">
                        {selectedProvider.services}
                      </p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-sm">
                      <span className="font-semibold">Phone:</span>{" "}
                      {selectedProvider.phone}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Services:</span>{" "}
                      {selectedProvider.services}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Rate:</span> Rs
                      {selectedProvider.hourlyRate}/hour
                    </p>
                  </div>
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded-md mb-4"
                    placeholder="Describe your problem"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <button
                    onClick={handleBooking}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                  >
                    Book Now
                  </button>
                </div>
              )}
              {bookingState === "waiting" && bookingDetails && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4"
                  style={{ pointerEvents: "auto" }}
                >
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
                    <div className="animate-pulse mb-4">
                      <div className="w-12 h-12 mx-auto rounded-full bg-blue-500"></div>
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                      Waiting for {selectedProvider.name} to Accept
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Your request has been sent.
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Services:</span>{" "}
                      {selectedProvider.services}
                    </p>
                    <button
                      onClick={resetBooking}
                      className="w-full bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 mt-4"
                    >
                      Cancel Request
                    </button>
                  </div>
                </div>
              )}
              {bookingState === "accepted" && bookingDetails && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4"
                  style={{ pointerEvents: "auto" }}
                >
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Booking Accepted</h3>
                    <p className="text-gray-600 mb-4">
                      Please confirm to proceed.
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center">
                        <img
                          src={`http://localhost:8000${bookingDetails.details.providerImage}`}
                          alt={bookingDetails.details.providerName}
                          className="w-10 h-10 rounded-full mr-2 object-cover"
                        />
                        <p className="text-sm">
                          <span className="font-semibold">Provider:</span>{" "}
                          {bookingDetails.details.providerName}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">Services:</span>{" "}
                        {bookingDetails.details.providerServices}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Description:</span>{" "}
                        {bookingDetails.description}
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={resetBooking}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmBooking}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {bookingState === "confirmed" && bookingDetails && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4"
                  style={{ pointerEvents: "auto" }}
                >
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">
                      Booking Confirmed
                    </h3>
                    <p className="text-gray-600 mb-4">
                      The provider will start soon.
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center">
                        <img
                          src={`http://localhost:8000${bookingDetails.details.providerImage}`}
                          alt={bookingDetails.details.providerName}
                          className="w-10 h-10 rounded-full mr-2 object-cover"
                        />
                        <p className="text-sm">
                          <span className="font-semibold">Provider:</span>{" "}
                          {bookingDetails.details.providerName}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">Services:</span>{" "}
                        {bookingDetails.details.providerServices}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Description:</span>{" "}
                        {bookingDetails.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {bookingState === "ongoing" && bookingDetails && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4"
                  style={{ pointerEvents: "auto" }}
                >
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">
                      Service in Progress
                    </h3>
                    <p className="text-gray-600 mb-4">
                      The provider is working on your request.
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center">
                        <img
                          src={`http://localhost:8000${bookingDetails.details.providerImage}`}
                          alt={bookingDetails.details.providerName}
                          className="w-10 h-10 rounded-full mr-2 object-cover"
                        />
                        <p className="text-sm">
                          <span className="font-semibold">Provider:</span>{" "}
                          {bookingDetails.details.providerName}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">Services:</span>{" "}
                        {bookingDetails.details.providerServices}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Description:</span>{" "}
                        {bookingDetails.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {bookingState === "provider-completed" && bookingDetails && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4"
                  style={{ pointerEvents: "auto" }}
                >
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">
                      Provider Completed Job
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Please confirm completion.
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center">
                        <img
                          src={`http://localhost:8000${bookingDetails.details.providerImage}`}
                          alt={bookingDetails.details.providerName}
                          className="w-10 h-10 rounded-full mr-2 object-cover"
                        />
                        <p className="text-sm">
                          <span className="font-semibold">Provider:</span>{" "}
                          {bookingDetails.details.providerName}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">Services:</span>{" "}
                        {bookingDetails.details.providerServices}
                      </p>
                    </div>
                    <button
                      onClick={completeJob}
                      className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                    >
                      Confirm Completion
                    </button>
                  </div>
                </div>
              )}
              {bookingState === "completed" && bookingDetails && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4"
                  style={{ pointerEvents: "auto" }}
                >
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Payment</h3>
                    <p className="text-gray-600 mb-4">
                      Job completed. Please proceed with payment.
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center">
                        <img
                          src={`http://localhost:8000${bookingDetails.details.providerImage}`}
                          alt={bookingDetails.details.providerName}
                          className="w-10 h-10 rounded-full mr-2 object-cover"
                        />
                        <p className="text-sm">
                          <span className="font-semibold">Provider:</span>{" "}
                          {bookingDetails.details.providerName}
                        </p>
                      </div>
                      <p className="text-sm">
                        <span className="font-semibold">Total (2 hrs):</span> Rs
                        {bookingDetails.details.totalWage}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Method:</span> Cash
                        (Static)
                      </p>
                    </div>
                    <button
                      onClick={submitPayment}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      Pay Now
                    </button>
                  </div>
                </div>
              )}
              {bookingState === "paid" && bookingDetails && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4"
                  style={{ pointerEvents: "auto" }}
                >
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4">Review Service</h3>
                    <div className="mb-4">
                      <p className="text-sm font-semibold mb-2">Rating:</p>
                      <div className="flex space-x-1 text-2xl text-yellow-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            onClick={() => setRating(star)}
                            className={
                              star <= rating
                                ? "cursor-pointer"
                                : "cursor-pointer text-gray-300"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="w-full p-2 border border-gray-300 rounded-md mb-4"
                      placeholder="Leave a comment (optional)"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                    />
                    <button
                      onClick={submitReview}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                      disabled={rating === 0}
                    >
                      Submit Review
                    </button>
                    <button
                      onClick={resetBooking}
                      className="w-full mt-2 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              )}
              {bookingState === "reviewed" && (
                <div
                  className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-4"
                  style={{ pointerEvents: "auto" }}
                >
                  <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6 text-center">
                    <h3 className="text-xl font-bold mb-4">Thank You!</h3>
                    <p className="text-gray-600 mb-4">
                      Your review has been submitted.
                    </p>
                    <button
                      onClick={resetBooking}
                      className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                    >
                      Back to Map
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMaps;
