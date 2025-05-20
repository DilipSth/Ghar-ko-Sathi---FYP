import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';

const ReviewForm = ({ onClose }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [providerId, setProviderId] = useState('');
  const [providerName, setProviderName] = useState('Service Provider');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // Retrieve provider information from localStorage
    const storedProviderId = localStorage.getItem('reviewProviderId');
    const storedProviderName = localStorage.getItem('reviewProviderName');
    const storedBookingId = localStorage.getItem('reviewBookingId');

    if (storedProviderId) {
      setProviderId(storedProviderId);
    }
    if (storedProviderName) {
      setProviderName(storedProviderName);
    }
    if (storedBookingId) {
      setBookingId(storedBookingId);
    }
  }, []);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      toast.warning('Please select a rating');
      return;
    }
    
    if (!comment.trim()) {
      toast.warning('Please provide your review before submitting');
      return;
    }

    if (!providerId) {
      toast.error('Missing service provider information');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const reviewData = {
        providerId,
        providerName,
        rating,
        comment,
        bookingId
      };
      
      console.log("Submitting review data:", reviewData);
      
      const response = await axios.post('/api/reviews', reviewData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.data.success) {
        setIsSubmitted(true);
        
        // Clear the localStorage items
        localStorage.removeItem('showReviewForm');
        localStorage.removeItem('reviewBookingId');
        localStorage.removeItem('reviewProviderId');
        localStorage.removeItem('reviewProviderName');
        
        // Close the review form after 3 seconds
        setTimeout(() => {
          if (onClose) onClose();
        }, 3000);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      toast.error(error.response?.data?.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Clear the localStorage items
    localStorage.removeItem('showReviewForm');
    localStorage.removeItem('reviewBookingId');
    localStorage.removeItem('reviewProviderId');
    localStorage.removeItem('reviewProviderName');
    
    toast.info('You can always leave a review later from your profile');
    
    // Close the review form
    if (onClose) onClose();
  };

  if (isSubmitted) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 max-w-lg mx-auto">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">Your review has been submitted successfully.</p>
          
          <div className="flex justify-center space-x-1 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-6 h-6 ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          
          <p className="text-sm text-gray-500 italic">"{comment}"</p>
          
          <div className="mt-6">
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-lg mx-auto">
      <div className="text-center relative">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Successful</h2>
        <p className="text-gray-600 mb-6">Please rate your experience with {providerName}</p>
        
        <div className="space-y-6">
          <div>
            <p className="text-base font-medium mb-2">Rating</p>
            <div className="flex justify-center space-x-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`transform transition-all duration-200 focus:outline-none ${
                    star <= rating
                      ? "text-yellow-400 scale-110"
                      : "text-gray-300 hover:text-yellow-400 hover:scale-110"
                  }`}
                >
                  <span className="text-3xl">★</span>
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {rating === 0 ? "Select a rating" : `You rated ${rating} star${rating !== 1 ? "s" : ""}`}
            </p>
          </div>
          
          <div>
            <label className="block text-base font-medium mb-2">
              Your Review
            </label>
            <textarea
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-700 resize-none"
              rows="4"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
            />
          </div>
          
          <div className="flex gap-4">
            <button
              onClick={handleSkip}
              className="flex-1 bg-gray-100 text-gray-800 py-2 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center text-sm font-medium"
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Skip
            </button>
            <button
              onClick={handleSubmitReview}
              disabled={rating === 0 || isSubmitting}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center text-sm font-medium ${
                rating > 0 && !isSubmitting
                  ? "bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  Submit Review
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewForm; 