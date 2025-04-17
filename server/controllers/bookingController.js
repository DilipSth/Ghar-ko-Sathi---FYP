import Booking from '../models/Booking.js';
import User from '../models/User.js';
import ServiceProvider from '../models/ServiceProvider.js';

// Calculate booking charge based on duration
const calculateBookingCharge = (durationInHours) => {
  const MINIMUM_CHARGE = 200;
  const HOURLY_RATE = 200;
  
  // If duration is less than 1 hour, charge minimum
  if (durationInHours <= 1) {
    return MINIMUM_CHARGE;
  }
  
  // For durations longer than 1 hour, charge minimum for first hour
  // and then charge per hour for remaining time
  const remainingHours = durationInHours - 1;
  const remainingCharge = Math.ceil(remainingHours) * HOURLY_RATE;
  return MINIMUM_CHARGE + remainingCharge;
};

// Create a new booking
export const createBooking = async (req, res) => {
  try {
    const { 
      providerId, 
      serviceType, 
      durationInHours, 
      startTime,
      location,
      description,
      scheduledTime 
    } = req.body;
    
    const userId = req.user._id;

    // Validate required fields
    if (!providerId || !serviceType || !durationInHours) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Calculate the charge
    const charge = calculateBookingCharge(durationInHours);

    // Create new booking
    const booking = new Booking({
      userId,
      providerId,
      serviceType,
      durationInHours,
      startTime: startTime || new Date(),
      scheduledTime: scheduledTime || new Date(),
      location,
      description,
      charge,
      status: 'pending'
    });

    await booking.save();
    
    // Populate user and provider details for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('userId', 'name email phoneNo')
      .populate('providerId', 'name email phoneNo services');
    
    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: populatedBooking,
      chargeBreakdown: {
        baseCharge: charge,
        minimumCharge: durationInHours <= 1 ? 200 : null,
        hourlyRate: 200,
        hours: durationInHours
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: error.message
    });
  }
};

// Get all bookings (admin only)
export const getBookings = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    // Support filtering by status
    const { status, fromDate, toDate } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    // Date range filtering
    if (fromDate || toDate) {
      query.createdAt = {};
      
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      
      if (toDate) {
        query.createdAt.$lte = new Date(toDate);
      }
    }
    
    const bookings = await Booking.find(query)
      .populate('userId', 'name email phoneNo')
      .populate('providerId', 'name email phoneNo services')
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: error.message
    });
  }
};

// Get a booking by ID
export const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id)
      .populate('userId', 'name email phoneNo')
      .populate('providerId', 'name email phoneNo services');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if user is authorized to access this booking
    if (
      req.user.role !== 'admin' && 
      booking.userId._id.toString() !== req.user._id.toString() && 
      booking.providerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    return res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: error.message
    });
  }
};

// Get user's bookings
export const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, fromDate, toDate } = req.query;
    
    // Check authorization
    if (req.user.role !== 'admin' && userId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    // Build query
    let query = { userId };
    
    if (status) {
      query.status = status;
    }
    
    // Date range filtering
    if (fromDate || toDate) {
      query.createdAt = {};
      
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      
      if (toDate) {
        query.createdAt.$lte = new Date(toDate);
      }
    }
    
    const bookings = await Booking.find(query)
      .populate('providerId', 'name email phoneNo services')
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user bookings',
      error: error.message
    });
  }
};

// Get provider's bookings
export const getProviderBookings = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { status, fromDate, toDate } = req.query;
    
    // Check authorization
    if (req.user.role !== 'admin' && providerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    // Build query
    let query = { providerId };
    
    if (status) {
      query.status = status;
    }
    
    // Date range filtering
    if (fromDate || toDate) {
      query.createdAt = {};
      
      if (fromDate) {
        query.createdAt.$gte = new Date(fromDate);
      }
      
      if (toDate) {
        query.createdAt.$lte = new Date(toDate);
      }
    }
    
    const bookings = await Booking.find(query)
      .populate('userId', 'name email phoneNo')
      .sort({ createdAt: -1 });
    
    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    console.error('Error fetching provider bookings:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching provider bookings',
      error: error.message
    });
  }
};

// Update booking status
export const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actualDuration, materials, notes } = req.body;
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check authorization
    if (
      req.user.role !== 'admin' && 
      booking.userId.toString() !== req.user._id.toString() && 
      booking.providerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    // Validate status transitions
    const validStatusTransitions = {
      'pending': ['accepted', 'declined'],
      'accepted': ['in-progress', 'cancelled'],
      'in-progress': ['completed'],
      'completed': ['paid'],
      'paid': ['reviewed']
    };
    
    if (
      status && 
      booking.status !== status && 
      (!validStatusTransitions[booking.status] || !validStatusTransitions[booking.status].includes(status))
    ) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${booking.status} to ${status}`
      });
    }
    
    // Update booking fields
    if (status) booking.status = status;
    
    // If the booking is completed, recalculate the charge based on actual duration
    if (status === 'completed' && actualDuration) {
      const charge = calculateBookingCharge(actualDuration);
      booking.charge = charge;
      booking.actualDuration = actualDuration;
    }
    
    // Add materials used if provided
    if (materials && Array.isArray(materials)) {
      booking.materials = materials;
      
      // Calculate total materials cost
      const materialsCost = materials.reduce((sum, item) => sum + (item.cost || 0), 0);
      booking.materialsCost = materialsCost;
      
      // Update total charge
      booking.totalCharge = booking.charge + materialsCost;
    }
    
    // Add notes if provided
    if (notes) {
      booking.notes = booking.notes || [];
      booking.notes.push({
        text: notes,
        createdBy: req.user._id,
        createdAt: new Date()
      });
    }
    
    // Save the updated booking
    await booking.save();
    
    // Populate user and provider details for response
    const updatedBooking = await Booking.findById(id)
      .populate('userId', 'name email phoneNo')
      .populate('providerId', 'name email phoneNo services');
    
    return res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating booking status',
      error: error.message
    });
  }
};

// Delete a booking
export const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check authorization - only admin or booking creator can delete
    if (req.user.role !== 'admin' && booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    // Only allow deletion of pending bookings
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending bookings can be deleted'
      });
    }
    
    await Booking.findByIdAndDelete(id);
    
    return res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting booking',
      error: error.message
    });
  }
};

// Rate a booking
export const rateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Only the user who made the booking can rate it
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }
    
    // Can only rate completed bookings
    if (booking.status !== 'completed' && booking.status !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Only completed bookings can be rated'
      });
    }
    
    // Add rating and comment
    booking.rating = rating;
    booking.comment = comment;
    booking.status = 'reviewed';
    
    await booking.save();
    
    return res.status(200).json({
      success: true,
      message: 'Booking rated successfully',
      booking
    });
  } catch (error) {
    console.error('Error rating booking:', error);
    return res.status(500).json({
      success: false,
      message: 'Error rating booking',
      error: error.message
    });
  }
}; 