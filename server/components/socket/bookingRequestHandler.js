import User from "../../models/User.js";
import ServiceProvider from "../../models/ServiceProvider.js";

const handleBookingRequest = (socket, io, connectedUsers, bookings) => {
  // Handle initial booking request from user to provider
  socket.on("sendBookingRequest", async (bookingData) => {
    const { 
      userId, 
      providerId, 
      service, 
      issue, 
      description, 
      userLocation, 
      userLocationName,
      userName,
      userPhone
    } = bookingData;
    
    const bookingId = `${userId}-${providerId}-${Date.now()}`;

    const user = await User.findById(userId).select("name phoneNo");
    const provider = await ServiceProvider.findById(providerId)
      .select("name services profileImage")
      .populate("services"); // Populate services to get ser_name

    const bookingDetails = {
      bookingId,
      userId,
      providerId,
      status: "pending",
      // Store the user's real-time location
      userLocation: userLocation || null,
      details: {
        service, // Still sent from frontend, but we'll override providerServices
        issue,
        description,
        requestTime: new Date().toISOString(),
        wagePerHour: 200,
        userName: userName || user?.name || "Unknown User",
        userPhone: userPhone || user?.phoneNo || "Not provided",
        // Store the user's location name
        userLocationName: userLocationName || "Current Location",
        providerName: provider?.name || "Unknown Provider",
        providerServices:
          provider?.services.map((s) => s.ser_name).join(", ") ||
          "General Services",
        providerImage: provider?.profileImage
          ? `/public/registerImage/${provider.profileImage}`
          : null,
      },
    };

    bookings.set(bookingId, bookingDetails);

    let providerSocketId = null;
    for (const [socketId, info] of connectedUsers) {
      if (info.userId === providerId && info.role === "serviceProvider") {
        providerSocketId = socketId;
        break;
      }
    }

    if (providerSocketId) {
      io.to(providerSocketId).emit("newBookingRequest", bookingDetails);
      socket.emit("bookingRequestSent", {
        bookingId,
        message: "Request sent to provider",
      });
    } else {
      socket.emit("bookingError", { message: "Provider not available" });
      bookings.delete(bookingId);
    }
  });

  // Provider accepts a booking
  socket.on("acceptBooking", (data) => {
    const { bookingId } = data;
    const booking = bookings.get(bookingId);

    if (booking && booking.status === "pending") {
      booking.status = "accepted";
      bookings.set(bookingId, booking);

      let userSocketId = null;
      for (const [socketId, info] of connectedUsers) {
        if (info.userId === booking.userId && info.role === "user") {
          userSocketId = socketId;
          break;
        }
      }

      if (userSocketId) {
        io.to(userSocketId).emit("bookingAccepted", booking);
      }
      socket.emit("bookingConfirmed", booking);
    }
  });

  // Provider declines a booking
  socket.on("declineBooking", (data) => {
    const { bookingId } = data;
    const booking = bookings.get(bookingId);

    if (booking && booking.status === "pending") {
      bookings.delete(bookingId);

      let userSocketId = null;
      for (const [socketId, info] of connectedUsers) {
        if (info.userId === booking.userId && info.role === "user") {
          userSocketId = socketId;
          break;
        }
      }

      if (userSocketId) {
        io.to(userSocketId).emit("bookingDeclined", {
          bookingId,
          message: "Provider declined your request",
        });
      }
    }
  });

  // User confirms the booking
  socket.on("confirmBooking", (data) => {
    const { bookingId } = data;
    const booking = bookings.get(bookingId);

    if (booking && booking.status === "accepted") {
      booking.status = "confirmed";
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
        io.to(providerSocketId).emit("bookingConfirmedByUser", booking);
      }
      socket.emit("bookingConfirmedSuccess", booking);
    }
  });

  // Handle booking cancellation
  socket.on("cancelBooking", (data) => {
    const { bookingId, reason, cancelledBy, cancelTime } = data;
    const booking = bookings.get(bookingId);

    if (booking && ['pending', 'accepted', 'confirmed'].includes(booking.status)) {
      booking.status = 'cancelled';
      booking.details.cancellation = {
        reason,
        cancelledBy,
        cancelTime
      };
      bookings.set(bookingId, booking);

      // Find the socket ID of the other party to notify them
      let targetSocketId = null;
      let targetRole = cancelledBy === 'user' ? 'serviceProvider' : 'user';
      let targetId = cancelledBy === 'user' ? booking.providerId : booking.userId;

      for (const [socketId, info] of connectedUsers) {
        if (info.userId === targetId && info.role === targetRole) {
          targetSocketId = socketId;
          break;
        }
      }

      // Send cancellation notification to the other party
      if (targetSocketId) {
        io.to(targetSocketId).emit("bookingCancelled", {
          bookingId,
          message: `Booking was cancelled by ${cancelledBy === 'user' ? 'the user' : 'the service provider'}`,
          reason,
          cancelTime
        });
      }

      // Confirm cancellation to the cancelling party
      socket.emit("bookingCancellationConfirmed", {
        bookingId,
        message: "Booking cancelled successfully"
      });
    }
  });
};

export default handleBookingRequest; 