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
  
  const [piStatus, setPiStatus] = useState('checking')
  const [piError, setPiError] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [debugInfo, setDebugInfo] = useState({})

  const API_BASE_URL = 'https://louablech.vercel.app'

  // Check Pi SDK
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
      console.log('🔍 Pi Debug:', info)

      if (!window.Pi) {
        setPiStatus('error')
        setPiError('Pi SDK not found. Open in Pi Browser.')
        return
      }

      // Try authentication
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 15000)
        )
        
        const authPromise = window.Pi.authenticate(['payments'], (payment) => {
          console.log('🔄 Incomplete payment:', payment)
          return { action: 'cancel' }
        })
        
        const auth = await Promise.race([authPromise, timeoutPromise])
        
        console.log('✅ Auth success:', auth)
        setPiStatus('authenticated')
        
      } catch (error) {
        console.error('❌ Auth error:', error)
        setPiStatus('available') // Not error, just not authenticated yet
        setPiError('Authentication pending. Tap below to retry.')
      }
    }

    checkPi()
  }, [])

  // Retry authentication manually
  const retryAuth = async () => {
    setPiStatus('checking')
    setPiError(null)
    
    try {
      const auth = await window.Pi.authenticate(['payments'], (p) => {
        console.log('Incomplete:', p)
        return { action: 'cancel' }
      })
      
      console.log('✅ Retry success:', auth)
      setPiStatus('authenticated')
      setPiError(null)
      
    } catch (error) {
      console.error('❌ Retry failed:', error)
      setPiStatus('error')
      setPiError(error.message || 'Authentication failed')
    }
  }

  const handleCheckout = async () => {
    if (piStatus !== 'authenticated') {
      alert('Please connect Pi first')
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
            setIsProcessing(false)
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
        return <div style={{...styles, background: '#2196F3'}}>🔐 Tap to Connect</div>
      case 'authenticated':
        return <div style={{...styles, background: '#4CAF50'}}>✅ Pi Connected</div>
      case 'error':
        return <div style={{...styles, background: '#f44336'}}>❌ Error</div>
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

        {/* Debug Info */}
        <div style={{
          background: '#263238', color: '#aed581', padding: '1rem',
          borderRadius: '8px', marginBottom: '1rem', fontSize: '12px',
          fontFamily: 'monospace', overflow: 'auto'
        }}>
          <strong>Debug:</strong><br/>
          Host: {debugInfo.hostname}<br/>
          Pi Exists: {debugInfo.piExists ? 'Yes' : 'No'}<br/>
          Status: {piStatus}<br/>
          {piError && `Error: ${piError}`}
        </div>

        {/* 🔐 RETRY BUTTON - SHOWS WHEN AUTH PENDING */}
        {piStatus === 'available' && (
          <div style={{
            padding: '1.5rem',
            background: '#e3f2fd',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            textAlign: 'center',
            border: '2px solid #2196F3'
          }}>
            <p style={{ margin: '0 0 1rem 0', color: '#1565c0', fontWeight: '600' }}>
              🔐 Pi authentication required
            </p>
            <button 
              onClick={retryAuth}
              style={{
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #2196F3, #1976d2)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)'
              }}
            >
              Connect Pi Wallet
            </button>
          </div>
        )}

        {/* Error Message */}
        {piStatus === 'error' && (
          <div style={{
            padding: '1.5rem',
            background: '#ffebee',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            color: '#c62828',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 1rem 0', fontWeight: '600' }}>
              ⚠️ {piError}
            </p>
            <button 
              onClick={retryAuth}
              style={{
                padding: '12px 24px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Try Again
            </button>
          </div>
        )}

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
             '⏳ Connect Pi First'}
          </button>
        </div>
      </div>
    </div>
  )
}