import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { db } from '../services/firebase'
import { paymobService } from '../services/paymob' // ADDED: Paymob service
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore' // ADDED: updateDoc
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon issue in webpack/vite
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

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
  const [scrollY, setScrollY] = useState(0)

  // ============ ADDED: PAYMENT METHOD STATE ============
  const [paymentMethod, setPaymentMethod] = useState('cod') // 'cod' or 'card'

  // ============ FULL-SCREEN MAP EDITOR STATES ============
  const [showMapEditor, setShowMapEditor] = useState(false)
  const [mapEditorCenter, setMapEditorCenter] = useState(null)
  const [mapEditorLoading, setMapEditorLoading] = useState(false)
  const [tempLocation, setTempLocation] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Leaflet map refs
  const mapRef = useRef(null)
  const mapContainerRef = useRef(null)
  const markerRef = useRef(null)

  // ============ SHIPPING CONFIGURATION (LUXOR BASED) ============
  const WAREHOUSE_LOCATION = { lat: 25.6872, lng: 32.6396 }

  const SHIPPING_ZONES = {
    local: { name: 'Luxor & Aswan', baseCost: 40, maxDistance: 220 },
    upper: { name: 'Upper Egypt', baseCost: 60, maxDistance: 350 },
    cairo: { name: 'Cairo & Giza', baseCost: 80, maxDistance: 550 },
    delta: { name: 'Delta & Alexandria', baseCost: 90, maxDistance: 700 },
    remote: { name: 'Red Sea & Sinai', baseCost: 110, maxDistance: 9999 }
  }

  const FREE_SHIPPING_THRESHOLD = 800

  // ============ SHIPPING CALCULATION FUNCTIONS ============
  const getDistanceFromLatLonInKm = (lat1, lng1, lat2, lng2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const calculateShipping = useCallback(() => {
    if (!deliveryInfo?.latitude || !deliveryInfo?.longitude) {
      return { cost: 0, zone: 'Pending', isFree: false }
    }

    const distance = getDistanceFromLatLonInKm(
      WAREHOUSE_LOCATION.lat,
      WAREHOUSE_LOCATION.lng,
      deliveryInfo.latitude,
      deliveryInfo.longitude
    )

    let zone = SHIPPING_ZONES.remote
    if (distance <= SHIPPING_ZONES.local.maxDistance) zone = SHIPPING_ZONES.local
    else if (distance <= SHIPPING_ZONES.upper.maxDistance) zone = SHIPPING_ZONES.upper
    else if (distance <= SHIPPING_ZONES.cairo.maxDistance) zone = SHIPPING_ZONES.cairo
    else if (distance <= SHIPPING_ZONES.delta.maxDistance) zone = SHIPPING_ZONES.delta

    let cost = zone.baseCost
    const isFree = totalPrice >= FREE_SHIPPING_THRESHOLD
    if (isFree) cost = 0

    return {
      cost,
      zone: zone.name,
      distance: Math.round(distance),
      isFree
    }
  }, [deliveryInfo, totalPrice])

  const shippingDetails = calculateShipping()

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

  // ============ SCROLL ANIMATIONS ============
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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

  // ============ LOCATION SEARCH ============
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    
    setIsSearching(true)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=eg&limit=5`
      )
      const data = await response.json()
      setSearchResults(data.map(item => ({
        display_name: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon)
      })))
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  const handleSelectResult = (result) => {
    const newLocation = { lat: result.lat, lng: result.lon }
    setTempLocation(newLocation)
    setMapEditorCenter(newLocation)
    setSearchQuery(result.display_name)
    setSearchResults([])
    
    // Update map view if map exists
    if (mapRef.current) {
      mapRef.current.setView([newLocation.lat, newLocation.lng], 16)
      if (markerRef.current) {
        markerRef.current.setLatLng([newLocation.lat, newLocation.lng])
      }
    }
  }

  // ============ LEAFLET MAP INITIALIZATION ============
  useEffect(() => {
    if (showMapEditor && mapContainerRef.current && !mapRef.current) {
      const initialCenter = mapEditorCenter || { lat: 30.0444, lng: 31.2357 }
      
      mapRef.current = L.map(mapContainerRef.current).setView(
        [initialCenter.lat, initialCenter.lng],
        15
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapRef.current)

      // Create draggable marker
      markerRef.current = L.marker([initialCenter.lat, initialCenter.lng], {
        draggable: true,
        title: 'Drag to set your location'
      }).addTo(mapRef.current)

      // Update temp location when marker is dragged
      markerRef.current.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng()
        setTempLocation({ lat, lng })
      })

      // Click on map to move marker
      mapRef.current.on('click', (e) => {
        const { lat, lng } = e.latlng
        markerRef.current.setLatLng([lat, lng])
        setTempLocation({ lat, lng })
      })

      setMapEditorLoading(false)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [showMapEditor, mapEditorCenter])

  // Update marker position when mapEditorCenter changes
  useEffect(() => {
    if (mapRef.current && markerRef.current && mapEditorCenter) {
      markerRef.current.setLatLng([mapEditorCenter.lat, mapEditorCenter.lng])
      mapRef.current.setView([mapEditorCenter.lat, mapEditorCenter.lng], 16)
    }
  }, [mapEditorCenter])

  // ============ FULL-SCREEN MAP EDITOR HANDLERS ============
  const handleOpenMapEditor = useCallback(() => {
    setMapEditorLoading(true)
    
    const initialCenter = deliveryInfo?.latitude 
      ? { lat: deliveryInfo.latitude, lng: deliveryInfo.longitude }
      : mapCenter || { lat: 30.0444, lng: 31.2357 }
      
    setMapEditorCenter(initialCenter)
    setTempLocation(initialCenter)
    setSearchQuery('')
    setSearchResults([])
    setShowMapEditor(true)
    
    document.body.style.overflow = 'hidden'
  }, [deliveryInfo, mapCenter])

  const handleCloseMapEditor = useCallback(() => {
    setShowMapEditor(false)
    document.body.style.overflow = 'unset'
    
    // Clean up map instance
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  const handleSaveMapLocation = useCallback(() => {
    if (tempLocation && tempLocation.lat && tempLocation.lng) {
      setFormData(prev => ({
        ...prev,
        latitude: tempLocation.lat,
        longitude: tempLocation.lng
      }))
      handleCloseMapEditor()
    }
  }, [tempLocation, handleCloseMapEditor])

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
  const subtotal = totalPrice - discountAmount
  const shippingCost = shippingDetails.cost
  const finalPrice = subtotal + shippingCost

  // ============ MODIFIED: CHECKOUT WITH PAYMOB ============
  const handleCheckout = useCallback(async () => {
    if (!canCheckout) return

    setIsProcessing(true)
    const orderId = `order_${Date.now()}`

    try {
      // Create order in Firestore
      const orderRef = await addDoc(collection(db, 'orders_egp'), {
        orderId,
        userId: `guest_${Date.now()}`, // Guest checkout
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1
        })),
        totalPrice: finalPrice,
        totalItems: items.reduce((sum, item) => sum + (item.quantity || 1), 0),
        currency: 'EGP',
        paymentMethod: paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card (Paymob)',
        paymentStatus: paymentMethod === 'cod' ? 'pending' : 'awaiting_payment',
        status: 'pending',
        customerName: deliveryInfo.name,
        customerPhone: deliveryInfo.phone,
        customerAddress: deliveryInfo.address,
        customerLocation: {
          latitude: deliveryInfo.latitude,
          longitude: deliveryInfo.longitude
        },
        coupon: appliedCoupon?.label || null,
        shipping: shippingDetails,
        createdAt: serverTimestamp()
      })

      // ============ PAYMOB CARD PAYMENT ============
      if (paymentMethod === 'card') {
        const billingData = {
          firstName: deliveryInfo.name.split(' ')[0] || deliveryInfo.name,
          lastName: deliveryInfo.name.split(' ').slice(1).join(' ') || 'N/A',
          email: 'customer@example.com', // Default for guest
          phone: deliveryInfo.phone,
          city: deliveryInfo.city || 'Cairo',
          street: deliveryInfo.address,
          country: 'EG'
        }

        const { iframeUrl, paymobOrderId } = await paymobService.createPayment(
          finalPrice,
          billingData,
          items,
          'EGP'
        )

        // Update order with paymobOrderId
        await updateDoc(orderRef, { paymobOrderId })

        // Store in session and redirect to Paymob
        sessionStorage.setItem('pendingOrderId', orderId)
        sessionStorage.setItem('pendingFirestoreId', orderRef.id)
        sessionStorage.setItem('paymobOrderId', paymobOrderId)
        paymobService.redirectToPayment(iframeUrl)
        return // Don't clear cart yet, wait for payment callback
      }

      // ============ CASH ON DELIVERY ============
      clearCart()
      clearDeliveryInfo()
      navigate('/order-success', {
        state: {
          orderId,
          txid: `TXN-${Date.now()}`,
          totalPrice: finalPrice,
          items,
          deliveryInfo,
          shipping: shippingDetails,
          paymentMethod: 'cod'
        }
      })
    } catch (error) {
      console.error('Checkout error:', error)
      alert(t('checkoutFailed') + ': ' + (error.message || t('tryAgain')))
      setIsProcessing(false)
    }
  }, [canCheckout, items, finalPrice, deliveryInfo, appliedCoupon, shippingDetails, paymentMethod, clearCart, clearDeliveryInfo, navigate, t])

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

  // ============ MAP EDITOR MODAL COMPONENT ============
  const MapEditorModal = () => {
    if (!showMapEditor) return null

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: c.background,
        display: 'flex',
        flexDirection: 'column',
        animation: 'fadeInMap 0.3s ease-out'
      }}>
        {/* TOP BAR */}
        <div style={{
          padding: '1rem 1.5rem',
          background: c.card,
          borderBottom: `2px solid ${c.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: `0 4px 12px ${c.overlay}`
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: c.textDark,
              fontSize: '1.5rem',
              fontWeight: '900',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              🗺️ Select Location
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              color: c.textMuted,
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              Drag the marker or click on map to set your location
            </p>
          </div>
          <button
            onClick={handleCloseMapEditor}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: `2px solid ${c.border}`,
              background: c.surface,
              color: c.textDark,
              fontSize: '1.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = c.danger
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = c.surface
              e.currentTarget.style.color = c.textDark
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            ✕
          </button>
        </div>

        {/* SEARCH BAR */}
        <div style={{
          padding: '1rem 1.5rem',
          background: c.card,
          borderBottom: `1px solid ${c.border}`,
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
          flexDirection: isMobile ? 'column' : 'row'
        }}>
          <div style={{ flex: 1, position: 'relative', width: '100%' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for area, street, or landmark in Egypt..."
              style={{
                width: '100%',
                padding: '12px 16px',
                border: `2px solid ${c.border}`,
                borderRadius: '10px',
                fontSize: '1rem',
                background: c.surface,
                color: c.textDark,
                fontFamily: 'inherit'
              }}
            />
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: c.surface,
                border: `2px solid ${c.border}`,
                borderRadius: '10px',
                marginTop: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: `0 8px 24px ${c.overlay}`
              }}>
                {searchResults.map((result, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectResult(result)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      textAlign: 'left',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: `1px solid ${c.border}`,
                      cursor: 'pointer',
                      color: c.textDark,
                      fontSize: '0.9rem',
                      transition: 'background 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = c.overlay
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <span>📍</span>
                    <span style={{ flex: 1 }}>{result.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            style={{
              padding: '12px 24px',
              background: isSearching || !searchQuery.trim() ? c.textMuted : c.secondary,
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontWeight: '800',
              cursor: isSearching || !searchQuery.trim() ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              minWidth: '100px'
            }}
          >
            {isSearching ? '...' : '🔍 Search'}
          </button>
        </div>

        {/* MAP CONTAINER - LEAFLET */}
        <div style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          background: c.overlay
        }}>
          {mapEditorLoading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: c.card,
              zIndex: 10
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '1rem',
                  animation: 'spin 2s linear infinite'
                }}>
                  📡
                </div>
                <p style={{ color: c.textMuted, fontWeight: '700' }}>
                  Loading map...
                </p>
              </div>
            </div>
          )}
          
          {/* Leaflet Map Container */}
          <div 
            ref={mapContainerRef}
            style={{
              width: '100%',
              height: '100%',
              zIndex: 1
            }}
          />

          {/* Floating Instructions */}
          <div style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            background: c.card,
            padding: '8px 16px',
            borderRadius: '20px',
            boxShadow: `0 4px 12px ${c.overlay}`,
            zIndex: 500,
            fontSize: '0.85rem',
            fontWeight: '700',
            color: c.textDark,
            border: `2px solid ${c.border}`,
            pointerEvents: 'none'
          }}>
            🖱️ Click map or drag marker to set location
          </div>

          {/* INFO CARD (BOTTOM) */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: c.card,
            borderTop: `2px solid ${c.border}`,
            padding: '1.5rem',
            boxShadow: `0 -4px 12px ${c.overlay}`,
            animation: 'slideUpMap 0.4s ease-out',
            maxHeight: '280px',
            overflowY: 'auto',
            zIndex: 500
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: c.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.5rem'
                }}>
                  Latitude
                </label>
                <div style={{
                  padding: '10px 14px',
                  background: c.overlay,
                  borderRadius: '10px',
                  border: `2px solid ${tempLocation ? c.success : c.border}`,
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: c.textDark,
                  fontFamily: 'monospace'
                }}>
                  {tempLocation?.lat?.toFixed(6) || '—'}
                </div>
              </div>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: c.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '0.5rem'
                }}>
                  Longitude
                </label>
                <div style={{
                  padding: '10px 14px',
                  background: c.overlay,
                  borderRadius: '10px',
                  border: `2px solid ${tempLocation ? c.success : c.border}`,
                  fontSize: '0.95rem',
                  fontWeight: '700',
                  color: c.textDark,
                  fontFamily: 'monospace'
                }}>
                  {tempLocation?.lng?.toFixed(6) || '—'}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <button
                onClick={handleCloseMapEditor}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: c.card,
                  border: `2px solid ${c.border}`,
                  borderRadius: '12px',
                  color: c.textDark,
                  fontWeight: '800',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = c.border
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = c.card
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                ✕ Cancel
              </button>
              <button
                onClick={handleSaveMapLocation}
                disabled={!tempLocation}
                style={{
                  flex: 1,
                  padding: '12px 20px',
                  background: !tempLocation ? c.textMuted : `linear-gradient(135deg, ${c.success} 0%, ${c.success}dd 100%)`,
                  border: 'none',
                  borderRadius: '12px',
                  color: 'white',
                  fontWeight: '800',
                  fontSize: '1rem',
                  cursor: !tempLocation ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  boxShadow: !tempLocation ? 'none' : `0 4px 12px ${c.success}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (tempLocation) {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)'
                    e.currentTarget.style.boxShadow = `0 8px 24px ${c.success}60`
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = !tempLocation ? 'none' : `0 4px 12px ${c.success}40`
                }}
              >
                <span>✓</span> Save Location
              </button>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes fadeInMap {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUpMap {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .leaflet-container {
            font-family: inherit;
          }
        `}</style>
      </div>
    )
  }

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
        animation: 'slideDown 0.6s cubic-bezier(0.23, 1, 0.320, 1)',
        transform: `translateY(${scrollY * 0.05}px)`
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: '700' }}>
              Stock Issues Detected
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
                transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)'
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '0.9'
                e.target.style.transform = 'scale(1.05)'
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '1'
                e.target.style.transform = 'scale(1)'
              }}
            >
              Dismiss
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
        <div style={{
          fontSize: isMobile ? '6rem' : '8rem',
          marginBottom: '2rem',
          opacity: 0.3,
          animation: 'bounce 3s ease-in-out infinite'
        }}>
          🛒
        </div>
        <h2 style={{
          fontSize: isMobile ? '1.75rem' : '2.5rem',
          marginBottom: '1rem',
          color: c.textDark,
          fontWeight: '900',
          textAlign: 'center',
          animation: 'fadeInUp 0.8s ease-out'
        }}>
          Your cart is empty
        </h2>
        <p style={{
          color: c.textMuted,
          marginBottom: '2rem',
          maxWidth: '400px',
          textAlign: 'center',
          animation: 'fadeInUp 1s ease-out 0.2s backwards'
        }}>
          Browse our collection and add some delicious items!
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
            transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
            boxShadow: `0 8px 24px rgba(212, 160, 23, 0.25)`,
            animation: 'fadeInUp 1.2s ease-out 0.4s backwards'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-4px) scale(1.05)'
            e.target.style.boxShadow = '0 12px 32px rgba(212, 160, 23, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0) scale(1)'
            e.target.style.boxShadow = '0 8px 24px rgba(212, 160, 23, 0.25)'
          }}
        >
          🛍️ Continue Shopping
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
          flexWrap: isMobile ? 'wrap' : 'nowrap',
          animation: 'fadeInDown 0.6s ease-out'
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
              transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = c.primary
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.transform = 'translateX(-4px) scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = c.card
              e.currentTarget.style.color = c.textDark
              e.currentTarget.style.transform = 'translateX(0) scale(1)'
            }}
          >
            ← {!isMobile && 'Back'}
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
            🛒 Cart
            <span style={{
              fontSize: isMobile ? '1rem' : '1.3rem',
              fontWeight: '800',
              background: `linear-gradient(135deg, ${c.secondary}20, ${c.secondary}05)`,
              color: c.secondary,
              padding: '8px 16px',
              borderRadius: '24px',
              border: `2px solid ${c.secondary}`,
              minWidth: '50px',
              textAlign: 'center',
              animation: 'badgePulse 2s ease-in-out infinite'
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
                    transition: 'all 0.4s cubic-bezier(0.23, 1, 0.320, 1)',
                    transform: hoveredItem === item.id ? 'translateY(-6px) scale(1.01)' : 'translateY(0) scale(1)',
                    boxShadow: hoveredItem === item.id ? `0 16px 40px ${c.overlay}` : `0 4px 12px ${c.overlay}`,
                    animation: `slideInItem 0.5s ease-out ${idx * 0.1}s backwards`
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
                      transition: 'transform 0.4s cubic-bezier(0.23, 1, 0.320, 1)',
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      if (!isMobile && product?.imageUrl) {
                        e.currentTarget.style.transform = 'scale(1.08) rotate(2deg)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
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
                        Out of Stock
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
                            WebkitBoxOrient: 'vertical',
                            transition: 'color 0.3s ease'
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
                            transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
                            flexShrink: 0
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.4) rotate(15deg)'
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
                        @ {item.price.toFixed(2)} EGP each
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
                          <span style={{ color: c.danger }}>❌ Out of Stock</span>
                        ) : isLowStock ? (
                          <span style={{ color: c.warning }}>⚡ {product.stock} Left</span>
                        ) : (
                          <span style={{ color: c.success }}>✓ In Stock</span>
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
                          marginBottom: '1rem',
                          animation: 'slideDown 0.5s ease-out'
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
                              padding: 0,
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.color = c.accent
                              e.target.style.letterSpacing = '0.5px'
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.color = c.secondary
                              e.target.style.letterSpacing = '0px'
                            }}
                          >
                            🍬 {product.flavors.length} flavors {expandedItem === item.id ? '▲' : '▼'}
                          </button>
                          {expandedItem === item.id && (
                            <div style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '8px',
                              marginTop: '10px',
                              animation: 'slideDown 0.4s ease-out'
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
                                    border: `1px solid ${c.border}`,
                                    animation: `fadeInScale 0.4s ease-out ${i * 0.08}s backwards`
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
                        border: `2px solid ${c.border}`,
                        transition: 'all 0.3s ease'
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
                          Max Reached
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
                boxShadow: `0 8px 24px ${c.overlay}`,
                animation: 'slideInRight 0.6s ease-out'
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
                  📍 Delivery Info
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
                      Full Name <span style={{ color: c.danger }}>*</span>
                    </label>
                    <input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
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
                      Phone Number <span style={{ color: c.danger }}>*</span>
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
                      Address <span style={{ color: c.danger }}>*</span>
                    </label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter detailed address"
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

                  {/* MAP - EMBEDDED WITH EDIT BUTTON */}
                  <div>
                    <label style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.5rem',
                      fontSize: '0.9rem',
                      fontWeight: '700',
                      color: c.textDark,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      <span>Location <span style={{ color: c.danger }}>*</span></span>
                      <button
                        type="button"
                        onClick={handleOpenMapEditor}
                        style={{
                          background: `linear-gradient(135deg, ${c.secondary} 0%, ${c.accent} 100%)`,
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'
                          e.currentTarget.style.boxShadow = `0 4px 12px ${c.secondary}40`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0) scale(1)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        🗺️ Edit Location
                      </button>
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
                        ⚠️ Geolocation not available
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
                          Loading...
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
                    transition: 'all 0.3s cubic-bezier(0.23, 1, 0.320, 1)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px) scale(1.05)'
                    e.target.style.boxShadow = `0 8px 20px ${c.success}50`
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  <span>✓</span> Save
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
                boxShadow: `0 4px 12px ${c.overlay}`,
                animation: 'slideInRight 0.6s ease-out'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '1rem' }}>
                  <h4 style={{ margin: 0, color: c.success, fontWeight: '800', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✓</span> Delivery Info
                  </h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setShowDeliveryForm(true)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: c.success,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        textDecoration: 'underline',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = c.secondary
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = c.success
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleOpenMapEditor}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: c.secondary,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        textDecoration: 'underline',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.color = c.accent
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.color = c.secondary
                      }}
                    >
                      🗺️ Location
                    </button>
                  </div>
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
              boxShadow: `0 4px 12px ${c.overlay}`,
              animation: 'slideInRight 0.7s ease-out'
            }}>
              <h4 style={{ margin: '0 0 1rem 0', color: c.textDark, fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🎟️ Coupon
              </h4>
              <div style={{ display: 'flex', gap: '8px', marginBottom: appliedCoupon ? '1rem' : 0 }}>
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
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
                      e.target.style.transform = 'translateY(-2px) scale(1.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0) scale(1)'
                  }}
                >
                  Apply
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
                  alignItems: 'center',
                  animation: 'slideDown 0.4s ease-out'
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
                      fontSize: '1rem',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.3)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* ============ ADDED: PAYMENT METHOD SELECTION ============ */}
            <div style={{
              background: c.card,
              padding: '1.5rem',
              borderRadius: '14px',
              border: `2px solid ${c.border}`,
              boxShadow: `0 4px 12px ${c.overlay}`,
              animation: 'slideInRight 0.75s ease-out'
            }}>
              <h4 style={{
                margin: '0 0 1rem 0',
                color: c.textDark,
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                💳 Payment Method
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Cash on Delivery */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px',
                  background: paymentMethod === 'cod' ? `${c.success}15` : c.overlay,
                  border: `2px solid ${paymentMethod === 'cod' ? c.success : c.border}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}>
                  <input
                    type="radio"
                    name="payment"
                    value="cod"
                    checked={paymentMethod === 'cod'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '20px', height: '20px', accentColor: c.success }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', color: c.textDark }}>Cash on Delivery</div>
                    <div style={{ fontSize: '0.8rem', color: c.textMuted }}>Pay when you receive</div>
                  </div>
                  <span style={{ fontSize: '1.5rem' }}>💵</span>
                </label>

                {/* Credit/Debit Card */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '14px',
                  background: paymentMethod === 'card' ? `${c.secondary}15` : c.overlay,
                  border: `2px solid ${paymentMethod === 'card' ? c.secondary : c.border}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}>
                  <input
                    type="radio"
                    name="payment"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    style={{ width: '20px', height: '20px', accentColor: c.secondary }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', color: c.textDark }}>Credit/Debit Card</div>
                    <div style={{ fontSize: '0.8rem', color: c.textMuted }}>Secure payment via Paymob</div>
                  </div>
                  <span style={{ fontSize: '1.5rem' }}>💳</span>
                </label>
              </div>
            </div>

            {/* ORDER SUMMARY */}
            <div style={{
              background: c.card,
              padding: '1.5rem',
              borderRadius: '14px',
              border: `2px solid ${c.secondary}40`,
              boxShadow: `0 8px 24px ${c.overlay}`,
              animation: 'slideInRight 0.8s ease-out'
            }}>
              <h4 style={{ margin: '0 0 1.25rem 0', color: c.textDark, fontWeight: '800', fontSize: '1.1rem' }}>
                💰 Order Summary
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
                  <span>Subtotal</span>
                  <span>{totalPrice.toFixed(2)} EGP</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: c.success, fontSize: '0.9rem', fontWeight: '800', animation: 'slideDown 0.4s ease-out' }}>
                    <span>💚 Discount</span>
                    <span>-{discountAmount.toFixed(2)} EGP</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: c.textMuted, fontSize: '0.9rem', fontWeight: '600' }}>
                  <span>Shipping</span>
                  <span style={{ 
                    color: shippingDetails.isFree ? c.success : c.textDark, 
                    fontWeight: '800',
                    animation: shippingDetails.isFree ? 'badgePulse 2s ease-in-out infinite' : 'none'
                  }}>
                    {shippingDetails.isFree 
                      ? `Free 🎉` 
                      : `${shippingCost.toFixed(2)} EGP`
                    }
                  </span>
                </div>
                {deliveryInfo?.latitude && !shippingDetails.isFree && (
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: c.textMuted, 
                    textAlign: 'right',
                    marginTop: '-4px'
                  }}>
                    📍 {shippingDetails.zone} Zone
                  </div>
                )}
              </div>
              
              {/* Free Shipping Progress Bar */}
              {!shippingDetails.isFree && (
                <div style={{
                  marginBottom: '1.25rem',
                  background: c.overlay,
                  borderRadius: '8px',
                  height: '6px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${Math.min((totalPrice / FREE_SHIPPING_THRESHOLD) * 100, 100)}%`,
                    background: c.secondary,
                    height: '100%',
                    transition: 'width 0.5s cubic-bezier(0.23, 1, 0.320, 1)'
                  }} />
                </div>
              )}
              {!shippingDetails.isFree && (
                <p style={{
                  fontSize: '0.75rem',
                  color: c.textMuted,
                  textAlign: 'center',
                  marginBottom: '1.25rem',
                  animation: 'fadeInUp 0.6s ease-out'
                }}>
                  Add {(FREE_SHIPPING_THRESHOLD - totalPrice).toFixed(0)} EGP more for free shipping!
                </p>
              )}

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
                <span>Total:</span>
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
                  transition: 'all 0.4s cubic-bezier(0.23, 1, 0.320, 1)',
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
                    e.target.style.transform = 'translateY(-4px) scale(1.05)'
                    e.target.style.boxShadow = `0 12px 32px ${c.overlay}`
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)'
                  e.target.style.boxShadow = canCheckout ? `0 4px 12px ${c.overlay}` : 'none'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>
                  {isProcessing ? '⏳' : !hasDeliveryInfo ? '📝' : Object.keys(stockErrors).length > 0 ? '❌' : '💳'}
                </span>
                {isProcessing ? 'Processing' : !hasDeliveryInfo ? 'Enter Delivery Info' : Object.keys(stockErrors).length > 0 ? 'Resolve Stock Issues' : 'Checkout'}
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
                  {!hasDeliveryInfo ? 'Complete delivery info' : 'Adjust quantities before checkout'}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* MAP EDITOR MODAL - MUST BE AT THE END */}
      <MapEditorModal />

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInItem {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
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

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}