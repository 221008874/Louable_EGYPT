// src/pages/ProductDetail_RESPONSIVE.jsx
// Enhanced version with improved responsive design
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLanguage } from '../context/LanguageContext'
import { useCart } from '../context/CartContext'
import { useTheme } from '../context/ThemeContext'
import { db } from '../services/firebase'
import { doc, getDoc } from 'firebase/firestore'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useLanguage()
  const { addToCart } = useCart()
  const { theme, getImage } = useTheme()
  const [product, setProduct] = useState(null)

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
      accent: '#5D4037',
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
      accent: '#5D4037',
      border: '#3E2723'
    }
  }

  const c = theme === 'light' ? colors.light : colors.dark

  useEffect(() => {
    if (!id) {
      navigate('/home')
      return
    }

    const fetchProduct = async () => {
      try {
        const docRef = doc(db, 'products', id)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setProduct({ id: docSnap.id, ...docSnap.data() })
        } else {
          navigate('/home')
        }
      } catch (err) {
        console.error('Error fetching product:', err)
        navigate('/home')
      }
    }
    fetchProduct()
  }, [id, navigate])

  if (!product) {
    return (
      <div style={{ 
        padding: isMobile ? '1.5rem' : '24px', 
        textAlign: 'center',
        background: c.background,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px'
      }}>
        <div style={{
          width: isMobile ? '70px' : '80px',
          height: isMobile ? '70px' : '80px',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            border: `6px solid ${c.border}`,
            borderRadius: '50%'
          }}></div>
          <div style={{
            position: 'absolute',
            inset: 0,
            border: '6px solid transparent',
            borderTopColor: c.secondary,
            borderRightColor: c.secondary,
            borderRadius: '50%',
            animation: 'spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite'
          }}></div>
        </div>
        <p style={{
          color: c.textDark,
          fontSize: isMobile ? '1rem' : '1.1rem',
          fontWeight: '600',
          padding: '0 1rem'
        }}>
          Loading product details...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  const handleAddToCart = () => {
    addToCart(product)
    const successMsg = document.createElement('div')
    successMsg.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.5rem;">✓</span>
        <span>Added to cart!</span>
      </div>
    `
    successMsg.style.cssText = `
      position: fixed;
      top: ${isMobile ? '80px' : '100px'};
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, ${c.success}, #7CB342);
      color: white;
      padding: ${isMobile ? '14px 24px' : '16px 32px'};
      borderRadius: 12px;
      font-weight: 700;
      box-shadow: 0 8px 24px rgba(139, 195, 74, 0.5);
      z-index: 1000;
      animation: slideInBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-size: ${isMobile ? '0.9rem' : 'clamp(0.95rem, 3vw, 1.05rem)'};
      max-width: 90%;
    `
    document.body.appendChild(successMsg)
    setTimeout(() => {
      successMsg.style.animation = 'slideOut 0.3s ease-out forwards'
      setTimeout(() => successMsg.remove(), 300)
    }, 2000)
  }

  return (
    <div style={{ 
      padding: isMobile ? '1.5rem 1rem' : 'clamp(24px, 4vw, 32px) clamp(16px, 3vw, 24px)',
      backgroundColor: c.background,
      minHeight: '100vh',
      animation: 'fadeIn 0.5s ease-out'
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isMobile ? '1.5rem' : 'clamp(24px, 5vw, 32px)',
          gap: isMobile ? '12px' : 'clamp(16px, 4vw, 20px)',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate('/home')}
            style={{
              background: 'transparent',
              border: `2px solid ${c.primary}`,
              color: c.primary,
              cursor: 'pointer',
              fontSize: isMobile ? '0.85rem' : 'clamp(0.9rem, 2.8vw, 1rem)',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '6px' : 'clamp(8px, 2vw, 10px)',
              padding: isMobile ? '10px 16px' : 'clamp(10px, 2.5vw, 12px) clamp(20px, 4vw, 24px)',
              borderRadius: isMobile ? '8px' : 'clamp(8px, 2vw, 10px)',
              transition: 'all 0.3s ease',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              if (windowWidth >= 768) {
                e.currentTarget.style.background = c.primary
                e.currentTarget.style.color = theme === 'light' ? '#FFFFFF' : c.textDark
                e.currentTarget.style.transform = 'translateX(-6px)'
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
              e.currentTarget.style.transform = 'scale(0.95)'
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <span>←</span>
            {t('backToProducts')}
          </button>
          
          <div style={{
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
        </div>

        {/* Product Details Card */}
        <div style={{
          background: c.card,
          borderRadius: isMobile ? '12px' : 'clamp(16px, 3vw, 20px)',
          padding: isMobile ? '20px' : 'clamp(24px, 5vw, 40px)',
          border: `1px solid ${c.border}`,
          boxShadow: theme === 'light'
            ? '0 8px 32px rgba(62, 39, 35, 0.12)'
            : '0 8px 32px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Decorative background */}
          {!isMobile && (
            <div style={{
              position: 'absolute',
              top: '-50%',
              right: '-20%',
              width: '400px',
              height: '400px',
              background: `radial-gradient(circle, ${c.secondary}08, transparent)`,
              borderRadius: '50%',
              filter: 'blur(60px)',
              pointerEvents: 'none'
            }}></div>
          )}

          {/* Product Image */}
          {product?.imageUrl ? (
            <div style={{ 
              position: 'relative', 
              marginBottom: isMobile ? '20px' : 'clamp(28px, 6vw, 40px)',
              borderRadius: isMobile ? '10px' : 'clamp(12px, 2.5vw, 16px)',
              overflow: 'hidden',
              boxShadow: theme === 'light'
                ? '0 8px 24px rgba(0,0,0,0.12)'
                : '0 8px 24px rgba(0,0,0,0.4)'
            }}>
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{
                  width: '100%',
                  height: 'auto',
                  // IMPROVED: Better mobile image height
                  maxHeight: isMobile ? 'clamp(300px, 50vh, 400px)' : 'clamp(350px, 55vw, 450px)',
                  objectFit: 'cover',
                  borderRadius: isMobile ? '10px' : 'clamp(12px, 2.5vw, 16px)',
                  filter: theme === 'dark' ? 'brightness(0.95)' : 'brightness(1)'
                }}
              />
              
              {/* Gradient overlay */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '40%',
                background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.3))',
                pointerEvents: 'none'
              }}></div>

              {/* Premium Badge */}
              <div style={{
                position: 'absolute',
                top: isMobile ? '12px' : 'clamp(16px, 3.5vw, 20px)',
                right: lang === 'ar' ? 'auto' : (isMobile ? '12px' : 'clamp(16px, 3.5vw, 20px)'),
                left: lang === 'ar' ? (isMobile ? '12px' : 'clamp(16px, 3.5vw, 20px)') : 'auto',
                background: 'linear-gradient(135deg, #FFD700, #D4A017)',
                color: '#FFFFFF',
                padding: isMobile ? '6px 12px' : 'clamp(8px, 2vw, 10px) clamp(16px, 3.5vw, 20px)',
                borderRadius: isMobile ? '8px' : 'clamp(8px, 2vw, 10px)',
                fontSize: isMobile ? '0.75rem' : 'clamp(0.85rem, 2.8vw, 1rem)',
                fontWeight: '800',
                boxShadow: '0 6px 20px rgba(212, 160, 23, 0.6)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                animation: 'badgeGlow 2s ease-in-out infinite'
              }}>
                <span style={{ fontSize: isMobile ? '1rem' : '1.2rem' }}>✨</span>
                Premium{isMobile ? '' : ' Quality'}
              </div>
            </div>
          ) : (
            <div style={{
              width: '100%',
              height: isMobile ? '250px' : 'clamp(350px, 55vw, 450px)',
              background: theme === 'light' 
                ? 'linear-gradient(135deg, #E8DDD4 0%, #D4C4B8 100%)'
                : 'linear-gradient(135deg, #3E2723 0%, #5D4037 100%)',
              borderRadius: isMobile ? '10px' : 'clamp(12px, 2.5vw, 16px)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: isMobile ? '20px' : 'clamp(28px, 6vw, 40px)',
              fontSize: isMobile ? '3.5rem' : 'clamp(5rem, 15vw, 7rem)',
              border: `2px solid ${c.border}`,
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle, rgba(212, 160, 23, 0.05), transparent)',
                animation: 'pulse 3s ease-in-out infinite'
              }}></div>
              <span style={{ animation: 'bounce 2s ease-in-out infinite' }}>🍫</span>
              <p style={{ 
                fontSize: isMobile ? '0.95rem' : 'clamp(1rem, 3.5vw, 1.2rem)', 
                color: c.textLight, 
                marginTop: '20px',
                fontWeight: '600'
              }}>
                Product Image
              </p>
            </div>
          )}

          {/* Product Info */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h1 style={{ 
              fontSize: isMobile ? 'clamp(1.5rem, 8vw, 2.2rem)' : 'clamp(1.8rem, 6vw, 3rem)',
              marginBottom: isMobile ? '12px' : 'clamp(16px, 3.5vw, 24px)',
              color: c.textDark,
              fontWeight: '700',
              letterSpacing: '-1px',
              lineHeight: 1.2,
              fontFamily: 'Georgia, serif'
            }}>
              {product.name}
            </h1>
            
            {/* Price and Rating */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '12px' : 'clamp(16px, 4vw, 24px)',
              marginBottom: isMobile ? '20px' : 'clamp(24px, 5vw, 32px)',
              flexWrap: 'wrap',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}>
              <div style={{
                background: `linear-gradient(135deg, ${c.secondary}20, ${c.secondary}10)`,
                padding: isMobile ? '8px 16px' : 'clamp(10px, 2.5vw, 14px) clamp(20px, 4vw, 28px)',
                borderRadius: '12px',
                border: `2px solid ${c.secondary}40`,
                boxShadow: theme === 'light'
                  ? '0 4px 16px rgba(212, 160, 23, 0.2)'
                  : '0 4px 16px rgba(212, 160, 23, 0.4)'
              }}>
                <p style={{ 
                  color: c.secondary,
                  fontSize: isMobile ? '1.6rem' : 'clamp(1.8rem, 6vw, 2.5rem)',
                  fontWeight: '800', 
                  margin: 0,
                  textShadow: theme === 'dark' ? '0 2px 8px rgba(212, 160, 23, 0.4)' : 'none'
                }}>
                  π   {product.price.toFixed(2)}
                </p>
              </div>
              
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: isMobile ? '8px 14px' : 'clamp(8px, 2vw, 12px) clamp(16px, 3.5vw, 20px)',
                background: c.background, 
                borderRadius: '24px', 
                border: `2px solid ${c.border}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
              }}>
                <span style={{ 
                  fontSize: isMobile ? '0.8rem' : 'clamp(0.9rem, 2.8vw, 1rem)',
                  filter: 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.4))'
                }}>
                  ⭐⭐⭐⭐⭐
                </span>
                <span style={{ 
                  fontSize: isMobile ? '0.8rem' : 'clamp(0.85rem, 2.5vw, 1rem)',
                  color: c.textLight, 
                  fontWeight: '700' 
                }}>
                  5.0
                </span>
              </div>
            </div>

            {/* Pieces Per Box */}
            <div style={{
              background: c.background,
              padding: isMobile ? '12px 14px' : 'clamp(12px, 3vw, 16px) clamp(16px, 4vw, 20px)',
              borderRadius: '10px',
              marginBottom: isMobile ? '16px' : 'clamp(20px, 4vw, 24px)',
              border: `1px solid ${c.border}`
            }}>
              <p style={{ 
                fontWeight: '700', 
                color: c.textDark, 
                margin: 0,
                fontSize: isMobile ? '0.95rem' : 'clamp(1rem, 3.2vw, 1.15rem)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}>
                <span style={{ fontSize: isMobile ? '1.3rem' : '1.5rem' }}>📦</span>
                <strong>{t('piecesPerBox')}:</strong> 
                <span style={{ color: c.secondary, fontWeight: '800' }}>
                  {product.piecesPerBox} pieces
                </span>
              </p>
            </div>
            
            {/* Flavors */}
            <div style={{ marginBottom: isMobile ? '20px' : 'clamp(24px, 5vw, 32px)' }}>
              <p style={{ 
                fontWeight: '700', 
                color: c.textDark, 
                marginBottom: isMobile ? '10px' : 'clamp(12px, 3vw, 16px)',
                fontSize: isMobile ? '0.95rem' : 'clamp(1rem, 3.2vw, 1.15rem)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}>
                <span style={{ fontSize: isMobile ? '1.3rem' : '1.5rem' }}>🍬</span>
                <strong>{t('flavors')}:</strong>
              </p>
              <div style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: isMobile ? '8px' : 'clamp(8px, 2vw, 12px)',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}>
                {product.flavors.map((flavor, index) => (
                  <span key={index} style={{
                    background: `linear-gradient(135deg, ${c.background}, ${c.card})`,
                    padding: isMobile ? '10px 16px' : 'clamp(10px, 2.5vw, 14px) clamp(16px, 4vw, 22px)',
                    borderRadius: '24px',
                    fontSize: isMobile ? '0.85rem' : 'clamp(0.9rem, 2.8vw, 1.05rem)',
                    color: c.textDark,
                    border: `2px solid ${c.border}`,
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    cursor: 'default',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s backwards`
                  }}
                  onMouseEnter={(e) => {
                    if (windowWidth >= 768) {
                      e.currentTarget.style.background = `linear-gradient(135deg, ${c.secondary}, #D4A017)`
                      e.currentTarget.style.color = '#FFFFFF'
                      e.currentTarget.style.borderColor = c.secondary
                      e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(212, 160, 23, 0.4)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (windowWidth >= 768) {
                      e.currentTarget.style.background = `linear-gradient(135deg, ${c.background}, ${c.card})`
                      e.currentTarget.style.color = c.textDark
                      e.currentTarget.style.borderColor = c.border
                      e.currentTarget.style.transform = 'translateY(0) scale(1)'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
                    }
                  }}
                  >
                    {flavor}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: isMobile ? '24px' : 'clamp(32px, 6vw, 48px)' }}>
              <p style={{ 
                fontWeight: '700', 
                color: c.textDark, 
                marginBottom: isMobile ? '10px' : 'clamp(12px, 3vw, 16px)',
                fontSize: isMobile ? '0.95rem' : 'clamp(1rem, 3.2vw, 1.15rem)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}>
                <span style={{ fontSize: isMobile ? '1.3rem' : '1.5rem' }}>📝</span>
                <strong>{t('description')}:</strong>
              </p>
              <p style={{ 
                color: c.textLight, 
                lineHeight: 1.8, 
                fontSize: isMobile ? '0.9rem' : 'clamp(0.95rem, 3.2vw, 1.1rem)',
                background: c.background,
                padding: isMobile ? '14px' : 'clamp(16px, 4vw, 20px)',
                borderRadius: '10px',
                border: `1px solid ${c.border}`,
                margin: 0,
                textAlign: isMobile ? 'center' : 'left'
              }}>
                {product.description}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: isMobile ? '10px' : 'clamp(12px, 3vw, 16px)',
              flexDirection: isMobile ? 'column' : 'row',
              flexWrap: 'wrap' 
            }}>
              <button
                onClick={handleAddToCart}
                style={{
                  flex: isMobile ? 'none' : 1,
                  width: isMobile ? '100%' : 'auto',
                  minWidth: isMobile ? 'auto' : 'clamp(180px, 45vw, 220px)',
                  padding: isMobile ? '14px 20px' : 'clamp(14px, 3.5vw, 20px) clamp(24px, 5vw, 32px)',
                  background: `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`,
                  color: 'white',
                  border: 'none',
                  borderRadius: isMobile ? '10px' : 'clamp(8px, 2vw, 12px)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: isMobile ? '1rem' : 'clamp(1rem, 3.5vw, 1.2rem)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 6px 20px rgba(139, 195, 74, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px'
                }}
                onMouseEnter={(e) => {
                  if (windowWidth >= 768) {
                    e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
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
                <span style={{ fontSize: '1.3rem' }}>✓</span>
                {t('addToCart')}
              </button>
              
              <button
                onClick={() => navigate('/cart')}
                style={{
                  width: isMobile ? '100%' : 'auto',
                  padding: isMobile ? '14px 20px' : 'clamp(14px, 3.5vw, 20px) clamp(24px, 5vw, 32px)',
                  backgroundColor: 'transparent',
                  color: c.primary,
                  border: `2px solid ${c.primary}`,
                  borderRadius: isMobile ? '10px' : 'clamp(8px, 2vw, 12px)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: isMobile ? '1rem' : 'clamp(1rem, 3.5vw, 1.2rem)',
                  transition: 'all 0.3s ease',
                  minWidth: isMobile ? 'auto' : 'clamp(140px, 35vw, 170px)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (windowWidth >= 768) {
                    e.currentTarget.style.backgroundColor = c.primary
                    e.currentTarget.style.color = theme === 'light' ? '#FFFFFF' : c.textDark
                    e.currentTarget.style.transform = 'translateY(-4px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (windowWidth >= 768) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = c.primary
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)'
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                🛒 {t('goToCart')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        @keyframes badgeGlow {
          0%, 100% {
            box-shadow: 0 6px 20px rgba(212, 160, 23, 0.6);
          }
          50% {
            box-shadow: 0 8px 30px rgba(212, 160, 23, 0.8);
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