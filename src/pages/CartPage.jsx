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

  const apiUrl = import.meta.env.VITE_API_URL || ''

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

        const scopes = ['payments']
        
        const onIncompletePaymentFound = (payment) => {
  console.log('⚠️ INCOMPLETE PAYMENT FOUND:', payment);
  setPendingPayment(payment);
  
  // ✅ CRITICAL: Return payment IMMEDIATELY
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
  }, [apiUrl, items, clearCart])

  // Handle pending payment completion manually
  const handleCompletePending = async () => {
    if (!pendingPayment) return;
    
    setIsProcessing(true);
    try {
      const txid = pendingPayment.transaction?.txid || pendingPayment.txid || '';
      
      const response = await fetch(`${apiUrl}/api/pi/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: pendingPayment.identifier,
          txid: txid,
          orderDetails: { items, totalPrice, totalItems }
        })
      });

      if (response.ok) {
        alert('✅ Pending payment completed successfully!');
        setPendingPayment(null);
        clearCart();
        navigate('/order-success');
      } else {
        const error = await response.json();
        alert('❌ Failed to complete: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = async () => {
    // Check if user is authenticated
    if (!window.Pi) {
      alert('Pi not initialized. Please open in Pi Browser.');
      return;
    }

    // Prevent multiple simultaneous payments
    if (isProcessing) {
      alert('Payment already in progress. Please wait...');
      return;
    }

    // Check for pending payment first
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
        meta: { 
          orderItems: items.map(i => i.name).join(', '),
          timestamp: Date.now()
        }
      };

      console.log('💳 Payment data:', paymentData);

      const callbacks = {
        onReadyForServerApproval: async (paymentId) => {
          console.log('🚀 Approving payment:', paymentId);
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            // FIXED: Use apiUrl variable, no trailing space
            const response = await fetch(`${apiUrl}/api/pi/approve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);

            let result;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
              result = await response.json();
            } else {
              const text = await response.text();
              if (text.trim() === '') {
                throw new Error(`Server returned ${response.status} with no content`);
              }
              try {
                result = JSON.parse(text);
              } catch {
                throw new Error(`Server error: ${text.substring(0, 100)}`);
              }
            }
            
            if (!response.ok) {
              throw new Error(result.error || `HTTP ${response.status}`);
            }
            
            console.log('✅ Payment approved');
          } catch (error) {
            console.error('💥 Approval error:', error);
            alert('❌ Approval failed: ' + error.message);
            throw error;
          }
        },

        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log('✅ Completing payment:', paymentId, txid);
          
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);

            // FIXED: Use apiUrl variable, no trailing space
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

            let result;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
              result = await response.json();
            } else {
              const text = await response.text();
              console.warn('⚠️ Non-JSON response:', text.substring(0, 100));
              result = { success: response.ok };
            }
            
            if (!response.ok) {
              throw new Error(result.error || 'Completion failed');
            }

            // Save to Firebase
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

            console.log('✅ Order saved');
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

        onError: (error) => {
          console.error('💥 Payment error:', error);
          setIsProcessing(false);
          
          // Handle specific error types
          if (error.message?.includes('pending payment')) {
            alert('⚠️ You have a pending payment. Please complete it first or wait for it to expire.');
          } else {
            alert('❌ Payment failed: ' + (error.message || 'Unknown error'));
          }
        }
      };

      // Create the payment
      const payment = await window.Pi.createPayment(paymentData, callbacks);
      console.log('💳 Payment created:', payment.identifier);

    } catch (error) {
      console.error('🔥 Checkout error:', error);
      alert('❌ Checkout failed: ' + (error.message || 'Please try again'));
      setIsProcessing(false);
    }
  };

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  const isMobile = windowWidth < 768

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
        padding: isMobile ? '2rem 1rem' : '3rem 2rem',
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
          {t('emptyCart')}
        </h2>
        <button onClick={() => navigate('/home')} style={{
          padding: '12px 32px',
          background: `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`,
          color: '#FFF', border: 'none', borderRadius: '10px',
          fontWeight: '700', fontSize: '1rem', cursor: 'pointer'
        }}>
          🛍️ {t('continueShopping')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: isMobile ? '1.5rem 1rem 5rem' : '2rem 2rem 6rem',
      background: c.background, minHeight: '100vh'
    }}>
      <AuthStatus />
      
      <div style={{ maxWidth: '950px', margin: '0 auto', paddingTop: '3rem' }}>
        <h2 style={{ 
          fontSize: '1.8rem', fontWeight: '700',
          color: c.textDark, marginBottom: '2rem'
        }}>
          {t('cart')} ({totalItems})
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
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>⚠️ Pending Payment Found</h3>
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
                        width: '32px', height: '32px',
                        borderRadius: '50%', border: `2px solid ${c.border}`,
                        background: c.card, color: c.textDark,
                        fontWeight: '700', cursor: 'pointer'
                      }}
                    >-</button>
                    <span style={{ fontWeight: '700', minWidth: '24px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      style={{
                        width: '32px', height: '32px',
                        borderRadius: '50%', border: `2px solid ${c.border}`,
                        background: c.card, color: c.textDark,
                        fontWeight: '700', cursor: 'pointer'
                      }}
                    >+</button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    style={{
                      background: c.danger, color: 'white',
                      border: 'none', borderRadius: '8px',
                      padding: '8px 12px', cursor: 'pointer',
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
              display: 'flex', justifyContent: 'space-between',
              fontSize: '1.5rem', fontWeight: '700',
              color: c.textDark, marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: `2px solid ${c.border}`
            }}>
              <span>{t('total')}:</span>
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
                gap: '10px',
                transition: 'all 0.3s ease'
              }}
            >
              {isProcessing ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                  Processing...
                </>
              ) : piLoading ? (
                '⏳ Connecting to Pi...'
              ) : pendingPayment ? (
                '⚠️ Complete Pending Payment First'
              ) : piAuthenticated ? (
                <>
                  <span style={{ fontSize: '1.4rem' }}>π</span>
                  {t('checkout')} with Pi
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
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}