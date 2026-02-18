import { useSearchParams } from 'react-router-dom';

function PaymentCancel() {
  const [searchParams] = useSearchParams();
  
  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1>❌ Payment Cancelled</h1>
      <p>You can try again or choose a different payment method.</p>
      <a href="/checkout">Return to Checkout</a>
    </div>
  );
}

export default PaymentCancel;