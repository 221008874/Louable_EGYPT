import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function DeliveryInfoForm({ onValidChange }) {
  const { deliveryInfo, setDeliveryInfo } = useCart();
  const { t } = useLanguage();
  const { theme } = useTheme();
  
  const [formData, setFormData] = useState({
    name: deliveryInfo?.name || '',
    age: deliveryInfo?.age || '',
    phone: deliveryInfo?.phone || '',
    address: deliveryInfo?.address || '',
    latitude: deliveryInfo?.latitude || null,
    longitude: deliveryInfo?.longitude || null
  });
  
  const [mapCenter, setMapCenter] = useState(null);
  const [isGeolocationSupported, setIsGeolocationSupported] = useState(true);
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

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
  };

  const c = theme === 'light' ? colors.light : colors.dark;

  // Get user's current location on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setIsGeolocationSupported(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setMapCenter({ lat: latitude, lng: longitude });
        
        if (!formData.latitude && !formData.longitude) {
          setFormData(prev => ({
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = t('nameRequired');
    if (!formData.age || formData.age < 13 || formData.age > 120) newErrors.age = t('validAgeRequired');
    if (!formData.phone.trim() || !/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      newErrors.phone = t('validPhoneRequired');
    }
    if (!formData.address.trim()) newErrors.address = t('addressRequired');
    if (!formData.latitude || !formData.longitude) newErrors.location = t('locationRequired');
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  };

  const handleFieldBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    validateForm();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      setDeliveryInfo(formData);
      if (onValidChange) onValidChange(true);
    } else if (onValidChange) {
      onValidChange(false);
    }
  };

  const FormField = ({ label, name, type = 'text', placeholder, isTextArea = false, error, value, onChange, onBlur, children }) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '0.75rem', 
        fontWeight: '800', 
        fontSize: '0.95rem', 
        color: c.textDark,
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {label} <span style={{ color: c.danger }}>*</span>
      </label>
      
      {isTextArea ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          rows="3"
          style={{
            width: '100%',
            padding: '12px 16px',
            border: `2px solid ${error ? c.danger : c.border}`,
            borderRadius: '12px',
            fontSize: '1rem',
            background: c.surface,
            color: c.textDark,
            transition: 'all 0.3s ease',
            resize: 'vertical',
            fontFamily: 'inherit',
            boxShadow: error ? `0 0 0 4px ${c.overlay}` : 'none'
          }}
          onFocus={(e) => !error && (e.target.style.borderColor = c.secondary)}
          onBlur={(e) => {
            onBlur?.();
            e.target.style.borderColor = error ? c.danger : c.border;
          }}
        />
      ) : (
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          min={type === 'number' ? '13' : undefined}
          max={type === 'number' ? '120' : undefined}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: `2px solid ${error ? c.danger : c.border}`,
            borderRadius: '12px',
            fontSize: '1rem',
            background: c.surface,
            color: c.textDark,
            transition: 'all 0.3s ease',
            boxShadow: error ? `0 0 0 4px ${c.overlay}` : 'none'
          }}
          onFocus={(e) => !error && (e.target.style.borderColor = c.secondary)}
          onBlur={(e) => {
            onBlur?.();
            e.target.style.borderColor = error ? c.danger : c.border;
          }}
        />
      )}
      
      {error && (
        <div style={{ 
          color: c.danger, 
          fontSize: '0.8rem', 
          marginTop: '8px', 
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: '700',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <span>✕</span>
          {error}
        </div>
      )}

      {children}
    </div>
  );

  return (
    <div style={{ 
      background: c.card,
      padding: '2.5rem',
      borderRadius: '20px',
      border: `2px solid ${c.border}`,
      boxShadow: `0 8px 24px ${c.overlay}`
    }}>
      <h3 style={{ 
        marginBottom: '2rem', 
        color: c.textDark,
        fontWeight: '900',
        fontSize: '1.35rem',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        <span style={{ fontSize: '1.6rem' }}>📍</span>
        {t('deliveryInformation')}
      </h3>
      
      <form onSubmit={handleSubmit}>
        {/* Name & Age Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <FormField
            label={t('fullName')}
            name="name"
            placeholder={t('enterFullName')}
            value={formData.name}
            onChange={handleInputChange}
            onBlur={() => handleFieldBlur('name')}
            error={touchedFields.name && errors.name}
          />
          
          <FormField
            label={t('age')}
            name="age"
            type="number"
            placeholder={t('enterAge')}
            value={formData.age}
            onChange={handleInputChange}
            onBlur={() => handleFieldBlur('age')}
            error={touchedFields.age && errors.age}
          />
        </div>

        {/* Phone */}
        <FormField
          label={t('phoneNumber')}
          name="phone"
          type="tel"
          placeholder="+20 123 456 7890"
          value={formData.phone}
          onChange={handleInputChange}
          onBlur={() => handleFieldBlur('phone')}
          error={touchedFields.phone && errors.phone}
        />

        {/* Address */}
        <FormField
          label={t('detailedAddress')}
          name="address"
          placeholder={t('enterDetailedAddress')}
          value={formData.address}
          onChange={handleInputChange}
          onBlur={() => handleFieldBlur('address')}
          error={touchedFields.address && errors.address}
          isTextArea
        />

        {/* Location Map */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '0.75rem', 
            fontWeight: '800', 
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
            border: `2px solid ${errors.location ? c.danger : c.border}`,
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
          
          {errors.location && (
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
              {errors.location}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          style={{
            width: '100%',
            padding: '16px 24px',
            background: `linear-gradient(135deg, ${c.success} 0%, ${c.success}dd 100%)`,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '1.1rem',
            fontWeight: '900',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: `0 4px 12px ${c.overlay}`,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px)';
            e.target.style.boxShadow = `0 8px 24px ${c.overlay}`;
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = `0 4px 12px ${c.overlay}`;
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>✓</span>
          {t('saveDeliveryInfo')}
        </button>
      </form>

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-12px);
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
            transform: translateY(-16px);
          }
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
  );
}