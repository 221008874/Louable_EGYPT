import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Verify payment with your backend if needed
    const orderId = searchParams.get('orderId');
    console.log('Payment successful for order:', orderId);
    
    // You can call your backend to verify the payment status
    // and update the UI accordingly
  }, [searchParams]);

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>✅ Payment Successful!</h1>
      <p>Thank you for your purchase.</p>
      <p>Order ID: {searchParams.get('orderId')}</p>
      <a href="/">Return to Home</a>
    </div>
  );
}

export default PaymentSuccess;