import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useCart } from '../context/CartContext'

export default function OrderSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { clearCart } = useCart()
  
  const { orderId, totalPrice, deliveryInfo, shipping, paymentMethod, currency } = location.state || {}

  useEffect(() => {
    if (paymentMethod === 'cod' && orderId) {
      clearCart()
    }
  }, [paymentMethod, orderId, clearCart])

  if (!orderId) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>❌</div>
        <h1>Invalid Order Access</h1>
        <p>No order information found.</p>
        <button onClick={() => navigate('/home')}>Go Home</button>
      </div>
    )
  }

  const colors = {
    light: {
      primary: '#3E2723', secondary: '#D4A017', background: '#F8F4F0',
      card: '#FCFAF8', textDark: '#2E1B1B', textLight: '#6B5E57',
      success: '#8BC34A', border: '#E8DDD4'
    },
    dark: {
      primary: '#2E1B1B', secondary: '#D4A017', background: '#1A1412',
      card: '#2E1B1B', textDark: '#F8F4F0', textLight: '#C4B5AD',
      success: '#8BC34A', border: '#3E2723'
    }
  }

  const c = theme === 'light' ? colors.light : colors.dark

  const formatPrice = (price) => {
    if (currency === 'USD') return `$${price?.toFixed(2)}`
    return `${price?.toFixed(2)} EGP`
  }

  return (
    <div style={{
      minHeight: '100vh', background: c.background, display: 'flex',
      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', textAlign: 'center'
    }}>
      <div style={{ fontSize: '5rem', marginBottom: '1.5rem', animation: 'bounce 2s infinite' }}>
        🎉
      </div>
      
      <h1 style={{ fontSize: '2.5rem', color: c.success, marginBottom: '1rem', fontWeight: '700' }}>
        Order Confirmed!
      </h1>
      
      <p style={{ fontSize: '1.2rem', color: c.textLight, marginBottom: '2rem' }}>
        Your order has been placed successfully. 
        {paymentMethod === 'cod' && ' Pay cash when you receive it.'}
      </p>
      
      <div style={{
        background: c.card, borderRadius: '16px', padding: '2rem',
        maxWidth: '500px', width: '100%', border: `2px solid ${c.border}`, marginBottom: '2rem'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ color: c.textLight }}>Order ID: </span>
          <strong style={{ color: c.textDark, fontFamily: 'monospace' }}>{orderId}</strong>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ color: c.textLight }}>Payment Method: </span>
          <strong style={{ color: c.textDark }}>
            {paymentMethod === 'cod' ? 'Cash on Delivery 💵' : 'Card Payment 💳'}
          </strong>
        </div>
        
        {shipping && (
          <div style={{ marginBottom: '1rem' }}>
            <span style={{ color: c.textLight }}>Shipping: </span>
            <strong style={{ color: c.textDark }}>{shipping.zone}</strong>
          </div>
        )}
        
        <div style={{
          padding: '1rem', background: c.background, borderRadius: '8px', marginTop: '1rem'
        }}>
          <span style={{ color: c.textLight }}>Total: </span>
          <strong style={{ color: c.secondary, fontSize: '1.5rem' }}>
            {formatPrice(totalPrice)}
          </strong>
        </div>
      </div>
      
      <button
        onClick={() => navigate('/home')}
        style={{
          padding: '14px 32px', background: `linear-gradient(135deg, ${c.secondary} 0%, #B8860B 100%)`,
          color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700',
          fontSize: '1.1rem', cursor: 'pointer', transition: 'transform 0.3s ease',
          boxShadow: '0 4px 12px rgba(212, 160, 23, 0.3)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        🛍️ Continue Shopping
      </button>
      
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  )
}