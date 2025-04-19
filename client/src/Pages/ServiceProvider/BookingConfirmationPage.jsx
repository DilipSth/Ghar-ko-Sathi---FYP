import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { SocketContext } from '../../context/SocketContext';
import bookingService from '../../services/BookingService';
import { BookingDetailsMap } from '../../Components';
import { toast } from 'react-toastify';

const BookingConfirmationPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { socket } = useContext(SocketContext);
  
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!location.state?.booking);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (socket) {
      bookingService.initialize(socket);
    }
  }, [socket]);

  useEffect(() => {
    if (!booking && bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId, booking]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      // Fetch booking details from API or use socket to get latest data
      const bookingDetails = await bookingService.getBookingById(bookingId);
      
      if (!bookingDetails) {
        setError('Booking not found');
        return;
      }
      
      setBooking(bookingDetails);
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError('Failed to load booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = async () => {
    try {
      if (!booking || !booking.bookingId) {
        toast.error('Invalid booking');
        return;
      }
      
      await bookingService.startJob(booking.bookingId);
      toast.success('Job started successfully');
      
      // Redirect to active jobs or update UI
      navigate('/provider/bookings', { state: { activeTab: 'active' } });
    } catch (error) {
      console.error('Error starting job:', error);
      toast.error('Failed to start job');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={() => navigate('/provider/bookings')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <button 
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>
      
      <BookingDetailsMap 
        booking={booking} 
        onStartJob={handleStartJob} 
      />
    </div>
  );
};

export default BookingConfirmationPage; 