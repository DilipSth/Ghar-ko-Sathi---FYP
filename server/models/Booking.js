import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServiceProvider',
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
  scheduledTime: {
    type: Date
  },
  location: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  description: {
    type: String
  },
  charge: {
    type: Number,
    required: true,
    min: 200
  },
  materialsCost: {
    type: Number,
    default: 0
  },
  totalCharge: {
    type: Number
  },
  materials: [{
    name: String,
    cost: Number
  }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'confirmed', 'in-progress', 'completed', 'completed-by-user', 'completed-by-provider', 'paid', 'reviewed', 'cancelled', 'declined'],
    default: 'pending'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  comment: {
    type: String
  },
  notes: [{
    text: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to set updatedAt on every save
bookingSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Set total charge if not explicitly set
  if (!this.totalCharge && this.charge) {
    const materialsCost = this.materialsCost || 0;
    this.totalCharge = this.charge + materialsCost;
  }
  
  next();
});

// Method to calculate the booking charge
bookingSchema.methods.calculateCharge = function() {
  const MINIMUM_CHARGE = 200;
  const HOURLY_RATE = 200;
  
  const duration = this.actualDuration || this.durationInHours;
  
  // If duration is less than 1 hour, charge minimum
  if (duration <= 1) {
    return MINIMUM_CHARGE;
  }
  
  // For durations longer than 1 hour, charge minimum for first hour
  // and then charge per hour for remaining time
  const remainingHours = duration - 1;
  const remainingCharge = Math.ceil(remainingHours) * HOURLY_RATE;
  return MINIMUM_CHARGE + remainingCharge;
};

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking; 