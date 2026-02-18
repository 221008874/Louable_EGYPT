// src/api/kashier.js - ENHANCED VERSION
const API_URL = import.meta.env.VITE_API_URL || '';

export const kashierApi = {
  async createPayment(paymentData) {
    try {
      const endpoint = API_URL 
        ? `${API_URL}/api/payment/kashier` 
        : '/api/payment/kashier';
      
      console.log('🚀 Sending payment request:', {
        amount: paymentData.amount,
        email: paymentData.customerEmail,
        orderId: paymentData.orderId
      });
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response:', text.substring(0, 500));
        throw new Error('Server error: Invalid response format');
      }

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ API Error:', data);
        throw new Error(data.error || data.details || `Payment failed: ${response.status}`);
      }

      if (!data.success || !data.checkoutUrl) {
        throw new Error('Invalid response: Missing checkout URL');
      }

      console.log('✅ Payment session created:', {
        orderId: data.orderId,
        test: data.test,
        url: data.checkoutUrl.substring(0, 100) + '...'
      });

      return data;

    } catch (error) {
      console.error('❌ Kashier API Error:', error);
      throw error;
    }
  }
};

export default kashierApi;