// src/api/kashier.js - Frontend API helper

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const kashierApi = {
  /**
   * Create payment session with Kashier
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} - { success, checkoutUrl, orderId }
   */
  async createPayment(paymentData) {
    try {
      const response = await fetch(`${API_URL}/payment/kashier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Payment creation failed');
      }

      if (!data.success || !data.checkoutUrl) {
        throw new Error('Invalid response from payment server');
      }

      return data;

    } catch (error) {
      console.error('Kashier API Error:', error);
      throw error;
    }
  },

  /**
   * Verify payment status (optional polling)
   * @param {string} orderId 
   */
  async checkStatus(orderId) {
    // This would check your backend/Firebase for payment status
    // Implementation depends on your setup
    console.log('Checking status for:', orderId);
    return { status: 'pending' };
  }
};

export default kashierApi;