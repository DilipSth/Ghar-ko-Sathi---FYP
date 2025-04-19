import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authContext';
import { useSocket } from '../../context/useSocket';
import bookingService from '../../services/BookingService';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const ScheduledBooking = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [durationHours, setDurationHours] = useState(1);
  const [description, setDescription] = useState('');
  const [serviceProviders, setServiceProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedService, setSelectedService] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(200); // Minimum charge
  const [bookingHistory, setBookingHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    // Initialize the booking service with socket
    if (socket) {
      bookingService.initialize(socket);
    }
  }, [socket]);

  useEffect(() => {
    // Load booking history when user is available
    if (user?._id) {
      loadUserBookingHistory();
    }
  }, [user, statusFilter]);

  useEffect(() => {
    // Calculate estimated cost when duration changes
    if (selectedService && durationHours > 0) {
      const cost = bookingService.calculateEstimatedPrice(selectedService, durationHours);
      setEstimatedCost(cost);
    }
  }, [selectedService, durationHours]);

  // Fetch available service providers
  const fetchServiceProviders = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/users/serviceProvider', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Only show approved providers
        const approvedProviders = data.serviceProviders.filter(
          provider => provider.approved && provider.role === 'serviceProvider'
        );
        setServiceProviders(approvedProviders);
      }
    } catch (error) {
      console.error('Error fetching service providers:', error);
      toast.error('Failed to load service providers');
    } finally {
      setLoading(false);
    }
  };

  // Load user's booking history
  const loadUserBookingHistory = async () => {
    if (!user?._id) return;
    
    try {
      setHistoryLoading(true);
      
      // Apply filters if needed
      const filters = {};
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      
      const history = await bookingService.getUserBookingHistory(user._id, filters);
      setBookingHistory(history);
    } catch (error) {
      console.error('Error loading booking history:', error);
      toast.error('Failed to load booking history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceProviders();
  }, []);

  // Handle provider selection
  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    
    // If provider offers services, preselect the first one
    if (provider.services && provider.services.length > 0) {
      setSelectedService(provider.services[0]._id);
    } else {
      setSelectedService('');
    }
  };

  // Handle booking creation
  const handleCreateBooking = async () => {
    if (!selectedProvider || !description) {
      toast.error('Please select a service provider and provide a description');
      return;
    }
    
    try {
      setLoading(true);
      
      const bookingData = {
        userId: user._id,
        providerId: selectedProvider._id,
        service: selectedService,
        durationHours,
        description,
        scheduledTime: scheduledDate.toISOString(),
        userLocation: { lat: 27.7172, lng: 85.3238 }, // Default to Kathmandu
        userName: user.name,
        userPhone: user.phoneNo,
        providerName: selectedProvider.name,
        providerPhone: selectedProvider.phoneNo,
      };
      
      const result = await bookingService.createBookingRequest(bookingData);
      
      toast.success('Booking request sent successfully!');
      
      // Reset form
      setDescription('');
      setSelectedProvider(null);
      setScheduledDate(new Date());
      setDurationHours(1);
      
      // Reload booking history
      loadUserBookingHistory();
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error(typeof error === 'string' ? error : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  // Cancel a booking
  const handleCancelBooking = async (bookingId) => {
    try {
      // Here we would implement a cancel booking functionality
      // For now, just show a toast message
      toast.info('Booking cancellation will be available soon');
    } catch (error) {
      toast.error('Failed to cancel booking');
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'completed-by-user': 
      case 'completed-by-provider':
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'paid': return 'bg-indigo-100 text-indigo-800';
      case 'reviewed': return 'bg-teal-100 text-teal-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Schedule a Service</h1>
      
      {/* Booking Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">New Booking</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Service Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Service Provider
            </label>
            <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto">
              {loading ? (
                <div className="animate-pulse bg-gray-100 h-16 rounded"></div>
              ) : serviceProviders.length > 0 ? (
                serviceProviders.map(provider => (
                  <div 
                    key={provider._id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedProvider?._id === provider._id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                    onClick={() => handleProviderSelect(provider)}
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden mr-3">
                        {provider.profileImage ? (
                          <img 
                            src={`http://localhost:8000/public/registerImage/${provider.profileImage}`} 
                            alt={provider.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full text-gray-500">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{provider.name}</h3>
                        <p className="text-sm text-gray-500">
                          {provider.services?.map(s => s.ser_name).join(', ')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-gray-500">No service providers available</div>
              )}
            </div>
          </div>
          
          {/* Booking Details */}
          <div>
            {selectedProvider && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule Date & Time
                  </label>
                  <DatePicker
                    selected={scheduledDate}
                    onChange={date => setScheduledDate(date)}
                    showTimeSelect
                    dateFormat="MMMM d, yyyy h:mm aa"
                    minDate={new Date()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (hours)
                  </label>
                  <select
                    value={durationHours}
                    onChange={e => setDurationHours(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(hour => (
                      <option key={hour} value={hour}>{hour} hour{hour > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description of Issue
                  </label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Please describe what service you need..."
                  ></textarea>
                </div>
                
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <h4 className="font-medium text-blue-800 mb-2">Estimated Cost</h4>
                  <p className="text-2xl font-bold text-blue-900">Rs. {estimatedCost}</p>
                  <p className="text-sm text-blue-600 mt-1">
                    Based on {durationHours} hour{durationHours > 1 ? 's' : ''} of service
                  </p>
                </div>
              </>
            )}
            
            <button
              onClick={handleCreateBooking}
              disabled={loading || !selectedProvider || !description}
              className={`w-full py-2 px-4 rounded-md text-white font-medium 
                ${loading || !selectedProvider || !description
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {loading ? 'Processing...' : 'Schedule Service'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Booking History */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Your Booking History</h2>
          
          {/* Filter dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Bookings</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        {historyLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-md"></div>
            ))}
          </div>
        ) : bookingHistory.length > 0 ? (
          <div className="space-y-4">
            {bookingHistory.map(booking => (
              <div key={booking.bookingId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{booking.providerName || 'Service Provider'}</h3>
                    <p className="text-sm text-gray-500">{booking.service || booking.details?.service}</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">
                      {formatDate(booking.scheduledTime || booking.requestTime)}
                    </p>
                    <p className="font-medium mt-1">
                      Rs. {booking.estimatedPrice || booking.details?.estimatedPrice || '200'}
                    </p>
                  </div>
                </div>
                
                <p className="mt-2 text-sm text-gray-600">
                  {booking.description || booking.details?.description}
                </p>
                
                {booking.status === 'pending' && (
                  <div className="mt-3 flex justify-end">
                    <button 
                      onClick={() => handleCancelBooking(booking.bookingId)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">You don't have any bookings yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduledBooking; 