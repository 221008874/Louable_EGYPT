// src/api/kashier.js - Frontend API helper - FIXED

const API_URL = import.meta.env.VITE_API_URL || '';

export const kashierApi = {
  /**
   * Create payment session with Kashier
   * @param {Object} paymentData - Payment details
   * @returns {Promise<Object>} - { success, checkoutUrl, orderId }
   */
  async createPayment(paymentData) {
    try {
      // FIXED: Use relative path for same-origin requests
      const endpoint = API_URL 
        ? `${API_URL}/api/payment/kashier` 
        : '/api/payment/kashier';
      
      console.log('Calling Kashier API:', endpoint); // Debug log
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      // FIXED: Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response. Check API endpoint.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || `HTTP ${response.status}: Payment creation failed`);
      }

      if (!data.success || !data.checkoutUrl) {
        throw new Error('Invalid response from payment server: missing checkoutUrl');
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
    console.log('Checking status for:', orderId);
    return { status: 'pending' };
  }
};

export default kashierApi;