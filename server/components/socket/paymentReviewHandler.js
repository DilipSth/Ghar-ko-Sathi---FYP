import Booking from "../../models/Booking.js";

const handlePaymentReview = (socket, io, connectedUsers, bookings) => {
  // Handle payment submission
  socket.on("submitPayment", (data) => {
    const { bookingId } = data;
    const booking = bookings.get(bookingId);

    if (booking && booking.status === "completed") {
      booking.status = "paid";
      booking.details.paymentDetails = {
        amount: booking.details.totalWage,
        method: "Cash (Static)",
        transactionId: `TXN-${Date.now()}`,
      };
      bookings.set(bookingId, booking);

      let providerSocketId = null;
      for (const [socketId, info] of connectedUsers) {
        if (
          info.userId === booking.providerId &&
          info.role === "serviceProvider"
        ) {
          providerSocketId = socketId;
          break;
        }
      }

      if (providerSocketId) {
        io.to(providerSocketId).emit("paymentReceived", booking);
      }
      socket.emit("paymentSuccess", {
        bookingId,
        message: "Payment processed successfully",
      });
    }
  });

  // Handle review submission
  socket.on("submitReview", (data) => {
    const { bookingId, rating, comment } = data;
    const booking = bookings.get(bookingId);

    if (booking && booking.status === "paid") {
      // Store the review with timestamp
      booking.review = { 
        rating, 
        comment,
        timestamp: new Date().toISOString(),
        userId: booking.userId,
        providerId: booking.providerId
      };
      bookings.set(bookingId, booking);

      // Update the service provider's average rating
      let providerSocketId = null;
      for (const [socketId, info] of connectedUsers) {
        if (info.userId === booking.providerId && info.role === "serviceProvider") {
          providerSocketId = socketId;
          break;
        }
      }

      if (providerSocketId) {
        io.to(providerSocketId).emit("reviewReceived", booking);
      }
      socket.emit("reviewSubmitted", {
        bookingId,
        message: "Review submitted successfully",
      });
    }
  });

  // Handle saving booking to database for payment processing
  socket.on("saveBookingForPayment", async (data) => {
    try {
      const { bookingId, paymentMethod, maintenanceDetails: explicitMaintenanceDetails } = data;
      console.log("Saving booking for payment:", { bookingId, paymentMethod });
      
      // First check if this booking ID already exists in the database
      const existingBooking = await Booking.findOne({ 
        $or: [
          { bookingId }, 
          { 'paymentDetails.transactionId': bookingId }
        ]
      });
      
      if (existingBooking) {
        console.log("Booking already exists in database with ID:", existingBooking._id);
        // Just return the existing MongoDB ID
        socket.emit("bookingSaved", { 
          mongoId: existingBooking._id.toString(),
          message: "Booking already exists in database" 
        });
        return;
      }
      
      const memoryBooking = bookings.get(bookingId);
      
      if (!memoryBooking) {
        console.error("Booking not found in memory:", bookingId);
        socket.emit("bookingSaveError", { message: "Booking not found in memory" });
        return;
      }
      
      console.log("Memory booking found:", memoryBooking);
      
      // Determine which maintenance details to use - prioritize explicit ones
      const useMaintDetails = explicitMaintenanceDetails || 
                              memoryBooking.maintenanceDetails || 
                              memoryBooking.details?.maintenanceDetails;
                              
      console.log("Using maintenance details:", useMaintDetails);
      
      // Calculate all charges
      const hourlyCharge = useMaintDetails?.hourlyCharge || 200;
      const materialCost = useMaintDetails?.materialCost || 0;
      const additionalCharge = useMaintDetails?.additionalCharge || 0;
      const totalCharge = useMaintDetails?.maintenancePrice || (hourlyCharge + materialCost + additionalCharge);
      
      // Get materials from either location
      const materials = useMaintDetails?.materials || [];
                        
      console.log("Payment calculation:", {
        hourlyCharge,
        materialCost,
        additionalCharge,
        totalCharge,
        materials
      });
      
      // Convert in-memory booking to database model
      const newBooking = new Booking({
        bookingId: bookingId, // Store the original bookingId
        userId: memoryBooking.userId,
        providerId: memoryBooking.providerId,
        serviceType: memoryBooking.details.service || "General Service",
        durationInHours: useMaintDetails?.jobDuration || 1,
        charge: hourlyCharge,
        materialsCost: materialCost,
        additionalCharge: additionalCharge,
        totalCharge: totalCharge,
        description: memoryBooking.details.description,
        location: {
          coordinates: memoryBooking.userLocation,
          address: memoryBooking.details.userLocationName
        },
        startTime: new Date(),
        status: "completed",
        paymentMethod: paymentMethod,
        paymentStatus: "pending",
        materials: materials,
        paymentDetails: {
          transactionId: `TXN-${Date.now()}`,
          paidAmount: totalCharge
        }
      });
      
      // Save booking to database
      console.log("Attempting to save booking to database:", newBooking);
      const savedBooking = await newBooking.save();
      console.log("Saved booking to database:", savedBooking._id);
      
      // Send back the MongoDB ID for the payment process
      socket.emit("bookingSaved", { 
        mongoId: savedBooking._id.toString(),
        message: "Booking saved to database successfully" 
      });
      
    } catch (error) {
      console.error("Error saving booking to database:", error);
      socket.emit("bookingSaveError", { 
        message: error.message || "Failed to save booking to database" 
      });
    }
  });
};

export default handlePaymentReview; 