import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

class PaymentService {
  constructor() {
    this.token = localStorage.getItem('token') || '';
  }

  // Get auth header
  getConfig() {
    return {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };
  }

  // Update token if it changes
  updateToken(token) {
    this.token = token;
  }

  // Initiate eSewa payment
  async initiateEsewaPayment(bookingId) {
    try {
      console.log('Initiating eSewa payment for booking:', bookingId);
      const response = await axios.post(
        `${API_URL}/payments/esewa/initiate`,
        { bookingId },
        this.getConfig()
      );
      return response.data;
    } catch (error) {
      console.error('eSewa payment error details:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
      }
      throw error.response?.data?.message || 'Failed to initiate eSewa payment';
    }
  }

  // Mark booking as paid by cash
  async markAsCashPayment(bookingId) {
    try {
      const response = await axios.post(
        `${API_URL}/payments/cash/complete`,
        { bookingId },
        this.getConfig()
      );
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Failed to mark as cash payment';
    }
  }

  // Get payment status
  async getPaymentStatus(bookingId) {
    try {
      const response = await axios.get(
        `${API_URL}/payments/status/${bookingId}`,
        this.getConfig()
      );
      return response.data;
    } catch (error) {
      console.error('Payment status error:', error.response?.status, error.response?.data);
      
      // If it's a 404, provide a more specific error message
      if (error.response?.status === 404) {
        throw 'Payment information not found. The transaction may still be processing.';
      }
      
      throw error.response?.data?.message || 'Failed to get payment status';
    }
  }

  // Submit eSewa payment
  submitEsewaForm(paymentUrl, formData) {
    // Create a form element
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = paymentUrl;
    form.style.display = 'none';

    // Add all required eSewa fields
    Object.entries(formData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    // Append form to body and submit
    document.body.appendChild(form);
    form.submit();

    // Remove form after submission
    setTimeout(() => {
      document.body.removeChild(form);
    }, 1000);
  }
}

export default new PaymentService(); 