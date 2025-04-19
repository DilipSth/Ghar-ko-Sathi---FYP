import Booking from "../../models/Booking.js";

const handleBookingDetails = (socket) => {
  // Handle booking details request
  socket.on('getBookingDetails', async ({ bookingId }) => {
    try {
      // Find the booking in the database
      const booking = await Booking.findOne({ 
        $or: [
          { bookingId }, 
          { _id: bookingId }
        ]
      })
      .populate('userId', 'name email phoneNo')
      .populate('providerId', 'name email phoneNo services');
      
      if (!booking) {
        socket.emit('bookingDetailsResponse', { success: false, message: 'Booking not found' });
        return;
      }
      
      // Send the booking details back to the client
      socket.emit('bookingDetailsResponse', { 
        success: true, 
        booking: {
          ...booking.toObject(),
          bookingId: booking.bookingId || booking._id
        }
      });
    } catch (error) {
      console.error('Error fetching booking details:', error);
      socket.emit('bookingDetailsResponse', { 
        success: false, 
        message: 'Error fetching booking details' 
      });
    }
  });
};

export default handleBookingDetails; 