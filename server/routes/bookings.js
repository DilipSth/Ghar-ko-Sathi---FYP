import express from "express";
import {
  createBooking,
  getBookings,
  getBookingById,
  getUserBookings,
  getProviderBookings,
  updateBookingStatus,
  deleteBooking,
  rateBooking
} from "../controllers/bookingController.js";
import verifyUser from "../middleware/authMiddleware.js";

const router = express.Router();

// Create a new booking
router.post("/create", verifyUser, createBooking);

// Get all bookings (admin only)
router.get("/", verifyUser, getBookings);

// Get a booking by ID
router.get("/:id", verifyUser, getBookingById);

// Get user's bookings
router.get("/user/:userId", verifyUser, getUserBookings);

// Get provider's bookings
router.get("/provider/:providerId", verifyUser, getProviderBookings);

// Update booking status
router.put("/:id/status", verifyUser, updateBookingStatus);

// Delete a booking
router.delete("/:id", verifyUser, deleteBooking);

// Rate a booking
router.post("/:id/rate", verifyUser, rateBooking);

export default router; 