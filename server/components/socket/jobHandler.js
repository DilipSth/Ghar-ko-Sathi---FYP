const handleJobEvents = (socket, io, connectedUsers, bookings) => {
  // Handle problem description submission
  socket.on("submitProblemDescription", (data) => {
    const { bookingId, description } = data;
    const booking = bookings.get(bookingId);

    if (booking && booking.status === "confirmed") {
      booking.details.description = description;
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
        io.to(providerSocketId).emit("problemDescriptionReceived", booking);
      }
    }
  });

  // Handle job start
  socket.on("startJob", (data) => {
    const { bookingId } = data;
    const booking = bookings.get(bookingId);

    if (booking && booking.status === "confirmed") {
      booking.status = "ongoing";
      booking.details.startTime = new Date().toISOString();
      bookings.set(bookingId, booking);

      let userSocketId = null;
      for (const [socketId, info] of connectedUsers) {
        if (info.userId === booking.userId && info.role === "user") {
          userSocketId = socketId;
          break;
        }
      }

      if (userSocketId) {
        io.to(userSocketId).emit("jobStarted", booking);
      }
      socket.emit("jobStartedSuccess", booking);
    }
  });

  // Handle maintenance details update
  socket.on("updateMaintenanceDetails", (data) => {
    const { bookingId, ...maintenanceDetails } = data;
    const booking = bookings.get(bookingId);

    if (booking) {
      // Calculate the total price components
      const hourlyCharge = (maintenanceDetails.hourlyCharge || 200);
      const materialCost = maintenanceDetails.materialCost || 0;
      const additionalCharge = maintenanceDetails.additionalCharge || 0;
      const totalPrice = hourlyCharge + materialCost + additionalCharge;

      console.log("Received maintenance details:", {
        hourlyCharge,
        materialCost,
        additionalCharge,
        totalPrice,
        materials: maintenanceDetails.materials
      });

      // Store all maintenance details in the booking object
      booking.maintenanceDetails = {
        jobDuration: maintenanceDetails.jobDuration || 1,
        hourlyRate: maintenanceDetails.hourlyRate || 200,
        hourlyCharge: hourlyCharge,
        materials: maintenanceDetails.materials || [],
        materialCost: materialCost,
        additionalCharge: additionalCharge,
        maintenancePrice: totalPrice,
        notes: maintenanceDetails.maintenanceNotes || ''
      };

      // Also store in the booking details for backward compatibility
      booking.details.maintenanceDetails = booking.maintenanceDetails;
      
      bookings.set(bookingId, booking);

      // Notify the user about the updated maintenance details
      let userSocketId = null;
      for (const [socketId, info] of connectedUsers) {
        if (info.userId === booking.userId && info.role === "user") {
          userSocketId = socketId;
          break;
        }
      }

      if (userSocketId) {
        // Create a response object that includes all the necessary data
        const responseObject = {
          ...booking,
          details: {
            ...booking.details,
            maintenanceDetails: booking.maintenanceDetails
          },
          maintenanceDetails: booking.maintenanceDetails
        };

        console.log("Sending maintenance details to user:", responseObject.maintenanceDetails);
        io.to(userSocketId).emit("maintenanceDetailsUpdated", responseObject);
      }
    }
  });

  // Handle job completion
  socket.on("completeJob", (data) => {
    const { bookingId, completedBy } = data;
    const booking = bookings.get(bookingId);

    if (booking && booking.status === "ongoing") {
      if (!booking.completedBy) booking.completedBy = [];
      booking.completedBy.push(completedBy);

      if (booking.completedBy.length === 2) {
        booking.status = "completed";
        booking.details.endTime = new Date().toISOString();
        
        // Include maintenance details in the completed job data
        if (booking.maintenanceDetails) {
          booking.details.maintenanceDetails = booking.maintenanceDetails;
        }
        
        bookings.set(bookingId, booking);

        let userSocketId = null;
        let providerSocketId = null;
        for (const [socketId, info] of connectedUsers) {
          if (info.userId === booking.userId && info.role === "user")
            userSocketId = socketId;
          if (info.userId === booking.providerId && info.role === "serviceProvider")
            providerSocketId = socketId;
        }

        if (userSocketId) io.to(userSocketId).emit("jobCompleted", booking);
        if (providerSocketId) io.to(providerSocketId).emit("jobCompleted", booking);
      } else {
        bookings.set(bookingId, booking);
        if (completedBy === "provider") {
          let userSocketId = null;
          for (const [socketId, info] of connectedUsers) {
            if (info.userId === booking.userId && info.role === "user") {
              userSocketId = socketId;
              break;
            }
          }
          if (userSocketId)
            io.to(userSocketId).emit("providerCompletedJob", booking);
        } else {
          let providerSocketId = null;
          for (const [socketId, info] of connectedUsers) {
            if (info.userId === booking.providerId && info.role === "serviceProvider") {
              providerSocketId = socketId;
              break;
            }
          }
          if (providerSocketId)
            io.to(providerSocketId).emit("userCompletedJob", booking);
        }
      }
    }
  });
};

export default handleJobEvents; 