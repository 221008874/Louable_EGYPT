// src/components/ProductCard.jsx
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { Link } from 'react-router-dom'

export default function ProductCard({ product }) {
  const { t, lang } = useLanguage()
  const { theme } = useTheme()

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

  return (
    <div 
      style={{
        background: c.card,
        border: `1px solid ${c.border}`,
        borderRadius: 'clamp(12px, 2.5vw, 16px)',
        padding: 'clamp(14px, 3.5vw, 20px)',
        width: '100%',
        maxWidth: '100%',
        boxShadow: theme === 'light'
          ? '0 6px 20px rgba(62, 39, 35, 0.08)'
          : '0 6px 20px rgba(0, 0, 0, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(12px, 2.5vw, 16px)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        if (window.innerWidth >= 768) {
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
            ? '0 6px 20px rgba(62, 39, 35, 0.08)'
            : '0 6px 20px rgba(0, 0, 0, 0.35)'
          e.currentTarget.style.borderColor = c.border
        }
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.98)'
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
              filter: theme === 'dark' ? 'brightness(0.95)' : 'brightness(1)'
            }}
            onMouseEnter={(e) => {
              if (window.innerWidth >= 768) {
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
            background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.1) 100%)',
            pointerEvents: 'none'
          }}></div>

          {/* Premium Badge with animation */}
          <div style={{
            position: 'absolute',
            top: 'clamp(8px, 2vw, 12px)',
            right: lang === 'ar' ? 'auto' : 'clamp(8px, 2vw, 12px)',
            left: lang === 'ar' ? 'clamp(8px, 2vw, 12px)' : 'auto',
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
          </div>
        </div>
      ) : (
        <div style={{
          width: '100%',
          aspectRatio: '1 / 1',
          background: theme === 'light'
            ? 'linear-gradient(135deg, #E8DDD4 0%, #D4C4B8 100%)'
            : 'linear-gradient(135deg, #3E2723 0%, #5D4037 100%)',
          borderRadius: 'clamp(8px, 2vw, 12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: c.textLight,
          fontSize: 'clamp(0.8rem, 2.5vw, 0.875rem)',
          border: `2px dashed ${c.border}`,
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
            animation: 'bounce 2s ease-in-out infinite',
            filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
          }}>🍫</span>
          <span style={{ fontWeight: '600', opacity: 0.7 }}>No Image</span>
        </div>
      )}
      
      {/* Product Name */}
      <h3 style={{ 
        margin: 0, 
        fontSize: 'clamp(0.95rem, 3.2vw, 1.1rem)',
        fontWeight: '700',
        color: c.textDark,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        transition: 'color 0.3s ease',
        letterSpacing: '-0.3px',
        fontFamily: 'Georgia, serif'
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
          background: `linear-gradient(135deg, ${c.secondary}20, ${c.secondary}10)`,
          padding: 'clamp(6px, 1.5vw, 8px) clamp(12px, 3vw, 16px)',
          borderRadius: '8px',
          border: `1px solid ${c.secondary}40`,
          boxShadow: theme === 'light'
            ? '0 2px 8px rgba(212, 160, 23, 0.15)'
            : '0 2px 8px rgba(212, 160, 23, 0.3)'
        }}>
          <p style={{ 
            color: c.secondary, 
            fontWeight: '800', 
            margin: 0,
            fontSize: 'clamp(1.1rem, 4vw, 1.4rem)',
            textShadow: theme === 'dark' ? '0 2px 6px rgba(212, 160, 23, 0.4)' : 'none',
            fontFamily: 'Georgia, serif'
          }}>
            π  {product.price.toFixed(2)}
          </p>
        </div>
        
        {/* Rating Stars */}
        <div style={{
          display: 'flex',
          gap: '3px',
          fontSize: 'clamp(0.75rem, 2.2vw, 0.85rem)',
          filter: 'drop-shadow(0 2px 4px rgba(255, 215, 0, 0.3))'
        }}>
          {'⭐'.repeat(5)}
        </div>
      </div>
      
      {/* View Details Button */}
      <Link
        to={`/product/${product.id}`}
        style={{
          marginTop: 'clamp(8px, 2vw, 12px)',
          padding: 'clamp(10px, 2.5vw, 14px) clamp(16px, 4vw, 20px)',
          background: `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`,
          color: 'white',
          border: 'none',
          borderRadius: 'clamp(8px, 2vw, 10px)',
          fontWeight: '700',
          cursor: 'pointer',
          fontSize: 'clamp(0.9rem, 2.8vw, 1rem)',
          textAlign: 'center',
          textDecoration: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 4px 12px rgba(139, 195, 74, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          if (window.innerWidth >= 768) {
            e.currentTarget.style.background = 'linear-gradient(135deg, #7CB342 0%, #689F38 100%)'
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 195, 74, 0.5)'
          }
        }}
        onMouseLeave={(e) => {
          if (window.innerWidth >= 768) {
            e.currentTarget.style.background = `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`
            e.currentTarget.style.transform = 'translateY(0) scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 195, 74, 0.35)'
          }
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.transform = 'scale(0.96)'
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        <span>{t('viewDetails')}</span>
        <span style={{ 
          transition: 'transform 0.3s ease',
          display: 'inline-block'
        }}>→</span>
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

        /* Hover effect for card glow */
        div:hover > .card-glow {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  )
}