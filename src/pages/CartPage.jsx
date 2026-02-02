// src/pages/CartPage.jsx
// ✅ FIXED: Proper Pi authentication with payments scope

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
  
  // ✅ NEW: Track authentication state
  const [piAuthenticated, setPiAuthenticated] = useState(false)
  const [piAuthError, setPiAuthError] = useState(null)

  // ✅ FIXED: Proper Pi authentication
  useEffect(() => {
    const authenticatePi = async () => {
      // Check if Pi SDK is available
      if (typeof window === 'undefined' || !window.Pi) {
        console.warn('⚠️ Pi SDK not available - not in Pi Browser');
        setPiAuthError('Please open this app in Pi Browser');
        return;
      }

      try {
        console.log('🔐 Authenticating with Pi Network...');
        
        // ✅ CRITICAL: Request 'payments' scope
        const scopes = ['payments'];
        
        // Handle incomplete payments
        const onIncompletePaymentFound = (payment) => {
          console.log('🔄 Found incomplete payment:', payment.identifier);
          // You can handle incomplete payments here if needed
          return payment;
        };

        // Authenticate with Pi
        const auth = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
        
        console.log('✅ Pi authentication successful:', auth);
        console.log('  - User:', auth.user?.username);
        console.log('  - Scopes:', auth.accessToken?.scopes);
        
        setPiAuthenticated(true);
        setPiAuthError(null);
        
      } catch (error) {
        console.error('❌ Pi authentication failed:', error);
        setPiAuthError(error.message || 'Authentication failed');
        setPiAuthenticated(false);
      }
    };

    authenticatePi();
  }, []); // Run once on mount

  // ✅ FIXED: Checkout handler that checks authentication
  const handleCheckout = async () => {
    // Check Pi SDK availability
    if (!window.Pi) {
      alert("❌ Please open this app in Pi Browser");
      return;
    }

    // Check if authenticated
    if (!piAuthenticated) {
      alert("❌ Please wait for Pi authentication to complete, then try again");
      console.error('Not authenticated yet. Auth error:', piAuthError);
      return;
    }

    try {
      console.log('💳 Creating payment...');
      
      const paymentData = {
        amount: totalPrice,
        memo: `Order for ${totalItems} item(s)`,
        metadata: { 
          orderId: `order_${Date.now()}`,
          itemCount: totalItems,
          timestamp: new Date().toISOString()
        }
      };

      console.log('Payment data:', paymentData);

      const callbacks = {
        onReadyForServerApproval: async (paymentId) => {
          console.log("🚀 Ready for server approval:", paymentId);
          
          try {
            const response = await fetch('/api/pi/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId })
            });
            
            const result = await response.json();
            
            if (!response.ok) {
              console.error("❌ Approval failed:", result);
              throw new Error(result.error || 'Approval failed');
            }
            
            console.log("✅ Server approved:", result);
            
          } catch (error) {
            console.error("💥 Approval error:", error);
            alert("Approval failed: " + error.message);
            throw error;
          }
        },
        
        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log("✅ Ready for completion:", { paymentId, txid });
          
          try {
            const response = await fetch('/api/pi/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
            
            const result = await response.json();
            
            if (!response.ok) {
              console.error("❌ Completion failed:", result);
              throw new Error(result.error || 'Completion failed');
            }
            
            console.log("✅ Order completed:", result);
            alert("✅ Payment successful! Transaction ID: " + txid);
            
            // Optional: Clear cart or redirect
            // navigate('/order-success');
            
          } catch (error) {
            console.error("💥 Completion error:", error);
            alert("Payment completed but order save failed. Transaction ID: " + txid);
          }
        },
        
        onCancel: (paymentId) => {
          console.log("❌ Payment cancelled:", paymentId);
          alert("Payment was cancelled");
        },
        
        onError: (error, payment) => {
          console.error("💥 Payment error:", error, payment);
          alert("Payment failed: " + (error.message || 'Unknown error'));
        }
      };

      // ✅ Create payment
      const payment = await window.Pi.createPayment(paymentData, callbacks);
      console.log("💳 Payment created successfully:", payment.identifier);
      
    } catch (error) {
      console.error("🔥 Checkout error:", error);
      
      // More helpful error messages
      if (error.message?.includes('scope')) {
        alert("❌ Authentication error: Please close and reopen the app in Pi Browser");
      } else {
        alert("Checkout failed: " + (error.message || 'Please try again'));
      }
    }
  };

  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )

  const isMobile = windowWidth < 768
  const isSmallMobile = windowWidth < 480

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

  // ✅ NEW: Show authentication status (optional)
  const AuthStatus = () => {
    if (!window.Pi) return null;
    
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
        padding: isMobile ? '2rem 1rem' : 'clamp(40px, 8vw, 60px) clamp(16px, 4vw, 24px)',
        textAlign: 'center', 
        background: c.background,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.5s ease-out',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <AuthStatus />
        
        <div style={{
          fontSize: isMobile ? '3.5rem' : 'clamp(4rem, 15vw, 6rem)',
          marginBottom: isMobile ? '16px' : 'clamp(20px, 5vw, 32px)',
          opacity: 0.4
        }}>
          🛒
        </div>
        
        <h2 style={{
          fontSize: isMobile ? '1.6rem' : 'clamp(1.8rem, 6vw, 2.5rem)',
          marginBottom: '16px',
          fontWeight: '700',
          color: c.textDark,
          fontFamily: 'Georgia, serif'
        }}>
          {t('emptyCart')}
        </h2>
        
        <p style={{ 
          margin: isMobile ? '0 0 2rem 0' : '0 0 clamp(32px, 6vw, 48px) 0',
          color: c.textLight,
          fontSize: isMobile ? '0.95rem' : 'clamp(1rem, 3.5vw, 1.2rem)'
        }}>
          {t('addProducts')}
        </p>
        
        <button
          onClick={() => navigate('/home')}
          style={{
            padding: isMobile ? '12px 28px' : 'clamp(14px, 3.5vw, 18px) clamp(32px, 7vw, 48px)',
            background: `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: isMobile ? '10px' : 'clamp(8px, 2vw, 12px)',
            cursor: 'pointer',
            fontWeight: '700',
            fontSize: isMobile ? '0.95rem' : 'clamp(1rem, 3.5vw, 1.15rem)',
            boxShadow: '0 6px 20px rgba(139, 195, 74, 0.4)'
          }}
        >
          <span>🛍️</span> {t('continueShopping')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: isMobile ? '1.5rem 1rem 5rem' : 'clamp(24px, 4vw, 32px) clamp(16px, 3vw, 24px) clamp(80px, 12vw, 100px)',
      background: c.background,
      minHeight: '100vh',
      animation: 'fadeIn 0.5s ease-out',
      position: 'relative'
    }}>
      <AuthStatus />
      
      {/* Logo */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '16px' : 'clamp(20px, 4vw, 32px)',
        left: lang === 'ar' ? 'auto' : (isMobile ? '16px' : 'clamp(20px, 4vw, 32px)'),
        right: lang === 'ar' ? (isMobile ? '16px' : 'clamp(20px, 4vw, 32px)') : 'auto',
        zIndex: 10,
        height: isMobile ? '50px' : 'clamp(55px, 12vw, 70px)'
      }}>
        <img 
          src={getImage('logo')} 
          alt="Louable" 
          style={{ 
            height: '100%',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
          }} 
        />
      </div>

      <div style={{ 
        maxWidth: '950px', 
        margin: '0 auto', 
        paddingTop: isMobile ? '4rem' : 'clamp(60px, 12vw, 80px)' 
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isMobile ? '1.5rem' : 'clamp(32px, 6vw, 48px)',
          gap: isMobile ? '12px' : 'clamp(16px, 4vw, 24px)',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <div style={{ width: isMobile ? '100%' : 'auto' }}>
            <h2 style={{ 
              margin: '0 0 8px 0',
              fontSize: isMobile ? '1.5rem' : 'clamp(1.6rem, 5vw, 2.2rem)',
              fontWeight: '700',
              color: c.textDark,
              fontFamily: 'Georgia, serif',
              textAlign: isMobile ? 'center' : 'left'
            }}>
              {t('cart')} ({totalItems})
            </h2>
            <p style={{
              margin: 0,
              fontSize: isMobile ? '0.85rem' : 'clamp(0.9rem, 2.8vw, 1rem)',
              color: c.textLight,
              textAlign: isMobile ? 'center' : 'left'
            }}>
              Review your items before checkout
            </p>
          </div>
          
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: isMobile ? '10px 20px' : 'clamp(10px, 2.5vw, 12px) clamp(20px, 4vw, 28px)',
              background: 'transparent',
              border: `2px solid ${c.primary}`,
              borderRadius: isMobile ? '8px' : 'clamp(8px, 2vw, 10px)',
              cursor: 'pointer',
              color: c.primary,
              fontWeight: '600',
              fontSize: isMobile ? '0.85rem' : 'clamp(0.9rem, 2.8vw, 1rem)',
              width: isMobile ? '100%' : 'auto'
            }}
          >
            <span>←</span> {t('continueShopping')}
          </button>
        </div>

        {/* Cart Items - Your existing item rendering code */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: isMobile ? '1rem' : 'clamp(16px, 3.5vw, 20px)',
          marginBottom: isMobile ? '2rem' : 'clamp(32px, 6vw, 48px)'
        }}>
          {items.map((item) => (
            <div key={item.id} style={{ 
              padding: isMobile ? '16px' : 'clamp(20px, 4vw, 28px)',
              backgroundColor: c.card,
              borderRadius: isMobile ? '12px' : 'clamp(12px, 2.5vw, 16px)',
              border: `1px solid ${c.border}`
            }}>
              {/* Your existing item card JSX */}
              <p>{item.name} - ${item.price}</p>
            </div>
          ))}
        </div>

        {/* Checkout Section */}
        <div style={{
          padding: isMobile ? '20px' : 'clamp(28px, 6vw, 40px)',
          background: c.card,
          borderRadius: isMobile ? '12px' : 'clamp(12px, 2.5vw, 18px)',
          maxWidth: '550px',
          margin: '0 auto',
          border: `2px solid ${c.secondary}40`,
          boxShadow: theme === 'light'
            ? `0 8px 30px rgba(62, 39, 35, 0.12)`
            : `0 8px 30px rgba(0, 0, 0, 0.4)`
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: isMobile ? '1.3rem' : 'clamp(1.4rem, 5vw, 1.8rem)',
            fontWeight: '700',
            color: c.textDark,
            marginBottom: isMobile ? '16px' : 'clamp(20px, 5vw, 32px)',
            fontFamily: 'Georgia, serif'
          }}>
            <span>{t('total')}:</span>
            <span style={{ color: c.secondary }}>${totalPrice.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={!piAuthenticated}
            style={{
              width: '100%',
              padding: isMobile ? '14px' : 'clamp(14px, 3.5vw, 20px)',
              background: piAuthenticated 
                ? `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`
                : '#999',
              color: 'white',
              border: 'none',
              borderRadius: isMobile ? '10px' : 'clamp(8px, 2vw, 12px)',
              fontWeight: '700',
              fontSize: isMobile ? '1rem' : 'clamp(1.05rem, 3.5vw, 1.25rem)',
              cursor: piAuthenticated ? 'pointer' : 'not-allowed',
              boxShadow: piAuthenticated 
                ? '0 6px 20px rgba(139, 195, 74, 0.4)' 
                : 'none',
              opacity: piAuthenticated ? 1 : 0.6
            }}
          >
            <span>✓</span> {piAuthenticated ? t('checkout') : 'Connecting to Pi...'}
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

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}