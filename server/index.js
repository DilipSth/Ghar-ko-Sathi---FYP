import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import servicesRouter from "./routes/services.js";
import usersRouter from "./routes/users.js";
import chatRouter from "./routes/chat.js";
import connectToDatabase from "./db/db.js";
import { Server } from "socket.io";
import http from "http";
import User from "./models/User.js";
import ServiceProvider from "./models/ServiceProvider.js";
import Conversation from "./models/Conversation.js";
import Message from "./models/Message.js";

dotenv.config();
connectToDatabase();

const app = express();
const PORT = process.env.PORT || 8000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use("/public", express.static("public"));
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRouter);
app.use("/api/services", servicesRouter);
app.use("/api/users", usersRouter);
app.use("/api/chat", chatRouter);

const connectedUsers = new Map();
const bookings = new Map();

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("register", (data) => {
    const { userId, role } = data;
    connectedUsers.set(socket.id, { userId, role });
    console.log(`Registered: ${userId} as ${role}`);
  });

  socket.on("sendBookingRequest", async (bookingData) => {
    const { userId, providerId, service, issue, address, description } =
      bookingData;
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
      details: {
        service, // Still sent from frontend, but we'll override providerServices
        issue,
        address,
        description,
        requestTime: new Date().toISOString(),
        wagePerHour: 200,
        userName: user?.name || "Unknown User",
        userPhone: user?.phoneNo || "Not provided",
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

  socket.on("updateMaintenanceDetails", (data) => {
    const { bookingId, ...maintenanceDetails } = data;
    const booking = bookings.get(bookingId);

    if (booking) {
      // Calculate the total price components
      const hourlyCharge = (maintenanceDetails.hourlyCharge || 200);
      const materialCost = maintenanceDetails.materialCost || 0;
      const additionalCharge = maintenanceDetails.additionalCharge || 0;
      const totalPrice = hourlyCharge + materialCost + additionalCharge;

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
        io.to(userSocketId).emit("maintenanceDetailsUpdated", booking);
      }
    }
  });

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

  // Chat related socket events
  socket.on("markAsRead", async (data) => {
    try {
      const { conversationId, userId } = data;
      if (!conversationId || !userId) return;

      // Mark messages as read
      await Message.updateMany(
        { 
          conversation: conversationId, 
          sender: { $ne: userId },
          isRead: false 
        },
        { isRead: true }
      );

      // Reset unread count for this conversation
      await Conversation.findByIdAndUpdate(conversationId, { unreadCount: 0 });

      // Get the updated conversation
      const conversation = await Conversation.findById(conversationId);
      
      // Notify other participants that messages have been read
      if (conversation) {
        // Find the other participant's socket ID
        let otherParticipantSocketId = null;
        const otherParticipantId = conversation.user && conversation.user.toString() !== userId 
          ? conversation.user.toString() 
          : conversation.serviceProvider ? conversation.serviceProvider.toString() : null;
        
        if (otherParticipantId) {
          for (const [socketId, info] of connectedUsers) {
            if (info.userId === otherParticipantId) {
              otherParticipantSocketId = socketId;
              break;
            }
          }
        }

        if (otherParticipantSocketId) {
          io.to(otherParticipantSocketId).emit("messagesRead", { conversationId });
        }
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  });

  // Handle new message sending via socket
  socket.on("sendMessage", async (messageData) => {
    try {
      const { conversationId, content } = messageData;
      const socketUser = connectedUsers.get(socket.id);
      
      if (!socketUser || !conversationId || !content) return;
      
      const { userId, role } = socketUser;

      // Create the new message
      const newMessage = new Message({
        conversation: conversationId,
        sender: userId,
        senderType: role,
        content: content,
        isRead: false
      });

      await newMessage.save();

      // Update conversation with last message and increment unread count
      const conversation = await Conversation.findByIdAndUpdate(
        conversationId,
        {
          lastMessage: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          $inc: { unreadCount: 1 }
        },
        { new: true }
      );

      // Populate the message before broadcasting
      const populatedMessage = await Message.findById(newMessage._id);

      // Broadcast the message to all participants in the conversation
      if (conversation) {
        // Determine recipients
        const recipientIds = [];
        if (conversation.user) recipientIds.push(conversation.user.toString());
        if (conversation.serviceProvider) recipientIds.push(conversation.serviceProvider.toString());
        
        // Add admin users if needed
        const adminUsers = await User.find({ role: "admin" }).select("_id");
        adminUsers.forEach(admin => recipientIds.push(admin._id.toString()));
        
        // Filter out duplicates and the sender
        const uniqueRecipients = [...new Set(recipientIds)].filter(id => id !== userId);
        
        // Find socket IDs for all recipients
        for (const recipientId of uniqueRecipients) {
          for (const [socketId, info] of connectedUsers) {
            if (info.userId === recipientId) {
              io.to(socketId).emit("newMessage", populatedMessage);
            }
          }
        }
        
        // Also send back to sender for confirmation
        socket.emit("messageSent", populatedMessage);
      }
    } catch (error) {
      console.error("Error sending message via socket:", error);
      socket.emit("messageError", { error: "Failed to send message" });
    }
  });

  socket.on("disconnect", () => {
    connectedUsers.delete(socket.id);
    console.log("Client disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
