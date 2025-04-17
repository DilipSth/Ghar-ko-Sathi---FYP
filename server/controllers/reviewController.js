const Review = require('../models/Review');

// Submit a new review
exports.submitReview = async (req, res) => {
  try {
    const { providerId, providerName, rating, comment } = req.body;
    const userId = req.user._id;
    const userName = req.user.name;

    // Validate required fields
    if (!rating || !comment) {
      return res.status(400).json({ 
        message: 'Rating and comment are required',
        error: 'Missing required fields'
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ 
        message: 'Rating must be between 1 and 5',
        error: 'Invalid rating'
      });
    }

    const review = new Review({
      userId,
      userName,
      providerId,
      providerName,
      rating,
      comment
    });

    await review.save();
    res.status(201).json({ 
      success: true,
      message: 'Review submitted successfully', 
      review 
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error submitting review', 
      error: error.message 
    });
  }
};

// Get all reviews
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .sort({ timestamp: -1 })
      .limit(50);
    res.json({ 
      success: true,
      reviews 
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching reviews', 
      error: error.message 
    });
  }
};

// Get reviews for a specific provider
exports.getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;
    const reviews = await Review.find({ providerId })
      .sort({ timestamp: -1 });
    res.json({ 
      success: true,
      reviews 
    });
  } catch (error) {
    console.error('Error fetching provider reviews:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching provider reviews', 
      error: error.message 
    });
  }
}; 