import { useState, useEffect, useCallback, useMemo } from 'react'
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
  const { t } = useLanguage()
  const { theme } = useTheme()
  const navigate = useNavigate()

  // ============ MAIN STATES ============
  const [isProcessing, setIsProcessing] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponInput, setCouponInput] = useState('')
  const [expandedItem, setExpandedItem] = useState(null)
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  const [hoveredItem, setHoveredItem] = useState(null)

  // ============ DELIVERY FORM STATES ============
  const [formData, setFormData] = useState({
    name: deliveryInfo?.name || '',
    phone: deliveryInfo?.phone || '',
    address: deliveryInfo?.address || '',
    latitude: deliveryInfo?.latitude || null,
    longitude: deliveryInfo?.longitude || null
  })

  const [formErrors, setFormErrors] = useState({})
  const [showDeliveryForm, setShowDeliveryForm] = useState(!deliveryInfo)
  const [mapCenter, setMapCenter] = useState(null)
  const [mapError, setMapError] = useState(false)
  const [mapLoading, setMapLoading] = useState(true)

  // ============ PRODUCT & STOCK STATES ============
  const [productDetails, setProductDetails] = useState({})
  const [stockErrors, setStockErrors] = useState({})
  const [updatingItems, setUpdatingItems] = useState(new Set())

  const isMobile = windowWidth < 768
  const isSmallMobile = windowWidth < 480

  // ============ RESPONSIVE HANDLERS ============
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ============ GEOLOCATION ============
  useEffect(() => {
    setMapLoading(true)
    if (!navigator.geolocation) {
      setMapError(true)
      setMapCenter({ lat: 30.0444, lng: 31.2357 })
      setMapLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setMapCenter({ lat: latitude, lng: longitude })
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude
        }))
        setMapError(false)
        setMapLoading(false)
      },
      (error) => {
        console.warn('Geolocation error:', error)
        setMapError(true)
        setMapCenter({ lat: 30.0444, lng: 31.2357 })
        setMapLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  // ============ PRODUCT DETAILS FETCH ============
  useEffect(() => {
    const fetchProductDetails = async () => {
      const details = {}
      const errors = {}

      await Promise.all(items.map(async (item) => {
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
      }))

      setProductDetails(details)
      setStockErrors(errors)
    }

    if (items.length > 0) {
      fetchProductDetails()
    }
  }, [items, t])

  // ============ DERIVED STATE ============
  const hasDeliveryInfo = useMemo(() => {
    return deliveryInfo && deliveryInfo.name && deliveryInfo.phone && deliveryInfo.address
  }, [deliveryInfo])

  const canCheckout = useMemo(() => {
    return Object.keys(stockErrors).length === 0 && hasDeliveryInfo && !isProcessing
  }, [stockErrors, hasDeliveryInfo, isProcessing])

  // ============ FORM VALIDATION ============
  const validateForm = useCallback(() => {
    const errors = {}
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/

    if (!formData.name.trim()) errors.name = t('nameRequired')
    if (!formData.phone.trim() || !phoneRegex.test(formData.phone)) errors.phone = t('validPhoneRequired')
    if (!formData.address.trim() || formData.address.trim().length < 10) errors.address = t('addressTooShort')
    if (!formData.latitude || !formData.longitude) errors.location = t('locationRequired')

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }, [formData, t])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors(prev => {
        const next = { ...prev }
        delete next[name]
        return next
      })
    }
  }

  const handleSaveDelivery = (e) => {
    e.preventDefault()
    if (validateForm()) {
      setDeliveryInfo(formData)
      setShowDeliveryForm(false)
    }
  }

  // ============ COUPON HANDLING ============
  const COUPONS = useMemo(() => ({
    'SAVE10': { discount: 0.10, label: '10% off' },
    'SAVE20': { discount: 0.20, label: '20% off' },
    'WELCOME': { discount: 0.15, label: '15% off' }
  }), [])

  const handleApplyCoupon = useCallback(() => {
    const code = couponInput.toUpperCase().trim()
    const coupon = COUPONS[code]
    
    if (coupon) {
      setAppliedCoupon(coupon)
      setCouponInput('')
    } else {
      alert(t('invalidCoupon'))
    }
  }, [couponInput, COUPONS, t])

  const discountAmount = appliedCoupon ? totalPrice * appliedCoupon.discount : 0
  const finalPrice = totalPrice - discountAmount

  // ============ CHECKOUT ============
  const handleCheckout = useCallback(async () => {
    if (!canCheckout) return

    setIsProcessing(true)
    const orderId = `order_${Date.now()}`

    try {
      await addDoc(collection(db, 'orders_egp'), {
        orderId,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1
        })),
        totalPrice: finalPrice,
        totalItems: items.reduce((sum, item) => sum + (item.quantity || 1), 0),
        currency: 'EGP',
        paymentMethod: 'Cash on Delivery',
        status: 'pending',
        customerName: deliveryInfo.name,
        customerPhone: deliveryInfo.phone,
        customerAddress: deliveryInfo.address,
        customerLocation: {
          latitude: deliveryInfo.latitude,
          longitude: deliveryInfo.longitude
        },
        coupon: appliedCoupon?.label || null,
        createdAt: serverTimestamp()
      })

      clearCart()
      clearDeliveryInfo()
      navigate('/order-success', {
        state: {
          orderId,
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
  }, [canCheckout, items, finalPrice, deliveryInfo, appliedCoupon, clearCart, clearDeliveryInfo, navigate, t])

  const handleQuantityUpdate = useCallback(async (item, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(item.id)
      return
    }

    const product = productDetails[item.id]
    const availableStock = product?.stock || 0

    setUpdatingItems(prev => new Set(prev).add(item.id))
    
    try {
      await updateQuantity(item.id, newQuantity, availableStock)

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
          const next = { ...prev }
          delete next[item.id]
          return next
        })
      }
    } finally {
      setUpdatingItems(prev => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }, [productDetails, updateQuantity, removeFromCart, t])

  // ============ COLOR SCHEME ============
  const colors = useMemo(() => ({
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
  }), [])

  const c = colors[theme] || colors.light

  // ============ RENDER HELPERS ============
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
        animation: 'slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: '700' }}>
              {t('stockIssuesDetected')}
            </h4>
            {Object.entries(stockErrors).map(([id, error]) => (
              <p key={id} style={{ margin: '4px 0', fontSize: '0.85rem' }}>
                • {items.find(i => i.id === id)?.name}: {error.message}
              </p>
            ))}
            <button
              onClick={() => setStockErrors({})}
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
              onMouseEnter={(e) => e.target.style.opacity = '0.9'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              {t('dismiss')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============ EMPTY CART VIEW ============
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
        <div style={{ fontSize: isMobile ? '6rem' : '8rem', marginBottom: '2rem', opacity: 0.3 }}>
          🛒
        </div>
        <h2 style={{ fontSize: isMobile ? '1.75rem' : '2.5rem', marginBottom: '1rem', color: c.textDark, fontWeight: '900', textAlign: 'center' }}>
          {t('emptyCart')}
        </h2>
        <p style={{ color: c.textMuted, marginBottom: '2rem', maxWidth: '400px', textAlign: 'center' }}>
          {t('browseOurCollectionAndAddSomeItems')}
        </p>
        <button
          onClick={() => navigate('/home')}
          style={{
            padding: '14px 48px',
            background: `linear-gradient(135deg, ${c.secondary} 0%, ${c.accent} 100%)`,
            color: '#FFF',
            border: 'none',
            borderRadius: '14px',
            fontWeight: '800',
            fontSize: '1.1rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: `0 8px 24px rgba(212, 160, 23, 0.25)`
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)'
            e.target.style.boxShadow = '0 12px 32px rgba(212, 160, 23, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)'
            e.target.style.boxShadow = '0 8px 24px rgba(212, 160, 23, 0.25)'
          }}
        >
          🛍️ {t('continueShopping')}
        </button>
      </div>
    )
  }

  // ============ MAIN RENDER ============
  return (
    <div style={{ padding: isMobile ? '1rem' : '2rem', background: c.background, minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* HEADER */}
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          gap: '16px',
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: '12px 24px',
              background: c.card,
              border: `2px solid ${c.border}`,
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: '700',
              color: c.textDark,
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = c.primary
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.transform = 'translateX(-4px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = c.card
              e.currentTarget.style.color = c.textDark
              e.currentTarget.style.transform = 'translateX(0)'
            }}
          >
            ← {!isMobile && t('back')}
          </button>

          <h1 style={{
            margin: 0,
            color: c.textDark,
            fontSize: isMobile ? '1.8rem' : '2.5rem',
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flex: isMobile ? '1' : 'auto'
          }}>
            🛒 {t('cart')}
            <span style={{
              fontSize: isMobile ? '1rem' : '1.3rem',
              fontWeight: '800',
              background: `linear-gradient(135deg, ${c.secondary}20, ${c.secondary}05)`,
              color: c.secondary,
              padding: '8px 16px',
              borderRadius: '24px',
              border: `2px solid ${c.secondary}`,
              minWidth: '50px',
              textAlign: 'center'
            }}>
              {totalItems}
            </span>
          </h1>
        </header>

        <CartErrorBanner />

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 420px',
          gap: '2.5rem',
          alignItems: 'start'
        }}>
          
          {/* CART ITEMS */}
          <main>
            {items.map((item, idx) => {
              const product = productDetails[item.id]
              const stockError = stockErrors[item.id]
              const isOutOfStock = !product || product.stock <= 0
              const isLowStock = product && product.stock > 0 && product.stock < 10
              const canIncrease = product && item.quantity < product.stock
              const isUpdating = updatingItems.has(item.id)

              return (
                <article
                  key={item.id}
                  onMouseEnter={() => !isMobile && setHoveredItem(item.id)}
                  onMouseLeave={() => !isMobile && setHoveredItem(null)}
                  style={{
                    padding: isMobile ? '1.25rem' : '1.75rem',
                    background: c.card,
                    borderRadius: '16px',
                    marginBottom: '1.5rem',
                    border: `2px solid ${stockError ? c.danger : isOutOfStock ? c.danger : c.border}`,
                    display: 'grid',
                    gridTemplateColumns: isSmallMobile ? '1fr' : '130px 1fr',
                    gap: '1.5rem',
                    opacity: isOutOfStock ? 0.7 : 1,
                    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    transform: hoveredItem === item.id ? 'translateY(-4px)' : 'translateY(0)',
                    boxShadow: hoveredItem === item.id ? `0 12px 32px ${c.overlay}` : `0 4px 12px ${c.overlay}`
                  }}
                >
                  {/* IMAGE */}
                  <div
                    onClick={() => navigate(`/product/${item.id}`)}
                    style={{
                      width: isSmallMobile ? '100%' : '130px',
                      height: isSmallMobile ? '200px' : '130px',
                      background: c.overlay,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      border: `2px solid ${c.border}`,
                      transition: 'transform 0.3s ease',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      if (!isMobile && product?.imageUrl) {
                        e.currentTarget.style.transform = 'scale(1.05)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    {product?.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={item.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          filter: isOutOfStock ? 'grayscale(0.8) opacity(0.6)' : 'none'
                        }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        fontSize: '3rem'
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
                        fontSize: '0.75rem',
                        fontWeight: '900',
                        textTransform: 'uppercase'
                      }}>
                        {t('outOfStock')}
                      </div>
                    )}
                  </div>

                  {/* INFO */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', gap: '8px' }}>
                        <h3
                          onClick={() => navigate(`/product/${item.id}`)}
                          style={{
                            margin: 0,
                            color: isOutOfStock ? c.textMuted : c.textDark,
                            fontSize: isMobile ? '1.05rem' : '1.2rem',
                            fontWeight: '800',
                            cursor: 'pointer',
                            textDecoration: isOutOfStock ? 'line-through' : 'none',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}
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
                            padding: '4px',
                            transition: 'all 0.3s ease',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.3) rotate(10deg)'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1) rotate(0deg)'
                          }}
                        >
                          ✕
                        </button>
                      </div>

                      {/* PRICE */}
                      <div style={{
                        color: c.secondary,
                        fontSize: '1.4rem',
                        fontWeight: '900',
                        marginBottom: '0.5rem'
                      }}>
                        {(item.price * item.quantity).toFixed(2)} EGP
                      </div>

                      {/* UNIT PRICE */}
                      <div style={{
                        color: c.textMuted,
                        fontSize: '0.85rem',
                        marginBottom: '1rem'
                      }}>
                        @ {item.price.toFixed(2)} EGP {t('each')}
                      </div>

                      {/* STOCK STATUS */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '1rem',
                        fontSize: '0.85rem',
                        fontWeight: '700'
                      }}>
                        {isOutOfStock ? (
                          <span style={{ color: c.danger }}>❌ {t('outOfStock')}</span>
                        ) : isLowStock ? (
                          <span style={{ color: c.warning }}>⚡ {product.stock} {t('left')}</span>
                        ) : (
                          <span style={{ color: c.success }}>✓ {t('inStock')}</span>
                        )}
                      </div>

                      {/* ERRORS */}
                      {stockError && (
                        <div style={{
                          padding: '10px 14px',
                          background: `${c.danger}20`,
                          borderLeft: `4px solid ${c.danger}`,
                          borderRadius: '8px',
                          color: c.danger,
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          marginBottom: '1rem'
                        }}>
                          ⚠️ {stockError.message}
                        </div>
                      )}

                      {/* FLAVORS */}
                      {product?.flavors && product.flavors.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                          <button
                            onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: c.secondary,
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: '700',
                              textDecoration: 'underline',
                              padding: 0
                            }}
                          >
                            🍬 {product.flavors.length} {t('flavors')} {expandedItem === item.id ? '▲' : '▼'}
                          </button>
                          {expandedItem === item.id && (
                            <div style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '8px',
                              marginTop: '10px'
                            }}>
                              {product.flavors.map((flavor, i) => (
                                <span
                                  key={i}
                                  style={{
                                    background: c.overlay,
                                    padding: '6px 12px',
                                    borderRadius: '12px',
                                    color: c.textDark,
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    border: `1px solid ${c.border}`
                                  }}
                                >
                                  {flavor}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* QUANTITY */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '1rem' }}>
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
                        border: `2px solid ${c.border}`
                      }}>
                        <button
                          onClick={() => handleQuantityUpdate(item, item.quantity - 1)}
                          disabled={isUpdating}
                          style={{
                            width: '36px',
                            height: '36px',
                            border: 'none',
                            background: c.card,
                            borderRadius: '8px',
                            cursor: isUpdating ? 'not-allowed' : 'pointer',
                            fontWeight: '800',
                            color: c.textDark,
                            opacity: isUpdating ? 0.5 : 1,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => !isUpdating && (e.target.style.background = c.danger)}
                          onMouseLeave={(e) => (e.target.style.background = c.card)}
                        >
                          −
                        </button>
                        <span style={{
                          fontWeight: '800',
                          minWidth: '36px',
                          textAlign: 'center',
                          color: c.textDark,
                          fontSize: '1rem'
                        }}>
                          {isUpdating ? '⟳' : item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityUpdate(item, item.quantity + 1)}
                          disabled={!canIncrease || isUpdating || isOutOfStock}
                          style={{
                            width: '36px',
                            height: '36px',
                            border: 'none',
                            background: (!canIncrease || isOutOfStock) ? c.overlay : c.card,
                            borderRadius: '8px',
                            cursor: (!canIncrease || isUpdating || isOutOfStock) ? 'not-allowed' : 'pointer',
                            fontWeight: '800',
                            color: (!canIncrease || isOutOfStock) ? c.textMuted : c.textDark,
                            opacity: isUpdating ? 0.5 : 1,
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => !(!canIncrease || isUpdating || isOutOfStock) && (e.target.style.background = c.success)}
                          onMouseLeave={(e) => (e.target.style.background = (!canIncrease || isOutOfStock) ? c.overlay : c.card)}
                        >
                          +
                        </button>
                      </div>
                      {product && item.quantity >= product.stock && !isOutOfStock && (
                        <span style={{
                          fontSize: '0.75rem',
                          color: c.warning,
                          fontWeight: '700',
                          textTransform: 'uppercase'
                        }}>
                          {t('maxReached')}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </main>

          {/* SIDEBAR */}
          <aside style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            position: isMobile ? 'relative' : 'sticky',
            top: '20px',
            height: 'fit-content'
          }}>

            {/* DELIVERY FORM */}
            {(showDeliveryForm || !hasDeliveryInfo) && (
              <form onSubmit={handleSaveDelivery} style={{
                background: c.card,
                padding: isMobile ? '1.5rem' : '1.75rem',
                borderRadius: '16px',
                border: `2px solid ${c.secondary}40`,
                boxShadow: `0 8px 24px ${c.overlay}`
              }}>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  color: c.textDark,
                  fontWeight: '800',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📍 {t('deliveryInfo')}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* NAME */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: c.textDark,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {t('fullName')} <span style={{ color: c.danger }}>*</span>
                    </label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder={t('enterFullName')}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${formErrors.name ? c.danger : c.border}`,
                        borderRadius: '12px',
                        fontSize: '1rem',
                        background: c.surface,
                        color: c.textDark,
                        fontFamily: 'inherit',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        if (!formErrors.name) e.target.style.borderColor = c.secondary
                      }}
                      onBlur={(e) => (e.target.style.borderColor = formErrors.name ? c.danger : c.border)}
                    />
                    {formErrors.name && <div style={{ color: c.danger, fontSize: '0.75rem', marginTop: '4px' }}>✕ {formErrors.name}</div>}
                  </div>

                  {/* PHONE */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: c.textDark,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {t('phoneNumber')} <span style={{ color: c.danger }}>*</span>
                    </label>
                    <input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+20 123 456 7890"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${formErrors.phone ? c.danger : c.border}`,
                        borderRadius: '12px',
                        fontSize: '1rem',
                        background: c.surface,
                        color: c.textDark,
                        fontFamily: 'inherit',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        if (!formErrors.phone) e.target.style.borderColor = c.secondary
                      }}
                      onBlur={(e) => (e.target.style.borderColor = formErrors.phone ? c.danger : c.border)}
                    />
                    {formErrors.phone && <div style={{ color: c.danger, fontSize: '0.75rem', marginTop: '4px' }}>✕ {formErrors.phone}</div>}
                  </div>

                  {/* ADDRESS */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: c.textDark,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {t('address')} <span style={{ color: c.danger }}>*</span>
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder={t('enterDetailedAddress')}
                      rows="3"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: `2px solid ${formErrors.address ? c.danger : c.border}`,
                        borderRadius: '12px',
                        fontSize: '1rem',
                        background: c.surface,
                        color: c.textDark,
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        if (!formErrors.address) e.target.style.borderColor = c.secondary
                      }}
                      onBlur={(e) => (e.target.style.borderColor = formErrors.address ? c.danger : c.border)}
                    />
                    {formErrors.address && <div style={{ color: c.danger, fontSize: '0.75rem', marginTop: '4px' }}>✕ {formErrors.address}</div>}
                  </div>

                  {/* MAP */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: c.textDark,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {t('location')} <span style={{ color: c.danger }}>*</span>
                    </label>

                    {mapError && (
                      <div style={{
                        padding: '10px 12px',
                        background: `${c.warning}20`,
                        color: c.warning,
                        fontSize: '0.8rem',
                        borderLeft: `4px solid ${c.warning}`,
                        borderRadius: '6px',
                        marginBottom: '0.5rem',
                        fontWeight: '700'
                      }}>
                        ⚠️ {t('geolocationNotSupported')}
                      </div>
                    )}

                    <div style={{
                      height: '250px',
                      border: `2px solid ${formErrors.location ? c.danger : c.border}`,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      background: c.overlay
                    }}>
                      {mapLoading ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          height: '100%',
                          color: c.textMuted
                        }}>
                          {t('loading')}...
                        </div>
                      ) : mapCenter ? (
                        <iframe
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.01}%2C${mapCenter.lat - 0.01}%2C${mapCenter.lng + 0.01}%2C${mapCenter.lat + 0.01}&marker=${mapCenter.lat}%2C${mapCenter.lng}`}
                          style={{ width: '100%', height: '100%', border: 'none' }}
                          title="Location Map"
                          loading="lazy"
                        />
                      ) : null}
                    </div>

                    {formErrors.location && <div style={{ color: c.danger, fontSize: '0.75rem', marginTop: '4px' }}>✕ {formErrors.location}</div>}
                  </div>
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    background: `linear-gradient(135deg, ${c.success} 0%, ${c.success}dd 100%)`,
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)'
                  }}
                >
                  <span>✓</span> {t('save')}
                </button>
              </form>
            )}

            {/* DELIVERY SUMMARY */}
            {hasDeliveryInfo && !showDeliveryForm && (
              <div style={{
                background: `linear-gradient(135deg, ${c.success}15, ${c.success}05)`,
                border: `2px solid ${c.success}40`,
                padding: '1.5rem',
                borderRadius: '14px',
                boxShadow: `0 4px 12px ${c.overlay}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: c.success, fontWeight: '800', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✓</span> {t('deliveryInfo')}
                  </h4>
                  <button
                    onClick={() => setShowDeliveryForm(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: c.success,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: '700',
                      textDecoration: 'underline'
                    }}
                  >
                    {t('edit')}
                  </button>
                </div>
                <div style={{ fontSize: '0.9rem', color: c.textDark, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div><strong>{deliveryInfo.name}</strong></div>
                  <div>{deliveryInfo.phone}</div>
                  <div style={{ wordBreak: 'break-word' }}>{deliveryInfo.address}</div>
                </div>
              </div>
            )}

            {/* COUPON */}
            <div style={{
              background: c.card,
              padding: '1.5rem',
              borderRadius: '14px',
              border: `2px solid ${c.border}`,
              boxShadow: `0 4px 12px ${c.overlay}`
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: c.textDark, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎟️ {t('coupon')}
              </h4>
              <div style={{ display: 'flex', gap: '8px', marginBottom: appliedCoupon ? '1rem' : 0 }}>
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder={t('enterCouponCode')}
                  disabled={appliedCoupon}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: `2px solid ${c.border}`,
                    borderRadius: '10px',
                    background: c.surface,
                    color: c.textDark,
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    fontFamily: 'inherit',
                    transition: 'all 0.3s ease'
                  }}
                  onFocus={(e) => !appliedCoupon && (e.target.style.borderColor = c.secondary)}
                  onBlur={(e) => (e.target.style.borderColor = c.border)}
                />
                <button
                  onClick={handleApplyCoupon}
                  disabled={appliedCoupon || !couponInput.trim()}
                  style={{
                    padding: '10px 16px',
                    background: appliedCoupon || !couponInput.trim() ? c.textMuted : c.secondary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: '800',
                    cursor: appliedCoupon || !couponInput.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!appliedCoupon && couponInput.trim()) {
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
                  padding: '12px 14px',
                  background: `${c.success}20`,
                  borderLeft: `4px solid ${c.success}`,
                  borderRadius: '8px',
                  color: c.success,
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>✅ {appliedCoupon.label}</span>
                  <button
                    onClick={() => setAppliedCoupon(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: c.success,
                      cursor: 'pointer',
                      fontWeight: '800',
                      fontSize: '1rem'
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* ORDER SUMMARY */}
            <div style={{
              background: c.card,
              padding: '1.5rem',
              borderRadius: '14px',
              border: `2px solid ${c.secondary}40`,
              boxShadow: `0 8px 24px ${c.overlay}`
            }}>
              <h4 style={{ margin: '0 0 1.25rem 0', color: c.textDark, fontWeight: '800', fontSize: '1.1rem' }}>
                💰 {t('orderSummary')}
              </h4>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginBottom: '1.25rem',
                paddingBottom: '1.25rem',
                borderBottom: `2px solid ${c.border}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '0.9rem', fontWeight: '600' }}>
                  <span>{t('subtotal')}</span>
                  <span>{totalPrice.toFixed(2)} EGP</span>
                </div>

                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.success, fontSize: '0.9rem', fontWeight: '800' }}>
                    <span>💚 {t('discount')}</span>
                    <span>-{discountAmount.toFixed(2)} EGP</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '0.9rem', fontWeight: '600' }}>
                  <span>{t('shipping')}</span>
                  <span style={{ color: c.success, fontWeight: '800' }}>{t('free')}</span>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '1.3rem',
                fontWeight: '900',
                color: c.textDark,
                marginBottom: '1.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <span>{t('total')}:</span>
                <span style={{ color: c.secondary }}>{finalPrice.toFixed(2)} EGP</span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={!canCheckout}
                style={{
                  width: '100%',
                  padding: '15px 20px',
                  background: canCheckout ? `linear-gradient(135deg, ${c.secondary} 0%, ${c.accent} 100%)` : c.textMuted,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '900',
                  fontSize: '1.05rem',
                  cursor: canCheckout ? 'pointer' : 'not-allowed',
                  opacity: canCheckout ? 1 : 0.6,
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: canCheckout ? `0 4px 12px ${c.overlay}` : 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (canCheckout) {
                    e.target.style.transform = 'translateY(-3px)'
                    e.target.style.boxShadow = `0 8px 24px ${c.overlay}`
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = canCheckout ? `0 4px 12px ${c.overlay}` : 'none'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>
                  {isProcessing ? '⏳' : !hasDeliveryInfo ? '📝' : Object.keys(stockErrors).length > 0 ? '❌' : '💳'}
                </span>
                {isProcessing ? t('processing') : !hasDeliveryInfo ? t('enterDeliveryInfo') : Object.keys(stockErrors).length > 0 ? t('resolveStockIssues') : t('checkout')}
              </button>

              {!canCheckout && (
                <p style={{
                  marginTop: '12px',
                  color: c.danger,
                  fontSize: '0.75rem',
                  textAlign: 'center',
                  fontWeight: '700',
                  background: `${c.danger}15`,
                  padding: '10px',
                  borderRadius: '8px',
                  borderLeft: `4px solid ${c.danger}`
                }}>
                  {!hasDeliveryInfo ? t('completeDeliveryInfo') : t('adjustQuantitiesBeforeCheckout')}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        * {
          box-sizing: border-box;
        }

        button:disabled {
          cursor: not-allowed !important;
        }

        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
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