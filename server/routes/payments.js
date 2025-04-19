import express from 'express';
import {
  initiateEsewaPayment,
  handleEsewaSuccess,
  handleEsewaFailure,
  markBookingAsCashPayment,
  getPaymentStatus
} from '../controllers/paymentController.js';
import verifyUser from '../middleware/authMiddleware.js';

const router = express.Router();

// Initiate eSewa payment
router.post('/esewa/initiate', verifyUser, initiateEsewaPayment);

// Handle eSewa payment callbacks
router.get('/esewa/success', handleEsewaSuccess);
router.get('/esewa/failure', handleEsewaFailure);

// Mark booking as paid by cash
router.post('/cash/complete', verifyUser, markBookingAsCashPayment);

// Get payment status for a booking
router.get('/status/:bookingId', verifyUser, getPaymentStatus);

export default router; 