const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const auth = require('../middleware/auth');

// Submit a new review (requires authentication)
router.post('/', auth, reviewController.submitReview);

// Get all reviews (public)
router.get('/', reviewController.getAllReviews);

// Get reviews for a specific provider (public)
router.get('/provider/:providerId', reviewController.getProviderReviews);

module.exports = router; 