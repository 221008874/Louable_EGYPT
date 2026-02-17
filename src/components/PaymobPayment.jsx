import { useState, useEffect } from 'react';
import { paymobService } from '../services/paymob';
import { useAuth } from '../hooks/useAuth'; // Your auth hook

export default function PaymobPayment({ amount, items = [], onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    city: '',
    street: '',
    building: '',
    apartment: '',
    country: 'EG'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { iframeUrl, orderId } = await paymobService.createPayment(
        amount,
        formData,
        items
      );

      sessionStorage.setItem('pendingOrderId', orderId);
      paymobService.redirectToPayment(iframeUrl);
    } catch (err) {
      onError?.(err.message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="paymob-form">
      <h3>Pay {amount} EGP</h3>
      
      <input 
        name="firstName" 
        placeholder="First Name" 
        value={formData.firstName}
        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
        required 
      />
      
      <input 
        name="lastName" 
        placeholder="Last Name" 
        value={formData.lastName}
        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
        required 
      />
      
      <input 
        name="email" 
        type="email"
        placeholder="Email" 
        value={formData.email}
        onChange={(e) => setFormData({...formData, email: e.target.value})}
        required 
      />
      
      <input 
        name="phone" 
        placeholder="Phone (+20...)" 
        value={formData.phone}
        onChange={(e) => setFormData({...formData, phone: e.target.value})}
        required 
      />
      
      <input 
        name="city" 
        placeholder="City" 
        value={formData.city}
        onChange={(e) => setFormData({...formData, city: e.target.value})}
        required 
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}