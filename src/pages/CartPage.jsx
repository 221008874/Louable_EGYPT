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
  // ✅ ADD: Payment method state
  const [paymentMethod, setPaymentMethod] = useState('pi') // 'pi' or 'egp'

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
          console.log('🔄 Incomplete payment:', payment.identifier)
          return payment
        }

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

  // ✅ ADD: Handle EGP payment
  const handleEgpPayment = async () => {
    try {
      console.log('💰 Processing EGP payment...')
      
      // Generate order ID
      const orderId = `order_egp_${Date.now()}`
      
      // Save order to Firebase with EGP flag
      const orderData = {
        orderId,
        paymentMethod: 'egp', // ✅ Flag for EGP
        paymentId: null, // No Pi payment ID
        txid: null, // No blockchain txid
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1
        })),
        totalPrice,
        totalItems,
        currency: 'EGP',
        status: 'pending', // Pending manual confirmation
        createdAt: serverTimestamp(),
        notes: 'Cash on delivery or bank transfer'
      }

      const docRef = await addDoc(collection(db, 'orders'), orderData)
      console.log('✅ EGP Order saved:', docRef.id)

      alert(`✅ Order placed successfully!\nOrder ID: ${orderId}\nPayment: Cash on Delivery (EGP)\n\nOur team will contact you soon.`)
      
      clearCart()
      navigate('/home')
      
    } catch (error) {
      console.error('💥 EGP payment error:', error)
      alert('❌ Failed to place order. Please try again.')
    }
  }

  const handleCheckout = async () => {
    if (paymentMethod === 'egp') {
      return handleEgpPayment()
    }

    // Pi Payment Flow
    if (!window.Pi) {
      alert("❌ Please open this app in Pi Browser")
      return
    }
    if (!piAuthenticated) {
      alert("❌ Please wait for Pi authentication to complete")
      return
    }
    
    try {
      console.log('💳 Starting Pi checkout...')

      const paymentData = {
        amount: 0.1,
        memo: `Order for ${totalItems} item(s)`,
        metadata: {
          purpose: "ecommerce_test"
        }
      }

      console.log('Payment Data:', paymentData)

      const API_BASE_URL = import.meta.env.VITE_API_URL || ''

      const callbacks = {
        onReadyForServerApproval: async (paymentId) => {
          console.log("🚀 Approval needed for:", paymentId)
          
          try {
            const approveUrl = API_BASE_URL 
              ? `${API_BASE_URL}/api/pi/approve`
              : '/api/pi/approve'
            
            const response = await fetch(approveUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ paymentId })
            })
            
            let result
            const contentType = response.headers.get('content-type')
            
            if (contentType && contentType.includes('application/json')) {
              result = await response.json()
            } else {
              const text = await response.text()
              if (!text.trim()) {
                throw new Error(`Server returned ${response.status}`)
              }
              result = JSON.parse(text)
            }
            
            if (!response.ok) {
              throw new Error(result.error || `HTTP ${response.status}`)
            }
            
            console.log("✅ Server approved:", result)
            
          } catch (error) {
            console.error("💥 Approval error:", error)
            alert("❌ Approval failed: " + error.message)
            throw error
          }
        },
        
        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log("✅ Completing payment:", { paymentId, txid })
          
          try {
            const completeUrl = API_BASE_URL 
              ? `${API_BASE_URL}/api/pi/complete`
              : '/api/pi/complete'
            
            const response = await fetch(completeUrl, {
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
            })
            
            let result
            const contentType = response.headers.get('content-type')
            
            if (contentType && contentType.includes('application/json')) {
              result = await response.json()
            } else {
              result = { success: response.ok }
            }
            
            if (!response.ok) {
              throw new Error(result.error || 'Completion failed')
            }

            // 💾 Save to Firebase with PI flag
            try {
              const orderData = {
                orderId: result.orderId || `order_pi_${Date.now()}`,
                paymentMethod: 'pi', // ✅ Flag for Pi
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
              }

              const docRef = await addDoc(collection(db, 'orders'), orderData)
              console.log('✅ Pi Order saved:', docRef.id)
              
              clearCart()
              alert(`✅ Payment successful!\nTransaction ID: ${txid}\nOrder: ${orderData.orderId}`)
              
            } catch (firebaseError) {
              console.error('⚠️ Firebase error:', firebaseError)
              alert(`✅ Paid but record failed. Save TXID: ${txid}`)
            }
            
          } catch (error) {
            console.error("💥 Completion error:", error)
            alert(`⚠️ Issue occurred. TXID: ${txid}`)
          }
        },
        
        onCancel: (paymentId) => {
          console.log("❌ Cancelled:", paymentId)
          alert("Payment cancelled")
        },
        
        onError: (error) => {
          console.error("💥 Error:", error)
          let msg = error.message || 'Unknown error'
          if (msg.includes('scope')) msg = 'Auth error. Restart app.'
          else if (msg.includes('network')) msg = 'Check connection.'
          alert("❌ Failed: " + msg)
        }
      }

      const payment = await window.Pi.createPayment(paymentData, callbacks)
      console.log("💳 Created:", payment.identifier)
      
    } catch (error) {
      console.error("🔥 Checkout error:", error)
      alert("❌ Failed: " + (error.message || 'Try again'))
    }
  }

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

        {/* ✅ PAYMENT METHOD SELECTOR */}
        <div style={{
          padding: '1.5rem',
          background: c.card,
          borderRadius: '12px',
          marginBottom: '1.5rem',
          border: `2px solid ${c.secondary}40`
        }}>
          <h3 style={{ margin: '0 0 1rem 0', color: c.textDark, fontSize: '1.1rem' }}>
            💳 Select Payment Method
          </h3>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Pi Payment Option */}
            <button
              onClick={() => setPaymentMethod('pi')}
              style={{
                flex: 1,
                minWidth: '140px',
                padding: '1rem',
                background: paymentMethod === 'pi' ? c.secondary : 'transparent',
                color: paymentMethod === 'pi' ? '#fff' : c.textDark,
                border: `2px solid ${c.secondary}`,
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{ fontSize: '1.5rem' }}>π</span>
              <span style={{ fontWeight: '700' }}>Pi Network</span>
              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                Pay with Pi cryptocurrency
              </span>
            </button>

            
         
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          {items.map((item) => (
            <div key={item.id} style={{ 
              padding: '1.5rem',
              backgroundColor: c.card,
              borderRadius: '12px',
              marginBottom: '1rem',
              border: `1px solid ${c.border}`
            }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: c.textDark }}>{item.name}</h3>
              <p style={{ color: c.secondary, fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
                ${item.price.toFixed(2)}
              </p>
            </div>
          ))}
        </div>

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
            color: c.textDark, marginBottom: '1.5rem'
          }}>
            <span>{t('total')}:</span>
            <span style={{ color: c.secondary }}>${totalPrice.toFixed(2)}</span>
          </div>

          {/* Dynamic Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={paymentMethod === 'pi' && (!piAuthenticated || piLoading)}
            style={{
              width: '100%',
              padding: '14px',
              background: paymentMethod === 'pi' 
                ? (piAuthenticated && !piLoading) 
                  ? `linear-gradient(135deg, ${c.secondary} 0%, #B8860B 100%)`
                  : '#999'
                : `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '1.1rem',
              cursor: (paymentMethod === 'pi' && (!piAuthenticated || piLoading)) 
                ? 'not-allowed' 
                : 'pointer',
              opacity: (paymentMethod === 'pi' && (!piAuthenticated || piLoading)) ? 0.6 : 1
            }}
          >
            {paymentMethod === 'pi' ? (
              piLoading ? '⏳ Connecting...' : 
              piAuthenticated ? `π ${t('checkout')} with Pi` : 
              '❌ Pi Not Connected'
            ) : (
              `💰 ${t('checkout')} with Cash (EGP)`
            )}
          </button>
          
          {paymentMethod === 'pi' && piAuthError && (
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