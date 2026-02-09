import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { db } from '../services/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export default function CartPage() {
  const { items, totalItems, totalPrice, removeFromCart, updateQuantity, clearCart } = useCart()
  const { t, lang } = useLanguage()
  const { theme } = useTheme()
  const navigate = useNavigate()
  
  const [piAuthenticated, setPiAuthenticated] = useState(false)
  const [piAuthError, setPiAuthError] = useState(null)
  const [piLoading, setPiLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingPayment, setPendingPayment] = useState(null)

// ✅ FIXED: No trailing spaces, correct paths
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  
  if (isLocalhost) {
    return 'http://localhost:5173'; // Your Vite dev port
  }
  // Production - NO trailing space!
  return 'https://ecommerce-frontend-tawny-psi.vercel.app';
};

// Usage in fetch calls:
const apiUrl = getApiUrl();

  const completePendingPayment = async (payment) => {
    console.log('🔄 Auto-completing pending payment:', payment.identifier);
    
    try {
      const txid = payment.transaction?.txid;
      if (!txid) {
        console.error('No txid in pending payment');
        return false;
      }

      const response = await fetch(`${apiUrl}/api/pi/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: txid,
          orderDetails: { items, totalPrice, totalItems }
        })
      });

      const result = await response.json();
      
      // ✅ Handle "already completed" as success
      if (!response.ok) {
        if (result.details?.includes('already_completed')) {
          console.log('✅ Payment already completed, treating as success');
          await addDoc(collection(db, 'orders'), {
            orderId: `order_${Date.now()}`,
            paymentId: payment.identifier,
            txid,
            items: items.map(item => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity || 1
            })),
            totalPrice: payment.amount,
            totalItems: items.length,
            currency: 'PI',
            status: 'completed',
            createdAt: serverTimestamp()
          });
          
          setPendingPayment(null);
          clearCart();
          navigate('/order-success');
          return true;
        }
        
        console.error('API error:', result);
        return false;
      }

      console.log('✅ Pending payment completed');
      await addDoc(collection(db, 'orders'), {
        orderId: `order_${Date.now()}`,
        paymentId: payment.identifier,
        txid,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1
        })),
        totalPrice: payment.amount,
        totalItems: items.length,
        currency: 'PI',
        status: 'completed',
        createdAt: serverTimestamp()
      });
      
      setPendingPayment(null);
      clearCart();
      navigate('/order-success');
      return true;
      
    } catch (error) {
      console.error('Error completing pending:', error);
      return false;
    }
  };

  // Pi authentication
  useEffect(() => {
    const authenticatePi = async () => {
      try {
        let attempts = 0
        const maxAttempts = 50
        
        while (!window.Pi && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        if (!window.Pi) {
          setPiLoading(false)
          setPiAuthError('Please open this app in Pi Browser')
          return
        }

        const scopes = ['username', 'payments']
        
        const onIncompletePaymentFound = async (payment) => {
  console.log('⚠️ Incomplete payment:', payment.identifier);
  setPendingPayment(payment);
  
  // Auto-complete if possible
  const completed = await completePendingPayment(payment);
  
  // Return payment to Pi SDK (required!)
  return payment;
};

        const auth = await window.Pi.authenticate(scopes, onIncompletePaymentFound)
        console.log('✅ Pi authenticated:', auth.user?.username)
        setPiAuthenticated(true)
        setPiAuthError(null)
        
      } catch (error) {
        console.error('❌ Authentication failed:', error)
        setPiAuthError(error.message || 'Authentication failed')
        setPiAuthenticated(false)
      } finally {
        setPiLoading(false)
      }
    }
    authenticatePi()
  }, [])

  const handleCompletePending = async () => {
    if (!pendingPayment) return;
    setIsProcessing(true);
    await completePendingPayment(pendingPayment);
    setIsProcessing(false);
  };

  const handleCheckout = async () => {
    if (!window.Pi) {
      alert('Pi not initialized. Please open in Pi Browser.');
      return;
    }

    if (isProcessing) {
      alert('Payment already in progress. Please wait...');
      return;
    }

    if (pendingPayment) {
      const shouldComplete = confirm('You have a pending payment. Complete it first?');
      if (shouldComplete) {
        await handleCompletePending();
      }
      return;
    }

    setIsProcessing(true);

    try {
      console.log('💳 Creating new payment...');
      
      const paymentData = {
        amount: Number(totalPrice),
        memo: `Louable Order - ${totalItems} items`,
        metadata: {
          orderItems: items.map(i => i.name).join(', '),
          timestamp: Date.now()
        }
      };

      console.log('💳 Payment data:', paymentData);

      const callbacks = {
        onReadyForServerApproval: async (paymentId) => {
          console.log('🚀 onReadyForServerApproval called:', paymentId);
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(`${apiUrl}/api/pi/approve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('✅ Server approval success:', result);
            
          } catch (error) {
            console.error('💥 Approval error:', error);
            alert('❌ Approval failed: ' + error.message);
            throw error;
          }
        },

        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log('🚀 onReadyForServerCompletion called:', paymentId, txid);
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            const response = await fetch(`${apiUrl}/api/pi/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                paymentId, 
                txid,
                orderDetails: { items, totalPrice, totalItems }
              }),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Completion failed');
            }

            const result = await response.json();
            console.log('✅ Server completion success:', result);

            await addDoc(collection(db, 'orders'), {
              orderId: `order_${Date.now()}`,
              paymentId,
              txid,
              items: items.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1
              })),
              totalPrice,
              totalItems,
              currency: 'PI',
              status: 'completed',
              createdAt: serverTimestamp()
            });

            console.log('✅ Order saved to Firebase');
            clearCart();
            navigate('/order-success', { 
              state: { orderId: paymentId, txid, totalPrice, items } 
            });
            
          } catch (error) {
            console.error('💥 Completion error:', error);
            alert('⚠️ Payment completed but order save failed. TXID: ' + txid);
            setIsProcessing(false);
          }
        },

        onCancel: (paymentId) => {
          console.log('❌ Payment cancelled:', paymentId);
          setIsProcessing(false);
          alert('Payment cancelled');
        },

        onError: (error, payment) => {
          console.error('💥 Payment error:', error, payment);
          setIsProcessing(false);
          
          if (error.message?.includes('pending payment')) {
            alert('⚠️ You have a pending payment. Please complete it first.');
          } else {
            alert('❌ Payment failed: ' + (error.message || 'Unknown error'));
          }
        }
      };

      const payment = await window.Pi.createPayment(paymentData, callbacks);
      console.log('💳 Payment created successfully:', payment?.identifier);

    } catch (error) {
      console.error('🔥 Checkout error:', error);
      alert('❌ Checkout failed: ' + (error.message || 'Please try again'));
      setIsProcessing(false);
    }
  };

  // ✅ ADDED: UI Render Code
  const colors = {
    light: {
      primary: '#3E2723',
      secondary: '#D4A017',
      background: '#F8F4F0',
      card: '#FCFAF8',
      textDark: '#2E1B1B',
      textLight: '#6B5E57',
      success: '#8BC34A',
      danger: '#D32F2F',
      border: '#E8DDD4'
    },
    dark: {
      primary: '#2E1B1B',
      secondary: '#D4A017',
      background: '#1A1412',
      card: '#2E1B1B',
      textDark: '#F8F4F0',
      textLight: '#C4B5AD',
      success: '#8BC34A',
      danger: '#EF5350',
      border: '#3E2723'
    }
  }

  const c = theme === 'light' ? colors.light : colors.dark

  const AuthStatus = () => {
    if (typeof window === 'undefined' || !window.Pi) return null
    
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 12px',
        background: piAuthenticated ? '#4CAF50' : (piLoading ? '#FF9800' : '#FF5252'),
        color: 'white',
        borderRadius: '6px',
        fontSize: '12px',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        {piLoading ? '⏳ Connecting...' : (piAuthenticated ? '✅ Pi Connected' : '❌ Pi Failed')}
      </div>
    )
  }

  if (totalItems === 0 && !pendingPayment) {
    return (
      <div style={{ 
        padding: '3rem 2rem',
        textAlign: 'center', 
        background: c.background,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <AuthStatus />
        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.4 }}>🛒</div>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: c.textDark }}>
          {t('emptyCart') || 'Your cart is empty'}
        </h2>
        <button onClick={() => navigate('/home')} style={{
          padding: '12px 32px',
          background: c.success,
          color: '#FFF',
          border: 'none',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '1rem',
          cursor: 'pointer'
        }}>
          🛍️ {t('continueShopping') || 'Continue Shopping'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: '2rem',
      background: c.background,
      minHeight: '100vh'
    }}>
      <AuthStatus />
      
      <div style={{ maxWidth: '950px', margin: '0 auto', paddingTop: '3rem' }}>
        <h2 style={{ 
          fontSize: '1.8rem',
          fontWeight: '700',
          color: c.textDark,
          marginBottom: '2rem'
        }}>
          {t('cart') || 'Cart'} ({totalItems})
        </h2>

        {/* Pending Payment Alert */}
        {pendingPayment && (
          <div style={{
            padding: '1.5rem',
            background: '#FFF3CD',
            border: '2px solid #FFC107',
            borderRadius: '12px',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>⚠️ Pending Payment</h3>
              <p style={{ margin: 0, color: '#856404' }}>
                Amount: π {pendingPayment.amount} | ID: {pendingPayment.identifier?.slice(0, 8)}...
              </p>
            </div>
            <button
              onClick={handleCompletePending}
              disabled={isProcessing}
              style={{
                padding: '12px 24px',
                background: isProcessing ? '#999' : '#FFC107',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: isProcessing ? 'not-allowed' : 'pointer'
              }}
            >
              {isProcessing ? 'Processing...' : 'Complete Payment'}
            </button>
          </div>
        )}

        {/* Cart Items */}
        {items.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            {items.map((item) => (
              <div key={item.id} style={{ 
                padding: '1.5rem',
                backgroundColor: c.card,
                borderRadius: '12px',
                marginBottom: '1rem',
                border: `1px solid ${c.border}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: c.textDark }}>{item.name}</h3>
                  <p style={{ color: c.secondary, fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
                    π {item.price.toFixed(2)}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: `2px solid ${c.border}`,
                        background: c.card,
                        color: c.textDark,
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >-</button>
                    <span style={{ fontWeight: '700', minWidth: '24px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        border: `2px solid ${c.border}`,
                        background: c.card,
                        color: c.textDark,
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >+</button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    style={{
                      background: c.danger,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Order Summary */}
        {(items.length > 0 || pendingPayment) && (
          <div style={{
            padding: '2rem',
            background: c.card,
            borderRadius: '12px',
            border: `2px solid ${c.secondary}40`,
            maxWidth: '550px',
            margin: '0 auto'
          }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: c.textDark,
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: `2px solid ${c.border}`
            }}>
              <span>{t('total') || 'Total'}:</span>
              <span style={{ color: c.secondary }}>
                π {(pendingPayment ? pendingPayment.amount : totalPrice).toFixed(2)}
              </span>
            </div>

            {/* Pi Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={!piAuthenticated || piLoading || isProcessing || pendingPayment}
              style={{
                width: '100%',
                padding: '16px',
                background: (piAuthenticated && !piLoading && !isProcessing && !pendingPayment)
                  ? `linear-gradient(135deg, ${c.secondary} 0%, #B8860B 100%)`
                  : '#999',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '1.2rem',
                cursor: (piAuthenticated && !piLoading && !isProcessing && !pendingPayment) ? 'pointer' : 'not-allowed',
                opacity: (piAuthenticated && !piLoading && !isProcessing && !pendingPayment) ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px'
              }}
            >
              {isProcessing ? (
                <>
                  <span>⏳</span>
                  Processing...
                </>
              ) : piLoading ? (
                '⏳ Connecting to Pi...'
              ) : pendingPayment ? (
                '⚠️ Complete Pending Payment First'
              ) : piAuthenticated ? (
                <>
                  <span style={{ fontSize: '1.4rem' }}>π</span>
                  {t('checkout') || 'Checkout'} with Pi
                </>
              ) : (
                '❌ Pi Not Connected'
              )}
            </button>
            
            {piAuthError && (
              <p style={{
                marginTop: '12px',
                color: c.danger,
                fontSize: '0.85rem',
                textAlign: 'center'
              }}>
                ⚠️ {piAuthError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}