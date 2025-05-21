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
import { useLocation } from "react-router-dom";
import { toast } from 'react-toastify';
import paymentService from "../../../services/PaymentService";
import bookingService from "../../../services/BookingService";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
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

// Custom marker component to handle user and provider locations
const DynamicMarkers = ({ userPosition, providerPosition, bookingState, onUserLocationFound }) => {
  const map = useMapEvents({
    // Optional: recenter map on user location when bookingState is idle
    locationfound(e) {
      if (bookingState === 'idle') {
         // Prevent re-centering on every position update if already centered
         const center = map.getCenter();
         const distanceToCenter = center.distanceTo(e.latlng);
         if (distanceToCenter > 50) { // Recenter if more than 50 meters away
             map.flyTo(e.latlng, map.getZoom());
         }
       }
       // Call the parent handler with the new location
       if (onUserLocationFound) {
         onUserLocationFound(e.latlng);
       }
    },
  });


  useEffect(() => {
    // Attempt to locate user when map is idle or accepted/confirmed
    if (bookingState === 'idle') {
      map.locate({ enableHighAccuracy: true, watch: true, timeout: 5000 });
    } else if (bookingState === 'accepted' || bookingState === 'confirmed' || bookingState === 'ongoing') {
      map.locate({ enableHighAccuracy: true, watch: true, timeout: 5000 });
      // Fit bounds to include both markers if both are available
      if (userPosition && providerPosition) {
        const bounds = L.latLngBounds([userPosition, providerPosition]);
        map.fitBounds(bounds, { padding: [50, 50] }); // Add some padding
      }
    } else {
       // Stop watching location when no longer needed
       map.stopLocate();
    }

    // Cleanup function to stop watching location on component unmount
    return () => {
       map.stopLocate();
    };
  }, [map, bookingState, userPosition, providerPosition]);

  // Render markers based on booking state
  return (
    <>
      {userPosition && (
        <Marker position={userPosition}>
          <Popup>Your Location</Popup>
        </Marker>
      )}
      {(bookingState === 'accepted' || bookingState === 'confirmed' || bookingState === 'ongoing') && providerPosition && (
        <Marker position={providerPosition}>
          <Popup>Service Provider Location</Popup>
        </Marker>
      )}
    </>
  );
};

const UserMaps = () => {
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingState, setBookingState] = useState("idle");
  const [bookingDetails, setBookingDetails] = useState(null);
  const [serviceProviders, setServiceProviders] = useState([]);
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
  const [activeTab, setActiveTab] = useState("map");
  const [bookingHistory, setBookingHistory] = useState([]);
  const { user } = useAuth();
  const { socket } = useContext(SocketContext);
  const location = useLocation();
  const selectedService = location.state?.selectedService || null;
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on("bookingAccepted", (booking) => {
      console.log("Booking accepted:", booking);
      
      // Show notification when booking is accepted by service provider
      toast.success(`${booking.providerName || 'Service provider'} has accepted your booking request!`, {
        duration: 5000,
        icon: '✅',
        style: {
          borderRadius: '10px',
          background: '#4BB543',
          color: '#fff',
        },
      });
      
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
      
      // Process maintenance details to ensure they're valid
      if (booking.maintenanceDetails) {
        const fixedMaintenanceDetails = { ...booking.maintenanceDetails };
        
        // Force numeric values for key fields
        fixedMaintenanceDetails.hourlyCharge = parseFloat(fixedMaintenanceDetails.hourlyCharge) || 200;
        fixedMaintenanceDetails.additionalCharge = parseFloat(fixedMaintenanceDetails.additionalCharge) || 0;
        
        // Process materials and calculate materialCost if needed
        if (fixedMaintenanceDetails.materials && fixedMaintenanceDetails.materials.length > 0) {
          fixedMaintenanceDetails.materials = fixedMaintenanceDetails.materials.map(material => ({
            ...material,
            cost: parseFloat(material.cost) || 0 
          }));
          
          fixedMaintenanceDetails.materialCost = fixedMaintenanceDetails.materials.reduce(
            (total, material) => total + (parseFloat(material.cost) || 0), 0
          );
        } else {
          fixedMaintenanceDetails.materialCost = parseFloat(fixedMaintenanceDetails.materialCost) || 0;
        }
        
        // Calculate total price if needed
        if (!fixedMaintenanceDetails.maintenancePrice) {
          fixedMaintenanceDetails.maintenancePrice = 
            fixedMaintenanceDetails.hourlyCharge + 
            fixedMaintenanceDetails.materialCost + 
            fixedMaintenanceDetails.additionalCharge;
        } else {
          fixedMaintenanceDetails.maintenancePrice = parseFloat(fixedMaintenanceDetails.maintenancePrice) || 0;
        }
        
        booking.maintenanceDetails = fixedMaintenanceDetails;
      }
      
      // Show notification when job is completed
      toast.success("Service has been completed successfully!", {
        duration: 5000,
        icon: '🎉',
        style: {
          borderRadius: '10px',
          background: '#4BB543',
          color: '#fff',
        },
      });
      
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
        // Store provider location with location name if available
        const enhancedLocation = {
          ...data.location,
          locationName: data.locationName || null
        };
        
        setProviderLocation(enhancedLocation);
        
        if (data.eta) {
          setProviderEta(data.eta);
        }
        if (data.distance) {
          setProviderDistance(data.distance);
        }
        
        // Get location name if not provided
        if (!enhancedLocation.locationName) {
          getLocationName(enhancedLocation.lat, enhancedLocation.lng)
            .then(name => {
              setProviderLocation(prev => ({
                ...prev,
                locationName: name
              }));
            })
            .catch(err => console.error("Error getting provider location name:", err));
        }
      }
    });

    socket.on("maintenanceDetailsUpdated", (booking) => {
      console.log("Maintenance details updated:", booking);
      
      if (!booking || !booking.maintenanceDetails) {
        console.error("Missing maintenance details in update");
        return;
      }
      
      // Validate that values are numbers where needed
      const fixedMaintenanceDetails = { ...booking.maintenanceDetails };
      
      // Force numeric values for key fields (with 0 as fallback)
      fixedMaintenanceDetails.hourlyCharge = parseFloat(fixedMaintenanceDetails.hourlyCharge) || 200;
      fixedMaintenanceDetails.additionalCharge = parseFloat(fixedMaintenanceDetails.additionalCharge) || 0;
      
      // Ensure material cost is calculated if not present but materials are
      if (fixedMaintenanceDetails.materials && fixedMaintenanceDetails.materials.length > 0) {
        // Force numeric values for each material cost
        fixedMaintenanceDetails.materials = fixedMaintenanceDetails.materials.map(material => ({
          ...material,
          cost: parseFloat(material.cost) || 0 
        }));
        
        // Recalculate materialCost
        fixedMaintenanceDetails.materialCost = fixedMaintenanceDetails.materials.reduce(
          (total, material) => total + (parseFloat(material.cost) || 0), 0
        );
      } else if (!fixedMaintenanceDetails.materialCost) {
        fixedMaintenanceDetails.materialCost = 0;
      } else {
        fixedMaintenanceDetails.materialCost = parseFloat(fixedMaintenanceDetails.materialCost) || 0;
      }
      
      // Ensure maintenancePrice is calculated if not present
      if (!fixedMaintenanceDetails.maintenancePrice) {
        fixedMaintenanceDetails.maintenancePrice = 
          fixedMaintenanceDetails.hourlyCharge + 
          fixedMaintenanceDetails.materialCost + 
          fixedMaintenanceDetails.additionalCharge;
      } else {
        fixedMaintenanceDetails.maintenancePrice = parseFloat(fixedMaintenanceDetails.maintenancePrice) || 0;
      }
      
      console.log("Fixed maintenance details:", fixedMaintenanceDetails);
      
      // Deep clone current booking details to avoid reference issues
      const currentDetails = JSON.parse(JSON.stringify(bookingDetails || {}));
      
      // Create a new object with combined data, prioritizing the new maintenance details
      const updatedBookingDetails = {
        ...currentDetails,
        details: {
          ...(currentDetails.details || {}),
          maintenanceDetails: fixedMaintenanceDetails
        },
        maintenanceDetails: fixedMaintenanceDetails
      };
      
      console.log("Updated booking details:", updatedBookingDetails);
      
      // Update state with the new booking details
      setBookingDetails(updatedBookingDetails);
      
      // Show the user a notification with the details
      const { hourlyCharge, materialCost, additionalCharge, maintenancePrice } = fixedMaintenanceDetails;
      const calculatedTotal = maintenancePrice || (hourlyCharge + materialCost + additionalCharge);
      toast.info(`Service details updated: Total Rs. ${calculatedTotal}`);
    });

    socket.on("bookingCancelled", (data) => {
      console.log("Booking cancelled:", data);
      
      // Show notification when booking is cancelled
      toast.info(data.message, {
        duration: 5000,
        icon: '❌',
        style: {
          borderRadius: '10px',
          background: '#FF4B4B',
          color: '#fff',
        },
      });
      
      if (data.reason) {
        toast.info(`Reason: ${data.reason}`, {
          duration: 5000,
          style: {
            borderRadius: '10px',
            background: '#4A5568',
            color: '#fff',
          },
        });
      }
      
      setBookingState("idle");
      setBookingDetails(null);
    });

    socket.on("bookingCancellationConfirmed", (data) => {
      console.log("Booking cancellation confirmed:", data);
      
      toast.success(data.message, {
        duration: 5000,
        icon: '✔️',
        style: {
          borderRadius: '10px',
          background: '#48BB78',
          color: '#fff',
        },
      });
      
      setBookingState("idle");
      setBookingDetails(null);
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
      socket.off("bookingCancelled");
      socket.off("bookingCancellationConfirmed");
    };
  }, [socket]);

  const fetchServiceProviders = async () => {
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
        // Show booking notification immediately
        toast.success("Service booking request sent successfully!", {
          duration: 5000,
          icon: '🔔',
          style: {
            borderRadius: '10px',
            background: '#4BB543',
            color: '#fff',
          },
        });
        
        setBookingState("waiting");

        // Get real-time location data if available
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            // Get real-time position
            const userRealLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            
            // Save to localStorage
            localStorage.setItem("userCurrentPosition", JSON.stringify(userRealLocation));
            
            // Update current position state
            setCurrentPosition(userRealLocation);
            
            // Get location name
            let userLocationName = locationName;
            
            if (!userLocationName) {
              try {
                userLocationName = await getLocationName(
                  userRealLocation.lat,
                  userRealLocation.lng
                );
              } catch (error) {
                console.error("Error getting location name:", error);
                userLocationName = `${userRealLocation.lat.toFixed(4)}, ${userRealLocation.lng.toFixed(4)}`;
              }
            }
            
            const bookingData = {
              userId: user._id,
              userName: user.name,
              userPhone: user.phoneNo,
              providerId: selectedProvider.id,
              service: selectedProvider.services,
              issue: "Repair Needed",
              description,
              userLocation: userRealLocation,
              userLocationName: userLocationName,
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
          },
          (error) => {
            // If geolocation fails, use last known position
            console.error("Geolocation error:", error);
            
            const bookingData = {
              userId: user._id,
              userName: user.name,
              userPhone: user.phoneNo,
              providerId: selectedProvider.id,
              service: selectedProvider.services,
              issue: "Repair Needed",
              description,
              userLocation: currentPosition,
              userLocationName: locationName || "Current Location",
              providerLocation: selectedProvider.realTimeLocation || null,
            };

            console.log("Sending booking request with last known position:", bookingData);

            if (socket) {
              socket.emit("sendBookingRequest", bookingData);
              setBookingDetails(bookingData);
            } else {
              console.error("Socket not available for booking request");
              setError("Connection error. Please try again.");
              setBookingState("idle");
            }
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
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

  const submitPayment = async (method) => {
    if (!bookingDetails || !socket) {
      setError("Booking details not available");
      return;
    }
    
    setIsProcessingPayment(true);
    
    try {
      // Log booking details for debugging
      console.log("Full booking details:", JSON.stringify(bookingDetails));
      
      // Log maintenance details before payment
      console.log("Maintenance details for payment:", {
        hourlyCharge: getMaintenanceValue('hourlyCharge', 200),
        materialCost: getMaintenanceValue('materialCost', 0),
        additionalCharge: getMaintenanceValue('additionalCharge', 0),
        materials: getMaintenanceValue('materials', []),
        calculatedTotal: (
          getMaintenanceValue('hourlyCharge', 200) + 
          getMaintenanceValue('materialCost', 0) + 
          getMaintenanceValue('additionalCharge', 0)
        )
      });
      
      // Force recalculation of material cost from materials array if it exists
      let materialCost = 0;
      const materials = getMaintenanceValue('materials', []);
      if (materials && materials.length > 0) {
        materialCost = materials.reduce((total, material) => total + (parseFloat(material.cost) || 0), 0);
      } else {
        materialCost = getMaintenanceValue('materialCost', 0);
      }
      
      // Prepare maintenance details for payment with explicitly calculated values
      const maintenanceDetails = {
        jobDuration: getMaintenanceValue('jobDuration', 1),
        hourlyRate: getMaintenanceValue('hourlyRate', 200),
        hourlyCharge: getMaintenanceValue('hourlyCharge', 200),
        materials: materials,
        materialCost: materialCost,
        additionalCharge: parseFloat(getMaintenanceValue('additionalCharge', 0)),
        maintenancePrice: getMaintenanceValue('maintenancePrice') || 
          (getMaintenanceValue('hourlyCharge', 200) + 
           materialCost + 
           parseFloat(getMaintenanceValue('additionalCharge', 0)))
      };
      
      // Always save the booking to database first, regardless of payment method
      console.log("Saving booking to database with maintenance details:", maintenanceDetails);
          
      // First, save booking to database via socket
      socket.emit("saveBookingForPayment", {
        bookingId: bookingDetails.bookingId,
        paymentMethod: method,
        // Include maintenance details explicitly to ensure they're properly saved
        maintenanceDetails: maintenanceDetails
      });
          
      // Wait for confirmation before proceeding
      const bookingSaved = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Timeout waiting for booking to save"));
        }, 8000); // Increase timeout to 8 seconds
            
        socket.once("bookingSaved", (data) => {
          clearTimeout(timeout);
          console.log("Booking saved successfully:", data);
          resolve(data);
        });
            
        socket.once("bookingSaveError", (error) => {
          clearTimeout(timeout);
          console.error("Error saving booking:", error);
          reject(new Error(error.message || "Failed to save booking"));
        });
      });
          
      console.log("Booking saved with MongoDB ID:", bookingSaved.mongoId);
      
      if (method === 'cash') {
        // Cash payment - use the MongoDB ID for the payment
        const response = await paymentService.markAsCashPayment(bookingSaved.mongoId);
        console.log("Cash payment response:", response);
        
        toast.success("Cash payment confirmed");
        setBookingState("paid");
      } 
      else if (method === 'esewa') {
        // eSewa payment - initiate through the payment service using MongoDB ID
        try {
          console.log("Initiating eSewa payment with MongoDB ID:", bookingSaved.mongoId);
          
          const response = await paymentService.initiateEsewaPayment(bookingSaved.mongoId);
          
          if (response.success) {
            // Submit eSewa payment form
            paymentService.submitEsewaForm(response.paymentUrl, response.formData);
            toast.info("Processing payment with eSewa. Please complete the payment process.");
          } else {
            throw new Error(response.message || "Failed to initiate eSewa payment");
          }
        } catch (error) {
          console.error("eSewa payment error:", error);
          toast.error(error.message || "Payment processing failed");
          setError(error.message || "Failed to initiate eSewa payment");
        }
      }
    } catch (error) {
      console.error("Payment error:", error);
      setError("Payment failed. Please try again: " + error.message);
      toast.error("Payment failed: " + error.message);
    } finally {
      setIsProcessingPayment(false);
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

  const resetBooking = useCallback(async () => {
    if (bookingDetails?.bookingId) {
      try {
        await bookingService.cancelBooking(bookingDetails.bookingId, 'Cancelled by user', 'user');
        
        // Show notification to the user that they cancelled the booking
        toast.info('You cancelled the service provider booking', {
          duration: 5000,
          icon: '❌',
          style: {
            borderRadius: '10px',
            background: '#FF4B4B',
            color: '#fff',
          },
        });

        // Set booking state to cancelled first
        setBookingState("cancelled");
        
        // Wait for 2 seconds to show the cancellation message
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        console.error('Error cancelling booking:', error);
        toast.error('Failed to cancel booking');
      }
    }
    
    // Reset all states
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
    setCurrentPosition(null); // Clear user position on reset
  }, [bookingDetails]);

  const [locationName, setLocationName] = useState("");
  const locationNameCache = useRef({});

  const getLocationName = useCallback(
    async (lat, lng) => {
      const cacheKey = `${parseFloat(lat).toFixed(4)},${parseFloat(lng).toFixed(
        4
      )}`;

      if (locationNameCache.current[cacheKey]) {
        return locationNameCache.current[cacheKey];
      }

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch location name: ${response.status}`);
        }
        
        const data = await response.json();
        const displayName = data.display_name || 
          `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        
        locationNameCache.current[cacheKey] = displayName;
        return displayName;
      } catch (error) {
        console.error("Error getting location name from API:", error);
        // Fallback to just coordinates if API fails
        const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        locationNameCache.current[cacheKey] = fallback;
        return fallback;
      }
    },
    [locationNameCache]
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

  // Mock booking history data - in a real app, this would come from an API
  useEffect(() => {
    // Simulate loading booking history
    const mockHistory = [
      {
        id: "booking123",
        provider: { name: "Ramesh Sharma", service: "Plumbing" },
        date: "May 15, 2023",
        status: "completed",
        cost: 450
      },
      {
        id: "booking456",
        provider: { name: "Suresh Kumar", service: "Electrician" },
        date: "Apr 28, 2023",
        status: "completed",
        cost: 350
      },
      {
        id: "booking789",
        provider: { name: "Kamal Thapa", service: "Carpenter" },
        date: "Mar 12, 2023",
        status: "completed",
        cost: 600
      }
    ];
    setBookingHistory(mockHistory);
  }, []);

  // Utility function to safely extract maintenance data
  const getMaintenanceValue = (field, defaultValue = 0) => {
    let value;

    // Try first from maintenanceDetails directly
    if (bookingDetails?.maintenanceDetails && bookingDetails.maintenanceDetails[field] !== undefined) {
      value = bookingDetails.maintenanceDetails[field];
    }
    // Try from details.maintenanceDetails
    else if (bookingDetails?.details?.maintenanceDetails && bookingDetails.details.maintenanceDetails[field] !== undefined) {
      value = bookingDetails.details.maintenanceDetails[field];
    } 
    // Special case for materialCost if we have materials array but no materialCost
    else if (field === 'materialCost') {
      const materials = getMaintenanceValue('materials', []);
      if (materials && materials.length > 0) {
        return materials.reduce((total, material) => total + (parseFloat(material.cost) || 0), 0);
      }
      value = defaultValue;
    }
    else {
      value = defaultValue;
    }

    // For numeric fields, ensure we return a number
    if (['hourlyCharge', 'hourlyRate', 'materialCost', 'additionalCharge', 'maintenancePrice', 'jobDuration'].includes(field)) {
      return parseFloat(value) || defaultValue;
    }

    return value;
  };

  // Handle location update from RealTimeMap (now from DynamicMarkers)
  const handleLocationUpdate = useCallback(async (position) => {
    setCurrentPosition(position);
    localStorage.setItem("userCurrentPosition", JSON.stringify(position));
    // No need to setMapLoading(false) here as we removed the old map logic
    const name = await getLocationName(position.lat, position.lng);
    setLocationName(name);
  }, [getLocationName]);

  return (
    <div className="h-screen flex flex-col">
      <div className="p-4 h-full">
        <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-2xl">User Dashboard</h3>
            <div className="flex items-center">
              <span className="text-gray-600 text-sm">{user?.name || "User"}</span>
            </div>
          </div>
          
          {/* Dashboard Tabs */}
          <div className="flex border-b mb-4">
            <button
              className={`py-2 px-4 font-medium ${
                activeTab === "map"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500"
              }`}
              onClick={() => setActiveTab("map")}
            >
              Find Services
            </button>
          </div>
          
          {/* Dashboard Content */}
          <div className="flex-1 flex flex-col gap-4">
            {activeTab === "map" && (
              <div className="flex-1 flex flex-col lg:flex-row gap-4">
                {/* Map Section */}
                <div className="lg:w-2/3 overflow-hidden bg-white shadow-md rounded-lg">
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
                  
                  {/* Provider location info when needed */}
                  {providerLocation && (bookingState === "accepted" || bookingState === "confirmed" || bookingState === "ongoing") && (
                    <div className="p-3 bg-blue-50 mb-3 rounded-lg shadow-sm">
                      <div className="flex items-center">
                        <div className="bg-green-500 text-white p-2 rounded-full mr-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                            <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Service Provider Location</p>
                          <p className="text-sm font-medium">
                            {providerLocation.locationName || 
                              `${providerLocation.lat.toFixed(4)}, ${providerLocation.lng.toFixed(4)}`}
                          </p>
                        </div>
                      </div>
                      
                      {providerDistance && (
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-100">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm">Distance: <strong>{providerDistance} km</strong></span>
                          </div>
                          {providerEta && (
                            <div className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm">ETA: <strong>{providerEta} mins</strong></span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Display current location name */}
                  {locationName && activeTab === 'map' && (
                    <div className="p-3 bg-gray-50 mb-3 rounded-lg shadow-sm">
                      <p className="text-xs text-gray-500">Your Current Location</p>
                      <p className="text-sm font-medium">{locationName}</p>
                    </div>
                  )}
                  
                  <div className="flex-1 relative h-[400px] rounded-lg overflow-hidden border border-gray-200">
                    <MapContainer
                      center={currentPosition || [27.7172, 85.324]} // Default to Kathmandu if position is null
                      zoom={15}
                      style={{ height: "100%", width: "100%" }}
                      whenCreated={mapInstance => {
                        // Optional: Store map instance if needed for later access
                        // mapRef.current = mapInstance;
                      }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <DynamicMarkers 
                         userPosition={currentPosition} 
                         providerPosition={providerLocation} 
                         bookingState={bookingState}
                         onUserLocationFound={handleLocationUpdate} // Pass the handler down
                       />
                    </MapContainer>
                  </div>
                </div>

                {/* Side Panel - Service Providers or Booking Status */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-hidden">
                  {/* Service Providers List */}
                  {bookingState === "idle" && !selectedProvider && (
                    <div className="bg-white rounded-lg shadow-lg p-4 max-h-[calc(100vh-240px)] overflow-y-auto">
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
                                className="bg-white border border-gray-200 hover:border-blue-300 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer"
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
                    <div className="bg-white rounded-xl shadow-lg p-6 animate-fade-in max-h-[calc(100vh-240px)] overflow-y-auto">
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
                          <div className="bg-blue-50 p-4 rounded-lg mb-4 text-left">
                            <div className="space-y-2">
                              <p className="flex justify-between">
                                <span className="font-semibold">Services:</span>
                                <span>{selectedProvider.services}</span>
                              </p>
                              <p className="flex justify-between items-start">
                                <span className="font-semibold">Description:</span>
                                <span className="text-right max-w-[200px]">{description}</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="font-semibold">Location:</span>
                                <span>{locationName}</span>
                              </p>
                            </div>
                          </div>
                          {/* Notification Panel */}
                          {bookingState === "cancelled" && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                              <div className="flex items-center">
                                <div className="flex-shrink-0">
                                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div className="ml-3">
                                  <h3 className="text-sm font-medium text-red-800">
                                    Booking Cancelled
                                  </h3>
                                  <div className="mt-1 text-sm text-red-700">
                                    You have cancelled your service request.
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
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
                          <h3 className="text-xl font-bold text-center">Booking Accepted!</h3>
                          <div className="text-center mb-4">
                            <p className="font-medium">{selectedProvider.name}</p>
                            <p className="text-gray-600">{selectedProvider.services}</p>
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
                            <div className="space-y-2 mt-2">
                              <p className="text-sm">
                                <span className="font-medium">Description:</span> {bookingDetails.description}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Phone:</span> {bookingDetails.details?.providerPhone || "Not provided"}
                              </p>
                              
                              {providerLocation && (
                                <div className="bg-green-50 p-3 rounded mt-2">
                                  <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-medium">Provider Location:</p>
                                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                      En Route
                                    </span>
                                  </div>
                                  <p className="text-xs">
                                    {providerLocation.locationName || 
                                      `${providerLocation.lat.toFixed(4)}, ${providerLocation.lng.toFixed(4)}`}
                                  </p>
                                  {providerDistance && (
                                    <div className="flex justify-between items-center mt-1">
                                      <p className="text-xs">
                                        <span className="font-medium">Distance:</span> {providerDistance} km
                                      </p>
                                      {providerEta && (
                                        <p className="text-xs font-medium text-blue-800">
                                          ETA: {providerEta} mins
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {bookingState === "ongoing" && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center">
                              <svg className="h-8 w-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-center">Service in Progress</h3>
                          <p className="text-gray-600 text-center mb-4">
                            The service provider is currently working on your request.
                          </p>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <div className="text-center">
                              <p className="font-semibold text-lg">{bookingDetails.details?.providerName}</p>
                              <p className="text-gray-600">{bookingDetails.details?.providerServices}</p>
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
                            The service provider has marked this job as complete. Please confirm.
                          </p>
                          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                            <div className="text-center">
                              <p className="font-semibold text-lg">{bookingDetails.details?.providerName}</p>
                              <p className="text-gray-600 mb-3">{bookingDetails.details?.providerServices}</p>
                            </div>
                            <div className="space-y-2 pb-3 border-b border-gray-200">
                              <p className="text-sm">
                                <span className="font-medium">Duration:</span> {bookingDetails.jobDuration || bookingDetails.durationHours || 1} hour
                                {(bookingDetails.jobDuration || bookingDetails.durationHours) > 1 ? "s" : ""}
                              </p>
                              <p className="text-sm">
                                <span className="font-medium">Service:</span> {bookingDetails.details?.service || bookingDetails.details?.providerServices}
                              </p>
                            </div>
                            <div className="flex items-center justify-center mt-4">
                              <p className="text-center text-gray-700">
                                Is the service completed to your satisfaction?
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={completeJob}
                            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center font-medium"
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
                            {console.log("Debug payment details:", {
                              hourlyCharge: getMaintenanceValue('hourlyCharge', 200),
                              materialCost: getMaintenanceValue('materialCost', 0),
                              additionalCharge: getMaintenanceValue('additionalCharge', 0),
                              materials: getMaintenanceValue('materials', []),
                              maintenancePrice: getMaintenanceValue('maintenancePrice'),
                              totalCalculated: (
                                getMaintenanceValue('hourlyCharge', 200) + 
                                getMaintenanceValue('materialCost', 0) + 
                                getMaintenanceValue('additionalCharge', 0)
                              )
                            })}
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="font-medium">Service Duration:</span>
                                <span>{getMaintenanceValue('jobDuration', 1)} hour</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">Hourly Rate:</span>
                                <span>Rs. {getMaintenanceValue('hourlyRate', 200)}/hour</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">Service Charge:</span>
                                <span>Rs. {getMaintenanceValue('hourlyCharge', 200)}</span>
                              </div>
                            </div>

                            {/* Material Cost Calculation */}
                            {(() => {
                              const materials = getMaintenanceValue('materials', []);
                              let materialCost = 0;
                              
                              if (materials && materials.length > 0) {
                                materialCost = materials.reduce((total, material) => total + (parseFloat(material.cost) || 0), 0);
                              } else {
                                materialCost = getMaintenanceValue('materialCost', 0);
                              }
                              
                              return (
                                <div className="border-t pt-2">
                                  <p className="font-medium mb-2">Materials Used:</p>
                                  {materials.length > 0 ? (
                                    <div className="space-y-1">
                                      {materials.map((material, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                          <span>{material.name}</span>
                                          <span>Rs. {material.cost}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500">No materials added</div>
                                  )}
                                  <div className="flex justify-between font-medium pt-1 border-t mt-2">
                                    <span>Total Material Cost:</span>
                                    <span>Rs. {materialCost}</span>
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="border-t pt-2">
                              <div className="flex justify-between">
                                <span className="font-medium">Additional Charges:</span>
                                <span>Rs. {getMaintenanceValue('additionalCharge', 0)}</span>
                              </div>
                              <div className="flex justify-between font-bold text-lg pt-2 mt-2 border-t">
                                <span>Total Amount:</span>
                                <span>Rs. {
                                  (() => {
                                    // Get the maintenance price if available
                                    const maintenancePrice = getMaintenanceValue('maintenancePrice');
                                    if (maintenancePrice) return maintenancePrice;
                                    
                                    // Otherwise calculate it
                                    const hourlyCharge = getMaintenanceValue('hourlyCharge', 200);
                                    
                                    // Calculate material cost from materials if available
                                    const materials = getMaintenanceValue('materials', []);
                                    let materialCost = 0;
                                    
                                    if (materials && materials.length > 0) {
                                      materialCost = materials.reduce((total, material) => total + (parseFloat(material.cost) || 0), 0);
                                    } else {
                                      materialCost = getMaintenanceValue('materialCost', 0);
                                    }
                                    
                                    const additionalCharge = parseFloat(getMaintenanceValue('additionalCharge', 0));
                                    const total = hourlyCharge + materialCost + additionalCharge;
                                    
                                    console.log('Calculated detailed total:', { hourlyCharge, materialCost, additionalCharge, total });
                                    return total;
                                  })()
                                }</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Payment Options */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-center">Select Payment Method</h4>
                            
                            {/* Cash Payment Option */}
                            <button
                              onClick={() => submitPayment('cash')}
                              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                              disabled={isProcessingPayment}
                            >
                              {isProcessingPayment ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                  Pay with Cash
                                </>
                              )}
                            </button>
                            
                            {/* eSewa Payment Option */}
                            <button
                              onClick={() => submitPayment('esewa')}
                              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                              disabled={isProcessingPayment}
                            >
                              {isProcessingPayment ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                                  </svg>
                                  Pay with eSewa
                                </>
                              )}
                            </button>
                          </div>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserMaps;
