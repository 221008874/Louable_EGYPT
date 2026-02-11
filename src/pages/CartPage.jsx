// src/pages/CartPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { db } from '../services/firebase'
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'

export default function CartPage() {
  const { items, totalItems, totalPrice, removeFromCart, updateQuantity, clearCart, error: cartError, clearError } = useCart()
  const { t, lang } = useLanguage()
  const { theme } = useTheme()
  const navigate = useNavigate()
  
  const [piAuthenticated, setPiAuthenticated] = useState(false)
  const [piAuthError, setPiAuthError] = useState(null)
  const [piLoading, setPiLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [pendingPayment, setPendingPayment] = useState(null)
  
  // State for enhanced product display and stock validation
  const [productDetails, setProductDetails] = useState({})
  const [stockErrors, setStockErrors] = useState({})
  const [isUpdating, setIsUpdating] = useState({})
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [expandedItem, setExpandedItem] = useState(null)

  const isMobile = windowWidth < 768
  const isSmallMobile = windowWidth < 480

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fetch current product details including stock
  useEffect(() => {
    const fetchProductDetails = async () => {
      const details = {}
      const errors = {}
      
      for (const item of items) {
        try {
          const docRef = doc(db, 'products', item.id)
          const docSnap = await getDoc(docRef)
          
          if (docSnap.exists()) {
            const data = docSnap.data()
            details[item.id] = data
            
            // Validate stock
            if (data.stock < item.quantity) {
              errors[item.id] = {
                type: 'INSUFFICIENT_STOCK',
                available: data.stock,
                requested: item.quantity,
                message: t('onlyAvailable', { count: data.stock })
              }
            }
          } else {
            errors[item.id] = {
              type: 'PRODUCT_NOT_FOUND',
              message: t('productNotAvailable')
            }
          }
        } catch (err) {
          console.error('Error fetching product:', err)
        }
      }
      
      setProductDetails(details)
      setStockErrors(errors)
    }
    
    if (items.length > 0) {
      fetchProductDetails()
    }
  }, [items, t])

  // Mock coupon validation
  const validateCoupon = (code) => {
    const coupons = {
      'SAVE10': { discount: 0.10, label: '10% off' },
      'SAVE20': { discount: 0.20, label: '20% off' },
      'WELCOME': { discount: 0.15, label: '15% off' }
    }
    return coupons[code.toUpperCase()] || null
  }

  const handleApplyCoupon = () => {
    const coupon = validateCoupon(couponInput)
    if (coupon) {
      setAppliedCoupon(coupon)
      setCouponInput('')
    } else {
      alert(t('invalidCoupon'))
    }
  }

  const discountAmount = appliedCoupon ? totalPrice * appliedCoupon.discount : 0
  const finalPrice = totalPrice - discountAmount

  const getApiUrl = () => {
    return 'https://elhamd-industries.vercel.app/'; // Always Vercel, no spaces!
  };

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
          navigate('/order-success', {
            state: { orderId: payment.identifier, txid, totalPrice: payment.amount, items }
          });
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
      navigate('/order-success', {
        state: { orderId: payment.identifier, txid, totalPrice: payment.amount, items }
      });
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
          setPiAuthError(t('piBrowserRequired'))
          return
        }

        const scopes = ['username', 'payments']
        
        const onIncompletePaymentFound = async (payment) => {
          console.log('⚠️ Incomplete payment:', payment.identifier);
          setPendingPayment(payment);
          
          const completed = await completePendingPayment(payment);
          
          return payment;
        };

        const auth = await window.Pi.authenticate(scopes, onIncompletePaymentFound)
        console.log('✅ Pi authenticated:', auth.user?.username)
        setPiAuthenticated(true)
        setPiAuthError(null)
        
      } catch (error) {
        console.error('❌ Authentication failed:', error)
        setPiAuthError(error.message || t('authFailed'))
        setPiAuthenticated(false)
      } finally {
        setPiLoading(false)
      }
    }
    authenticatePi()
  }, [t])

  const handleCompletePending = async () => {
    if (!pendingPayment) return;
    setIsProcessing(true);
    await completePendingPayment(pendingPayment);
    setIsProcessing(false);
  };

  const handleCheckout = async () => {
    if (!window.Pi) {
      alert(t('piBrowserRequired'));
      return;
    }

    if (isProcessing) {
      alert(t('paymentInProgress'));
      return;
    }

    if (pendingPayment) {
      const shouldComplete = confirm(t('completePendingPayment'));
      if (shouldComplete) {
        await handleCompletePending();
      }
      return;
    }

    // Validate stock before checkout
    const hasStockErrors = Object.keys(stockErrors).length > 0
    if (hasStockErrors) {
      alert(t('resolveStockIssues'))
      return
    }

    setIsProcessing(true);

    try {
      console.log('💳 Creating new payment...');
      
      const paymentData = {
        amount: Number(finalPrice),
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
            alert(t('approvalFailed') + ': ' + error.message);
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
                orderDetails: { items, totalPrice: finalPrice, totalItems }
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
              totalPrice: finalPrice,
              totalItems,
              currency: 'PI',
              status: 'completed',
              createdAt: serverTimestamp()
            });

            console.log('✅ Order saved to Firebase');
            clearCart();
            navigate('/order-success', { 
              state: { orderId: paymentId, txid, totalPrice: finalPrice, items } 
            });
            
          } catch (error) {
            console.error('💥 Completion error:', error);
            alert(t('paymentCompletedButSaveFailed') + ': ' + txid);
            setIsProcessing(false);
          }
        },

        onCancel: (paymentId) => {
          console.log('❌ Payment cancelled:', paymentId);
          setIsProcessing(false);
          alert(t('paymentCancelled'));
        },

        onError: (error, payment) => {
          console.error('💥 Payment error:', error, payment);
          setIsProcessing(false);
          
          if (error.message?.includes('pending payment')) {
            alert(t('pendingPaymentExists'));
          } else {
            alert(t('paymentFailed') + ': ' + (error.message || 'Unknown error'));
          }
        }
      };

      const payment = await window.Pi.createPayment(paymentData, callbacks);
      console.log('💳 Payment created successfully:', payment?.identifier);

    } catch (error) {
      console.error('🔥 Checkout error:', error);
      alert(t('checkoutFailed') + ': ' + (error.message || t('tryAgain')));
      setIsProcessing(false);
    }
  };

  // Enhanced quantity update with stock validation
  const handleQuantityUpdate = async (item, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(item.id)
      return
    }

    const product = productDetails[item.id]
    const availableStock = product?.stock || 0
    
    setIsUpdating(prev => ({ ...prev, [item.id]: true }))
    
    // Optimistic update
    updateQuantity(item.id, newQuantity, availableStock)
    
    // Check for errors after update
    if (availableStock > 0 && newQuantity > availableStock) {
      setStockErrors(prev => ({
        ...prev,
        [item.id]: {
          type: 'INSUFFICIENT_STOCK',
          available: availableStock,
          requested: newQuantity,
          message: t('onlyAvailable', { count: availableStock })
        }
      }))
    } else {
      setStockErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[item.id]
        return newErrors
      })
    }
    
    setTimeout(() => {
      setIsUpdating(prev => ({ ...prev, [item.id]: false }))
    }, 300)
  }

  const colors = {
    light: {
      primary: '#3E2723',
      secondary: '#D4A017',
      background: '#F8F4F0',
      card: '#FCFAF8',
      textDark: '#2E1B1B',
      textLight: '#6B5E57',
      success: '#8BC34A',
      danger: '#EF4444',
      warning: '#F59E0B',
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
      danger: '#EF4444',
      warning: '#F59E0B',
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
        padding: '10px 16px',
        background: piAuthenticated ? '#4CAF50' : (piLoading ? '#FF9800' : '#FF5252'),
        color: 'white',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontWeight: '600'
      }}>
        {piLoading ? '⏳ ' + t('connecting') : (piAuthenticated ? '✅ ' + t('piConnected') : '❌ ' + t('piFailed'))}
      </div>
    )
  }

  // Cart Error Display
  const CartErrorBanner = () => {
    if (!cartError && Object.keys(stockErrors).length === 0) return null
    
    return (
      <div style={{
        padding: isMobile ? '12px 16px' : '16px 20px',
        background: '#FEE2E2',
        border: '2px solid #EF4444',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        color: '#991B1B',
        animation: 'slideDown 0.3s ease'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: '700' }}>⚠️ {t('stockIssuesDetected')}</h4>
        {cartError && <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>{cartError.message}</p>}
        {Object.entries(stockErrors).map(([id, error]) => (
          <p key={id} style={{ margin: '4px 0', fontSize: '0.85rem' }}>
            • {items.find(i => i.id === id)?.name}: {error.message}
          </p>
        ))}
        <button 
          onClick={() => { clearError(); setStockErrors({}) }}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            background: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: '700',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => e.target.style.background = '#DC2626'}
          onMouseLeave={(e) => e.target.style.background = '#EF4444'}
        >
          {t('dismiss')}
        </button>
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
        <div style={{ fontSize: isMobile ? '5rem' : '6rem', marginBottom: '1.5rem', opacity: 0.6 }}>🛒</div>
        <h2 style={{ 
          fontSize: isMobile ? '1.5rem' : '2rem', 
          marginBottom: '1rem', 
          color: c.textDark,
          fontWeight: '700'
        }}>
          {t('emptyCart')}
        </h2>
        <p style={{
          fontSize: '1rem',
          color: c.textLight,
          marginBottom: '2rem'
        }}>
          {t('browseOurCollectionAndAddSomeItems')}
        </p>
        <button onClick={() => navigate('/home')} style={{
          padding: '14px 40px',
          background: `linear-gradient(135deg, ${c.secondary} 0%, #B8860B 100%)`,
          color: '#FFF',
          border: 'none',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '1rem',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(212, 160, 23, 0.3)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-2px)'
          e.target.style.boxShadow = '0 6px 16px rgba(212, 160, 23, 0.5)'
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)'
          e.target.style.boxShadow = '0 4px 12px rgba(212, 160, 23, 0.3)'
        }}
        >
          🛍️ {t('continueShopping')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: isMobile ? '1rem' : '2rem',
      background: c.background,
      minHeight: '100vh'
    }}>
      <AuthStatus />
      
      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto', 
        paddingTop: isMobile ? '2rem' : '3rem' 
      }}>
        {/* Header with Back Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isMobile ? '1.5rem' : '2rem',
          gap: '16px',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              background: `linear-gradient(135deg, ${c.primary}15, ${c.primary}05)`,
              border: `2px solid ${c.primary}`,
              color: c.primary,
              cursor: 'pointer',
              fontSize: isMobile ? '0.8rem' : '0.95rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isMobile ? '10px 14px' : '12px 24px',
              borderRadius: '10px',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              if (windowWidth >= 768) {
                e.currentTarget.style.background = c.primary
                e.currentTarget.style.color = '#FFFFFF'
                e.currentTarget.style.transform = 'translateX(-6px)'
              }
            }}
            onMouseLeave={(e) => {
              if (windowWidth >= 768) {
                e.currentTarget.style.background = `linear-gradient(135deg, ${c.primary}15, ${c.primary}05)`
                e.currentTarget.style.color = c.primary
                e.currentTarget.style.transform = 'translateX(0)'
              }
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>←</span>
            {!isMobile && t('backToProducts')}
            {isMobile && 'Back'}
          </button>

          <h1 style={{ 
            fontSize: isMobile ? '1.4rem' : '2.2rem',
            fontWeight: '800',
            color: c.textDark,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flex: isMobile ? 1 : 'auto'
          }}>
            🛒 {t('cart')} <span style={{
              fontSize: isMobile ? '0.85rem' : '1rem',
              fontWeight: '700',
              color: c.secondary,
              background: c.background,
              padding: '4px 12px',
              borderRadius: '20px'
            }}>
              {totalItems}
            </span>
          </h1>
        </div>

        <CartErrorBanner />

        {/* Pending Payment Alert */}
        {pendingPayment && (
          <div style={{
            padding: isMobile ? '1rem' : '1.5rem',
            background: '#FFF3CD',
            border: '2px solid #FFC107',
            borderRadius: '12px',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            animation: 'slideDown 0.3s ease'
          }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404', fontSize: isMobile ? '1rem' : '1.1rem', fontWeight: '700' }}>
                ⚠️ {t('pendingPayment')}
              </h3>
              <p style={{ margin: 0, color: '#856404', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                {t('amount')}: π {pendingPayment.amount} | ID: {pendingPayment.identifier?.slice(0, 8)}...
              </p>
            </div>
            <button
              onClick={handleCompletePending}
              disabled={isProcessing}
              style={{
                padding: isMobile ? '10px 16px' : '12px 24px',
                background: isProcessing ? '#999' : '#FFC107',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontSize: isMobile ? '0.9rem' : '1rem',
                transition: 'all 0.2s ease'
              }}
            >
              {isProcessing ? t('processing') + '...' : t('completePayment')}
            </button>
          </div>
        )}

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 380px',
          gap: '2rem'
        }}>
          {/* Cart Items - Main Column */}
          {items.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              {items.map((item, idx) => {
                const product = productDetails[item.id]
                const stockError = stockErrors[item.id]
                const isOutOfStock = !product || product.stock <= 0
                const isLowStock = product && product.stock > 0 && product.stock < 10
                const canIncrease = product && item.quantity < product.stock
                const isExpanded = expandedItem === item.id
                
                return (
                  <div 
                    key={item.id} 
                    style={{ 
                      padding: isMobile ? '1rem' : '1.5rem',
                      backgroundColor: c.card,
                      borderRadius: '12px',
                      marginBottom: '1rem',
                      border: `2px solid ${stockError ? c.danger : (isOutOfStock ? c.danger : c.border)}`,
                      display: 'grid',
                      gridTemplateColumns: isSmallMobile ? '1fr' : '100px 1fr',
                      gap: '1rem',
                      position: 'relative',
                      overflow: 'hidden',
                      opacity: isOutOfStock ? 0.85 : 1,
                      transition: 'all 0.3s ease',
                      animation: `slideDown 0.3s ease ${idx * 0.05}s both`
                    }}
                  >
                    {/* Product Image */}
                    <div style={{
                      width: isSmallMobile ? '100%' : '100px',
                      height: isSmallMobile ? '180px' : '100px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      position: 'relative',
                      background: c.background,
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/product/${item.id}`)}
                    >
                      {product?.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={item.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: isOutOfStock ? 'grayscale(0.7)' : 'none',
                            transition: 'transform 0.3s ease'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '2.5rem',
                          background: c.background
                        }}>
                          🍫
                        </div>
                      )}
                      
                      {isOutOfStock && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '800',
                          fontSize: '0.65rem',
                          textTransform: 'uppercase',
                          textAlign: 'center',
                          padding: '4px'
                        }}>
                          {t('outOfStock')}
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '0.5rem',
                          gap: '0.5rem'
                        }}>
                          <h3 style={{ 
                            margin: 0, 
                            color: isOutOfStock ? c.textLight : c.textDark,
                            fontSize: isMobile ? '0.95rem' : '1.05rem',
                            textDecoration: isOutOfStock ? 'line-through' : 'none',
                            flex: 1,
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                          onClick={() => navigate(`/product/${item.id}`)}
                          >
                            {item.name}
                          </h3>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: c.danger,
                              fontSize: '1.3rem',
                              cursor: 'pointer',
                              padding: '4px',
                              lineHeight: 1,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.2)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                            aria-label={t('remove')}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Price & Unit Price */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          marginBottom: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ 
                            color: c.secondary, 
                            fontSize: '1.25rem', 
                            fontWeight: '800' 
                          }}>
                            π {(item.price * item.quantity).toFixed(2)}
                          </span>
                          <span style={{ 
                            color: c.textLight, 
                            fontSize: '0.8rem' 
                          }}>
                            (π {item.price.toFixed(2)} {t('each')})
                          </span>
                        </div>

                        {/* Stock Status */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '0.5rem',
                          fontSize: '0.8rem',
                          flexWrap: 'wrap'
                        }}>
                          {isOutOfStock ? (
                            <span style={{ color: c.danger, fontWeight: '600' }}>
                              ❌ {t('outOfStock')}
                            </span>
                          ) : isLowStock ? (
                            <span style={{ color: c.warning, fontWeight: '600' }}>
                              ⚡ {t('onlyLeft', { count: product.stock })}
                            </span>
                          ) : (
                            <span style={{ color: c.success, fontWeight: '600' }}>
                              ✓ {t('inStock', { count: product.stock })}
                            </span>
                          )}
                        </div>

                        {/* Stock Error Message */}
                        {stockError && (
                          <div style={{
                            padding: '8px 12px',
                            background: '#FEE2E2',
                            borderRadius: '6px',
                            marginBottom: '0.5rem',
                            color: '#DC2626',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            ⚠️ {stockError.message}
                          </div>
                        )}
                      </div>

                      {/* Flavors if available */}
                      {product?.flavors && product.flavors.length > 0 && (
                        <div style={{ marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                          <button
                            onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                            style={{
                              fontSize: '0.75rem', 
                              color: c.secondary,
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0',
                              fontWeight: '700',
                              textDecoration: 'underline'
                            }}
                          >
                            🍬 {product.flavors.length} {t('flavorsAvailable')}
                          </button>
                          {isExpanded && (
                            <div style={{ 
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                              marginTop: '6px',
                              paddingTop: '6px',
                              borderTop: `1px solid ${c.border}`
                            }}>
                              {product.flavors.map((flavor, idx) => (
                                <span key={idx} style={{
                                  background: c.background,
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  color: c.textDark,
                                  fontWeight: '600',
                                  fontSize: '0.75rem'
                                }}>
                                  {flavor}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Quantity Controls */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                        marginTop: '0.5rem'
                      }}>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          color: c.textLight,
                          fontWeight: '700'
                        }}>
                          {t('qty')}
                        </span>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          background: c.background,
                          padding: '4px',
                          borderRadius: '8px',
                          border: `1px solid ${c.border}`
                        }}>
                          <button
                            onClick={() => handleQuantityUpdate(item, item.quantity - 1)}
                            disabled={isUpdating[item.id]}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: 'none',
                              background: c.card,
                              color: c.textDark,
                              fontWeight: '700',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: isUpdating[item.id] ? 0.6 : 1,
                              transition: 'all 0.2s ease'
                            }}
                          >−</button>
                          <span style={{ 
                            fontWeight: '700', 
                            minWidth: '30px', 
                            textAlign: 'center',
                            color: c.textDark,
                            fontSize: '0.9rem'
                          }}>
                            {isUpdating[item.id] ? '...' : item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityUpdate(item, item.quantity + 1)}
                            disabled={!canIncrease || isUpdating[item.id] || isOutOfStock}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: 'none',
                              background: !canIncrease || isOutOfStock ? '#E5E7EB' : c.card,
                              color: !canIncrease || isOutOfStock ? '#9CA3AF' : c.textDark,
                              fontWeight: '700',
                              cursor: (!canIncrease || isOutOfStock) ? 'not-allowed' : 'pointer',
                              fontSize: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            title={!canIncrease ? t('maxAvailable', { count: product?.stock }) : t('increaseQuantity')}
                          >+</button>
                        </div>
                        
                        {product && item.quantity >= product.stock && !isOutOfStock && (
                          <span style={{ 
                            fontSize: '0.7rem', 
                            color: c.warning,
                            fontWeight: '700'
                          }}>
                            {t('maxReached')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Sidebar - Order Summary & Checkout */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            {/* Coupon Section - New Feature */}
            <div style={{
              padding: '1.5rem',
              background: c.card,
              borderRadius: '12px',
              border: `2px solid ${c.border}`
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: '700',
                color: c.textDark
              }}>
                🎟️ {t('haveCoupon')}
              </h3>
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder={t('enterCouponCode')}
                  disabled={appliedCoupon}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: `1px solid ${c.border}`,
                    borderRadius: '8px',
                    background: c.background,
                    color: c.textDark,
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={appliedCoupon || !couponInput}
                  style={{
                    padding: '10px 16px',
                    background: (appliedCoupon || !couponInput) ? '#999' : c.success,
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '700',
                    cursor: (appliedCoupon || !couponInput) ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {t('apply')}
                </button>
              </div>
              {appliedCoupon && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '8px 12px',
                  background: '#D1FAE5',
                  borderRadius: '6px',
                  color: '#047857',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>✅ {appliedCoupon.label}</span>
                  <button
                    onClick={() => {
                      setAppliedCoupon(null)
                      setCouponInput('')
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#047857',
                      cursor: 'pointer',
                      fontWeight: '700'
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* Order Summary */}
            {(items.length > 0 || pendingPayment) && (
              <div style={{
                padding: '1.5rem',
                background: c.card,
                borderRadius: '12px',
                border: `2px solid ${c.secondary}40`,
                position: 'sticky',
                top: '100px'
              }}>
                <h3 style={{
                  margin: '0 0 1rem 0',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: c.textDark
                }}>
                  {t('orderSummary')}
                </h3>

                {/* Summary Details */}
                <div style={{ marginBottom: '1rem', borderBottom: `1px solid ${c.border}`, paddingBottom: '1rem' }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    color: c.textLight,
                    fontSize: '0.9rem'
                  }}>
                    <span>{t('subtotal')}</span>
                    <span>π {totalPrice.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                      color: c.success,
                      fontSize: '0.9rem',
                      fontWeight: '700'
                    }}>
                      <span>💰 {t('discount')}</span>
                      <span>-π {discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                    color: c.textLight,
                    fontSize: '0.9rem'
                  }}>
                    <span>{t('shipping')}</span>
                    <span style={{ color: c.success, fontWeight: '700' }}>{t('free')}</span>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.3rem',
                  fontWeight: '800',
                  color: c.textDark,
                  marginBottom: '1.5rem'
                }}>
                  <span>{t('total')}:</span>
                  <span style={{ color: c.secondary }}>
                    π {(pendingPayment ? pendingPayment.amount : finalPrice).toFixed(2)}
                  </span>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={!piAuthenticated || piLoading || isProcessing || pendingPayment || Object.keys(stockErrors).length > 0}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: (piAuthenticated && !piLoading && !isProcessing && !pendingPayment && Object.keys(stockErrors).length === 0)
                      ? `linear-gradient(135deg, ${c.secondary} 0%, #B8860B 100%)`
                      : '#9CA3AF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '1rem',
                    cursor: (piAuthenticated && !piLoading && !isProcessing && !pendingPayment && Object.keys(stockErrors).length === 0) ? 'pointer' : 'not-allowed',
                    opacity: (piAuthenticated && !piLoading && !isProcessing && !pendingPayment && Object.keys(stockErrors).length === 0) ? 1 : 0.7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    if ((piAuthenticated && !piLoading && !isProcessing && !pendingPayment && Object.keys(stockErrors).length === 0)) {
                      e.target.style.transform = 'translateY(-2px)'
                      e.target.style.boxShadow = '0 6px 16px rgba(212, 160, 23, 0.3)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                >
                  {isProcessing ? (
                    <>
                      <span>⏳</span>
                      {t('processing')}...
                    </>
                  ) : piLoading ? (
                    '⏳ ' + t('connectingToPi') + '...'
                  ) : pendingPayment ? (
                    '⚠️ ' + t('completePendingFirst')
                  ) : Object.keys(stockErrors).length > 0 ? (
                    '❌ ' + t('resolveStockIssues')
                  ) : piAuthenticated ? (
                    <>
                      <span style={{ fontSize: '1.3rem' }}>π</span>
                      {t('checkoutWithPi')}
                    </>
                  ) : (
                    '❌ ' + t('piNotConnected')
                  )}
                </button>
                
                {piAuthError && (
                  <p style={{
                    marginTop: '12px',
                    color: c.danger,
                    fontSize: '0.8rem',
                    textAlign: 'center'
                  }}>
                    ⚠️ {piAuthError}
                  </p>
                )}

                {Object.keys(stockErrors).length > 0 && (
                  <p style={{
                    marginTop: '12px',
                    color: c.danger,
                    fontSize: '0.8rem',
                    textAlign: 'center'
                  }}>
                    ⚠️ {t('adjustQuantitiesBeforeCheckout')}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInBounce {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes slideOut {
          to {
            opacity: 0;
            transform: translateX(-50%) translateY(-30px);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
