const Booking = require('../models/Booking');
const { calculateBookingCharge } = require('../utils/bookingUtils');

// Create a new booking
exports.createBooking = async (req, res) => {
  try {
    const { providerId, serviceType, durationInHours, startTime } = req.body;
    const userId = req.user._id;

    // Calculate the charge
    const charge = calculateBookingCharge(durationInHours);

    const booking = new Booking({
      userId,
      providerId,
      serviceType,
      durationInHours,
      startTime,
      charge,
      status: 'pending'
    });

    await booking.save();
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        ...booking.toObject(),
        chargeBreakdown: {
          baseCharge: charge,
          minimumCharge: durationInHours <= 1 ? 200 : null,
          hourlyRate: 200,
          hours: durationInHours
        }
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, actualDuration } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // If the booking is completed, recalculate the charge based on actual duration
    if (status === 'completed' && actualDuration) {
      const charge = calculateBookingCharge(actualDuration);
      booking.charge = charge;
      booking.actualDuration = actualDuration;
    }

    booking.status = status;
    await booking.save();

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      booking: {
        ...booking.toObject(),
        chargeBreakdown: {
          baseCharge: booking.charge,
          minimumCharge: booking.actualDuration <= 1 ? 200 : null,
          hourlyRate: 200,
          hours: booking.actualDuration || booking.durationInHours
        }
      }
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating booking status',
      error: error.message
    });
  }
}; 