// src/pages/CartPage.jsx - FIXED onBlur ERRORS
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
  const [deliveryTouchedFields, setDeliveryTouchedFields] = useState({});
  const [isDeliveryInfoValid, setIsDeliveryInfoValid] = useState(!!deliveryInfo);
  
  // State for enhanced product display and stock validation
  const [productDetails, setProductDetails] = useState({})
  const [stockErrors, setStockErrors] = useState({})
  const [isUpdating, setIsUpdating] = useState({})
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [hoveredItem, setHoveredItem] = useState(null)

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
      setMapCenter({ lat: 30.0444, lng: 31.2357 });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter({ lat: latitude, lng: longitude });
        
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

  const handleDeliveryFieldBlur = (fieldName) => {
    setDeliveryTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    validateDeliveryForm();
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
    const hasStockErrors = Object.keys(stockErrors).length > 0
    if (hasStockErrors) {
      alert(t('resolveStockIssues'))
      return
    }

    if (!deliveryInfo) {
      alert(t('pleaseCompleteDeliveryInfo'));
      return;
    }

    setIsProcessing(true)

    try {
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

      clearCart();
      clearDeliveryInfo();
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
      console.error('Checkout error:', error)
      alert(t('checkoutFailed') + ': ' + (error.message || t('tryAgain')))
      setIsProcessing(false)
    }
  }

  const handleQuantityUpdate = async (item, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(item.id)
      return
    }

    const product = productDetails[item.id]
    const availableStock = product?.stock || 0
    
    setIsUpdating(prev => ({ ...prev, [item.id]: true }))
    updateQuantity(item.id, newQuantity, availableStock)
    
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

  // Enhanced color scheme
  const colors = {
    light: {
      primary: '#2C1810',
      secondary: '#D4A574',
      accent: '#E8B4A0',
      background: '#FAFAF8',
      surface: '#FFFFFF',
      card: '#FCFBF9',
      textDark: '#1A1410',
      textMuted: '#8B7D73',
      success: '#6B9E5F',
      danger: '#C84B31',
      warning: '#E8A840',
      border: '#E8DDD4',
      overlay: 'rgba(44, 24, 16, 0.05)'
    },
    dark: {
      primary: '#E8B4A0',
      secondary: '#D4A574',
      accent: '#C49080',
      background: '#0F0E0C',
      surface: '#1A1410',
      card: '#2C1810',
      textDark: '#F5F3F0',
      textMuted: '#A8968B',
      success: '#8FC178',
      danger: '#E67052',
      warning: '#F0B956',
      border: '#3E2723',
      overlay: 'rgba(232, 180, 160, 0.05)'
    }
  }

  const c = theme === 'light' ? colors.light : colors.dark

  // Cart Error Banner
  const CartErrorBanner = () => {
    if (!cartError && Object.keys(stockErrors).length === 0) return null
    
    return (
      <div style={{
        padding: '16px 20px',
        background: theme === 'light' ? '#FEF2F0' : '#4A2B24',
        border: `2px solid ${c.danger}`,
        borderRadius: '16px',
        marginBottom: '2rem',
        color: c.danger,
        animation: 'slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: '700' }}>
              {t('stockIssuesDetected')}
            </h4>
            {cartError && <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', opacity: 0.9 }}>{cartError.message}</p>}
            {Object.entries(stockErrors).map(([id, error]) => (
              <p key={id} style={{ margin: '4px 0', fontSize: '0.85rem', opacity: 0.9 }}>
                • {items.find(i => i.id === id)?.name}: {error.message}
              </p>
            ))}
            <button 
              onClick={() => { clearError(); setStockErrors({}) }}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                background: c.danger,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: '700',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              {t('dismiss')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Delivery Info Form Component - FIXED WITH STABLE INPUTS
  const DeliveryInfoForm = () => (
    <form onSubmit={handleSaveDeliveryInfo}>
      <div style={{ 
        background: c.card,
        padding: isMobile ? '1.5rem' : '2.5rem',
        borderRadius: '20px',
        border: `2px solid ${c.border}`,
        marginBottom: '2rem',
        boxShadow: `0 8px 24px ${c.overlay}`
      }}>
        <h3 style={{ 
          marginBottom: '2rem', 
          color: c.textDark,
          fontWeight: '800',
          fontSize: isMobile ? '1.2rem' : '1.3rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <span style={{ fontSize: '1.5rem' }}>📍</span>
          {t('deliveryInformation')}
        </h3>
        
        {/* Name & Age - Side by side on desktop */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
          gap: isMobile ? '1.5rem' : '2rem',
          marginBottom: '2rem'
        }}>
          {/* Name */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.75rem', 
              fontWeight: '700', 
              fontSize: '0.95rem', 
              color: c.textDark,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {t('fullName')} <span style={{ color: c.danger }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              value={deliveryFormData.name}
              onChange={handleDeliveryInputChange}
              onBlur={() => handleDeliveryFieldBlur('name')}
              placeholder={t('enterFullName')}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `2px solid ${deliveryTouchedFields.name && deliveryFormErrors.name ? c.danger : c.border}`,
                borderRadius: '12px',
                fontSize: '1rem',
                background: c.surface,
                color: c.textDark,
                transition: 'all 0.3s ease',
                boxShadow: deliveryTouchedFields.name && deliveryFormErrors.name ? `0 0 0 4px ${c.overlay}` : 'none',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                if (!deliveryFormErrors.name) {
                  e.target.style.borderColor = c.secondary
                }
              }}
            />
            {deliveryTouchedFields.name && deliveryFormErrors.name && (
              <div style={{ color: c.danger, fontSize: '0.8rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                <span>✕</span>
                {deliveryFormErrors.name}
              </div>
            )}
          </div>

          {/* Age */}
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.75rem', 
              fontWeight: '700', 
              fontSize: '0.95rem', 
              color: c.textDark,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              {t('age')} <span style={{ color: c.danger }}>*</span>
            </label>
            <input
              type="number"
              name="age"
              value={deliveryFormData.age}
              onChange={handleDeliveryInputChange}
              onBlur={() => handleDeliveryFieldBlur('age')}
              min="13"
              max="120"
              placeholder={t('enterAge')}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `2px solid ${deliveryTouchedFields.age && deliveryFormErrors.age ? c.danger : c.border}`,
                borderRadius: '12px',
                fontSize: '1rem',
                background: c.surface,
                color: c.textDark,
                transition: 'all 0.3s ease',
                boxShadow: deliveryTouchedFields.age && deliveryFormErrors.age ? `0 0 0 4px ${c.overlay}` : 'none',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                if (!deliveryFormErrors.age) {
                  e.target.style.borderColor = c.secondary
                }
              }}
            />
            {deliveryTouchedFields.age && deliveryFormErrors.age && (
              <div style={{ color: c.danger, fontSize: '0.8rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
                <span>✕</span>
                {deliveryFormErrors.age}
              </div>
            )}
          </div>
        </div>

        {/* Phone */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.75rem', 
            fontWeight: '700', 
            fontSize: '0.95rem', 
            color: c.textDark,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {t('phoneNumber')} <span style={{ color: c.danger }}>*</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={deliveryFormData.phone}
            onChange={handleDeliveryInputChange}
            onBlur={() => handleDeliveryFieldBlur('phone')}
            placeholder="+20 123 456 7890"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `2px solid ${deliveryTouchedFields.phone && deliveryFormErrors.phone ? c.danger : c.border}`,
              borderRadius: '12px',
              fontSize: '1rem',
              background: c.surface,
              color: c.textDark,
              transition: 'all 0.3s ease',
              boxShadow: deliveryTouchedFields.phone && deliveryFormErrors.phone ? `0 0 0 4px ${c.overlay}` : 'none',
              fontFamily: 'inherit'
            }}
            onFocus={(e) => {
              if (!deliveryFormErrors.phone) {
                e.target.style.borderColor = c.secondary
              }
            }}
          />
          {deliveryTouchedFields.phone && deliveryFormErrors.phone && (
            <div style={{ color: c.danger, fontSize: '0.8rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <span>✕</span>
              {deliveryFormErrors.phone}
            </div>
          )}
        </div>

        {/* Address */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.75rem', 
            fontWeight: '700', 
            fontSize: '0.95rem', 
            color: c.textDark,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {t('detailedAddress')} <span style={{ color: c.danger }}>*</span>
          </label>
          <textarea
            name="address"
            value={deliveryFormData.address}
            onChange={handleDeliveryInputChange}
            onBlur={() => handleDeliveryFieldBlur('address')}
            placeholder={t('enterDetailedAddress')}
            rows="3"
            style={{
              width: '100%',
              padding: '12px 16px',
              border: `2px solid ${deliveryTouchedFields.address && deliveryFormErrors.address ? c.danger : c.border}`,
              borderRadius: '12px',
              fontSize: '1rem',
              background: c.surface,
              color: c.textDark,
              transition: 'all 0.3s ease',
              resize: 'vertical',
              fontFamily: 'inherit',
              boxShadow: deliveryTouchedFields.address && deliveryFormErrors.address ? `0 0 0 4px ${c.overlay}` : 'none'
            }}
            onFocus={(e) => {
              if (!deliveryFormErrors.address) {
                e.target.style.borderColor = c.secondary
              }
            }}
          />
          {deliveryTouchedFields.address && deliveryFormErrors.address && (
            <div style={{ color: c.danger, fontSize: '0.8rem', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600' }}>
              <span>✕</span>
              {deliveryFormErrors.address}
            </div>
          )}
        </div>

        {/* Location Map */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.75rem', 
            fontWeight: '700', 
            fontSize: '0.95rem', 
            color: c.textDark,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {t('selectLocationOnMap')} <span style={{ color: c.danger }}>*</span>
          </label>
          
          {!isGeolocationSupported && (
            <div style={{ 
              color: c.warning, 
              fontSize: '0.85rem', 
              marginBottom: '1rem', 
              padding: '12px 16px',
              background: `${c.warning}15`,
              borderLeft: `4px solid ${c.warning}`,
              borderRadius: '8px',
              fontWeight: '700'
            }}>
              ⚠️ {t('geolocationNotSupported')}
            </div>
          )}
          
          <div style={{
            height: '320px',
            border: `2px solid ${deliveryFormErrors.location ? c.danger : c.border}`,
            borderRadius: '16px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: `0 4px 12px ${c.overlay}`,
            transition: 'all 0.3s ease'
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
                backgroundColor: c.overlay,
                flexDirection: 'column',
                gap: '12px'
              }}>
                <span style={{ fontSize: '2.5rem', animation: 'float 3s ease-in-out infinite' }}>📍</span>
                <span style={{ color: c.textMuted, fontWeight: '700' }}>{t('loadingMap')}...</span>
              </div>
            )}
          </div>
          
          {deliveryFormErrors.location && (
            <div style={{ 
              color: c.danger, 
              fontSize: '0.8rem', 
              marginTop: '8px', 
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '700'
            }}>
              <span>✕</span>
              {deliveryFormErrors.location}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '14px 24px',
            background: `linear-gradient(135deg, ${c.success} 0%, ${c.success}dd 100%)`,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.05rem',
            fontWeight: '800',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: `0 4px 12px ${c.overlay}`,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-2px)'
            e.target.style.boxShadow = `0 8px 24px ${c.overlay}`
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = `0 4px 12px ${c.overlay}`
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>✓</span>
          {t('saveDeliveryInfo')}
        </button>
      </div>
    </form>
  );

  if (totalItems === 0) {
    return (
      <div style={{ 
        padding: isMobile ? '2rem 1rem' : '4rem 2rem',
        background: c.background,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: isMobile ? '6rem' : '8rem', marginBottom: '2rem', opacity: 0.3, animation: 'float 3s ease-in-out infinite' }}>🛒</div>
        <h2 style={{ 
          fontSize: isMobile ? '1.75rem' : '2.5rem', 
          marginBottom: '1rem', 
          color: c.textDark,
          fontWeight: '900',
          textAlign: 'center'
        }}>
          {t('emptyCart')}
        </h2>
        <p style={{
          fontSize: '1.05rem',
          color: c.textMuted,
          marginBottom: '3rem',
          maxWidth: '500px',
          textAlign: 'center',
          lineHeight: 1.6
        }}>
          {t('browseOurCollectionAndAddSomeItems')}
        </p>
        <button onClick={() => navigate('/home')} style={{
          padding: '16px 48px',
          background: `linear-gradient(135deg, ${c.secondary} 0%, ${c.accent} 100%)`,
          color: '#FFF',
          border: 'none',
          borderRadius: '14px',
          fontWeight: '800',
          fontSize: '1.1rem',
          cursor: 'pointer',
          boxShadow: `0 8px 24px rgba(212, 160, 23, 0.25)`,
          transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateY(-4px)'
          e.target.style.boxShadow = `0 12px 32px rgba(212, 160, 23, 0.4)`
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateY(0)'
          e.target.style.boxShadow = `0 8px 24px rgba(212, 160, 23, 0.25)`
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
        maxWidth: '1400px', 
        margin: '0 auto', 
        paddingTop: isMobile ? '1rem' : '2rem' 
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '3rem',
          gap: '16px',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              background: c.card,
              border: `2px solid ${c.border}`,
              color: c.textDark,
              cursor: 'pointer',
              fontSize: isMobile ? '0.85rem' : '0.95rem',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: isMobile ? '10px 16px' : '12px 28px',
              borderRadius: '12px',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.background = c.primary
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.transform = 'translateX(-6px)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.background = c.card
                e.currentTarget.style.color = c.textDark
                e.currentTarget.style.transform = 'translateX(0)'
              }
            }}
          >
            <span style={{ fontSize: '1.3rem' }}>←</span>
            {!isMobile && t('backToProducts')}
          </button>

          <h1 style={{ 
            fontSize: isMobile ? '1.6rem' : '2.8rem',
            fontWeight: '900',
            color: c.textDark,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flex: isMobile ? 1 : 'auto',
            letterSpacing: '-1px'
          }}>
            🛒 {t('cart')} 
            <span style={{
              fontSize: isMobile ? '1rem' : '1.3rem',
              fontWeight: '800',
              color: c.secondary,
              background: `linear-gradient(135deg, ${c.secondary}15, ${c.secondary}05)`,
              padding: '8px 16px',
              borderRadius: '24px',
              border: `2px solid ${c.secondary}`
            }}>
              {totalItems}
            </span>
          </h1>
        </div>

        <CartErrorBanner />

        <div style={{ 
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 420px',
          gap: '2.5rem',
          alignItems: 'start'
        }}>
          {/* Cart Items */}
          {items.length > 0 && (
            <div>
              {items.map((item, idx) => {
                const product = productDetails[item.id]
                const stockError = stockErrors[item.id]
                const isOutOfStock = !product || product.stock <= 0
                const isLowStock = product && product.stock > 0 && product.stock < 10
                const canIncrease = product && item.quantity < product.stock
                const isExpanded = expandedItem === item.id
                const isHovered = hoveredItem === item.id
                
                return (
                  <div 
                    key={item.id} 
                    style={{ 
                      padding: isMobile ? '1.25rem' : '1.75rem',
                      backgroundColor: c.card,
                      borderRadius: '16px',
                      marginBottom: '1.5rem',
                      border: `2px solid ${stockError ? c.danger : (isOutOfStock ? c.danger : c.border)}`,
                      display: 'grid',
                      gridTemplateColumns: isSmallMobile ? '1fr' : '120px 1fr',
                      gap: '1.5rem',
                      position: 'relative',
                      overflow: 'hidden',
                      opacity: isOutOfStock ? 0.8 : 1,
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                      boxShadow: isHovered ? `0 12px 32px ${c.overlay}` : `0 4px 12px ${c.overlay}`,
                      animation: `slideDown 0.4s ease-out ${idx * 0.05}s both`
                    }}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    {/* Product Image */}
                    <div style={{
                      width: isSmallMobile ? '100%' : '120px',
                      height: isSmallMobile ? '200px' : '120px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      position: 'relative',
                      background: c.overlay,
                      cursor: 'pointer',
                      border: `2px solid ${c.border}`
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
                            filter: isOutOfStock ? 'grayscale(0.8) opacity(0.6)' : 'none',
                            transition: 'transform 0.4s ease'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '3rem',
                          background: c.overlay
                        }}>
                          🍫
                        </div>
                      )}
                      
                      {isOutOfStock && (
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'rgba(0,0,0,0.7)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '900',
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          textAlign: 'center',
                          padding: '8px',
                          letterSpacing: '1px'
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
                          marginBottom: '0.75rem',
                          gap: '0.75rem'
                        }}>
                          <h3 style={{ 
                            margin: 0, 
                            color: isOutOfStock ? c.textMuted : c.textDark,
                            fontSize: isMobile ? '1.05rem' : '1.2rem',
                            textDecoration: isOutOfStock ? 'line-through' : 'none',
                            flex: 1,
                            fontWeight: '800',
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
                              fontSize: '1.5rem',
                              cursor: 'pointer',
                              padding: '6px',
                              lineHeight: 1,
                              transition: 'all 0.3s ease',
                              borderRadius: '6px'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.3) rotate(10deg)'
                              e.target.style.background = `${c.overlay}`
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1) rotate(0deg)'
                              e.target.style.background = 'transparent'
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Price */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px',
                          marginBottom: '1rem',
                          flexWrap: 'wrap'
                        }}>
                          <span style={{ 
                            color: c.secondary, 
                            fontSize: '1.4rem', 
                            fontWeight: '900'
                          }}>
                            {(item.price * item.quantity).toFixed(2)} EGP
                          </span>
                          <span style={{ 
                            color: c.textMuted, 
                            fontSize: '0.85rem',
                            fontWeight: '600'
                          }}>
                            @ {item.price.toFixed(2)} EGP {t('each')}
                          </span>
                        </div>

                        {/* Stock Status */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '1rem',
                          fontSize: '0.85rem'
                        }}>
                          {isOutOfStock ? (
                            <span style={{ color: c.danger, fontWeight: '700' }}>
                              ❌ {t('outOfStock')}
                            </span>
                          ) : isLowStock ? (
                            <span style={{ color: c.warning, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ⚡ {t('onlyLeft', { count: product.stock })}
                            </span>
                          ) : (
                            <span style={{ color: c.success, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              ✓ {t('inStock', { count: product.stock })}
                            </span>
                          )}
                        </div>

                        {/* Stock Error */}
                        {stockError && (
                          <div style={{
                            padding: '10px 14px',
                            background: `${c.danger}15`,
                            borderLeft: `4px solid ${c.danger}`,
                            borderRadius: '8px',
                            marginBottom: '1rem',
                            color: c.danger,
                            fontSize: '0.8rem',
                            fontWeight: '700'
                          }}>
                            ⚠️ {stockError.message}
                          </div>
                        )}
                      </div>

                      {/* Flavors */}
                      {product?.flavors && product.flavors.length > 0 && (
                        <div style={{ marginBottom: '1rem', marginTop: '0.5rem' }}>
                          <button
                            onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                            style={{
                              fontSize: '0.8rem', 
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
                              gap: '8px',
                              marginTop: '10px',
                              paddingTop: '10px',
                              borderTop: `1px solid ${c.border}`
                            }}>
                              {product.flavors.map((flavor, idx) => (
                                <span key={idx} style={{
                                  background: c.overlay,
                                  padding: '6px 12px',
                                  borderRadius: '12px',
                                  color: c.textDark,
                                  fontWeight: '700',
                                  fontSize: '0.8rem',
                                  border: `1px solid ${c.border}`
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
                        gap: '12px',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{ 
                          fontSize: '0.85rem', 
                          color: c.textMuted,
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Qty:
                        </span>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          background: c.overlay,
                          padding: '6px',
                          borderRadius: '10px',
                          border: `2px solid ${c.border}`,
                          transition: 'all 0.3s ease'
                        }}>
                          <button
                            onClick={() => handleQuantityUpdate(item, item.quantity - 1)}
                            disabled={isUpdating[item.id]}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              border: 'none',
                              background: c.card,
                              color: c.textDark,
                              fontWeight: '800',
                              cursor: 'pointer',
                              fontSize: '1.1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: isUpdating[item.id] ? 0.5 : 1,
                              transition: 'all 0.2s ease',
                              border: `1px solid ${c.border}`
                            }}
                            onMouseEnter={(e) => e.target.style.background = c.danger}
                            onMouseLeave={(e) => e.target.style.background = c.card}
                          >−</button>
                          <span style={{ 
                            fontWeight: '800', 
                            minWidth: '30px', 
                            textAlign: 'center',
                            color: c.textDark,
                            fontSize: '1rem'
                          }}>
                            {isUpdating[item.id] ? '⟳' : item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityUpdate(item, item.quantity + 1)}
                            disabled={!canIncrease || isUpdating[item.id] || isOutOfStock}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              border: `1px solid ${(!canIncrease || isOutOfStock) ? c.border : c.border}`,
                              background: (!canIncrease || isOutOfStock) ? c.overlay : c.card,
                              color: (!canIncrease || isOutOfStock) ? c.textMuted : c.textDark,
                              fontWeight: '800',
                              cursor: (!canIncrease || isOutOfStock) ? 'not-allowed' : 'pointer',
                              fontSize: '1.1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (canIncrease && !isOutOfStock) {
                                e.target.style.background = c.success
                                e.target.style.color = 'white'
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = canIncrease && !isOutOfStock ? c.card : c.overlay
                              e.target.style.color = canIncrease && !isOutOfStock ? c.textDark : c.textMuted
                            }}
                          >+</button>
                        </div>
                        
                        {product && item.quantity >= product.stock && !isOutOfStock && (
                          <span style={{ 
                            fontSize: '0.75rem', 
                            color: c.warning,
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            max reached
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Sidebar - NOW BETTER POSITIONED */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            position: 'sticky',
            top: '20px'
          }}>
            {/* Delivery Info Form */}
            <DeliveryInfoForm />

            {/* Coupon Section */}
            <div style={{
              padding: '2rem',
              background: c.card,
              borderRadius: '16px',
              border: `2px solid ${c.border}`,
              boxShadow: `0 4px 12px ${c.overlay}`
            }}>
              <h3 style={{
                margin: '0 0 1.5rem 0',
                fontSize: '1.05rem',
                fontWeight: '800',
                color: c.textDark,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🎟️ {t('haveCoupon')}
              </h3>
              <div style={{
                display: 'flex',
                gap: '10px'
              }}>
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder={t('enterCouponCode')}
                  disabled={appliedCoupon}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: `2px solid ${c.border}`,
                    borderRadius: '10px',
                    background: c.surface,
                    color: c.textDark,
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => e.target.style.borderColor = c.secondary}
                  onBlur={(e) => e.target.style.borderColor = c.border}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={appliedCoupon || !couponInput}
                  style={{
                    padding: '12px 20px',
                    background: (appliedCoupon || !couponInput) ? c.textMuted : c.success,
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '800',
                    cursor: (appliedCoupon || !couponInput) ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    if (!appliedCoupon && couponInput) {
                      e.target.style.transform = 'translateY(-2px)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                  }}
                >
                  {t('apply')}
                </button>
              </div>
              {appliedCoupon && (
                <div style={{
                  marginTop: '1rem',
                  padding: '12px 16px',
                  background: `${c.success}20`,
                  borderLeft: `4px solid ${c.success}`,
                  borderRadius: '10px',
                  color: c.success,
                  fontSize: '0.9rem',
                  fontWeight: '700',
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
                      color: c.success,
                      cursor: 'pointer',
                      fontWeight: '800',
                      fontSize: '1.1rem'
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
                padding: '2rem',
                background: c.card,
                borderRadius: '16px',
                border: `2px solid ${c.secondary}40`,
                boxShadow: `0 8px 24px ${c.overlay}`
              }}>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  fontSize: '1.2rem',
                  fontWeight: '800',
                  color: c.textDark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {t('orderSummary')}
                </h3>

                <div style={{ marginBottom: '1.5rem', borderBottom: `2px solid ${c.border}`, paddingBottom: '1.5rem' }}>
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                    color: c.textMuted,
                    fontSize: '0.95rem',
                    fontWeight: '600'
                  }}>
                    <span>{t('subtotal')}</span>
                    <span>{totalPrice.toFixed(2)} EGP</span>
                  </div>
                  {discountAmount > 0 && (
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.75rem',
                      color: c.success,
                      fontSize: '0.95rem',
                      fontWeight: '800'
                    }}>
                      <span>💰 {t('discount')}</span>
                      <span>-{discountAmount.toFixed(2)} EGP</span>
                    </div>
                  )}
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    color: c.textMuted,
                    fontSize: '0.95rem',
                    fontWeight: '600'
                  }}>
                    <span>{t('shipping')}</span>
                    <span style={{ color: c.success, fontWeight: '800' }}>FREE</span>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '1.4rem',
                  fontWeight: '900',
                  color: c.textDark,
                  marginBottom: '2rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
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
                    padding: '16px',
                    background: (Object.keys(stockErrors).length === 0 && !isProcessing && isDeliveryInfoValid)
                      ? `linear-gradient(135deg, ${c.secondary} 0%, ${c.accent} 100%)`
                      : c.textMuted,
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '900',
                    fontSize: '1.05rem',
                    cursor: (Object.keys(stockErrors).length === 0 && !isProcessing && isDeliveryInfoValid) ? 'pointer' : 'not-allowed',
                    opacity: (Object.keys(stockErrors).length === 0 && !isProcessing && isDeliveryInfoValid) ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: `0 4px 12px ${c.overlay}`,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}
                  onMouseEnter={(e) => {
                    if ((Object.keys(stockErrors).length === 0 && !isProcessing && isDeliveryInfoValid)) {
                      e.target.style.transform = 'translateY(-3px)'
                      e.target.style.boxShadow = `0 8px 24px ${c.overlay}`
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                    e.target.style.boxShadow = `0 4px 12px ${c.overlay}`
                  }}
                >
                  {isProcessing ? (
                    <>
                      <span>⏳</span>
                      {t('processing')}...
                    </>
                  ) : !isDeliveryInfoValid ? (
                    <>
                      <span>📝</span>
                      {t('completeDeliveryInfo')}
                    </>
                  ) : Object.keys(stockErrors).length > 0 ? (
                    <>
                      <span>❌</span>
                      {t('resolveStockIssues')}
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '1.3rem' }}>💳</span>
                      {t('checkout')}
                    </>
                  )}
                </button>

                {(!isDeliveryInfoValid || Object.keys(stockErrors).length > 0) && (
                  <p style={{
                    marginTop: '16px',
                    color: c.danger,
                    fontSize: '0.8rem',
                    textAlign: 'center',
                    fontWeight: '700',
                    background: `${c.danger}15`,
                    padding: '12px',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${c.danger}`
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
            transform: translateY(-24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
        }

        * {
          box-sizing: border-box;
        }

        button:disabled {
          cursor: not-allowed !important;
        }

        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  )
}