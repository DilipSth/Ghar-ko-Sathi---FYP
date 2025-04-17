const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceType: {
    type: String,
    required: true
  },
  durationInHours: {
    type: Number,
    required: true,
    min: 0.5
  },
  actualDuration: {
    type: Number,
    min: 0.5
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  charge: {
    type: Number,
    required: true,
    min: 200
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Booking', bookingSchema); 