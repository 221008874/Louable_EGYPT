import { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';

export default function DeliveryInfoForm({ onValidChange }) {
  const { deliveryInfo, setDeliveryInfo } = useCart();
  const { t } = useLanguage();
  
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
        
        // If no saved location, use current location
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
        // Fallback to Cairo, Egypt if geolocation fails
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
  };

  const handleMapClick = (lat, lng) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
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

  return (
    <div style={{ 
      background: '#f8f9fa', 
      padding: '2rem', 
      borderRadius: '12px',
      border: '1px solid #dee2e6'
    }}>
      <h3 style={{ 
        marginBottom: '1.5rem', 
        color: '#2c3e50',
        fontWeight: '700'
      }}>
        📍 {t('deliveryInformation')}
      </h3>
      
      <form onSubmit={handleSubmit}>
        {/* Name */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            {t('fullName')} *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder={t('enterFullName')}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
          {errors.name && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.name}</span>}
        </div>

        {/* Age */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            {t('age')} *
          </label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleInputChange}
            min="13"
            max="120"
            placeholder={t('enterAge')}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
          {errors.age && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.age}</span>}
        </div>

        {/* Phone */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            {t('phoneNumber')} *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="+20 123 456 7890"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '1rem'
            }}
          />
          {errors.phone && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.phone}</span>}
        </div>

        {/* Address */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            {t('detailedAddress')} *
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder={t('enterDetailedAddress')}
            rows="3"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #ced4da',
              borderRadius: '6px',
              fontSize: '1rem',
              resize: 'vertical'
            }}
          />
          {errors.address && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.address}</span>}
        </div>

        {/* Location Map */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
            {t('selectLocationOnMap')} *
          </label>
          
          {!isGeolocationSupported && (
            <p style={{ color: '#ffc107', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
              ⚠️ {t('geolocationNotSupported')}
            </p>
          )}
          
          <div style={{
            height: '300px',
            border: '1px solid #ced4da',
            borderRadius: '6px',
            overflow: 'hidden',
            position: 'relative'
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
                backgroundColor: '#e9ecef'
              }}>
                <span>📍 {t('loadingMap')}...</span>
              </div>
            )}
          </div>
          
          {errors.location && <span style={{ color: '#dc3545', fontSize: '0.875rem' }}>{errors.location}</span>}
          
          <p style={{ fontSize: '0.875rem', color: '#6c757d', marginTop: '0.5rem' }}>
            {t('clickMapToSelectLocation')}
          </p>
        </div>

        <button
          type="submit"
          style={{
            width: '100%',
            padding: '0.75rem',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}
        >
          {t('saveDeliveryInfo')}
        </button>
      </form>
    </div>
  );
}