import { useState, useEffect } from 'react';
import axios from 'axios';
import { FaStar } from 'react-icons/fa';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newReview, setNewReview] = useState({
    providerId: '',
    providerName: '',
    rating: 0,
    comment: ''
  });
  const [hover, setHover] = useState(null);
  const [showRatingError, setShowRatingError] = useState(false);
  const [showCommentError, setShowCommentError] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/reviews', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setReviews(response.data.reviews);
      setLoading(false);
    } catch {
      setError('Failed to fetch reviews');
      setLoading(false);
    }
  };

  const handleRatingClick = (ratingValue) => {
    setNewReview({...newReview, rating: ratingValue});
    setShowRatingError(false);
  };

  const handleCommentChange = (e) => {
    setNewReview({...newReview, comment: e.target.value});
    setShowCommentError(false);
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    let hasError = false;

    if (newReview.rating === 0) {
      setShowRatingError(true);
      hasError = true;
    }
    if (!newReview.comment.trim()) {
      setShowCommentError(true);
      hasError = true;
    }

    if (hasError) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:8000/api/reviews',
        newReview,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      if (response.data.success) {
        setReviews([response.data.review, ...reviews]);
        setNewReview({
          providerId: '',
          providerName: '',
          rating: 0,
          comment: ''
        });
        setError(null);
        setShowRatingError(false);
        setShowCommentError(false);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Service Provider Reviews</h2>
      
      {/* Review Form */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h3 className="text-xl font-semibold mb-4">Write a Review</h3>
        <form onSubmit={handleSubmitReview}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating *
            </label>
            <div className="flex space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingClick(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(null)}
                  className="focus:outline-none"
                >
                  <FaStar
                    className="cursor-pointer transition-colors duration-200"
                    color={star <= (hover || newReview.rating) ? "#ffc107" : "#e4e5e9"}
                    size={30}
                  />
                </button>
              ))}
            </div>
            {showRatingError && (
              <p className="text-red-500 text-sm mt-1">Please select a rating</p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Review *
            </label>
            <textarea
              className={`w-full p-2 border rounded-md ${
                showCommentError ? 'border-red-500' : 'border-gray-300'
              }`}
              rows="4"
              value={newReview.comment}
              onChange={handleCommentChange}
              placeholder="Share your experience..."
            />
            {showCommentError && (
              <p className="text-red-500 text-sm mt-1">Please write a review</p>
            )}
          </div>
          
          {error && (
            <div className="text-red-500 mb-4">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Submit Review
          </button>
        </form>
      </div>

      {/* Reviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((review) => (
          <div key={review._id} className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center mb-2">
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FaStar
                    key={star}
                    color={star <= review.rating ? "#ffc107" : "#e4e5e9"}
                    size={20}
                  />
                ))}
              </div>
              <span className="ml-2 text-sm text-gray-500">
                {new Date(review.timestamp).toLocaleDateString()}
              </span>
            </div>
            <p className="text-gray-700 mb-2">{review.comment}</p>
            <div className="text-sm text-gray-500">
              <p>Service Provider: {review.providerName}</p>
              <p>User: {review.userName}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Reviews; 