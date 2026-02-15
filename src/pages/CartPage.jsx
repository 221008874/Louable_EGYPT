// src/pages/CartPage.jsx - UPDATED WITH EGP CURRENCY AND DELIVERY INFO
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { db } from '../services/firebase'
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore'

export default function CartPage() {
  const { 
    items, 
    totalItems, 
    totalPrice, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    error: cartError, 
    clearError,
    deliveryInfo,
    setDeliveryInfo,
    clearDeliveryInfo
  } = useCart()
  const { t, lang } = useLanguage()
  const { theme } = useTheme()
  const navigate = useNavigate()
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [expandedItem, setExpandedItem] = useState(null)
  
  // Delivery info form state
  const [deliveryFormData, setDeliveryFormData] = useState({
    name: deliveryInfo?.name || '',
    age: deliveryInfo?.age || '',
    phone: deliveryInfo?.phone || '',
    address: deliveryInfo?.address || '',
    latitude: deliveryInfo?.latitude || null,
    longitude: deliveryInfo?.longitude || null
  });
  const [mapCenter, setMapCenter] = useState(null);
  const [isGeolocationSupported, setIsGeolocationSupported] = useState(true);
  const [deliveryFormErrors, setDeliveryFormErrors] = useState({});
  const [isDeliveryInfoValid, setIsDeliveryInfoValid] = useState(!!deliveryInfo);
  
  // State for enhanced product display and stock validation
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

  // Get user's current location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsGeolocationSupported(false);
      // Fallback to Cairo, Egypt
      setMapCenter({ lat: 30.0444, lng: 31.2357 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter({ lat: latitude, lng: longitude });
        
        // If no saved location, use current location
        if (!deliveryFormData.latitude && !deliveryFormData.longitude) {
          setDeliveryFormData(prev => ({
            ...prev,
            latitude,
            longitude
          }));
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        // Fallback to Cairo, Egypt if geolocation fails
        setMapCenter({ lat: 30.0444, lng: 31.2357 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Fetch current product details including stock
  useEffect(() => {
    const fetchProductDetails = async () => {
      const details = {}
      const errors = {}
      
      for (const item of items) {
        try {
          const docRef = doc(db, 'products_egp', item.id)
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

  const validateDeliveryForm = () => {
    const newErrors = {};
    
    if (!deliveryFormData.name.trim()) newErrors.name = t('nameRequired');
    if (!deliveryFormData.age || deliveryFormData.age < 13 || deliveryFormData.age > 120) newErrors.age = t('validAgeRequired');
    if (!deliveryFormData.phone.trim() || !/^\+?[\d\s\-\(\)]{10,}$/.test(deliveryFormData.phone)) {
      newErrors.phone = t('validPhoneRequired');
    }
    if (!deliveryFormData.address.trim()) newErrors.address = t('addressRequired');
    if (!deliveryFormData.latitude || !deliveryFormData.longitude) newErrors.location = t('locationRequired');
    
    setDeliveryFormErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    setIsDeliveryInfoValid(isValid);
    return isValid;
  };

  const handleDeliveryInputChange = (e) => {
    const { name, value } = e.target;
    setDeliveryFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveDeliveryInfo = (e) => {
    e.preventDefault();
    if (validateDeliveryForm()) {
      setDeliveryInfo(deliveryFormData);
    }
  };

  const discountAmount = appliedCoupon ? totalPrice * appliedCoupon.discount : 0
  const finalPrice = totalPrice - discountAmount

  const handleCheckout = async () => {
    // Validate stock before checkout
    const hasStockErrors = Object.keys(stockErrors).length > 0
    if (hasStockErrors) {
      alert(t('resolveStockIssues'))
      return
    }

    // Validate delivery info
    if (!deliveryInfo) {
      alert(t('pleaseCompleteDeliveryInfo'));
      return;
    }

    setIsProcessing(true)

    try {
      console.log('💳 Processing payment with EGP...')
      
      // Create order in Firebase with delivery info
      await addDoc(collection(db, 'orders_egp'), {
        orderId: `order_${Date.now()}`,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1
        })),
        totalPrice: finalPrice,
        totalItems: items.length,
        currency: 'EGP',
        paymentMethod: 'Cash on Delivery',
        status: 'pending',
        // Delivery information
        customerName: deliveryInfo.name,
        customerAge: parseInt(deliveryInfo.age),
        customerPhone: deliveryInfo.phone,
        customerAddress: deliveryInfo.address,
        customerLocation: {
          latitude: deliveryInfo.latitude,
          longitude: deliveryInfo.longitude
        },
        createdAt: serverTimestamp()
      })

      console.log('✅ Order saved to Firebase')
      clearCart();
      clearDeliveryInfo(); // Clear delivery info after successful order
      navigate('/order-success', { 
        state: { 
          orderId: `order_${Date.now()}`, 
          txid: `TXN-${Date.now()}`, 
          totalPrice: finalPrice, 
          items,
          deliveryInfo
        } 
      })
      
    } catch (error) {
      console.error('🔥 Checkout error:', error)
      alert(t('checkoutFailed') + ': ' + (error.message || t('tryAgain')))
      setIsProcessing(false)
    }
  }

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

  // Delivery Info Form Component
  const DeliveryInfoForm = () => (
    <div style={{ 
      background: '#f8f9fa', 
      padding: '2rem', 
      borderRadius: '12px',
      border: '1px solid #dee2e6',
      marginBottom: '2rem'
    }}>
      <h3 style={{ 
        marginBottom: '1.5rem', 
        color: '#2c3e50',
        fontWeight: '700'
      }}>
        📍 {t('deliveryInformation')}
      </h3>
      
      <form onSubmit={handleSaveDeliveryInfo}>
        {/* Name */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            {t('fullName')} *
          </label>
          <input
            type="text"
            name="name"
            value={deliveryFormData.name}
            onChange={handleDeliveryInputChange}
            placeholder={t('enterFullName')}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
          {deliveryFormErrors.name && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{deliveryFormErrors.name}</span>}
        </div>

        {/* Age */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            {t('age')} *
          </label>
          <input
            type="number"
            name="age"
            value={deliveryFormData.age}
            onChange={handleDeliveryInputChange}
            min="13"
            max="120"
            placeholder={t('enterAge')}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
          {deliveryFormErrors.age && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{deliveryFormErrors.age}</span>}
        </div>

        {/* Phone */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            {t('phoneNumber')} *
          </label>
          <input
            type="tel"
            name="phone"
            value={deliveryFormData.phone}
            onChange={handleDeliveryInputChange}
            placeholder="+20 123 456 7890"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
          {deliveryFormErrors.phone && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{deliveryFormErrors.phone}</span>}
        </div>

        {/* Address */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            {t('detailedAddress')} *
          </label>
          <textarea
            name="address"
            value={deliveryFormData.address}
            onChange={handleDeliveryInputChange}
            placeholder={t('enterDetailedAddress')}
            rows="3"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '1rem',
              resize: 'vertical'
            }}
          />
          {deliveryFormErrors.address && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{deliveryFormErrors.address}</span>}
        </div>

        {/* Location Map */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            {t('selectLocationOnMap')} *
          </label>
          
          {!isGeolocationSupported && (
            <p style={{ color: '#ffc107', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              ⚠️ {t('geolocationNotSupported')}
            </p>
          )}
          
          <div style={{
            height: '300px',
            border: '1px solid #ced4da',
            borderRadius: '6px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {mapCenter ? (
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.01}%2C${mapCenter.lat - 0.01}%2C${mapCenter.lng + 0.01}%2C${mapCenter.lat + 0.01}&marker=${mapCenter.lat}%2C${mapCenter.lng}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                title="Location Map"
              />
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                backgroundColor: '#e9ecef'
              }}>
                <span>📍 {t('loadingMap')}...</span>
              </div>
            )}
          </div>
          
          {deliveryFormErrors.location && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{deliveryFormErrors.location}</span>}
          
          <p style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.5rem' }}>
            {t('clickMapToSelectLocation')}
          </p>
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          {t('saveDeliveryInfo')}
        </button>
      </form>
    </div>
  );

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
                            {(item.price * item.quantity).toFixed(2)} EGP
                          </span>
                          <span style={{ 
                            color: c.textLight, 
                            fontSize: '0.8rem' 
                          }}>
                            ({item.price.toFixed(2)} EGP {t('each')})
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
            {/* Delivery Info Form */}
            <DeliveryInfoForm />

            {/* Coupon Section */}
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
            {items.length > 0 && (
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
                    <span>{totalPrice.toFixed(2)} EGP</span>
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
                      <span>-{discountAmount.toFixed(2)} EGP</span>
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
                    {finalPrice.toFixed(2)} EGP
                  </span>
                </div>

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || Object.keys(stockErrors).length > 0 || !isDeliveryInfoValid}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: (Object.keys(stockErrors).length === 0 && !isProcessing && isDeliveryInfoValid)
                      ? `linear-gradient(135deg, ${c.secondary} 0%, #B8860B 100%)`
                      : '#9CA3AF',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '700',
                    fontSize: '1rem',
                    cursor: (Object.keys(stockErrors).length === 0 && !isProcessing && isDeliveryInfoValid) ? 'pointer' : 'not-allowed',
                    opacity: (Object.keys(stockErrors).length === 0 && !isProcessing && isDeliveryInfoValid) ? 1 : 0.7,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    if ((Object.keys(stockErrors).length === 0 && !isProcessing && isDeliveryInfoValid)) {
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
                  ) : !isDeliveryInfoValid ? (
                    '📝 ' + t('completeDeliveryInfo')
                  ) : Object.keys(stockErrors).length > 0 ? (
                    '❌ ' + t('resolveStockIssues')
                  ) : (
                    <>
                      <span style={{ fontSize: '1.3rem' }}>💳</span>
                      {t('checkout')}
                    </>
                  )}
                </button>

                {(!isDeliveryInfoValid || Object.keys(stockErrors).length > 0) && (
                  <p style={{
                    marginTop: '12px',
                    color: c.danger,
                    fontSize: '0.8rem',
                    textAlign: 'center'
                  }}>
                    {(!isDeliveryInfoValid && Object.keys(stockErrors).length > 0) 
                      ? t('completeAllRequirements') 
                      : !isDeliveryInfoValid 
                        ? t('completeDeliveryInfo') 
                        : t('adjustQuantitiesBeforeCheckout')}
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
