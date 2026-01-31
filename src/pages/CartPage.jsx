// src/pages/CartPage_RESPONSIVE.jsx
// Enhanced version with improved responsive design
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'

export default function CartPage() {
  const { items, totalItems, totalPrice, removeFromCart, updateQuantity } = useCart()
  const { t, lang } = useLanguage()
  const { theme, getImage } = useTheme()
  const navigate = useNavigate()
  
const handleCheckout = async () => {
  try {
    // Get user's Pi address (from Pi Browser context)
    const userAddress = await PiNetwork.getWalletAddress()
    
    if (!userAddress) {
      alert("Please log in with Pi Browser")
      return
    }

    // Create payment (1 Testnet Pi)
    const payment = await PiNetwork.createPayment({
      amount: "1.0", // Testnet Pi (no real value)
      memo: "Chocolate order test",
      recipient: userAddress,
      metadata: { 
        purpose: "test_transaction",
        cartItems: items.map(i => i.id).join(",")
      }
    })

    // Submit payment
    const result = await PiNetwork.submitPayment(payment)
    
    if (result.status === 'COMPLETED') {
      alert("✅ Test transaction successful! Thank you!")
      // Optional: Clear cart
      // items.forEach(item => removeFromCart(item.id))
    }
  } catch (error) {
    console.error("Payment failed:", error)
    alert("❌ Transaction failed. Please try again.")
  }
}
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )

  const isMobile = windowWidth < 768
  const isSmallMobile = windowWidth < 480

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

  if (totalItems === 0) {
    return (
      <div style={{ 
        padding: isMobile ? '2rem 1rem' : 'clamp(40px, 8vw, 60px) clamp(16px, 4vw, 24px)',
        textAlign: 'center', 
        background: c.background,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.5s ease-out',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background elements */}
        {!isMobile && (
          <>
            <div style={{
              position: 'absolute',
              top: '10%',
              left: '5%',
              width: '300px',
              height: '300px',
              background: `radial-gradient(circle, ${c.secondary}15, transparent)`,
              borderRadius: '50%',
              filter: 'blur(60px)',
              animation: 'float 6s ease-in-out infinite'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '10%',
              right: '5%',
              width: '250px',
              height: '250px',
              background: `radial-gradient(circle, ${c.primary}10, transparent)`,
              borderRadius: '50%',
              filter: 'blur(50px)',
              animation: 'float 7s ease-in-out infinite reverse'
            }}></div>
          </>
        )}

        {/* Logo in empty cart */}
        <div style={{
          position: 'absolute',
          top: isMobile ? '16px' : 'clamp(20px, 4vw, 32px)',
          left: lang === 'ar' ? 'auto' : (isMobile ? '16px' : 'clamp(20px, 4vw, 32px)'),
          right: lang === 'ar' ? (isMobile ? '16px' : 'clamp(20px, 4vw, 32px)') : 'auto',
          height: isMobile ? '50px' : 'clamp(55px, 12vw, 70px)',
          zIndex: 10
        }}>
          <img 
            src={getImage('logo')} 
            alt="Louable" 
            style={{ 
              height: '100%',
              filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
            }} 
          />
        </div>

        <div style={{
          position: 'relative',
          zIndex: 1,
          animation: 'scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          <div style={{
            fontSize: isMobile ? '3.5rem' : 'clamp(4rem, 15vw, 6rem)',
            marginBottom: isMobile ? '16px' : 'clamp(20px, 5vw, 32px)',
            opacity: 0.4,
            filter: 'grayscale(30%) sepia(20%) hue-rotate(10deg)',
            animation: 'sway 3s ease-in-out infinite',
            position: 'relative'
          }}>
            🛒
            <div style={{
              position: 'absolute',
              bottom: '-20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60%',
              height: '20px',
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.2), transparent)',
              filter: 'blur(10px)',
              animation: 'shadowPulse 3s ease-in-out infinite'
            }}></div>
          </div>
          
          <h2 style={{
            fontSize: isMobile ? '1.6rem' : 'clamp(1.8rem, 6vw, 2.5rem)',
            marginBottom: '16px',
            fontWeight: '700',
            color: c.textDark,
            fontFamily: 'Georgia, serif',
            letterSpacing: '-0.5px'
          }}>
            {t('emptyCart')}
          </h2>
          
          <p style={{ 
            margin: isMobile ? '0 0 2rem 0' : '0 0 clamp(32px, 6vw, 48px) 0',
            color: c.textLight,
            fontSize: isMobile ? '0.95rem' : 'clamp(1rem, 3.5vw, 1.2rem)',
            maxWidth: '90%',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6,
            padding: '0 1rem'
          }}>
            {t('addProducts')}
          </p>
          
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: isMobile ? '12px 28px' : 'clamp(14px, 3.5vw, 18px) clamp(32px, 7vw, 48px)',
              background: `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`,
              color: '#FFFFFF',
              border: 'none',
              borderRadius: isMobile ? '10px' : 'clamp(8px, 2vw, 12px)',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: isMobile ? '0.95rem' : 'clamp(1rem, 3.5vw, 1.15rem)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 6px 20px rgba(139, 195, 74, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              if (windowWidth >= 768) {
                e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(139, 195, 74, 0.5)'
              }
            }}
            onMouseLeave={(e) => {
              if (windowWidth >= 768) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 195, 74, 0.4)'
              }
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)'
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <span>🛍️</span>
            {t('continueShopping')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      padding: isMobile ? '1.5rem 1rem 5rem' : 'clamp(24px, 4vw, 32px) clamp(16px, 3vw, 24px) clamp(80px, 12vw, 100px)',
      background: c.background,
      minHeight: '100vh',
      animation: 'fadeIn 0.5s ease-out',
      position: 'relative'
    }}>
      {/* Logo */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '16px' : 'clamp(20px, 4vw, 32px)',
        left: lang === 'ar' ? 'auto' : (isMobile ? '16px' : 'clamp(20px, 4vw, 32px)'),
        right: lang === 'ar' ? (isMobile ? '16px' : 'clamp(20px, 4vw, 32px)') : 'auto',
        zIndex: 10,
        height: isMobile ? '50px' : 'clamp(55px, 12vw, 70px)'
      }}>
        <img 
          src={getImage('logo')} 
          alt="Louable" 
          style={{ 
            height: '100%',
            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))'
          }} 
        />
      </div>

      <div style={{ 
        maxWidth: '950px', 
        margin: '0 auto', 
        paddingTop: isMobile ? '4rem' : 'clamp(60px, 12vw, 80px)' 
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isMobile ? '1.5rem' : 'clamp(32px, 6vw, 48px)',
          gap: isMobile ? '12px' : 'clamp(16px, 4vw, 24px)',
          flexDirection: isMobile ? 'column' : 'row',
          flexWrap: 'wrap'
        }}>
          <div style={{ width: isMobile ? '100%' : 'auto' }}>
            <h2 style={{ 
              margin: '0 0 8px 0',
              fontSize: isMobile ? '1.5rem' : 'clamp(1.6rem, 5vw, 2.2rem)',
              fontWeight: '700',
              color: c.textDark,
              fontFamily: 'Georgia, serif',
              letterSpacing: '-0.5px',
              textAlign: isMobile ? 'center' : 'left'
            }}>
              {t('cart')} ({totalItems})
            </h2>
            <p style={{
              margin: 0,
              fontSize: isMobile ? '0.85rem' : 'clamp(0.9rem, 2.8vw, 1rem)',
              color: c.textLight,
              textAlign: isMobile ? 'center' : 'left'
            }}>
              Review your items before checkout
            </p>
          </div>
          
          <button
            onClick={() => navigate('/home')}
            style={{
              padding: isMobile ? '10px 20px' : 'clamp(10px, 2.5vw, 12px) clamp(20px, 4vw, 28px)',
              background: 'transparent',
              border: `2px solid ${c.primary}`,
              borderRadius: isMobile ? '8px' : 'clamp(8px, 2vw, 10px)',
              cursor: 'pointer',
              color: c.primary,
              fontWeight: '600',
              fontSize: isMobile ? '0.85rem' : 'clamp(0.9rem, 2.8vw, 1rem)',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: isMobile ? '100%' : 'auto',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (windowWidth >= 768) {
                e.currentTarget.style.background = c.primary
                e.currentTarget.style.color = '#FFFFFF'
                e.currentTarget.style.transform = 'translateX(-4px)'
              }
            }}
            onMouseLeave={(e) => {
              if (windowWidth >= 768) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = c.primary
                e.currentTarget.style.transform = 'translateX(0)'
              }
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.opacity = '0.7'
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            <span>←</span>
            {t('continueShopping')}
          </button>
        </div>

        {/* Cart Items */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: isMobile ? '1rem' : 'clamp(16px, 3.5vw, 20px)',
          marginBottom: isMobile ? '2rem' : 'clamp(32px, 6vw, 48px)'
        }}>
          {items.map((item, index) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                gap: isMobile ? '12px' : 'clamp(16px, 3.5vw, 24px)',
                padding: isMobile ? '16px' : 'clamp(20px, 4vw, 28px)',
                backgroundColor: c.card,
                borderRadius: isMobile ? '12px' : 'clamp(12px, 2.5vw, 16px)',
                alignItems: 'center',
                // IMPROVED: Stack vertically on mobile
                flexDirection: windowWidth < 640 ? 'column' : (lang === 'ar' ? 'row-reverse' : 'row'),
                transition: 'all 0.3s ease',
                animation: `slideUp 0.5s ease-out ${index * 0.1}s backwards`,
                border: `1px solid ${c.border}`,
                boxShadow: theme === 'light' 
                  ? '0 4px 12px rgba(62, 39, 35, 0.08)' 
                  : '0 4px 12px rgba(0, 0, 0, 0.3)',
                flexWrap: 'wrap',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (windowWidth >= 768) {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = theme === 'light'
                    ? '0 8px 24px rgba(62, 39, 35, 0.14)'
                    : '0 8px 24px rgba(0, 0, 0, 0.4)'
                }
              }}
              onMouseLeave={(e) => {
                if (windowWidth >= 768) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = theme === 'light'
                    ? '0 4px 12px rgba(62, 39, 35, 0.08)'
                    : '0 4px 12px rgba(0, 0, 0, 0.3)'
                }
              }}
            >
              {/* Gradient overlay */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(135deg, ${c.secondary}05, transparent)`,
                pointerEvents: 'none'
              }}></div>

              {/* Product Image */}
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  style={{
                    // IMPROVED: Full width on mobile, fixed size on desktop
                    width: windowWidth < 640 ? '100%' : 'clamp(70px, 16vw, 90px)',
                    height: windowWidth < 640 ? 'auto' : 'clamp(70px, 16vw, 90px)',
                    maxHeight: windowWidth < 640 ? '250px' : 'none',
                    objectFit: 'cover',
                    borderRadius: isMobile ? '8px' : 'clamp(8px, 2vw, 12px)',
                    border: `2px solid ${c.border}`,
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    transition: 'transform 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (windowWidth >= 768) {
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (windowWidth >= 768) {
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                />
              ) : (
                <div style={{
                  width: windowWidth < 640 ? '100%' : 'clamp(70px, 16vw, 90px)',
                  height: windowWidth < 640 ? '150px' : 'clamp(70px, 16vw, 90px)',
                  background: theme === 'light'
                    ? 'linear-gradient(135deg, #E8DDD4 0%, #D4C4B8 100%)'
                    : 'linear-gradient(135deg, #3E2723 0%, #5D4037 100%)',
                  borderRadius: isMobile ? '8px' : 'clamp(8px, 2vw, 12px)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  fontSize: isMobile ? '2rem' : 'clamp(2rem, 5vw, 2.5rem)',
                  flexShrink: 0,
                  border: `2px solid ${c.border}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}>
                  🍫
                </div>
              )}

              {/* Product Info & Controls Container */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: windowWidth < 640 ? 'column' : 'row',
                alignItems: windowWidth < 640 ? 'stretch' : 'center',
                gap: isMobile ? '12px' : '16px',
                width: windowWidth < 640 ? '100%' : 'auto',
                minWidth: 0
              }}>
                {/* Product Info */}
                <div style={{ 
                  flex: 1,
                  textAlign: windowWidth < 640 ? 'center' : (lang === 'ar' ? 'right' : 'left'),
                  minWidth: 0
                }}>
                  <h3 style={{ 
                    margin: '0 0 clamp(6px, 1.5vw, 10px) 0',
                    fontSize: isMobile ? '1rem' : 'clamp(1.05rem, 3.5vw, 1.25rem)',
                    fontWeight: '700',
                    color: c.textDark,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: windowWidth < 640 ? 'normal' : 'nowrap',
                    fontFamily: 'Georgia, serif'
                  }}>
                    {item.name}
                  </h3>
                  <p style={{ 
                    color: c.secondary,
                    fontWeight: '700', 
                    margin: 0,
                    fontSize: isMobile ? '1.2rem' : 'clamp(1.15rem, 4vw, 1.4rem)',
                    textShadow: theme === 'dark' ? '0 2px 6px rgba(212, 160, 23, 0.3)' : 'none'
                  }}>
                    ${item.price.toFixed(2)}
                  </p>
                </div>

                {/* Quantity Controls */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 'clamp(10px, 2.5vw, 14px)',
                  background: c.background,
                  padding: isMobile ? '8px 12px' : 'clamp(8px, 2vw, 10px) clamp(12px, 3vw, 16px)',
                  borderRadius: isMobile ? '10px' : 'clamp(8px, 2vw, 12px)',
                  border: `2px solid ${c.border}`,
                  boxShadow: theme === 'light'
                    ? '0 2px 8px rgba(0,0,0,0.05)'
                    : '0 2px 8px rgba(0,0,0,0.2)',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    style={{
                      // IMPROVED: Larger touch targets on mobile
                      width: isMobile ? '44px' : 'clamp(32px, 8vw, 38px)',
                      height: isMobile ? '44px' : 'clamp(32px, 8vw, 38px)',
                      background: 'transparent',
                      border: `2px solid ${c.primary}`,
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      fontSize: isMobile ? '1.2rem' : 'clamp(1.1rem, 3.5vw, 1.3rem)',
                      fontWeight: '700',
                      color: c.primary,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (windowWidth >= 768) {
                        e.currentTarget.style.background = c.primary
                        e.currentTarget.style.color = '#FFFFFF'
                        e.currentTarget.style.transform = 'scale(1.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (windowWidth >= 768) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = c.primary
                        e.currentTarget.style.transform = 'scale(1)'
                      }
                    }}
                    onTouchStart={(e) => {
                      e.currentTarget.style.transform = 'scale(0.9)'
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    −
                  </button>
                  
                  <span style={{ 
                    minWidth: isMobile ? '36px' : 'clamp(32px, 7vw, 40px)',
                    textAlign: 'center',
                    fontWeight: '700',
                    fontSize: isMobile ? '1rem' : 'clamp(1rem, 3.5vw, 1.15rem)',
                    color: c.textDark
                  }}>
                    {item.quantity}
                  </span>
                  
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    style={{
                      width: isMobile ? '44px' : 'clamp(32px, 8vw, 38px)',
                      height: isMobile ? '44px' : 'clamp(32px, 8vw, 38px)',
                      background: 'transparent',
                      border: `2px solid ${c.primary}`,
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      cursor: 'pointer',
                      fontSize: isMobile ? '1.2rem' : 'clamp(1.1rem, 3.5vw, 1.3rem)',
                      fontWeight: '700',
                      color: c.primary,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (windowWidth >= 768) {
                        e.currentTarget.style.background = c.primary
                        e.currentTarget.style.color = '#FFFFFF'
                        e.currentTarget.style.transform = 'scale(1.1)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (windowWidth >= 768) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = c.primary
                        e.currentTarget.style.transform = 'scale(1)'
                      }
                    }}
                    onTouchStart={(e) => {
                      e.currentTarget.style.transform = 'scale(0.9)'
                    }}
                    onTouchEnd={(e) => {
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  style={{
                    padding: isMobile ? '10px 16px' : 'clamp(10px, 2.5vw, 12px) clamp(16px, 4vw, 20px)',
                    color: c.danger,
                    background: 'transparent',
                    border: `2px solid ${c.danger}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: isMobile ? '0.85rem' : 'clamp(0.85rem, 2.8vw, 0.95rem)',
                    fontWeight: '700',
                    transition: 'all 0.3s ease',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    width: windowWidth < 640 ? '100%' : 'auto'
                  }}
                  onMouseEnter={(e) => {
                    if (windowWidth >= 768) {
                      e.currentTarget.style.background = c.danger
                      e.currentTarget.style.color = '#FFFFFF'
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (windowWidth >= 768) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = c.danger
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                  onTouchStart={(e) => {
                    e.currentTarget.style.opacity = '0.7'
                  }}
                  onTouchEnd={(e) => {
                    e.currentTarget.style.opacity = '1'
                  }}
                >
                  <span>🗑️</span>
                  {t('remove')}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Section */}
        <div style={{
          padding: isMobile ? '20px' : 'clamp(28px, 6vw, 40px)',
          background: c.card,
          borderRadius: isMobile ? '12px' : 'clamp(12px, 2.5vw, 18px)',
          maxWidth: '550px',
          margin: '0 auto',
          animation: 'slideUp 0.6s ease-out 0.3s backwards',
          border: `2px solid ${c.secondary}40`,
          boxShadow: theme === 'light'
            ? `0 8px 30px rgba(62, 39, 35, 0.12), 0 0 0 1px ${c.secondary}20`
            : `0 8px 30px rgba(0, 0, 0, 0.4), 0 0 0 1px ${c.secondary}30`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative corner */}
          {!isMobile && (
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '100px',
              height: '100px',
              background: `radial-gradient(circle at top right, ${c.secondary}15, transparent)`,
              pointerEvents: 'none'
            }}></div>
          )}

          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: isMobile ? '1.3rem' : 'clamp(1.4rem, 5vw, 1.8rem)',
            fontWeight: '700',
            color: c.textDark,
            marginBottom: isMobile ? '16px' : 'clamp(20px, 5vw, 32px)',
            flexDirection: 'row',
            gap: '16px',
            flexWrap: 'wrap',
            alignItems: 'center',
            fontFamily: 'Georgia, serif'
          }}>
            <span>{t('total')}:</span>
            <span style={{ 
              color: c.secondary,
              textShadow: theme === 'dark' ? '0 2px 8px rgba(212, 160, 23, 0.4)' : 'none'
            }}>
              ${totalPrice.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleCheckout}
            
            style={{
              width: '100%',
              
              padding: isMobile ? '14px' : 'clamp(14px, 3.5vw, 20px)',
              background: `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`,
              color: 'white',
              border: 'none',
              borderRadius: isMobile ? '10px' : 'clamp(8px, 2vw, 12px)',
              fontWeight: '700',
              fontSize: isMobile ? '1rem' : 'clamp(1.05rem, 3.5vw, 1.25rem)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 6px 20px rgba(139, 195, 74, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
            onMouseEnter={(e) => {
              if (windowWidth >= 768) {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(139, 195, 74, 0.5)'
              }
            }}
            onMouseLeave={(e) => {
              if (windowWidth >= 768) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 195, 74, 0.4)'
              }
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.96)'
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <span>✓</span>
            {t('checkout')}
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes sway {
          0%, 100% {
            transform: rotate(-3deg);
          }
          50% {
            transform: rotate(3deg);
          }
        }

        @keyframes shadowPulse {
          0%, 100% {
            opacity: 0.2;
            transform: translateX(-50%) scale(1);
          }
          50% {
            opacity: 0.4;
            transform: translateX(-50%) scale(1.1);
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
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