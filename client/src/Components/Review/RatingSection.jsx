import React from 'react';

const RatingSection = ({ rating, setRating, comment, setComment, onSubmit, onSkip }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center animate-bounce">
            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Payment Successful</h3>
          <p className="text-base text-gray-600 mt-1">
            Please rate your experience
          </p>
        </div>
        <div className="max-w-md mx-auto space-y-4">
          <div>
            <p className="text-base font-medium mb-2">Rating</p>
            <div className="flex justify-center space-x-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`transform transition-all duration-200 ${
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-700 text-sm resize-none"
              rows="3"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              className="flex-1 bg-gray-100 text-gray-800 py-2 rounded-lg hover:bg-gray-200 transition-all flex items-center justify-center text-sm font-medium"
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Skip
            </button>
            <button
              onClick={onSubmit}
              disabled={rating === 0}
              className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center text-sm font-medium ${
                rating > 0
                  ? "bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Submit Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingSection; 