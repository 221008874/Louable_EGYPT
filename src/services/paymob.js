// src/services/paymob.js
const API_BASE = '/api';

export const paymobService = {
  async createPayment(amount, billingData, items, currency = 'EGP') {
    const res = await fetch(`${API_BASE}/paymob/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount, 
        billingData, 
        orderItems: items, 
        currency 
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Payment creation failed');
    }
    return res.json();
  },

  redirectToPayment(iframeUrl) {
    window.location.href = iframeUrl;
  },

  async checkStatus(paymobOrderId) {
    const res = await fetch(`${API_BASE}/check-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymobOrderId })
    });
    
    if (!res.ok) throw new Error('Status check failed');
    return res.json();
  }
};