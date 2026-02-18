// src/api/kashier.js - FIXED VERSION
const API_URL = import.meta.env.VITE_API_URL || '';

export const kashierApi = {
  async createPayment(paymentData) {
    try {
      // FIX: Don't add /api if API_URL already includes it
      let endpoint;
      
      if (!API_URL) {
        // Local development - use relative path
        endpoint = '/api/payment/kashier';
      } else if (API_URL.endsWith('/api')) {
        // API_URL already ends with /api (e.g., http://localhost:5173/api)
        endpoint = `${API_URL}/payment/kashier`;
      } else {
        // API_URL is base URL only (e.g., https://yourdomain.com)
        endpoint = `${API_URL}/api/payment/kashier`;
      }
      
      console.log('🚀 API_URL:', API_URL);
      console.log('🚀 Endpoint:', endpoint);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('❌ HTTP Error:', response.status, text);
        throw new Error(`Server error: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response:', text.substring(0, 500));
        throw new Error('Server error: Invalid response format');
      }

      const data = await response.json();

      if (!data.success || !data.checkoutUrl) {
        throw new Error(data.error || 'Invalid response from server');
      }

      console.log('✅ Payment session created:', {
        orderId: data.orderId,
        test: data.test
      });

      return data;

    } catch (error) {
      console.error('❌ Kashier API Error:', error);
      throw error;
    }
  }
};

export default kashierApi;