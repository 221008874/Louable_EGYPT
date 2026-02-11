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
  
  // NEW: State for enhanced product display and stock validation
  const [productDetails, setProductDetails] = useState({})
  const [stockErrors, setStockErrors] = useState({})
  const [isUpdating, setIsUpdating] = useState({})
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)

  const isMobile = windowWidth < 768
  const isSmallMobile = windowWidth < 480

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // NEW: Fetch current product details including stock
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
                message: `Only ${data.stock} available (you have ${item.quantity} in cart)`
              }
            }
          } else {
            errors[item.id] = {
              type: 'PRODUCT_NOT_FOUND',
              message: 'Product no longer available'
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
  }, [items])

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
          navigate('/order-success');
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
      navigate('/order-success');
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
          setPiAuthError('Please open this app in Pi Browser')
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
        setPiAuthError(error.message || 'Authentication failed')
        setPiAuthenticated(false)
      } finally {
        setPiLoading(false)
      }
    }
    authenticatePi()
  }, [])

  const handleCompletePending = async () => {
    if (!pendingPayment) return;
    setIsProcessing(true);
    await completePendingPayment(pendingPayment);
    setIsProcessing(false);
  };

  const handleCheckout = async () => {
    if (!window.Pi) {
      alert('Pi not initialized. Please open in Pi Browser.');
      return;
    }

    if (isProcessing) {
      alert('Payment already in progress. Please wait...');
      return;
    }

    if (pendingPayment) {
      const shouldComplete = confirm('You have a pending payment. Complete it first?');
      if (shouldComplete) {
        await handleCompletePending();
      }
      return;
    }

    // NEW: Validate stock before checkout
    const hasStockErrors = Object.keys(stockErrors).length > 0
    if (hasStockErrors) {
      alert('Please resolve stock issues before checkout')
      return
    }

    setIsProcessing(true);

    try {
      console.log('💳 Creating new payment...');
      
      const paymentData = {
        amount: Number(totalPrice),
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
            alert('❌ Approval failed: ' + error.message);
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
                orderDetails: { items, totalPrice, totalItems }
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
              totalPrice,
              totalItems,
              currency: 'PI',
              status: 'completed',
              createdAt: serverTimestamp()
            });

            console.log('✅ Order saved to Firebase');
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

        onError: (error, payment) => {
          console.error('💥 Payment error:', error, payment);
          setIsProcessing(false);
          
          if (error.message?.includes('pending payment')) {
            alert('⚠️ You have a pending payment. Please complete it first.');
          } else {
            alert('❌ Payment failed: ' + (error.message || 'Unknown error'));
          }
        }
      };

      const payment = await window.Pi.createPayment(paymentData, callbacks);
      console.log('💳 Payment created successfully:', payment?.identifier);

    } catch (error) {
      console.error('🔥 Checkout error:', error);
      alert('❌ Checkout failed: ' + (error.message || 'Please try again'));
      setIsProcessing(false);
    }
  };

  // NEW: Enhanced quantity update with stock validation
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
          message: `Only ${availableStock} available`
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

  // NEW: Cart Error Display
  const CartErrorBanner = () => {
    if (!cartError && Object.keys(stockErrors).length === 0) return null
    
    return (
      <div style={{
        padding: isMobile ? '12px 16px' : '16px 20px',
        background: '#FEE2E2',
        border: '2px solid #EF4444',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        color: '#991B1B'
      }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem' }}>⚠️ Stock Issues Detected</h4>
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
            padding: '6px 12px',
            background: '#EF4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.8rem',
            cursor: 'pointer'
          }}
        >
          Dismiss
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
        <div style={{ fontSize: isMobile ? '3rem' : '4rem', marginBottom: '1rem', opacity: 0.4 }}>🛒</div>
        <h2 style={{ 
          fontSize: isMobile ? '1.5rem' : '1.8rem', 
          marginBottom: '1rem', 
          color: c.textDark 
        }}>
          {t('emptyCart') || 'Your cart is empty'}
        </h2>
        <button onClick={() => navigate('/home')} style={{
          padding: '12px 32px',
          background: c.success,
          color: '#FFF',
          border: 'none',
          borderRadius: '10px',
          fontWeight: '700',
          fontSize: '1rem',
          cursor: 'pointer'
        }}>
          🛍️ {t('continueShopping') || 'Continue Shopping'}
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
        maxWidth: '1000px', 
        margin: '0 auto', 
        paddingTop: isMobile ? '2rem' : '3rem' 
      }}>
        <h2 style={{ 
          fontSize: isMobile ? '1.5rem' : '1.8rem',
          fontWeight: '700',
          color: c.textDark,
          marginBottom: isMobile ? '1.5rem' : '2rem'
        }}>
          {t('cart') || 'Shopping Cart'} ({totalItems} {totalItems === 1 ? 'item' : 'items'})
        </h2>

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
            gap: '1rem'
          }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404', fontSize: isMobile ? '1rem' : '1.1rem' }}>
                ⚠️ Pending Payment
              </h3>
              <p style={{ margin: 0, color: '#856404', fontSize: isMobile ? '0.9rem' : '1rem' }}>
                Amount: π {pendingPayment.amount} | ID: {pendingPayment.identifier?.slice(0, 8)}...
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
                fontSize: isMobile ? '0.9rem' : '1rem'
              }}
            >
              {isProcessing ? 'Processing...' : 'Complete Payment'}
            </button>
          </div>
        )}

        {/* Cart Items - ENHANCED WITH PRODUCT DETAILS */}
        {items.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            {items.map((item) => {
              const product = productDetails[item.id]
              const stockError = stockErrors[item.id]
              const isOutOfStock = !product || product.stock <= 0
              const isLowStock = product && product.stock > 0 && product.stock < 10
              const canIncrease = product && item.quantity < product.stock
              
              return (
                <div 
                  key={item.id} 
                  style={{ 
                    padding: isMobile ? '1rem' : '1.5rem',
                    backgroundColor: c.card,
                    borderRadius: '12px',
                    marginBottom: '1rem',
                    border: `2px solid ${stockError ? c.danger : (isOutOfStock ? c.danger : c.border)}`,
                    display: 'flex',
                    flexDirection: isSmallMobile ? 'column' : 'row',
                    gap: isMobile ? '1rem' : '1.5rem',
                    alignItems: isSmallMobile ? 'stretch' : 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    opacity: isOutOfStock ? 0.85 : 1
                  }}
                >
                  {/* Product Image */}
                  <div style={{
                    width: isSmallMobile ? '100%' : (isMobile ? '80px' : '100px'),
                    height: isSmallMobile ? '200px' : (isMobile ? '80px' : '100px'),
                    borderRadius: '10px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    position: 'relative',
                    background: c.background
                  }}>
                    {product?.imageUrl ? (
                      <img 
                        src={product.imageUrl} 
                        alt={item.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: isOutOfStock ? 'grayscale(0.7)' : 'none'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '2rem',
                        background: c.background
                      }}>
                        🍫
                      </div>
                    )}
                    
                    {/* Stock Badge on Image */}
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
                        fontSize: '0.75rem',
                        textTransform: 'uppercase'
                      }}>
                        Out of Stock
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
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
                        fontSize: isMobile ? '1rem' : '1.1rem',
                        textDecoration: isOutOfStock ? 'line-through' : 'none',
                        flex: 1
                      }}>
                        {item.name}
                      </h3>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: c.danger,
                          fontSize: '1.2rem',
                          cursor: 'pointer',
                          padding: '4px',
                          lineHeight: 1
                        }}
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Price & Unit Price */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '0.75rem',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ 
                        color: c.secondary, 
                        fontSize: isMobile ? '1.1rem' : '1.25rem', 
                        fontWeight: '800' 
                      }}>
                        π {(item.price * item.quantity).toFixed(2)}
                      </span>
                      <span style={{ 
                        color: c.textLight, 
                        fontSize: '0.85rem' 
                      }}>
                        (π {item.price.toFixed(2)} each)
                      </span>
                    </div>

                    {/* Stock Status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '0.75rem',
                      fontSize: '0.85rem'
                    }}>
                      {isOutOfStock ? (
                        <span style={{ color: c.danger, fontWeight: '600' }}>
                          ❌ Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span style={{ color: c.warning, fontWeight: '600' }}>
                          ⚡ Only {product.stock} left!
                        </span>
                      ) : (
                        <span style={{ color: c.success, fontWeight: '600' }}>
                          ✓ In Stock ({product.stock} available)
                        </span>
                      )}
                    </div>

                    {/* Stock Error Message */}
                    {stockError && (
                      <div style={{
                        padding: '8px 12px',
                        background: '#FEE2E2',
                        borderRadius: '6px',
                        marginBottom: '0.75rem',
                        color: '#DC2626',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        ⚠️ {stockError.message}
                      </div>
                    )}

                    {/* Flavors if available */}
                    {product?.flavors && product.flavors.length > 0 && (
                      <div style={{ marginBottom: '0.75rem' }}>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          color: c.textLight,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          🍬 {product.flavors.slice(0, 3).join(', ')}
                          {product.flavors.length > 3 && ` +${product.flavors.length - 3} more`}
                        </span>
                      </div>
                    )}

                    {/* Quantity Controls */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.75rem',
                      flexWrap: 'wrap'
                    }}>
                      <span style={{ 
                        fontSize: '0.85rem', 
                        color: c.textLight,
                        fontWeight: '600'
                      }}>
                        Qty:
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
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isUpdating[item.id] ? 0.6 : 1
                          }}
                        >−</button>
                        <span style={{ 
                          fontWeight: '700', 
                          minWidth: '32px', 
                          textAlign: 'center',
                          color: c.textDark
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
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={!canIncrease ? `Max ${product?.stock} available` : 'Increase quantity'}
                        >+</button>
                      </div>
                      
                      {/* Max indicator */}
                      {product && item.quantity >= product.stock && !isOutOfStock && (
                        <span style={{ 
                          fontSize: '0.75rem', 
                          color: c.warning,
                          fontWeight: '600'
                        }}>
                          Max reached
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Order Summary */}
        {(items.length > 0 || pendingPayment) && (
          <div style={{
            padding: isMobile ? '1.5rem' : '2rem',
            background: c.card,
            borderRadius: '12px',
            border: `2px solid ${c.secondary}40`,
            maxWidth: '550px',
            margin: '0 auto',
            position: 'sticky',
            bottom: isMobile ? '1rem' : '2rem',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
          }}>
            {/* Summary Details */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                color: c.textLight,
                fontSize: '0.9rem'
              }}>
                <span>Subtotal ({totalItems} items)</span>
                <span>π {totalPrice.toFixed(2)}</span>
              </div>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem',
                color: c.textLight,
                fontSize: '0.9rem'
              }}>
                <span>Shipping</span>
                <span style={{ color: c.success }}>Free</span>
              </div>
            </div>

            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: isMobile ? '1.3rem' : '1.5rem',
              fontWeight: '700',
              color: c.textDark,
              marginBottom: '1.5rem',
              paddingTop: '1rem',
              borderTop: `2px solid ${c.border}`
            }}>
              <span>{t('total') || 'Total'}:</span>
              <span style={{ color: c.secondary }}>
                π {(pendingPayment ? pendingPayment.amount : totalPrice).toFixed(2)}
              </span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={!piAuthenticated || piLoading || isProcessing || pendingPayment || Object.keys(stockErrors).length > 0}
              style={{
                width: '100%',
                padding: isMobile ? '14px' : '16px',
                background: (piAuthenticated && !piLoading && !isProcessing && !pendingPayment && Object.keys(stockErrors).length === 0)
                  ? `linear-gradient(135deg, ${c.secondary} 0%, #B8860B 100%)`
                  : '#9CA3AF',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: isMobile ? '1.1rem' : '1.2rem',
                cursor: (piAuthenticated && !piLoading && !isProcessing && !pendingPayment && Object.keys(stockErrors).length === 0) ? 'pointer' : 'not-allowed',
                opacity: (piAuthenticated && !piLoading && !isProcessing && !pendingPayment && Object.keys(stockErrors).length === 0) ? 1 : 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.3s ease'
              }}
            >
              {isProcessing ? (
                <>
                  <span>⏳</span>
                  Processing...
                </>
              ) : piLoading ? (
                '⏳ Connecting to Pi...'
              ) : pendingPayment ? (
                '⚠️ Complete Pending Payment First'
              ) : Object.keys(stockErrors).length > 0 ? (
                '❌ Resolve Stock Issues'
              ) : piAuthenticated ? (
                <>
                  <span style={{ fontSize: '1.4rem' }}>π</span>
                  {t('checkout') || 'Checkout'} with Pi
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

            {Object.keys(stockErrors).length > 0 && (
              <p style={{
                marginTop: '12px',
                color: c.danger,
                fontSize: '0.85rem',
                textAlign: 'center'
              }}>
                ⚠️ Please adjust quantities before checkout
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
