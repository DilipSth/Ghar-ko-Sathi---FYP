import setupSocketServer from './socketSetup.js';
import handleConnection from './connectionHandler.js';
import handleBookingRequest from './bookingRequestHandler.js';
import handleJobEvents from './jobHandler.js';
import handlePaymentReview from './paymentReviewHandler.js';
import handleChatEvents from './chatHandler.js';
import handleBookingDetails from './bookingDetailsHandler.js';

const initializeSocket = (server) => {
  // Setup the socket server
  const { io, connectedUsers, bookings } = setupSocketServer(server);

  // Handle socket connections
  io.on('connection', (socket) => {
    // Setup connection and registration handler
    handleConnection(socket, connectedUsers);

    // Setup booking request and response handlers
    handleBookingRequest(socket, io, connectedUsers, bookings);

    // Setup job-related handlers
    handleJobEvents(socket, io, connectedUsers, bookings);

    // Setup payment and review handlers
    handlePaymentReview(socket, io, connectedUsers, bookings);

    // Setup chat handlers
    handleChatEvents(socket, io, connectedUsers);

    // Setup booking details handler
    handleBookingDetails(socket);
  });

  return { io, connectedUsers, bookings };
};

export default initializeSocket; 