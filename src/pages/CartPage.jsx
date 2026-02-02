// src/pages/CartPage.jsx
// ✅ FIXED: Better error handling for approval failures

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'

export default function CartPage() {
  const { items, totalItems, totalPrice, removeFromCart, updateQuantity } = useCart()
  const { t, lang } = useLanguage()
  const { theme, getImage } = useTheme()
  const navigate = useNavigate()
  
  const [piAuthenticated, setPiAuthenticated] = useState(false)
  const [piAuthError, setPiAuthError] = useState(null)

  // Pi authentication
  useEffect(() => {
    const authenticatePi = async () => {
      if (typeof window === 'undefined' || !window.Pi) {
        console.warn('⚠️ Pi SDK not available');
        setPiAuthError('Please open this app in Pi Browser');
        return;
      }

      try {
        console.log('🔐 Authenticating with Pi Network...');
        const scopes = ['payments'];
        
        const onIncompletePaymentFound = (payment) => {
          console.log('🔄 Incomplete payment:', payment.identifier);
          return payment;
        };

        const auth = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
        
        console.log('✅ Pi authenticated:', auth.user?.username);
        setPiAuthenticated(true);
        setPiAuthError(null);
        
      } catch (error) {
        console.error('❌ Authentication failed:', error);
        setPiAuthError(error.message || 'Authentication failed');
        setPiAuthenticated(false);
      }
    };

    authenticatePi();
  }, []);

  // ✅ FIXED: Better error handling in checkout
  const handleCheckout = async () => {
    if (!window.Pi) {
      alert("❌ Please open this app in Pi Browser");
      return;
    }

    if (!piAuthenticated) {
      alert("❌ Please wait for Pi authentication to complete");
      return;
    }

    try {
      console.log('💳 Starting checkout...');
      // ✅ CORRECT PAYMENT DATA
const paymentData = {
  amount: totalPrice,
  memo: `Order for ${totalItems} item(s)`,
  metadata: { // ✅ "metadata" not "meta"
    orderId: `order_${Date.now()}`,
    itemCount: totalItems,
    timestamp: new Date().toISOString()
  }
};

      console.log('Payment data:', paymentData);

      const callbacks = {
        onReadyForServerApproval: async (paymentId) => {
          console.log("🚀 Approval needed for:", paymentId);
          
          try {
            console.log('📤 Sending approval request...');
            
            const response = await fetch('/api/pi/approve', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ paymentId })
            });
            
            console.log('📥 Approval response status:', response.status);
            console.log('📥 Content-Type:', response.headers.get('content-type'));
            
            // ✅ FIXED: Check content type before parsing
            const contentType = response.headers.get('content-type') || '';
            
            let result;
            if (contentType.includes('application/json')) {
              result = await response.json();
            } else {
              // Response is not JSON (probably HTML error page)
              const text = await response.text();
              console.error('❌ Non-JSON response:', text.substring(0, 200));
              
              throw new Error(
                `Server returned ${response.status}: ${text.substring(0, 100)}...`
              );
            }
            
            console.log('📥 Parsed result:', result);
            
            if (!response.ok) {
              console.error("❌ Approval failed:", result);
              throw new Error(result.error || result.details || 'Approval failed');
            }
            
            console.log("✅ Server approved payment:", result);
            
          } catch (error) {
            console.error("💥 Approval error:", error);
            
            // More specific error messages
            if (error.message.includes('JSON')) {
              alert("❌ Server error: Invalid response format. Check server logs.");
            } else if (error.message.includes('Failed to fetch')) {
              alert("❌ Network error: Cannot reach server. Check your connection.");
            } else {
              alert("❌ Approval failed: " + error.message);
            }
            
            throw error;
          }
        },
        
        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log("✅ Completing payment:", { paymentId, txid });
          
          try {
            const response = await fetch('/api/pi/complete', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              body: JSON.stringify({ 
                paymentId, 
                txid,
                orderDetails: {
                  items,
                  totalPrice,
                  totalItems,
                  timestamp: new Date().toISOString()
                }
              })
            });
            
            const contentType = response.headers.get('content-type') || '';
            
            let result;
            if (contentType.includes('application/json')) {
              result = await response.json();
            } else {
              const text = await response.text();
              console.warn('⚠️ Completion returned non-JSON:', text.substring(0, 100));
              result = { success: response.ok };
            }
            
            if (!response.ok) {
              console.error("❌ Completion failed:", result);
              throw new Error(result.error || 'Completion failed');
            }
            
            console.log("✅ Order completed:", result);
            alert(`✅ Payment successful!\nTransaction ID: ${txid}\n\nThank you for your order!`);
            
            // Optional: Redirect or clear cart
            // navigate('/order-success');
            
          } catch (error) {
            console.error("💥 Completion error:", error);
            alert(`⚠️ Payment completed but order save failed.\n\nTransaction ID: ${txid}\n\nPlease save this for your records.`);
          }
        },
        
        onCancel: (paymentId) => {
          console.log("❌ Payment cancelled:", paymentId);
          alert("Payment was cancelled");
        },
        
        onError: (error, payment) => {
          console.error("💥 Payment error:", error, payment);
          
          let errorMessage = error.message || 'Unknown error';
          
          if (errorMessage.includes('scope')) {
            errorMessage = 'Authentication error. Please close and reopen the app.';
          } else if (errorMessage.includes('network')) {
            errorMessage = 'Network error. Please check your connection.';
          }
          
          alert("❌ Payment failed: " + errorMessage);
        }
      };

      // Create payment
      const payment = await window.Pi.createPayment(paymentData, callbacks);
      console.log("💳 Payment created:", payment.identifier);
      
    } catch (error) {
      console.error("🔥 Checkout error:", error);
      
      let errorMessage = error.message || 'Unknown error';
      
      if (errorMessage.includes('scope')) {
        errorMessage = 'Please close and reopen the app in Pi Browser';
      }
      
      alert("❌ Checkout failed: " + errorMessage);
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

  // Status indicator
  const AuthStatus = () => {
    if (typeof window === 'undefined' || !window.Pi) return null;
    
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 12px',
        background: piAuthenticated ? '#4CAF50' : '#FF9800',
        color: 'white',
        borderRadius: '6px',
        fontSize: '12px',
        zIndex: 1000,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        {piAuthenticated ? '✅ Pi Connected' : '⏳ Connecting...'}
      </div>
    );
  };

  if (totalItems === 0) {
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
        
        <div style={{ fontSize: '4rem', marginBottom: '1rem', opacity: 0.4 }}>
          🛒
        </div>
        
        <h2 style={{
          fontSize: '1.8rem',
          marginBottom: '1rem',
          color: c.textDark
        }}>
          {t('emptyCart')}
        </h2>
        
        <p style={{ 
          marginBottom: '2rem',
          color: c.textLight
        }}>
          {t('addProducts')}
        </p>
        
        <button
          onClick={() => navigate('/home')}
          style={{
            padding: '12px 32px',
            background: `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: '1rem'
          }}
        >
          🛍️ {t('continueShopping')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: isMobile ? '1.5rem 1rem 5rem' : '2rem 2rem 6rem',
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
          {t('cart')} ({totalItems})
        </h2>

        {/* Cart items */}
        <div style={{ marginBottom: '2rem' }}>
          {items.map((item) => (
            <div key={item.id} style={{ 
              padding: '1.5rem',
              backgroundColor: c.card,
              borderRadius: '12px',
              marginBottom: '1rem',
              border: `1px solid ${c.border}`
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: c.textDark }}>
                {item.name}
              </h3>
              <p style={{ color: c.secondary, fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
                ${item.price.toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* Checkout */}
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
            marginBottom: '1.5rem'
          }}>
            <span>{t('total')}:</span>
            <span style={{ color: c.secondary }}>${totalPrice.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={!piAuthenticated}
            style={{
              width: '100%',
              padding: '14px',
              background: piAuthenticated 
                ? `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`
                : '#999',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '1.1rem',
              cursor: piAuthenticated ? 'pointer' : 'not-allowed',
              opacity: piAuthenticated ? 1 : 0.6
            }}
          >
            ✓ {piAuthenticated ? t('checkout') : 'Connecting to Pi...'}
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
      </div>
    </div>
  )
}