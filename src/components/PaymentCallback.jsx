import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymobService } from '../services/paymob';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function PaymentCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    const verifyPayment = async () => {
      const orderId = sessionStorage.getItem('pendingOrderId');
      const firestoreId = sessionStorage.getItem('pendingFirestoreId');
      const paymobOrderId = sessionStorage.getItem('paymobOrderId');

      if (!orderId || !firestoreId || !paymobOrderId) {
        setStatus('error');
        return;
      }

      try {
        let attempts = 0;
        const maxAttempts = 10;
        
        const checkInterval = setInterval(async () => {
          attempts++;
          const result = await paymobService.checkStatus(paymobOrderId);
          
          if (result.success) {
            clearInterval(checkInterval);
            
            const orderRef = doc(db, 'orders_egp', firestoreId);
            await updateDoc(orderRef, {
              paymentStatus: 'paid',
              paymobTransactionId: result.transactionId,
              status: 'confirmed',
              updatedAt: new Date()
            });

            const orderSnap = await getDoc(orderRef);
            const orderData = orderSnap.data();

            sessionStorage.removeItem('pendingOrderId');
            sessionStorage.removeItem('pendingFirestoreId');
            sessionStorage.removeItem('paymobOrderId');

            setStatus('success');
            setTimeout(() => navigate('/order-success', { 
              state: { 
                orderId, 
                totalPrice: orderData.totalPrice,
                items: orderData.items,
                deliveryInfo: {
                  name: orderData.customerName,
                  phone: orderData.customerPhone,
                  address: orderData.customerAddress
                },
                shipping: orderData.shipping,
                paymentMethod: 'card'
              } 
            }), 2000);
          } else if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            setStatus('pending');
          }
        }, 3000);

      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
      }
    };

    verifyPayment();
  }, [navigate]);

  const messages = {
    checking: 'Verifying your payment...',
    success: 'Payment successful! Redirecting...',
    pending: 'Payment is being processed. We will update you shortly.',
    error: 'Could not verify payment. Please contact support.'
  };

  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <h2>{messages[status]}</h2>
      {status === 'checking' && <div>⏳</div>}
    </div>
  );
}