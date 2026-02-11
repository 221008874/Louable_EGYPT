// src/components/ProductCard.jsx
import { useLanguage } from '../context/LanguageContext'
import { useTheme } from '../context/ThemeContext'
import { useCart } from '../context/CartContext'
import { Link } from 'react-router-dom'

export default function ProductCard({ product }) {
  const { t, lang } = useLanguage()
  const { theme } = useTheme()
  const { addToCart } = useCart()

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

  // Stock calculations
  const stock = product?.stock || 0
  const isOutOfStock = stock <= 0
  const isLowStock = stock > 0 && stock < 10

  const handleAddToCart = (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isOutOfStock) return
    
    addToCart(product)
    
    // Show success message
    const successMsg = document.createElement('div')
    successMsg.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 1.5rem;">✓</span>
        <span>${t('addedToCart')}</span>
      </div>
    `
    successMsg.style.cssText = `
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #8BC34A, #7CB342);
      color: white;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 700;
      box-shadow: 0 8px 24px rgba(139, 195, 74, 0.5);
      z-index: 1000;
      animation: slideInBounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-size: 1rem;
      max-width: 90%;
    `
    document.body.appendChild(successMsg)
    setTimeout(() => {
      successMsg.style.animation = 'slideOut 0.3s ease-out forwards'
      setTimeout(() => successMsg.remove(), 300)
    }, 2000)
  }

  return (
    <Link
      to={`/product/${product.id}`}
      style={{
        textDecoration: 'none',
        color: 'inherit',
        display: 'block'
      }}
    >
      <div
        style={{
          background: c.card,
          borderRadius: '16px',
          overflow: 'hidden',
          border: `2px solid ${c.border}`,
          boxShadow: theme === 'light'
            ? '0 8px 24px rgba(62, 39, 35, 0.08)'
            : '0 8px 24px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          height: '100%',
          display: 'flex',
          flexDirection: 'column'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)'
          e.currentTarget.style.boxShadow = theme === 'light'
            ? '0 16px 48px rgba(62, 39, 35, 0.16)'
            : '0 16px 48px rgba(0, 0, 0, 0.5)'
          e.currentTarget.style.borderColor = c.secondary
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
          e.currentTarget.style.boxShadow = theme === 'light'
            ? '0 8px 24px rgba(62, 39, 35, 0.08)'
            : '0 8px 24px rgba(0, 0, 0, 0.3)'
          e.currentTarget.style.borderColor = c.border
        }}
      >
        {/* Stock Badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: lang === 'ar' ? 'auto' : '12px',
          left: lang === 'ar' ? '12px' : 'auto',
          zIndex: 10
        }}>
          {isOutOfStock ? (
            <span style={{
              background: 'linear-gradient(135deg, #EF4444, #DC2626)',
              color: '#FFFFFF',
              padding: '8px 14px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
            }}>
              {t('outOfStock')}
            </span>
          ) : isLowStock ? (
            <span style={{
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              color: '#FFFFFF',
              padding: '8px 14px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.4)',
              animation: 'pulse 2s ease-in-out infinite'
            }}>
              {t('onlyLeft', { count: stock })}
            </span>
          ) : (
            <span style={{
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFFFFF',
              padding: '8px 14px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: '700',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              {t('inStock', { count: stock })}
            </span>
          )}
        </div>

        {/* Product Image */}
        <div style={{
          position: 'relative',
          height: '220px',
          overflow: 'hidden',
          background: c.background
        }}>
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.5s ease',
                filter: isOutOfStock ? 'grayscale(0.6)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isOutOfStock) {
                  e.currentTarget.style.transform = 'scale(1.1)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: theme === 'light' 
                ? 'linear-gradient(135deg, #E8DDD4 0%, #D4C4B8 100%)'
                : 'linear-gradient(135deg, #3E2723 0%, #5D4037 100%)',
              fontSize: '4rem'
            }}>
              <span style={{ animation: 'bounce 2s ease-in-out infinite' }}>🍫</span>
            </div>
          )}
          
          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{
                background: '#EF4444',
                color: '#FFFFFF',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: '800',
                fontSize: '1rem',
                transform: 'rotate(-10deg)'
              }}>
                {t('outOfStock')}
              </span>
            </div>
          )}
        </div>

        {/* Product Info */}
        <div style={{
          padding: '20px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h3 style={{
            fontSize: '1.15rem',
            fontWeight: '700',
            color: isOutOfStock ? c.textLight : c.textDark,
            margin: 0,
            lineHeight: 1.3,
            textDecoration: isOutOfStock ? 'line-through' : 'none'
          }}>
            {product.name}
          </h3>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 'auto'
          }}>
            <span style={{
              color: c.secondary,
              fontSize: '1.3rem',
              fontWeight: '800'
            }}>
              π {product.price?.toFixed(2)}
            </span>
            
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              style={{
                padding: '10px 20px',
                background: isOutOfStock 
                  ? '#9CA3AF'
                  : `linear-gradient(135deg, ${c.success} 0%, #7CB342 100%)`,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: isOutOfStock 
                  ? 'none'
                  : '0 4px 12px rgba(139, 195, 74, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isOutOfStock ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!isOutOfStock) {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 195, 74, 0.5)'
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.boxShadow = isOutOfStock 
                  ? 'none'
                  : '0 4px 12px rgba(139, 195, 74, 0.4)'
              }}
            >
              {isOutOfStock ? '🚫' : '+'} {t('addToCart')}
            </button>
          </div>

          {/* Pieces per box info */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            color: c.textLight
          }}>
            <span>📦</span>
            <span>{product.piecesPerBox} {t('pieces')}</span>
          </div>
        </div>
      </div>

      <style>{`
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

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </Link>
  )
}
