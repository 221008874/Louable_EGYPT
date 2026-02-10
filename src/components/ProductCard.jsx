// src/components/ProductCard.jsx
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { Link } from 'react-router-dom'

export default function ProductCard({ product }) {
  const { t, lang } = useLanguage()
  const { theme } = useTheme()

  // STOCK MANAGEMENT
  const stock = product?.stock || 0
  const isOutOfStock = stock <= 0
  const isLowStock = stock > 0 && stock < 10

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
      danger: '#EF4444',
      warning: '#F59E0B',
      accent: '#5D4037',
      border: '#3E2723'
    }
  }

  const c = theme === 'light' ? colors.light : colors.dark

  return (
    <div 
      style={{
        background: c.card,
        border: `1px solid ${isOutOfStock ? c.danger : c.border}`,
        borderRadius: 'clamp(12px, 2.5vw, 16px)',
        padding: 'clamp(14px, 3.5vw, 20px)',
        width: '100%',
        maxWidth: '100%',
        boxShadow: theme === 'light'
          ? `0 6px 20px ${isOutOfStock ? 'rgba(239, 68, 68, 0.15)' : 'rgba(62, 39, 35, 0.08)'}`
          : `0 6px 20px ${isOutOfStock ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 0, 0, 0.35)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(12px, 2.5vw, 16px)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: isOutOfStock ? 'not-allowed' : 'pointer',
        position: 'relative',
        overflow: 'hidden',
        opacity: isOutOfStock ? 0.85 : 1
      }}
      onMouseEnter={(e) => {
        if (window.innerWidth >= 768 && !isOutOfStock) {
          e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
          e.currentTarget.style.boxShadow = theme === 'light'
            ? '0 12px 35px rgba(62, 39, 35, 0.16), 0 0 0 1px rgba(212, 160, 23, 0.3)'
            : '0 12px 35px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(212, 160, 23, 0.4)'
          e.currentTarget.style.borderColor = c.secondary
        }
      }}
      onMouseLeave={(e) => {
        if (window.innerWidth >= 768) {
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
          e.currentTarget.style.boxShadow = theme === 'light'
            ? `0 6px 20px ${isOutOfStock ? 'rgba(239, 68, 68, 0.15)' : 'rgba(62, 39, 35, 0.08)'}`
            : `0 6px 20px ${isOutOfStock ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 0, 0, 0.35)'}`
          e.currentTarget.style.borderColor = isOutOfStock ? c.danger : c.border
        }
      }}
      onTouchStart={(e) => {
        if (!isOutOfStock) {
          e.currentTarget.style.transform = 'scale(0.98)'
        }
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {/* Gradient overlay on hover */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(circle at 50% 0%, ${c.secondary}15 0%, transparent 60%)`,
        opacity: 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
        borderRadius: 'inherit'
      }} className="card-glow"></div>

      {/* STOCK BADGE - Top Right */}
      <div style={{
        position: 'absolute',
        top: 'clamp(8px, 2vw, 12px)',
        right: lang === 'ar' ? 'auto' : 'clamp(8px, 2vw, 12px)',
        left: lang === 'ar' ? 'clamp(8px, 2vw, 12px)' : 'auto',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        alignItems: lang === 'ar' ? 'flex-start' : 'flex-end'
      }}>
        {/* Stock Status Badge */}
        {isOutOfStock ? (
          <span style={{
            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
            color: '#FFFFFF',
            padding: 'clamp(4px, 1.2vw, 6px) clamp(8px, 2vw, 12px)',
            borderRadius: '6px',
            fontSize: 'clamp(0.65rem, 2vw, 0.75rem)',
            fontWeight: '800',
            boxShadow: '0 3px 12px rgba(239, 68, 68, 0.5)',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            ❌ Out of Stock
          </span>
        ) : isLowStock ? (
          <span style={{
            background: 'linear-gradient(135deg, #F59E0B, #D97706)',
            color: '#FFFFFF',
            padding: 'clamp(4px, 1.2vw, 6px) clamp(8px, 2vw, 12px)',
            borderRadius: '6px',
            fontSize: 'clamp(0.65rem, 2vw, 0.75rem)',
            fontWeight: '800',
            boxShadow: '0 3px 12px rgba(245, 158, 11, 0.5)',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            ⚡ Only {stock} left
          </span>
        ) : (
          <span style={{
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFFFFF',
            padding: 'clamp(4px, 1.2vw, 6px) clamp(8px, 2vw, 12px)',
            borderRadius: '6px',
            fontSize: 'clamp(0.6rem, 1.8vw, 0.7rem)',
            fontWeight: '700',
            boxShadow: '0 3px 12px rgba(16, 185, 129, 0.4)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            ✓ In Stock
          </span>
        )}

        {/* NEW Badge - only show if in stock */}
        {!isOutOfStock && (
          <span style={{
            background: 'linear-gradient(135deg, #FFD700, #D4A017)',
            color: '#FFFFFF',
            padding: 'clamp(4px, 1.2vw, 6px) clamp(8px, 2vw, 12px)',
            borderRadius: '6px',
            fontSize: 'clamp(0.65rem, 2vw, 0.75rem)',
            fontWeight: '800',
            boxShadow: '0 3px 12px rgba(212, 160, 23, 0.5), 0 0 0 2px rgba(255, 255, 255, 0.3)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            animation: 'badgePulse 2s ease-in-out infinite',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <span style={{ animation: 'sparkleRotate 3s linear infinite' }}>✨</span>
            NEW
          </span>
        )}
      </div>

      {/* REAL CLOUDINARY IMAGE */}
      {product.imageUrl ? (
        <div style={{ 
          position: 'relative', 
          overflow: 'hidden', 
          borderRadius: 'clamp(8px, 2vw, 12px)',
          aspectRatio: '1 / 1',
          boxShadow: theme === 'light'
            ? '0 4px 12px rgba(0, 0, 0, 0.08)'
            : '0 4px 12px rgba(0, 0, 0, 0.4)'
        }}>
          <img
            src={product.imageUrl}
            alt={product.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 'clamp(8px, 2vw, 12px)',
              transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              filter: isOutOfStock ? 'grayscale(0.7)' : (theme === 'dark' ? 'brightness(0.95)' : 'brightness(1)')
            }}
            onMouseEnter={(e) => {
              if (window.innerWidth >= 768 && !isOutOfStock) {
                e.currentTarget.style.transform = 'scale(1.1) rotate(2deg)'
              }
            }}
            onMouseLeave={(e) => {
              if (window.innerWidth >= 768) {
                e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
              }
            }}
          />
          
          {/* Overlay gradient on image */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: isOutOfStock 
              ? 'rgba(0, 0, 0, 0.4)'
              : 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.1) 100%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {isOutOfStock && (
              <span style={{
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                color: '#FFFFFF',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: '800',
                fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                transform: 'rotate(-10deg)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                Out of Stock
              </span>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%',
          aspectRatio: '1 / 1',
          background: isOutOfStock
            ? 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 100%)'
            : (theme === 'light'
              ? 'linear-gradient(135deg, #E8DDD4 0%, #D4C4B8 100%)'
              : 'linear-gradient(135deg, #3E2723 0%, #5D4037 100%)'),
          borderRadius: 'clamp(8px, 2vw, 12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: isOutOfStock ? '#DC2626' : c.textLight,
          fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
          border: `2px dashed ${isOutOfStock ? '#EF4444' : c.border}`,
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle, rgba(212, 160, 23, 0.05) 0%, transparent 70%)',
            animation: 'pulse 3s ease-in-out infinite'
          }}></div>
          <span style={{ 
            fontSize: 'clamp(2rem, 6vw, 3rem)',
            animation: isOutOfStock ? 'none' : 'bounce 2s ease-in-out infinite',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
          }}>
            {isOutOfStock ? '🚫' : '🍫'}
          </span>
          <span style={{ fontWeight: '600', opacity: 0.7 }}>
            {isOutOfStock ? 'Unavailable' : 'No Image'}
          </span>
        </div>
      )}
      
      {/* Product Name */}
      <h3 style={{ 
        margin: 0, 
        fontSize: 'clamp(0.95rem, 3.2vw, 1.1rem)',
        fontWeight: '700',
        color: isOutOfStock ? c.textLight : c.textDark,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        transition: 'color 0.3s ease',
        letterSpacing: '-0.3px',
        fontFamily: 'Georgia, serif',
        textDecoration: isOutOfStock ? 'line-through' : 'none',
        opacity: isOutOfStock ? 0.7 : 1
      }}>
        {product.name}
      </h3>
      
      {/* Price and Rating Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'clamp(8px, 2.5vw, 12px)',
        flexWrap: 'wrap'
      }}>
        {/* Price with gradient background */}
        <div style={{
          background: isOutOfStock 
            ? '#E5E7EB'
            : `linear-gradient(135deg, ${c.secondary}20, ${c.secondary}10)`,
          padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 16px)',
          borderRadius: '8px',
          border: `1px solid ${isOutOfStock ? '#D1D5DB' : c.secondary}40`,
          boxShadow: theme === 'light'
            ? '0 2px 8px rgba(0, 0, 0, 0.08)'
            : '0 2px 8px rgba(0, 0, 0, 0.2)'
        }}>
          <p style={{ 
            color: isOutOfStock ? '#9CA3AF' : c.secondary, 
            fontWeight: '800', 
            margin: 0,
            fontSize: 'clamp(1.1rem, 4vw, 1.4rem)',
            textShadow: theme === 'dark' && !isOutOfStock ? '0 2px 6px rgba(212, 160, 23, 0.4)' : 'none',
            fontFamily: 'Georgia, serif',
            textDecoration: isOutOfStock ? 'line-through' : 'none'
          }}>
            π  {product.price.toFixed(2)}
          </p>
        </div>
        
        {/* Rating Stars */}
        <div style={{
          display: 'flex',
          gap: '3px',
          fontSize: 'clamp(0.75rem, 2.2vw, 0.85rem)',
          filter: isOutOfStock ? 'grayscale(1)' : 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.3))',
          opacity: isOutOfStock ? 0.5 : 1
        }}>
          {'⭐'.repeat(5)}
        </div>
      </div>
      
      {/* Stock Info Text */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: 'clamp(0.75rem, 2vw, 0.85rem)',
        color: isOutOfStock ? c.danger : (isLowStock ? c.warning : c.success),
        fontWeight: '600',
        marginTop: '-4px'
      }}>
        <span>{isOutOfStock ? '❌' : (isLowStock ? '⚡' : '✓')}</span>
        <span>
          {isOutOfStock ? 'Out of Stock' : (isLowStock ? `Only ${stock} left` : `${stock} in stock`)}
        </span>
      </div>
      
      {/* View Details Button */}
      <Link
        to={`/product/${product.id}`}
        style={{
          marginTop: 'clamp(8px, 2vw, 12px)',
          padding: 'clamp(10px, 2.5vw, 14px) clamp(16px, 4vw, 20px)',
          background: isOutOfStock 
            ? '#9CA3AF'
            : `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`,
          color: 'white',
          border: 'none',
          borderRadius: 'clamp(8px, 2vw, 10px)',
          fontWeight: '700',
          cursor: 'pointer',
          fontSize: 'clamp(0.9rem, 2.8vw, 1rem)',
          textAlign: 'center',
          textDecoration: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: isOutOfStock ? 'none' : '0 4px 12px rgba(139, 195, 74, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          position: 'relative',
          overflow: 'hidden',
          pointerEvents: isOutOfStock ? 'none' : 'auto',
          opacity: isOutOfStock ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (window.innerWidth >= 768 && !isOutOfStock) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #7CB342 0%, #689F38 100%)'
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 195, 74, 0.5)'
          }
        }}
        onMouseLeave={(e) => {
          if (windowWidth >= 768) {
            e.currentTarget.style.background = isOutOfStock 
              ? '#9CA3AF'
              : `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
            e.currentTarget.style.boxShadow = isOutOfStock ? 'none' : '0 4px 12px rgba(139, 195, 74, 0.35)'
          }
        }}
        onTouchStart={(e) => {
          if (!isOutOfStock) {
            e.currentTarget.style.transform = 'scale(0.96)'
          }
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
        onClick={(e) => {
          if (isOutOfStock) {
            e.preventDefault()
            // Optional: Show toast notification
            const toast = document.createElement('div')
            toast.innerHTML = '❌ This product is currently out of stock'
            toast.style.cssText = `
              position: fixed;
              bottom: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: #EF4444;
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              font-weight: 600;
              z-index: 1000;
              animation: slideUp 0.3s ease;
            `
            document.body.appendChild(toast)
            setTimeout(() => {
              toast.style.animation = 'slideDown 0.3s ease'
              setTimeout(() => toast.remove(), 300)
            }, 2000)
          }
        }}
      >
        <span>{isOutOfStock ? 'Out of Stock' : t('viewDetails')}</span>
        <span style={{ 
          transition: 'transform 0.3s ease',
          display: 'inline-block'
        }}>{isOutOfStock ? '🚫' : '→'}</span>
      </Link>

      {/* Add animations */}
      <style>{`
        @keyframes badgePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        @keyframes sparkleRotate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.5;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes slideDown {
          to {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
        }

        /* Hover effect for card glow */
        div:hover > .card-glow {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}
