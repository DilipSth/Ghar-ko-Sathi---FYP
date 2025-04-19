import Booking from '../models/Booking.js';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Environment variables
const ESEWA_SECRET = process.env.ESEWA_SECRET || "8gBm/:&EnhH.1/q";
const ESEWA_PRODUCT_CODE = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";
const ESEWA_PAYMENT_URL = process.env.NODE_ENV === "production"
  ? "https://epay.esewa.com.np/api/epay/main/v2/form"
  : "https://rc-epay.esewa.com.np/api/epay/main/v2/form";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const API_URL = process.env.API_URL || "http://localhost:8000";

// Generate HMAC SHA256 signature
const generateSignature = (message, secret) => {
  return crypto.createHmac("sha256", secret).update(message).digest("base64");
};

// Initiate eSewa payment
export const initiateEsewaPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user._id;

    // Validate booking ID
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId);

    // Check if booking exists
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is authorized
    if (booking.userId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this booking'
      });
    }

    // Check if booking is completed and not yet paid
    if (!['completed', 'completed-by-user', 'completed-by-provider'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Booking must be completed before payment'
      });
    }

    // Check if payment is already completed
    if (booking.paymentStatus === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been completed for this booking'
      });
    }

    // Get payment amount
    const amount = booking.totalCharge.toString();
    const taxAmount = "0";
    const totalAmount = amount;
    const transactionUuid = `GKS-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    // Update booking with payment info
    booking.paymentMethod = 'esewa';
    booking.paymentStatus = 'pending';
    booking.paymentDetails = {
      transactionId: transactionUuid,
      paidAmount: totalAmount
    };
    await booking.save();

    // Generate signature
    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${ESEWA_PRODUCT_CODE}`;
    const signature = generateSignature(message, ESEWA_SECRET);

    // eSewa form data with API endpoints for success/failure
    const formData = {
      amount: amount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: ESEWA_PRODUCT_CODE,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: `${API_URL}/api/payments/esewa/success?bookingId=${booking._id}`,
      failure_url: `${API_URL}/api/payments/esewa/failure?bookingId=${booking._id}`,
      signed_field_names: "total_amount,transaction_uuid,product_code",
      signature: signature,
    };

    res.json({
      success: true,
      message: 'Payment initiated',
      paymentUrl: ESEWA_PAYMENT_URL,
      formData,
      transactionId: transactionUuid,
    });
  } catch (error) {
    console.error('Error initiating eSewa payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
};

// Handle successful eSewa payment
export const handleEsewaSuccess = async (req, res) => {
  let { bookingId, data } = req.query;

  // Fix malformed bookingId that contains ?data=
  if (bookingId && bookingId.includes("?data=")) {
    const [cleanId, base64Data] = bookingId.split("?data=");
    bookingId = cleanId;
    data = base64Data;
  }

  console.log("Payment success callback received:", { bookingId, data });

  // If data is missing but bookingId exists, try to complete the payment anyway
  if (!data && bookingId) {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        console.error("Booking not found:", bookingId);
        return res.redirect(`${FRONTEND_URL}/payments/error?message=Booking not found`);
      }

      if (booking.paymentStatus === "completed") {
        console.log("Payment already processed:", bookingId);
        return res.redirect(`${FRONTEND_URL}/payments/success?bookingId=${booking._id}`);
      }

      booking.paymentStatus = "completed";
      booking.status = "paid";
      booking.paymentDetails.paidAt = new Date();
      await booking.save();

      return res.redirect(`${FRONTEND_URL}/payments/success?bookingId=${booking._id}`);
    } catch (error) {
      console.error("Error processing payment without data:", error);
      return res.redirect(`${FRONTEND_URL}/payments/error?message=${error.message}`);
    }
  }

  if (!bookingId || !data) {
    console.error("Missing required parameters");
    return res.redirect(`${FRONTEND_URL}/payments/error?message=Invalid response - missing parameters`);
  }

  try {
    let decodedData;
    try {
      decodedData = JSON.parse(Buffer.from(data, "base64").toString("utf8"));
      console.log("Decoded data:", decodedData);
    } catch (decodeError) {
      console.error("Failed to decode data:", decodeError);
      return res.redirect(`${FRONTEND_URL}/payments/error?message=Invalid response format`);
    }

    const {
      transaction_code,
      status,
      total_amount,
      transaction_uuid,
      product_code,
      signed_field_names,
      signature,
    } = decodedData;

    if (!transaction_code || !status) {
      console.error("Missing critical fields in response");
      return res.redirect(`${FRONTEND_URL}/payments/error?message=Incomplete payment data`);
    }

    if (signed_field_names && signature) {
      const message = signed_field_names
        .split(",")
        .map((field) => `${field}=${decodedData[field]}`)
        .join(",");
      const computedSignature = generateSignature(message, ESEWA_SECRET);

      if (computedSignature !== signature) {
        console.error("Signature verification failed");
        return res.redirect(`${FRONTEND_URL}/payments/error?message=Invalid signature`);
      }
    }

    if (status !== "COMPLETE") {
      console.error("Payment status not complete:", status);
      return res.redirect(`${FRONTEND_URL}/payments/error?message=Payment not completed`);
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      console.error("Booking not found:", bookingId);
      return res.redirect(`${FRONTEND_URL}/payments/error?message=Booking not found`);
    }

    if (booking.paymentStatus === "completed") {
      console.log("Payment already processed:", bookingId);
      return res.redirect(`${FRONTEND_URL}/payments/success?bookingId=${booking._id}`);
    }

    booking.paymentStatus = "completed";
    booking.status = "paid";
    booking.paymentDetails.transactionCode = transaction_code;
    booking.paymentDetails.referenceId = transaction_code;
    booking.paymentDetails.paidAt = new Date();
    await booking.save();

    return res.redirect(`${FRONTEND_URL}/payments/success?bookingId=${booking._id}`);
  } catch (error) {
    console.error("Error processing success:", error);
    return res.redirect(`${FRONTEND_URL}/payments/error?message=${error.message}`);
  }
};

// Handle failed eSewa payment
export const handleEsewaFailure = async (req, res) => {
  const { bookingId } = req.query;
  console.log("Payment failure callback received for booking:", bookingId);

  if (bookingId) {
    try {
      // Find and update the booking
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.paymentStatus = 'failed';
        await booking.save();
        console.log("Updated booking payment status to failed");
      }
    } catch (error) {
      console.error("Error handling payment failure:", error);
    }
  }

  return res.redirect(`${FRONTEND_URL}/payments/error?message=Payment failed or was cancelled`);
};

// Update booking to cash payment
export const markBookingAsCashPayment = async (req, res) => {
  try {
    const { bookingId } = req.body;
    const userId = req.user._id;
    
    // Validate booking ID
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId);

    // Check if booking exists
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user is authorized
    if (booking.userId.toString() !== userId.toString() && 
        booking.providerId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to this booking'
      });
    }

    // Check if booking is completed and not yet paid
    if (!['completed', 'completed-by-user', 'completed-by-provider'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: 'Booking must be completed before payment'
      });
    }

    // Update booking with cash payment info
    booking.paymentMethod = 'cash';
    booking.paymentStatus = 'completed';
    booking.status = 'paid';
    booking.paymentDetails = {
      paidAmount: booking.totalCharge,
      paidAt: new Date()
    };
    await booking.save();

    res.json({
      success: true,
      message: 'Booking marked as paid by cash',
      booking
    });
  } catch (error) {
    console.error('Error marking booking as cash payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: error.message
    });
  }
};

// Get payment status for a booking
export const getPaymentStatus = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // Validate booking ID
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Get booking details
    const booking = await Booking.findById(bookingId);

    // Check if booking exists
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Return payment details
    res.json({
      success: true,
      payment: {
        method: booking.paymentMethod,
        status: booking.paymentStatus,
        details: booking.paymentDetails
      }
    });
  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
}; 