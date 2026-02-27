// src/pages/OrderSuccess.jsx
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'

export default function OrderSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { t } = useLanguage()
  
  const { orderId, orderData } = location.state || {}
  
  // Fallback if no state (direct navigation)
  if (!orderData) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h1>Order Not Found</h1>
        <p>Please check your email for order confirmation.</p>
        <button onClick={() => navigate('/home')}>Continue Shopping</button>
      </div>
    )
  }

  const colors = {
    light: {
      background: '#FAFAF8',
      card: '#FFFFFF',
      textDark: '#1A1410',
      textMuted: '#8B7D73',
      success: '#6B9E5F',
      secondary: '#D4A574'
    },
    dark: {
      background: '#0F0E0C',
      card: '#1A1410',
      textDark: '#F5F3F0',
      textMuted: '#A8968B',
      success: '#8FC178',
      secondary: '#D4A574'
    }
  }

  const c = colors[theme] || colors.light

  const formatPrice = (price) => {
    if (orderData.currency === 'USD') {
      return `$${Number(price).toFixed(2)}`
    }
    return `${Number(price).toFixed(2)} ${orderData.currency || 'EGP'}`
  }

  // Ensure price is a number
  const safePrice = (price) => {
    const num = Number(price)
    return isNaN(num) ? 0 : num
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: c.background,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: c.card,
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 25px 80px rgba(0,0,0,0.15)'
      }}>
        <div style={{
          width: '100px',
          height: '100px',
          background: `linear-gradient(135deg, ${c.success}, ${c.success}dd)`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 24px',
          fontSize: '3rem'
        }}>
          ✓
        </div>

        <h1 style={{ color: c.textDark, marginBottom: '8px' }}>
          Order Confirmed!
        </h1>
        <p style={{ color: c.textMuted, marginBottom: '24px' }}>
          Your order has been placed successfully.
        </p>

        <div style={{
          background: `linear-gradient(135deg, ${c.secondary}15, ${c.secondary}05)`,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          textAlign: 'left'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: c.textMuted }}>Order ID: </span>
            <span style={{ color: c.textDark, fontWeight: '700' }}>{orderId}</span>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            <span style={{ color: c.textMuted }}>Payment Method: </span>
            <span style={{ color: c.textDark, fontWeight: '700' }}>
              {orderData.paymentMethod} {orderData.paymentMethod.includes('Card') ? '💳' : '💵'}
            </span>
          </div>

          {/* Price Breakdown */}
          <div style={{ 
            borderTop: `1px dashed ${c.textMuted}40`,
            marginTop: '16px',
            paddingTop: '16px'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ color: c.textMuted }}>Subtotal:</span>
              <span style={{ color: c.textDark }}>{formatPrice(safePrice(orderData.subtotal))}</span>
            </div>
            
            {safePrice(orderData.discount) > 0 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '8px'
              }}>
                <span style={{ color: c.textMuted }}>Discount:</span>
                <span style={{ color: c.success }}>-{formatPrice(safePrice(orderData.discount))}</span>
              </div>
            )}
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <span style={{ color: c.textMuted }}>Shipping:</span>
              <span style={{ color: c.textDark }}>
                {safePrice(orderData.shippingCost) === 0 ? 'FREE' : formatPrice(safePrice(orderData.shippingCost))}
              </span>
            </div>
            
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: `2px solid ${c.secondary}`
            }}>
              <span style={{ color: c.textDark, fontWeight: '700', fontSize: '1.1rem' }}>Total:</span>
              <span style={{ color: c.secondary, fontWeight: '800', fontSize: '1.3rem' }}>
                {formatPrice(safePrice(orderData.totalPrice))}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: '14px 32px',
              background: c.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Continue Shopping
          </button>
          
          <button
            onClick={() => window.print()}
            style={{
              padding: '14px 32px',
              background: c.card,
              color: c.textDark,
              border: `2px solid ${c.textMuted}`,
              borderRadius: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  )
}