import axios from 'axios';

/**
 * BookingService - A comprehensive service for managing bookings
 * 
 * Features:
 * - Persistent booking history
 * - Scheduled bookings
 * - Better pricing model
 * - Estimated time calculations
 * - Location tracking
 * - Service provider matching
 */
class BookingService {
  constructor() {
    this.socket = null;
    this.API_URL = 'http://localhost:8000/api';
    this.bookingCache = new Map(); // Local cache for faster access
  }

  // Initialize with socket connection
  initialize(socket) {
    this.socket = socket;
    this.loadBookingsFromLocalStorage();
    return this;
  }
  
  // Socket Event Registration
  registerSocketEvents(callbacks) {
    if (!this.socket) {
      console.error('Socket not initialized');
      return;
    }
    
    // Register all socket event listeners with provided callbacks
    const events = [
      'newBookingRequest',
      'bookingConfirmed',
      'bookingConfirmedByUser',
      'problemDescriptionReceived',
      'jobStartedSuccess',
      'userCompletedJob',
      'jobCompleted',
      'reviewReceived',
      'bookingAccepted',
      'bookingDeclined'
    ];
    
    events.forEach(event => {
      if (callbacks[event]) {
        this.socket.on(event, callbacks[event]);
      }
    });
    
    return this;
  }
  
  // User-side Methods
  
  /**
   * Create a new booking request
   * @param {Object} bookingData - Booking information
   * @returns {Promise} - Promise with booking result
   */
  createBookingRequest(bookingData) {
    if (!this.socket) {
      return Promise.reject('Socket not available');
    }
    
    // Add additional booking information
    const enhancedBookingData = {
      ...bookingData,
      requestTime: new Date().toISOString(),
      status: 'pending',
      bookingId: this.generateBookingId(bookingData.userId, bookingData.providerId),
      estimatedPrice: this.calculateEstimatedPrice(bookingData.service, bookingData.durationHours || 1),
      scheduledTime: bookingData.scheduledTime || new Date().toISOString()
    };
    
    // Save to cache immediately for responsiveness
    this.saveBookingToCache(enhancedBookingData);
    
    return new Promise((resolve, reject) => {
      // Set timeout for responsiveness
      const timeoutId = setTimeout(() => {
        reject('Request timed out. Please try again.');
      }, 10000);
      
      // Send booking request via socket
      this.socket.emit('sendBookingRequest', enhancedBookingData);
      
      // Return the booking data immediately, socket will handle real-time updates
      clearTimeout(timeoutId);
      resolve(enhancedBookingData);
    });
  }

  /**
   * Confirm a booking (user accepts provider's acceptance)
   * @param {String} bookingId - ID of booking to confirm
   */
  confirmBooking(bookingId) {
    if (!this.socket) {
      return Promise.reject('Socket not available');
    }
    
    // Update local status immediately for responsive UI
    this.updateBookingStatus(bookingId, 'confirmed');
    
    // Emit socket event
    this.socket.emit('confirmBooking', { bookingId });
    return Promise.resolve({ success: true, bookingId });
  }
  
  /**
   * Mark job as completed by user
   * @param {String} bookingId - ID of the booking
   */
  completeJobByUser(bookingId) {
    if (!this.socket) {
      return Promise.reject('Socket not available');
    }
    
    this.updateBookingStatus(bookingId, 'completed-by-user');
    this.socket.emit('completeJob', { bookingId, completedBy: 'user' });
    return Promise.resolve({ success: true, bookingId });
  }
  
  /**
   * Submit payment for a completed job
   * @param {String} bookingId - ID of booking
   * @param {Number} amount - Payment amount
   */
  submitPayment(bookingId, amount) {
    if (!this.socket) {
      return Promise.reject('Socket not available');
    }
    
    this.updateBookingStatus(bookingId, 'paid');
    this.socket.emit('submitPayment', { bookingId, amount });
    return Promise.resolve({ success: true, bookingId, amount });
  }
  
  /**
   * Submit review for a completed service
   * @param {String} bookingId - ID of booking
   * @param {Number} rating - Rating (1-5)
   * @param {String} comment - Review comment
   */
  submitReview(bookingId, rating, comment) {
    if (!this.socket) {
      return Promise.reject('Socket not available');
    }
    
    if (rating < 1 || rating > 5) {
      return Promise.reject('Invalid rating. Must be between 1 and 5.');
    }
    
    this.updateBookingStatus(bookingId, 'reviewed');
    this.socket.emit('submitReview', { bookingId, rating, comment });
    return Promise.resolve({ success: true, bookingId, rating });
  }
  
  /**
   * Get the booking history for a user
   * @param {String} userId - User ID
   * @param {Object} filters - Optional filters (status, date range, etc.)
   * @returns {Promise} - Promise with booking history
   */
  getUserBookingHistory(userId, filters = {}) {
    return axios.get(`${this.API_URL}/bookings/user/${userId}`, { params: filters })
      .then(response => {
        if (response.data.success) {
          // Update local cache with the latest data
          response.data.bookings.forEach(booking => {
            this.saveBookingToCache(booking);
          });
          return response.data.bookings;
        }
        return [];
      })
      .catch(error => {
        console.error('Error fetching booking history:', error);
        
        // Fall back to cached data if available
        const cachedBookings = this.getBookingsFromCache().filter(booking => 
          booking.userId === userId && this.matchesFilters(booking, filters)
        );
        
        if (cachedBookings.length > 0) {
          return cachedBookings;
        }
        
        throw error;
      });
  }
  
  // Service Provider Methods
  
  /**
   * Accept a booking request (service provider)
   * @param {String} bookingId - ID of booking to accept
   * @param {Object} providerInfo - Additional provider information
   */
  acceptBookingRequest(bookingId, providerInfo = {}) {
    if (!this.socket) {
      return Promise.reject('Socket not available');
    }
    
    this.updateBookingStatus(bookingId, 'accepted');
    
    const acceptData = { 
      bookingId,
      providerLocation: providerInfo.location,
      estimatedArrival: providerInfo.eta
    };
    
    this.socket.emit('acceptBooking', acceptData);
    return Promise.resolve({ success: true, bookingId });
  }
  
  /**
   * Decline a booking request (service provider)
   * @param {String} bookingId - ID of booking to decline
   * @param {String} reason - Optional reason for declining
   */
  declineBookingRequest(bookingId, reason = '') {
    if (!this.socket) {
      return Promise.reject('Socket not available');
    }
    
    this.updateBookingStatus(bookingId, 'declined');
    this.socket.emit('declineBooking', { bookingId, reason });
    return Promise.resolve({ success: true, bookingId });
  }
  
  /**
   * Start a job (service provider)
   * @param {String} bookingId - ID of booking
   */
  startJob(bookingId) {
    if (!this.socket) {
      return Promise.reject('Socket not available');
    }
    
    this.updateBookingStatus(bookingId, 'in-progress');
    this.socket.emit('startJob', { 
      bookingId,
      startTime: new Date().toISOString()
    });
    return Promise.resolve({ success: true, bookingId });
  }
  
  /**
   * Complete a job (service provider)
   * @param {String} bookingId - ID of booking
   * @param {Object} jobDetails - Job completion details (duration, materials, etc.)
   */
  completeJobByProvider(bookingId, jobDetails = {}) {
    if (!this.socket) {
      return Promise.reject('Socket not available');
    }
    
    this.updateBookingStatus(bookingId, 'completed-by-provider');
    
    const completion = {
      bookingId,
      completedBy: 'provider',
      endTime: new Date().toISOString(),
      jobDuration: jobDetails.duration || 1,
      totalCharge: jobDetails.totalCharge,
      materials: jobDetails.materials || []
    };
    
    this.socket.emit('completeJob', completion);
    return Promise.resolve({ success: true, bookingId });
  }
  
  /**
   * Get the service history for a provider
   * @param {String} providerId - Provider ID
   * @param {Object} filters - Optional filters
   * @returns {Promise} - Promise with service history
   */
  getProviderServiceHistory(providerId, filters = {}) {
    return axios.get(`${this.API_URL}/bookings/provider/${providerId}`, { params: filters })
      .then(response => {
        if (response.data.success) {
          // Update local cache
          response.data.bookings.forEach(booking => {
            this.saveBookingToCache(booking);
          });
          return response.data.bookings;
        }
        return [];
      })
      .catch(error => {
        console.error('Error fetching provider history:', error);
        
        // Fall back to cached data
        const cachedBookings = this.getBookingsFromCache().filter(booking => 
          booking.providerId === providerId && this.matchesFilters(booking, filters)
        );
        
        if (cachedBookings.length > 0) {
          return cachedBookings;
        }
        
        throw error;
      });
  }
  
  // Utility Methods
  
  /**
   * Generate a unique booking ID
   */
  generateBookingId(userId, providerId) {
    return `${userId}-${providerId}-${Date.now()}`;
  }
  
  /**
   * Calculate estimated price based on service type and duration
   * @param {String} serviceType - Type of service
   * @param {Number} duration - Duration in hours
   * @returns {Number} - Estimated price
   */
  calculateEstimatedPrice(serviceType, duration = 1) {
    // Base rate is 200 per hour
    const baseRate = 200;
    
    // Minimum charge of 200 for first hour
    if (duration <= 1) {
      return baseRate;
    }
    
    // For durations longer than 1 hour, charge minimum for first hour
    // and then charge per hour for remaining time
    const remainingHours = duration - 1;
    const remainingCharge = Math.ceil(remainingHours) * baseRate;
    return baseRate + remainingCharge;
  }
  
  /**
   * Calculate ETA based on distance
   * @param {Number} distanceInKm - Distance in kilometers
   * @returns {Number} - ETA in minutes
   */
  calculateETA(distanceInKm) {
    // Assuming average speed of 30 km/h in city traffic
    return Math.ceil(distanceInKm * (60 / 30));
  }
  
  /**
   * Calculate distance between two points
   * @param {Number} lat1 - Latitude of point 1
   * @param {Number} lon1 - Longitude of point 1
   * @param {Number} lat2 - Latitude of point 2
   * @param {Number} lon2 - Longitude of point 2
   * @returns {Number} - Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  }
  
  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }
  
  // Cache Management
  
  saveBookingToCache(booking) {
    this.bookingCache.set(booking.bookingId, booking);
    this.persistBookings();
  }
  
  updateBookingStatus(bookingId, status) {
    const booking = this.bookingCache.get(bookingId);
    if (booking) {
      booking.status = status;
      booking.updatedAt = new Date().toISOString();
      this.saveBookingToCache(booking);
    }
  }
  
  getBookingsFromCache() {
    return Array.from(this.bookingCache.values());
  }
  
  matchesFilters(booking, filters) {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }
    
    let matches = true;
    
    if (filters.status && booking.status !== filters.status) {
      matches = false;
    }
    
    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      const bookingDate = new Date(booking.requestTime);
      if (bookingDate < fromDate) {
        matches = false;
      }
    }
    
    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      const bookingDate = new Date(booking.requestTime);
      if (bookingDate > toDate) {
        matches = false;
      }
    }
    
    return matches;
  }
  
  // Local Storage Management
  
  persistBookings() {
    try {
      const bookings = this.getBookingsFromCache();
      localStorage.setItem('bookings', JSON.stringify(bookings));
    } catch (error) {
      console.error('Error saving bookings to localStorage:', error);
    }
  }
  
  loadBookingsFromLocalStorage() {
    try {
      const bookingsJson = localStorage.getItem('bookings');
      if (bookingsJson) {
        const bookings = JSON.parse(bookingsJson);
        bookings.forEach(booking => {
          this.bookingCache.set(booking.bookingId, booking);
        });
      }
    } catch (error) {
      console.error('Error loading bookings from localStorage:', error);
    }
  }

  /**
   * Get booking details by ID
   * @param {String} bookingId - Booking ID
   * @returns {Promise} - Promise with booking details
   */
  getBookingById(bookingId) {
    // If we have it in cache, return it first for faster UI
    const cachedBooking = this.bookingCache.get(bookingId);
    
    // Make API call to get latest data
    return axios.get(`${this.API_URL}/bookings/${bookingId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(response => {
        if (response.data.success) {
          const booking = response.data.booking;
          // Update cache with the latest data
          this.saveBookingToCache(booking);
          return booking;
        }
        throw new Error('Booking not found');
      })
      .catch(error => {
        console.error('Error fetching booking details:', error);
        
        // Fall back to cached data if available
        if (cachedBooking) {
          console.log('Using cached booking data');
          return cachedBooking;
        }
        
        throw error;
      });
  }

  /**
   * Cancel a booking (can be called by either user or service provider)
   * @param {String} bookingId - ID of booking to cancel
   * @param {String} reason - Reason for cancellation
   * @param {String} cancelledBy - Either 'user' or 'provider'
   */
  cancelBooking(bookingId, reason = '', cancelledBy = 'user') {
    if (!this.socket) {
      return Promise.reject('Socket not available');
    }
    
    this.updateBookingStatus(bookingId, 'cancelled');
    
    const cancelData = {
      bookingId,
      reason,
      cancelledBy,
      cancelTime: new Date().toISOString()
    };
    
    this.socket.emit('cancelBooking', cancelData);
    return Promise.resolve({ success: true, bookingId });
  }
}

// Export singleton instance
const bookingService = new BookingService();
export default bookingService; 