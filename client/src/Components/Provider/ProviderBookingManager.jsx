import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/authContext';
import { useSocket } from '../../context/useSocket';
import bookingService from '../../services/BookingService';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const ProviderBookingManager = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const [pendingBookings, setPendingBookings] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [currentTab, setCurrentTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState([{ name: '', cost: 0 }]);
  const [additionalCharge, setAdditionalCharge] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);

  useEffect(() => {
    if (socket) {
      bookingService.initialize(socket);
      registerSocketHandlers();
    }
  }, [socket]);

  useEffect(() => {
    if (user?._id) {
      loadBookings();
    }
  }, [user]);

  // Utility function to extract location query from a booking
  const getLocationQueryFromBooking = (booking) => {
    let locationQuery = '';
    
    // Try different possible location formats
    if (booking.userLocation) {
      if (typeof booking.userLocation === 'string') {
        locationQuery = booking.userLocation;
      } else if (booking.userLocation.lat && booking.userLocation.lng) {
        locationQuery = `${booking.userLocation.lat},${booking.userLocation.lng}`;
      }
    } else if (booking.location) {
      // Try booking.location format
      if (booking.location.address) {
        locationQuery = booking.location.address;
      } else if (booking.location.coordinates && booking.location.coordinates.lat) {
        locationQuery = `${booking.location.coordinates.lat},${booking.location.coordinates.lng}`;
      }
    }
    
    // Default to user's address if available
    if (!locationQuery && booking.userAddress) {
      locationQuery = booking.userAddress;
    }
    
    return locationQuery;
  };
  
  // Open Google Maps with user's location
  const navigateToUserLocation = (booking) => {
    const locationQuery = getLocationQueryFromBooking(booking);
    
    // If we don't have a location, show an error
    if (!locationQuery) {
      toast.error('User location not available');
      return;
    }
    
    const encodedAddress = encodeURIComponent(locationQuery);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const registerSocketHandlers = () => {
    // Setup socket event handlers for real-time updates
    const handlers = {
      newBookingRequest: (booking) => {
        toast.info(`New booking request from ${booking.userName || 'a user'}`);
        setPendingBookings(prev => [booking, ...prev]);
      },
      
      bookingConfirmedByUser: (booking) => {
        toast.success('Booking confirmed by user');
        updateBookingStatus(booking);
      },
      
      userCompletedJob: (booking) => {
        toast.info('User marked job as completed');
        updateBookingStatus(booking);
      }
    };
    
    bookingService.registerSocketEvents(handlers);

    socket.on("bookingCancelled", (data) => {
      console.log("Booking cancelled:", data);
      
      // Show notification when booking is cancelled by user
      toast.info(data.message, {
        duration: 5000,
        icon: '❌',
        style: {
          borderRadius: '10px',
          background: '#FF4B4B',
          color: '#fff',
        },
      });
      
      if (data.reason) {
        toast.info(`Reason: ${data.reason}`, {
          duration: 5000,
          style: {
            borderRadius: '10px',
            background: '#4A5568',
            color: '#fff',
          },
        });
      }
      
      // Remove the cancelled booking from the list
      setPendingBookings(prev => prev.filter(b => b.bookingId !== data.bookingId));
      setActiveBookings(prev => prev.filter(b => b.bookingId !== data.bookingId));
      loadBookings(); // Refresh the booking lists
    });

    socket.on("bookingCancellationConfirmed", (data) => {
      console.log("Booking cancellation confirmed:", data);
      
      toast.success(data.message, {
        duration: 5000,
        icon: '✔️',
        style: {
          borderRadius: '10px',
          background: '#48BB78',
          color: '#fff',
        },
      });
      
      // Remove the cancelled booking from the list
      setPendingBookings(prev => prev.filter(b => b.bookingId !== data.bookingId));
      setActiveBookings(prev => prev.filter(b => b.bookingId !== data.bookingId));
      loadBookings(); // Refresh the booking lists
    });
  };

  const loadBookings = async () => {
    if (!user?._id) return;
    
    try {
      setLoading(true);
      
      // Load provider's booking history
      const bookings = await bookingService.getProviderServiceHistory(user._id);
      
      // Split bookings by status for different tabs
      const pending = bookings.filter(b => 
        b.status === 'pending'
      );
      
      const active = bookings.filter(b => 
        ['accepted', 'confirmed', 'in-progress'].includes(b.status)
      );
      
      const history = bookings.filter(b => 
        ['completed-by-user', 'completed-by-provider', 'completed', 'declined', 'paid', 'reviewed'].includes(b.status)
      );
      
      setPendingBookings(pending);
      setActiveBookings(active);
      setHistoryBookings(history);
      
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };
  
  const updateBookingStatus = (updatedBooking) => {
    // Helper to update booking in the correct list
    const updateList = (list, update) => {
      return list.map(booking => 
        booking.bookingId === updatedBooking.bookingId ? update : booking
      );
    };
    
    // Remove from current list
    if (['pending'].includes(updatedBooking.status)) {
      setPendingBookings(prev => prev.filter(b => b.bookingId !== updatedBooking.bookingId));
    } else if (['accepted', 'confirmed', 'in-progress'].includes(updatedBooking.status)) {
      setActiveBookings(prev => prev.filter(b => b.bookingId !== updatedBooking.bookingId));
    }
    
    // Add to appropriate list
    if (['pending'].includes(updatedBooking.status)) {
      setPendingBookings(prev => [updatedBooking, ...prev]);
    } else if (['accepted', 'confirmed', 'in-progress'].includes(updatedBooking.status)) {
      setActiveBookings(prev => [updatedBooking, ...prev]);
    } else {
      setHistoryBookings(prev => [updatedBooking, ...prev]);
    }
  };
  
  const acceptBooking = async (booking) => {
    try {
      if (!booking.bookingId) {
        toast.error('Invalid booking');
        return;
      }
      
      const currentLocation = { lat: 27.7172, lng: 85.3238 }; // Default or get from geolocation
      const distance = bookingService.calculateDistance(
        currentLocation.lat, 
        currentLocation.lng,
        booking.userLocation?.lat || currentLocation.lat, 
        booking.userLocation?.lng || currentLocation.lng
      );
      
      const eta = bookingService.calculateETA(distance);
      
      await bookingService.acceptBookingRequest(booking.bookingId, {
        location: currentLocation,
        eta: eta
      });
      
      toast.success('Booking accepted');
      
      // Update booking in UI
      const updatedBooking = {...booking, status: 'accepted'};
      updateBookingStatus(updatedBooking);
      
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast.error('Failed to accept booking');
    }
  };
  
  const declineBooking = async (booking) => {
    try {
      await bookingService.declineBookingRequest(booking.bookingId, 'Provider not available');
      toast.info('Booking declined');
      
      // Update booking in UI
      const updatedBooking = {...booking, status: 'declined'};
      updateBookingStatus(updatedBooking);
      
    } catch (error) {
      console.error('Error declining booking:', error);
      toast.error('Failed to decline booking');
    }
  };
  
  const startJob = async (booking) => {
    try {
      await bookingService.startJob(booking.bookingId);
      toast.success('Job started');
      
      // Update booking in UI
      const updatedBooking = {...booking, status: 'in-progress'};
      updateBookingStatus(updatedBooking);
      
    } catch (error) {
      console.error('Error starting job:', error);
      toast.error('Failed to start job');
    }
  };
  
  const completeJob = (booking) => {
    // Preset materials if they exist in the booking
    if (booking.maintenanceDetails?.materials && booking.maintenanceDetails.materials.length > 0) {
      setMaterials(booking.maintenanceDetails.materials);
    } else {
      setMaterials([{ name: '', cost: 0 }]);
    }
    
    // Preset additional charge if it exists
    if (booking.maintenanceDetails?.additionalCharge) {
      setAdditionalCharge(booking.maintenanceDetails.additionalCharge);
    } else {
      setAdditionalCharge(40); // Default additional charge
    }
    
    setSelectedBooking(booking);
    setShowMaterialModal(true);
  };
  
  const handleMaterialChange = (index, field, value) => {
    const updatedMaterials = [...materials];
    updatedMaterials[index][field] = field === 'cost' ? parseFloat(value) || 0 : value;
    setMaterials(updatedMaterials);
  };
  
  const addMaterial = () => {
    setMaterials([...materials, { name: '', cost: 0 }]);
  };
  
  const removeMaterial = (index) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };
  
  const submitJobCompletion = async () => {
    try {
      if (!selectedBooking || !socket) return;
      
      // Filter out empty materials
      const validMaterials = materials.filter(m => m.name && m.cost > 0);
      
      // Calculate total materials cost
      const materialsCost = validMaterials.reduce((sum, item) => sum + (item.cost || 0), 0);
      
      // Calculate duration (default to scheduled duration or 1 hour)
      const durationHours = selectedBooking.durationHours || 1;
      
      // Calculate base service charge
      const serviceCharge = bookingService.calculateEstimatedPrice(
        selectedBooking.service, 
        durationHours
      );
      
      // Get additional charges from state
      const additionalChargeValue = parseFloat(additionalCharge) || 0;
      
      // Calculate total charge
      const totalCharge = serviceCharge + materialsCost + additionalChargeValue;
      
      // First, update the maintenance details via socket
      const maintenanceDetails = {
        bookingId: selectedBooking.bookingId,
        jobDuration: durationHours,
        hourlyRate: 200, // Base hourly rate
        hourlyCharge: serviceCharge,
        materials: validMaterials,
        materialCost: materialsCost,
        additionalCharge: additionalChargeValue,
        maintenancePrice: totalCharge,
        maintenanceNotes: "Service completed by provider"
      };
      
      console.log("Sending maintenance details:", maintenanceDetails);
      socket.emit("updateMaintenanceDetails", maintenanceDetails);
      
      // Wait a moment for the maintenance details to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Then mark the job as complete
      await bookingService.completeJobByProvider(selectedBooking.bookingId, {
        duration: durationHours,
        materials: validMaterials,
        materialCost: materialsCost,
        additionalCharge: additionalChargeValue,
        totalCharge: totalCharge
      });
      
      toast.success('Job marked as completed');
      
      // Update booking in UI with the maintenance details
      const updatedBooking = {
        ...selectedBooking, 
        status: 'completed-by-provider',
        totalCharge,
        maintenanceDetails: {
          jobDuration: durationHours,
          hourlyRate: 200,
          hourlyCharge: serviceCharge,
          materials: validMaterials,
          materialCost: materialsCost,
          additionalCharge: additionalChargeValue,
          maintenancePrice: totalCharge
        }
      };
      
      updateBookingStatus(updatedBooking);
      
      // Reset form
      setShowMaterialModal(false);
      setSelectedBooking(null);
      setMaterials([{ name: '', cost: 0 }]);
      setAdditionalCharge(0);
      
    } catch (error) {
      console.error('Error completing job:', error);
      toast.error('Failed to complete job: ' + (error.message || 'Unknown error'));
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-indigo-100 text-indigo-800';
      case 'completed-by-user': 
      case 'completed-by-provider':
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'reviewed': return 'bg-teal-100 text-teal-800';
      case 'declined': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Booking Management</h1>
      
      {/* Tabs */}
      <div className="flex border-b mb-6">
        <button
          className={`px-4 py-2 font-medium ${
            currentTab === 'pending'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setCurrentTab('pending')}
        >
          Pending Requests
          {pendingBookings.length > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded-full">
              {pendingBookings.length}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            currentTab === 'active'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setCurrentTab('active')}
        >
          Active Jobs
          {activeBookings.length > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-green-500 text-white rounded-full">
              {activeBookings.length}
            </span>
          )}
        </button>
        <button
          className={`px-4 py-2 font-medium ${
            currentTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setCurrentTab('history')}
        >
          History
        </button>
      </div>
      
      {/* Content based on selected tab */}
      <div className="bg-white rounded-lg shadow p-6">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 rounded-md"></div>
            ))}
          </div>
        ) : (
          <>
            {/* Pending Requests */}
            {currentTab === 'pending' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Pending Requests</h2>
                {pendingBookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No pending booking requests</p>
                ) : (
                  <div className="space-y-4">
                    {pendingBookings.map(booking => (
                      <div key={booking.bookingId} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{booking.userName || 'Client'}</h3>
                            <p className="text-sm text-gray-600">
                              {booking.service || booking.details?.service || 'Service'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Phone:</span> {booking.userPhone || 'N/A'}
                            </p>
                            <div className="mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                {booking.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              Requested: {formatDate(booking.requestTime)}
                            </p>
                            <p className="text-sm text-gray-500">
                              Scheduled: {formatDate(booking.scheduledTime)}
                            </p>
                            <p className="font-medium mt-1">
                              Rs. {booking.estimatedPrice || 200}
                            </p>
                          </div>
                        </div>
                        
                        <p className="mt-2 text-sm text-gray-600">
                          {booking.description}
                        </p>
                        
                        <div className="mt-4 flex justify-end space-x-3">
                          <button
                            onClick={() => declineBooking(booking)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => acceptBooking(booking)}
                            className="px-3 py-1 text-sm bg-blue-600 rounded-md text-white hover:bg-blue-700"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Active Jobs */}
            {currentTab === 'active' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Active Jobs</h2>
                {activeBookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No active jobs</p>
                ) : (
                  <div className="space-y-4">
                    {activeBookings.map(booking => (
                      <div key={booking.bookingId} className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{booking.userName || 'Client'}</h3>
                            <p className="text-sm text-gray-600">
                              {booking.service || booking.details?.service || 'Service'}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                              <span className="font-medium">Phone:</span> {booking.userPhone || 'N/A'}
                            </p>
                            <div className="mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                {booking.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              Scheduled: {formatDate(booking.scheduledTime)}
                            </p>
                            <p className="font-medium mt-1">
                              Est. Rs. {booking.estimatedPrice || 200}
                            </p>
                          </div>
                        </div>
                        
                        <p className="mt-2 text-sm text-gray-600">
                          {booking.description}
                        </p>
                        
                        <div className="mt-4 flex justify-end space-x-3">
                          {booking.status === 'accepted' && (
                            <>
                              <button
                                onClick={() => navigateToUserLocation(booking)}
                                className="px-3 py-1 text-sm bg-indigo-600 rounded-md text-white hover:bg-indigo-700 flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Navigate
                              </button>
                              <button
                                onClick={() => navigate(`/provider/booking/${booking.bookingId}`, { state: { booking } })}
                                className="px-3 py-1 text-sm bg-blue-600 rounded-md text-white hover:bg-blue-700"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => startJob(booking)}
                                className="px-3 py-1 text-sm bg-green-600 rounded-md text-white hover:bg-green-700"
                              >
                                Start Job
                              </button>
                            </>
                          )}
                          
                          {booking.status === 'in-progress' && (
                            <>
                              <button
                                onClick={() => navigateToUserLocation(booking)}
                                className="px-3 py-1 text-sm bg-indigo-600 rounded-md text-white hover:bg-indigo-700 flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Navigate
                              </button>
                              <button
                                onClick={() => navigate(`/provider/booking/${booking.bookingId}`, { state: { booking } })}
                                className="px-3 py-1 text-sm bg-blue-600 rounded-md text-white hover:bg-blue-700"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => completeJob(booking)}
                                className="px-3 py-1 text-sm bg-purple-600 rounded-md text-white hover:bg-purple-700"
                              >
                                Complete Job
                              </button>
                            </>
                          )}
                          
                          {booking.status === 'confirmed' && (
                            <>
                              <button
                                onClick={() => navigateToUserLocation(booking)}
                                className="px-3 py-1 text-sm bg-indigo-600 rounded-md text-white hover:bg-indigo-700 flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Navigate
                              </button>
                              <button
                                onClick={() => navigate(`/provider/booking/${booking.bookingId}`, { state: { booking } })}
                                className="px-3 py-1 text-sm bg-blue-600 rounded-md text-white hover:bg-blue-700"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => startJob(booking)}
                                className="px-3 py-1 text-sm bg-green-600 rounded-md text-white hover:bg-green-700"
                              >
                                Start Job
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* History */}
            {currentTab === 'history' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Booking History</h2>
                {historyBookings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No booking history</p>
                ) : (
                  <div className="space-y-4">
                    {historyBookings.map(booking => (
                      <div key={booking.bookingId} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{booking.userName || 'Client'}</h3>
                            <p className="text-sm text-gray-600">
                              {booking.service || booking.details?.service || 'Service'}
                            </p>
                            <div className="mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                                {booking.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">
                              {formatDate(booking.scheduledTime)}
                            </p>
                            <p className="font-medium mt-1">
                              Rs. {booking.totalCharge || booking.estimatedPrice || 200}
                            </p>
                            {booking.rating && (
                              <div className="flex items-center justify-end mt-1">
                                <span className="text-sm text-gray-600 mr-1">Rating:</span>
                                <div className="flex">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <svg
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= booking.rating
                                          ? 'text-yellow-500'
                                          : 'text-gray-300'
                                      }`}
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {booking.comment && (
                          <p className="mt-2 text-sm text-gray-600 italic">
                            "{booking.comment}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Material Modal */}
      {showMaterialModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Complete Job</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Materials Used (Optional)
              </label>
              
              {materials.map((material, index) => (
                <div key={index} className="flex items-center mb-2">
                  <input
                    type="text"
                    placeholder="Material name"
                    value={material.name}
                    onChange={(e) => handleMaterialChange(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md mr-2"
                  />
                  <input
                    type="number"
                    placeholder="Cost"
                    value={material.cost}
                    onChange={(e) => handleMaterialChange(index, 'cost', e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md mr-2"
                  />
                  <button
                    type="button"
                    onClick={() => removeMaterial(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addMaterial}
                className="text-sm text-blue-600 hover:text-blue-800 mt-2"
              >
                + Add Material
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Charges (Rs)
              </label>
              <input
                type="number"
                value={additionalCharge}
                onChange={(e) => setAdditionalCharge(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            
            <div className="flex justify-end mt-6 space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowMaterialModal(false);
                  setSelectedBooking(null);
                  setMaterials([{ name: '', cost: 0 }]);
                  setAdditionalCharge(0);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitJobCompletion}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Complete Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderBookingManager; 