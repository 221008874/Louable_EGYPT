import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useLanguage } from '../context/LanguageContext'

export default function OrderSuccess() {
  const location = useLocation()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { t } = useLanguage()
  
  const { orderId, txid, totalPrice, items } = location.state || {}

  const colors = {
    light: {
      primary: '#3E2723',
      secondary: '#D4A017',
      background: '#F8F4F0',
      card: '#FCFAF8',
      textDark: '#2E1B1B',
      textLight: '#6B5E57',
      success: '#8BC34A',
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
      border: '#3E2723'
    }
  }

  const c = theme === 'light' ? colors.light : colors.dark

  if (!orderId) {
    return navigate('/home')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: c.background,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '5rem',
        marginBottom: '1.5rem',
        animation: 'bounce 2s infinite'
      }}>
        🎉
      </div>
      
      <h1 style={{
        fontSize: '2.5rem',
        color: c.success,
        marginBottom: '1rem',
        fontWeight: '700'
      }}>
        {t('orderConfirmed')}
      </h1>
      
      <p style={{
        fontSize: '1.2rem',
        color: c.textLight,
        marginBottom: '2rem'
      }}>
        {t('thankYouPurchase')}
      </p>
      
      <div style={{
        background: c.card,
        borderRadius: '16px',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        border: `2px solid ${c.border}`,
        marginBottom: '2rem'
      }}>
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ color: c.textLight }}>{t('orderId')} </span>
          <strong style={{ color: c.textDark, fontFamily: 'monospace' }}>
            {orderId}
          </strong>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ color: c.textLight }}>{t('transaction')} </span>
          <strong style={{ color: c.textDark, fontFamily: 'monospace', fontSize: '0.9rem' }}>
            {txid?.substring(0, 20)}...
          </strong>
        </div>
        
        <div style={{
          padding: '1rem',
          background: c.background,
          borderRadius: '8px',
          marginTop: '1rem'
        }}>
          <span style={{ color: c.textLight }}>{t('totalPaid')} </span>
          <strong style={{ color: c.secondary, fontSize: '1.5rem' }}>
            {totalPrice?.toFixed(2)} EGP
          </strong>
        </div>

        {items && items.length > 0 && (
          <div style={{
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: `1px solid ${c.border}`,
            textAlign: 'left'
          }}>
            <h3 style={{ color: c.textDark, marginBottom: '1rem' }}>
              {t('orderDetails')}
            </h3>
            {items.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                fontSize: '0.9rem'
              }}>
                <span style={{ color: c.textLight }}>
                  {item.name} x {item.quantity || 1}
                </span>
                <span style={{ color: c.textDark, fontWeight: '700' }}>
                  {((item.price || 0) * (item.quantity || 1)).toFixed(2)} EGP
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <button
        onClick={() => navigate('/home')}
        style={{
          padding: '14px 32px',
          background: `linear-gradient(135deg, ${c.secondary} 0%, #B8860B 100%)`,
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '1.1rem',
          cursor: 'pointer',
          transition: 'transform 0.3s ease',
          boxShadow: '0 4px 12px rgba(212, 160, 23, 0.3)'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        🛍️ {t('continueShopping')}
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