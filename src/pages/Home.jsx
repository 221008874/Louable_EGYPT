// src/pages/Home_RESPONSIVE.jsx
// Enhanced version with improved responsive design
import { useEffect, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useCart } from '../context/CartContext'
import { useLanguage } from '../context/LanguageContext'
import ProductCard from '../components/ProductCard'
import { Link } from 'react-router-dom'
import { db } from '../services/firebase'
import { collection, getDocs } from 'firebase/firestore'
import heroImage from '../assets/mainBG.webp'
import facebookIcon from '../assets/facebook.png'
import instagramIcon from '../assets/instagram.png'
import twitterIcon from '../assets/twitter.png'
import whatsappIcon from '../assets/whatsapp.png'

export default function Home() {
  const { toggleTheme, theme, getImage } = useTheme()
  const { totalItems } = useCart()
  const { t, lang, toggleLanguage } = useLanguage()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)

  const colors = {
    light: {
      primary: '#3E2723',
      secondary: '#D4A017',
      background: '#F8F4F0',
      card: '#FCFAF8',
      textDark: '#2E1B1B',
      textLight: '#6B5E57',
      border: '#E8DDD4'
    },
    dark: {
      primary: '#F8F4F0',
      secondary: '#D4A017',
      background: '#1A1412',
      card: '#2E1B1B',
      textDark: '#F8F4F0',
      textLight: '#C4B5AD',
      border: '#3E2723'
    }
  }

  const c = theme === 'light' ? colors.light : colors.dark

  // Responsive breakpoints
  const isMobile = windowWidth < 768
  const isTablet = windowWidth >= 768 && windowWidth < 1024
  const isSmallMobile = windowWidth < 480

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'products'))
        const productList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setProducts(productList)
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: c.background,
          color: c.textDark,
          fontSize: '1.25rem',
          fontFamily: 'Georgia, serif',
          gap: '24px',
          padding: '20px'
        }}
      >
        <div style={{
          width: '80px',
          height: '80px',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            border: '6px solid rgba(212, 160, 23, 0.2)',
            borderRadius: '50%'
          }}></div>
          <div style={{
            position: 'absolute',
            inset: 0,
            border: '6px solid transparent',
            borderTopColor: '#D4A017',
            borderRightColor: '#D4A017',
            borderRadius: '50%',
            animation: 'spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite'
          }}></div>
        </div>
        <p style={{ fontWeight: '600', letterSpacing: '1px', textAlign: 'center' }}>
          Loading premium chocolates...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <>
      {/* HERO IMAGE SECTION WITH CONTROLS */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          // IMPROVED: Better mobile hero height
          height: isMobile ? 'clamp(600px, 90vh, 750px)' : '75vh',
          minHeight: isMobile ? '600px' : '850px',
          maxHeight: isMobile ? '750px' : '950px',
          overflow: 'hidden',
          background: c.card
        }}
      >
        {/* Background Image */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: theme === 'dark' ? 'brightness(0.75)' : 'brightness(0.9)',
            transition: 'filter 0.3s ease',
            animation: isMobile ? 'none' : 'kenBurns 20s ease-in-out infinite alternate'
          }}
        />

        {/* Enhanced Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: theme === 'light' 
              ? 'linear-gradient(to bottom, rgba(248,244,240,0.1), rgba(62,39,35,0.6))' 
              : 'linear-gradient(to bottom, rgba(26,20,18,0.2), rgba(46,27,27,0.7))',
            transition: 'background 0.3s ease'
          }}
        />

        {/* Decorative elements - Hidden on small mobile */}
        {!isSmallMobile && (
          <>
            <div style={{
              position: 'absolute',
              top: '10%',
              right: '5%',
              fontSize: '2rem',
              opacity: 0.3,
              animation: 'float 4s ease-in-out infinite'
            }}>🍫</div>
            <div style={{
              position: 'absolute',
              bottom: '15%',
              left: '8%',
              fontSize: '1.5rem',
              opacity: 0.25,
              animation: 'float 5s ease-in-out infinite 1s'
            }}>✨</div>
          </>
        )}

        {/* TOP CONTROLS */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: isMobile ? '1rem' : 'clamp(1rem, 3vw, 1.5rem) clamp(1.5rem, 4vw, 2rem)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 10,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)',
            backdropFilter: 'blur(5px)',
            // IMPROVED: Better mobile spacing
            gap: '0.5rem'
          }}
        >
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `2px solid rgba(255, 255, 255, 0.4)`,
              borderRadius: '30px',
              padding: isMobile ? '0.6rem 1rem' : 'clamp(0.6rem, 2vw, 0.8rem) clamp(1.2rem, 3vw, 1.5rem)',
              cursor: 'pointer',
              fontSize: isMobile ? '0.85rem' : 'clamp(0.9rem, 2.5vw, 1rem)',
              fontWeight: '700',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              color: '#FFFFFF',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              minWidth: isMobile ? '60px' : '75px',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (windowWidth >= 768) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
                e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (windowWidth >= 768) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                e.currentTarget.style.transform = 'scale(1) translateY(0)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)'
              }
            }}
            onTouchStart={(e) => {
              e.currentTarget.style.transform = 'scale(0.95)'
            }}
            onTouchEnd={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {lang === 'ar' ? 'EN' : 'AR'}
          </button>

          {/* Right Side Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? '0.5rem' : 'clamp(0.6rem, 2vw, 0.9rem)'
            }}
          >
            {/* Theme Toggle */}
            

            {/* Cart Link */}
            <Link
              to="/cart"
              style={{
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: `2px solid rgba(255, 255, 255, 0.4)`,
                borderRadius: '50%',
                width: isMobile ? '48px' : 'clamp(50px, 12vw, 58px)',
                height: isMobile ? '48px' : 'clamp(50px, 12vw, 58px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: isMobile ? '1.3rem' : 'clamp(1.4rem, 4vw, 1.6rem)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                textDecoration: 'none',
                color: '#FFFFFF',
                boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                if (windowWidth >= 768) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'
                  e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)'
                }
              }}
              onMouseLeave={(e) => {
                if (windowWidth >= 768) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'
                  e.currentTarget.style.transform = 'scale(1) translateY(0)'
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)'
                }
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.transform = 'scale(0.9)'
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
            >
              🛒
              {totalItems > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: 'linear-gradient(135deg, #FF3B3B, #DC2626)',
                    color: '#fff',
                    borderRadius: '50%',
                    width: isMobile ? '22px' : 'clamp(24px, 6vw, 28px)',
                    height: isMobile ? '22px' : 'clamp(24px, 6vw, 28px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: isMobile ? '0.65rem' : 'clamp(0.7rem, 2vw, 0.8rem)',
                    fontWeight: 'bold',
                    border: `3px solid #FFFFFF`,
                    boxShadow: '0 4px 12px rgba(220, 38, 38, 0.5)',
                    animation: 'cartBadgePulse 2s ease-in-out infinite'
                  }}
                >
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* CENTERED HERO CONTENT */}
        <div
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '1.5rem 1rem' : 'clamp(2rem, 5vw, 3rem)',
            textAlign: 'center',
            zIndex: 1
          }}
        >
          <div
            style={{
              maxWidth: '1000px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: isMobile ? '1rem' : 'clamp(1.2rem, 3.5vh, 2.5rem)'
            }}
          >
            {/* Logo with enhanced effects */}
            <div 
              style={{
                marginTop: 0,
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                animation: 'fadeInScale 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative'
              }}
            >
              <div style={{
                position: 'relative',
                filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.4))'
              }}>
                <img 
                  src={getImage('logo')} 
                  alt="Louable Logo" 
                  style={{ 
                    // IMPROVED: Better mobile logo sizing
                    height: isMobile ? 'clamp(120px, 22vh, 200px)' : 'clamp(140px, 28vh, 280px)',
                    width: 'auto',
                    maxWidth: '90%',
                    objectFit: 'contain',
                    filter: theme === 'dark' 
                      ? 'brightness(1.15) contrast(1.1)' 
                      : 'brightness(1.05)',
                    transition: 'all 0.4s ease',
                    animation: isMobile ? 'none' : 'floatGentle 5s ease-in-out infinite'
                  }} 
                  onMouseEnter={(e) => {
                    if (windowWidth >= 768) {
                      e.currentTarget.style.transform = 'scale(1.08) rotate(2deg)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (windowWidth >= 768) {
                      e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
                    }
                  }}
                />
                {/* Glow effect */}
                {!isMobile && (
                  <div style={{
                    position: 'absolute',
                    inset: '-30%',
                    background: 'radial-gradient(circle, rgba(212, 160, 23, 0.4) 0%, transparent 60%)',
                    filter: 'blur(40px)',
                    animation: 'glow 3s ease-in-out infinite',
                    zIndex: -1,
                    pointerEvents: 'none'
                  }}></div>
                )}
              </div>
            </div>

            {/* Brand Name */}
            <h1
              style={{
                fontSize: isMobile ? 'clamp(2.5rem, 12vw, 4rem)' : 'clamp(3rem, 9vw, 6rem)',
                fontFamily: 'Georgia, serif',
                color: '#FFFFFF',
                margin: 0,
                fontWeight: 'bold',
                textShadow: '4px 4px 16px rgba(0,0,0,0.7), 0 0 40px rgba(212, 160, 23, 0.3)',
                letterSpacing: isMobile ? '1px' : 'clamp(1px, 0.3vw, 3px)',
                animation: 'fadeInScale 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s backwards',
                background: 'linear-gradient(135deg, #FFFFFF 0%, #F5C561 50%, #FFFFFF 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
              }}
            >
              {t('Louable')}
            </h1>

            {/* Decorative line */}
            <div style={{
              width: isMobile ? '80px' : 'clamp(100px, 25vw, 150px)',
              height: '4px',
              background: 'linear-gradient(90deg, transparent, #D4A017 20%, #FFD700 50%, #D4A017 80%, transparent)',
              animation: 'expandWidth 1.2s ease-out 0.6s backwards, shimmer 3s linear infinite',
              borderRadius: '2px',
              boxShadow: '0 0 20px rgba(212, 160, 23, 0.6)'
            }}></div>

            {/* Featured Products Heading */}
            <h2
              style={{
                fontSize: isMobile ? 'clamp(1.5rem, 7vw, 2.2rem)' : 'clamp(1.8rem, 5vw, 3rem)',
                fontFamily: 'Georgia, serif',
                color: '#F8F4F0',
                margin: 0,
                fontWeight: '700',
                textShadow: '3px 3px 12px rgba(0,0,0,0.6)',
                letterSpacing: isMobile ? '0.5px' : 'clamp(0.5px, 0.2vw, 1.5px)',
                animation: 'fadeInUp 1.6s ease-out 0.4s backwards'
              }}
            >
              {t('featuredProducts')}
            </h2>

            {/* Subtitle */}
                        {/* Subtitle */}
            <p
              style={{
                fontSize: isMobile ? 'clamp(0.95rem, 4vw, 1.3rem)' : 'clamp(1.1rem, 3vw, 1.7rem)',
                color: '#F8F4F0',
                margin: 0,
                fontFamily: 'Georgia, serif',
                textShadow: '2px 2px 8px rgba(0,0,0,0.6)',
                fontStyle: 'italic',
                opacity: 0.95,
                animation: 'fadeInUp 1.8s ease-out 0.6s backwards',
                maxWidth: '90%'
              }}
            >
              {t('discoverPremium')}
            </p>
          </div>
        </div>
      </section>

      {/* PRODUCTS SECTION */}
      <section
        style={{
          background: c.background,
          padding: isMobile ? '3rem 1rem' : 'clamp(4rem, 8vw, 6rem) clamp(1.5rem, 4vw, 2rem)',
          transition: 'background 0.3s ease',
          position: 'relative'
        }}
      >
        {/* Decorative background pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '200px',
          background: `linear-gradient(to bottom, ${c.background}00, ${c.background})`,
          pointerEvents: 'none'
        }}></div>

        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            position: 'relative'
          }}
        >
          {/* Section Title */}
          <div style={{
            textAlign: 'center',
            marginBottom: isMobile ? '2rem' : 'clamp(3rem, 6vw, 4rem)',
            animation: 'fadeInUp 0.8s ease-out'
          }}>
            <h2 style={{
              fontSize: isMobile ? 'clamp(1.8rem, 7vw, 2.5rem)' : 'clamp(2rem, 5vw, 3rem)',
              fontFamily: 'Georgia, serif',
              color: c.textDark,
              fontWeight: '700',
              marginBottom: '1rem',
              letterSpacing: '-1px'
            }}>
              Our Collection
            </h2>
            <div style={{
              width: isMobile ? '60px' : 'clamp(60px, 15vw, 80px)',
              height: '4px',
              background: `linear-gradient(90deg, transparent, ${c.secondary}, transparent)`,
              margin: '0 auto',
              borderRadius: '2px'
            }}></div>
          </div>

          {/* Products Grid */}
          {products.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: isMobile ? '3rem 1rem' : 'clamp(4rem, 8vw, 6rem) clamp(2rem, 4vw, 3rem)',
                color: c.textLight,
                animation: 'fadeIn 0.6s ease-out'
              }}
            >
              <div 
                style={{ 
                  fontSize: isMobile ? '3rem' : 'clamp(4rem, 10vw, 6rem)', 
                  marginBottom: 'clamp(1.5rem, 3vw, 2rem)',
                  animation: 'bounce 2s ease-in-out infinite',
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))'
                }}
              >
                🍫
              </div>
              <p style={{ 
                fontSize: isMobile ? '1.1rem' : 'clamp(1.2rem, 3vw, 1.5rem)', 
                fontFamily: 'Georgia, serif',
                fontWeight: '600'
              }}>
                No products available yet
              </p>
              <p style={{ 
                fontSize: isMobile ? '0.95rem' : 'clamp(1rem, 2.5vw, 1.1rem)',
                opacity: 0.7,
                marginTop: '0.5rem'
              }}>
                Check back soon for delicious chocolates!
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                // IMPROVED: Responsive grid columns
                gridTemplateColumns: isSmallMobile 
                  ? '1fr' 
                  : isMobile 
                    ? 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' 
                    : 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
                gap: isMobile ? '1.5rem' : 'clamp(1.5rem, 4vw, 2.5rem)',
                animation: 'fadeIn 0.8s ease-in-out'
              }}
            >
              {products.map((product, index) => (
                <div
                  key={product.id}
                  style={{
                    animation: `fadeInUp 0.6s ease-out ${index * 0.1}s both`
                  }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FOOTER SECTION */}
      <footer
        style={{
          background: theme === 'light' 
            ? `linear-gradient(135deg, ${c.primary} 0%, #2E1B1B 50%, ${c.textDark} 100%)`
            : `linear-gradient(135deg, ${c.card} 0%, ${c.background} 100%)`,
          color: theme === 'light' ? '#F8F4F0' : c.textDark,
          padding: isMobile ? '2.5rem 1rem 2rem' : 'clamp(3rem, 6vw, 4rem) clamp(1.5rem, 4vw, 2rem) clamp(2rem, 4vw, 3rem)',
          borderTop: `3px solid ${c.secondary}`,
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Decorative elements */}
        {!isMobile && (
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: `radial-gradient(circle, ${c.secondary}20, transparent)`,
            borderRadius: '50%',
            filter: 'blur(40px)',
            pointerEvents: 'none'
          }}></div>
        )}

        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'grid',
            // IMPROVED: Footer grid responsiveness
            gridTemplateColumns: isSmallMobile || isMobile
              ? '1fr'
              : 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
            gap: isMobile ? '2rem' : 'clamp(2.5rem, 5vw, 4rem)',
            marginBottom: isMobile ? '1.5rem' : 'clamp(2rem, 4vw, 3rem)',
            position: 'relative',
            zIndex: 1
          }}
        >
          {/* Brand Section */}
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '1.5rem',
              justifyContent: isMobile ? 'center' : 'flex-start'
            }}>
              <img 
                src={getImage('logo')} 
                alt="Louable" 
                style={{ 
                  height: isMobile ? '40px' : '50px',
                  filter: theme === 'dark' ? 'brightness(1.2)' : 'brightness(1.1) drop-shadow(0 2px 8px rgba(0,0,0,0.3))'
                }} 
              />
              <h3
                style={{
                  fontSize: isMobile ? '1.5rem' : 'clamp(1.6rem, 4vw, 2rem)',
                  fontFamily: 'Georgia, serif',
                  color: c.secondary,
                  marginBottom: 0,
                  fontWeight: 'bold',
                  letterSpacing: '1px',
                  textShadow: theme === 'light' ? '2px 2px 4px rgba(0,0,0,0.3)' : 'none'
                }}
              >
                {t('Louable')}
              </h3>
            </div>
            <p
              style={{
                fontSize: isMobile ? '0.9rem' : 'clamp(0.95rem, 2.5vw, 1.05rem)',
                lineHeight: '1.7',
                opacity: 0.9,
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic'
              }}
            >
              {t('footerTagline')}
            </p>
          </div>

          {/* Quick Links */}
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <h4
              style={{
                fontSize: isMobile ? '1.1rem' : 'clamp(1.2rem, 3vw, 1.4rem)',
                fontFamily: 'Georgia, serif',
                color: c.secondary,
                marginBottom: '1.5rem',
                fontWeight: '700',
                letterSpacing: '0.5px'
              }}
            >
              {t('quickLinks')}
            </h4>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0
              }}
            >
              {[
                { key: 'terms-of-service', label: t('terms-of-service'), path: '/terms-of-service' },
                { key: 'privacy', label: t('privacy'), path: '/privacy' },
                { key: 'aboutUs', label: t('aboutUs'), path: '/about' },
                { key: 'contact', label: t('contact'), path: '#' }
              ].map((link) => (
                <li key={link.key} style={{ marginBottom: '1rem' }}>
                  <Link
                    to={link.path}
                    style={{
                      color: 'inherit',
                      textDecoration: 'none',
                      fontSize: isMobile ? '0.9rem' : 'clamp(0.95rem, 2.5vw, 1.05rem)',
                      opacity: 0.85,
                      transition: 'all 0.3s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1'
                      e.currentTarget.style.transform = lang === 'ar' ? 'translateX(-8px)' : 'translateX(8px)'
                      e.currentTarget.style.color = c.secondary
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0.85'
                      e.currentTarget.style.transform = 'translateX(0)'
                      e.currentTarget.style.color = 'inherit'
                    }}
                  >
                    <span>→</span>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <h4
              style={{
                fontSize: isMobile ? '1.1rem' : 'clamp(1.2rem, 3vw, 1.4rem)',
                fontFamily: 'Georgia, serif',
                color: c.secondary,
                marginBottom: '1.5rem',
                fontWeight: '700',
                letterSpacing: '0.5px'
              }}
            >
              {t('contactUs')}
            </h4>
            <div style={{ 
              fontSize: isMobile ? '0.9rem' : 'clamp(0.95rem, 2.5vw, 1.05rem)', 
              lineHeight: '2', 
              opacity: 0.9 
            }}>
              <p style={{ 
                margin: '0 0 0.8rem 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}>
                <span style={{ fontSize: '1.2rem' }}>📧</span>
                louablefactory@gmail.com
              </p>
              <p style={{ 
                margin: '0 0 0.8rem 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}>
                <span style={{ fontSize: '1.2rem' }}>📱</span>
                +20 123 456 7890
              </p>
              <p style={{ 
                margin: '0 0 0.8rem 0', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}>
                <span style={{ fontSize: '1.2rem' }}>📍</span>
                Luxor, Egypt
              </p>
            </div>
          </div>

          {/* Social Media */}
          <div style={{ textAlign: isMobile ? 'center' : 'left' }}>
            <h4
              style={{
                fontSize: isMobile ? '1.1rem' : 'clamp(1.2rem, 3vw, 1.4rem)',
                fontFamily: 'Georgia, serif',
                color: c.secondary,
                marginBottom: '1.5rem',
                fontWeight: '700',
                letterSpacing: '0.5px'
              }}
            >
              {t('followUs')}
            </h4>
            <div
              style={{
                display: 'flex',
                gap: isMobile ? '0.8rem' : 'clamp(0.8rem, 2vw, 1.2rem)',
                flexWrap: 'wrap',
                justifyContent: isMobile ? 'center' : 'flex-start'
              }}
            >
              {[
                { icon: facebookIcon, name: 'Facebook' },
                { icon: instagramIcon, name: 'Instagram' },
                { icon: twitterIcon, name: 'Twitter' },
                { icon: whatsappIcon, name: 'WhatsApp' }
              ].map((social) => (
                <a
                  key={social.name}
                  href="#"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isMobile ? '48px' : 'clamp(48px, 11vw, 52px)',
                    height: isMobile ? '48px' : 'clamp(48px, 11vw, 52px)',
                    background: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '50%',
                    textDecoration: 'none',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    border: `2px solid ${c.secondary}50`,
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = c.secondary
                    e.currentTarget.style.transform = 'scale(1.15) rotate(5deg)'
                    e.currentTarget.style.borderColor = c.secondary
                    e.currentTarget.style.boxShadow = `0 8px 20px ${c.secondary}60`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
                    e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
                    e.currentTarget.style.borderColor = `${c.secondary}50`
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                  aria-label={social.name}
                >
                  <img
                    src={social.icon}
                    alt={social.name}
                    style={{
                      width: isMobile ? '24px' : 'clamp(24px, 5vw, 28px)',
                      height: isMobile ? '24px' : 'clamp(24px, 5vw, 28px)',
                      objectFit: 'contain',
                      transition: 'filter 0.3s ease'
                    }}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            paddingTop: isMobile ? '1.5rem' : 'clamp(2rem, 4vw, 3rem)',
            marginTop: isMobile ? '1.5rem' : 'clamp(2rem, 4vw, 3rem)',
            borderTop: `1px solid ${theme === 'light' ? 'rgba(255,255,255,0.2)' : c.border}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: isMobile ? '0.85rem' : 'clamp(0.9rem, 2.5vw, 1rem)',
              opacity: 0.85
            }}
          >
            © {new Date().getFullYear()} {t('Louable')}. {t('allRightsReserved')}.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: isMobile ? '0.8rem' : 'clamp(0.85rem, 2.2vw, 0.95rem)',
              opacity: 0.75,
              fontStyle: 'italic',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            {t('handcraftedWith')} <span style={{ color: '#FF6B6B', animation: 'heartbeat 1.5s ease-in-out infinite' }}>❤️</span>
          </p>
        </div>
      </footer>

      {/* Global Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes floatGentle {
          0%, 100% { 
            transform: translateY(0px); 
          }
          50% { 
            transform: translateY(-15px); 
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        @keyframes glow {
          0%, 100% {
            opacity: 0.4;
          }
          50% {
            opacity: 0.7;
          }
        }

        @keyframes shimmer {
          0% {
            background-position: 0% center;
          }
          100% {
            background-position: 200% center;
          }
        }

        @keyframes expandWidth {
          from { 
            width: 0; 
            opacity: 0; 
          }
          to { 
            opacity: 1; 
          }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes kenBurns {
          0% {
            transform: scale(1);
          }
          100% {
            transform: scale(1.1);
          }
        }

        @keyframes cartBadgePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }

        @keyframes heartbeat {
          0%, 100% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.2);
          }
          50% {
            transform: scale(1);
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        /* Landscape orientation adjustments for mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          section:first-of-type {
            min-height: 500px !important;
            height: 100vh !important;
          }
        }
      `}</style>
    </>
  )
}
