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
  
  const [piStatus, setPiStatus] = useState('checking') // 'checking', 'available', 'authenticated', 'error'
  const [piError, setPiError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [debugInfo, setDebugInfo] = useState({})

  const API_BASE_URL = 'https://louablech.vercel.app'

  // Check Pi SDK availability
  useEffect(() => {
    const checkPi = async () => {
      const info = {
        userAgent: navigator.userAgent,
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        piExists: typeof window.Pi !== 'undefined',
        timestamp: new Date().toISOString()
      }
      setDebugInfo(info)
      console.log('🔍 Pi Debug Info:', info)

      // Wait for Pi SDK
      let attempts = 0
      const maxAttempts = 50
      
      while (!window.Pi && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }

      if (!window.Pi) {
        console.error('❌ Pi SDK not found after', maxAttempts, 'attempts')
        setPiStatus('error')
        setPiError('Pi SDK not available. Please open in Pi Browser.')
        return
      }

      console.log('✅ Pi SDK found, attempting authentication...')
      setPiStatus('available')

      try {
        const auth = await window.Pi.authenticate(['payments'], (payment) => {
          console.log('🔄 Incomplete payment:', payment)
          return payment
        })

        console.log('✅ Authentication successful:', auth)
        setPiStatus('authenticated')
        
      } catch (error) {
        console.error('❌ Authentication failed:', error)
        setPiStatus('error')
        setPiError(error.message || 'Authentication failed')
      }
    }

    checkPi()
  }, [])

  const handleCheckout = async () => {
    if (piStatus !== 'authenticated') {
      alert('Please wait for Pi authentication')
      return
    }

    setIsProcessing(true)

    try {
      const paymentData = {
        amount: Number(totalPrice),
        memo: `Louable Order - ${totalItems} items`,
        metadata: { app: 'Louable', items: totalItems }
      }

      const callbacks = {
        onReadyForServerApproval: async (paymentId) => {
          console.log('🚀 Approving:', paymentId)
          
          try {
            const res = await fetch(`${API_BASE_URL}/api/pi/approve`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId })
            })
            
            if (!res.ok) {
              const err = await res.json()
              throw new Error(err.error || 'Approval failed')
            }
            
            console.log('✅ Approved')
          } catch (error) {
            alert('Approval failed: ' + error.message)
            throw error
          }
        },

        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log('✅ Completing:', paymentId, txid)
          
          try {
            const res = await fetch(`${API_BASE_URL}/api/pi/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                paymentId, 
                txid,
                orderDetails: { items, totalPrice, totalItems }
              })
            })

            if (!res.ok) {
              const err = await res.json()
              throw new Error(err.error || 'Completion failed')
            }

            // Save to Firebase
            await addDoc(collection(db, 'orders'), {
              orderId: `order_${Date.now()}`,
              paymentId,
              txid,
              items,
              totalPrice,
              currency: 'PI',
              status: 'completed',
              createdAt: serverTimestamp()
            })

            clearCart()
            navigate('/order-success', { 
              state: { orderId: paymentId, txid, totalPrice } 
            })
            
          } catch (error) {
            alert('Completion error: ' + error.message)
          }
        },

        onCancel: (paymentId) => {
          console.log('❌ Cancelled:', paymentId)
          setIsProcessing(false)
          alert('Payment cancelled')
        },

        onError: (error) => {
          console.error('💥 Payment error:', error)
          setIsProcessing(false)
          alert('Payment failed: ' + error.message)
        }
      }

      const payment = await window.Pi.createPayment(paymentData, callbacks)
      console.log('💳 Payment created:', payment.identifier)

    } catch (error) {
      console.error('🔥 Checkout error:', error)
      alert('Checkout failed: ' + error.message)
      setIsProcessing(false)
    }
  }

  // Colors
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
  const isMobile = window.innerWidth < 768

  // Status badge
  const getStatusBadge = () => {
    const styles = {
      position: 'fixed',
      top: '10px',
      right: '10px',
      padding: '10px 16px',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '600',
      zIndex: 1000,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    }

    switch (piStatus) {
      case 'checking':
        return <div style={{...styles, background: '#FF9800'}}>⏳ Checking Pi...</div>
      case 'available':
        return <div style={{...styles, background: '#2196F3'}}>🔐 Authenticating...</div>
      case 'authenticated':
        return <div style={{...styles, background: '#4CAF50'}}>✅ Pi Connected</div>
      case 'error':
        return <div style={{...styles, background: '#f44336'}}>❌ {piError}</div>
      default:
        return null
    }
  }

  if (totalItems === 0) {
    return (
      <div style={{ 
        padding: '3rem', textAlign: 'center', background: c.background,
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}>
        {getStatusBadge()}
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
        <h2 style={{ color: c.textDark }}>{t('emptyCart')}</h2>
        <button onClick={() => navigate('/home')} style={{
          padding: '12px 32px', background: c.success, color: 'white',
          border: 'none', borderRadius: '10px', cursor: 'pointer',
          fontWeight: '700'
        }}>
          Continue Shopping
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', background: c.background, minHeight: '100vh' }}>
      {getStatusBadge()}
      
      <div style={{ maxWidth: '950px', margin: '0 auto' }}>
        <h2 style={{ color: c.textDark, marginBottom: '2rem' }}>
          {t('cart')} ({totalItems})
        </h2>

        {/* Debug Info - Remove in production */}
        <div style={{
          background: '#263238', color: '#aed581', padding: '1rem',
          borderRadius: '8px', marginBottom: '1rem', fontSize: '12px',
          fontFamily: 'monospace', overflow: 'auto'
        }}>
          <strong>Debug Info:</strong><br/>
          UA: {debugInfo.userAgent?.slice(0, 60)}...<br/>
          Host: {debugInfo.hostname}<br/>
          Protocol: {debugInfo.protocol}<br/>
          Pi Exists: {debugInfo.piExists ? 'Yes' : 'No'}<br/>
          Status: {piStatus}
        </div>

        {/* Cart Items */}
        {items.map((item) => (
          <div key={item.id} style={{ 
            padding: '1.5rem', background: c.card, borderRadius: '12px',
            marginBottom: '1rem', border: `1px solid ${c.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, color: c.textDark }}>{item.name}</h3>
              <p style={{ color: c.secondary, fontWeight: '700', margin: '0.5rem 0 0 0' }}>
                π {item.price.toFixed(2)}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={() => updateQuantity(item.id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${c.border}`, background: c.card }}>-</button>
              <span style={{ fontWeight: '700' }}>{item.quantity}</span>
              <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: `2px solid ${c.border}`, background: c.card }}>+</button>
              <button onClick={() => removeFromCart(item.id)}
                style={{ background: c.danger, color: 'white', border: 'none', borderRadius: '8px', padding: '8px 12px' }}>✕</button>
            </div>
          </div>
        ))}

        {/* Summary */}
        <div style={{
          padding: '2rem', background: c.card, borderRadius: '12px',
          border: `2px solid ${c.secondary}40`, maxWidth: '550px', margin: '0 auto'
        }}>
          <div style={{ 
            display: 'flex', justifyContent: 'space-between',
            fontSize: '1.5rem', fontWeight: '700', color: c.textDark,
            marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: `2px solid ${c.border}`
          }}>
            <span>Total:</span>
            <span style={{ color: c.secondary }}>π {totalPrice.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={piStatus !== 'authenticated' || isProcessing}
            style={{
              width: '100%', padding: '16px',
              background: (piStatus === 'authenticated' && !isProcessing) ? c.secondary : '#999',
              color: 'white', border: 'none', borderRadius: '12px',
              fontWeight: '700', fontSize: '1.2rem',
              cursor: (piStatus === 'authenticated' && !isProcessing) ? 'pointer' : 'not-allowed',
              opacity: (piStatus === 'authenticated' && !isProcessing) ? 1 : 0.6
            }}
          >
            {isProcessing ? '⏳ Processing...' : 
             piStatus === 'authenticated' ? 'π Pay with Pi' : 
             '⏳ Waiting for Pi...'}
          </button>
        </div>
      </div>
    </div>
  )
}