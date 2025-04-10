import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRouter from "./routes/auth.js";
import servicesRouter from "./routes/services.js";
import usersRouter from "./routes/users.js";
import connectToDatabase from "./db/db.js";
import { Server } from "socket.io";
import http from "http";
import User from "./models/User.js";
import ServiceProvider from "./models/ServiceProvider.js";

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

    const user = await User.findById(userId).select("name");
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

  socket.on("completeJob", (data) => {
    const { bookingId, completedBy } = data;
    const booking = bookings.get(bookingId);

    if (booking && booking.status === "ongoing") {
      if (!booking.completedBy) booking.completedBy = [];
      booking.completedBy.push(completedBy);

      if (booking.completedBy.length === 2) {
        booking.status = "completed";
        booking.details.endTime = new Date().toISOString();
        const hoursWorked = 2;
        booking.details.totalWage = hoursWorked * booking.details.wagePerHour;
        bookings.set(bookingId, booking);

        let userSocketId = null;
        let providerSocketId = null;
        for (const [socketId, info] of connectedUsers) {
          if (info.userId === booking.userId && info.role === "user")
            userSocketId = socketId;
          if (
            info.userId === booking.providerId &&
            info.role === "serviceProvider"
          )
            providerSocketId = socketId;
        }

        if (userSocketId) io.to(userSocketId).emit("jobCompleted", booking);
        if (providerSocketId)
          io.to(providerSocketId).emit("jobCompleted", booking);
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
            if (
              info.userId === booking.providerId &&
              info.role === "serviceProvider"
            ) {
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
      booking.review = { rating, comment };
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
        io.to(providerSocketId).emit("reviewReceived", booking);
      }
      socket.emit("reviewSubmitted", {
        bookingId,
        message: "Review submitted successfully",
      });
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
