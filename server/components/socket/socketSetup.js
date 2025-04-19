import { Server } from "socket.io";

const setupSocketServer = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"],
    },
  });

  // Create a Map to store connected users
  const connectedUsers = new Map();
  // Create a Map to store bookings
  const bookings = new Map();

  return { io, connectedUsers, bookings };
};

export default setupSocketServer; 