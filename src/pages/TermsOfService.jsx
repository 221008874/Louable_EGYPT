import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function TermsOfService() {
  const { t, lang } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const colors = {
    light: {
      background: '#F8F4F0',
      text: '#2E1B1B',
      heading: '#3E2723',
      link: '#D4A017'
    },
    dark: {
      background: '#1A1412',
      text: '#F8F4F0',
      heading: '#FCFAF8',
      link: '#D4A017'
    }
  };

  const c = colors[theme];

  return (
    <div style={{
      background: c.background,
      color: c.text,
      minHeight: '100vh',
      padding: '2rem 1rem'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        backgroundColor: theme === 'light' ? '#FFFFFF' : '#2E1B1B',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginBottom: '1.5rem',
            color: c.link,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          ← {t('back')}
        </button>

               <h1 style={{ 
          color: c.heading, 
          marginBottom: '1.5rem',
          fontSize: '2rem'
        }}>
          {t('termsOfServiceTitle')}
        </h1>

               <div style={{ lineHeight: 1.6, fontSize: '1rem' }}>
          <p><strong>{t('lastUpdated')}:</strong> February 3, 2026</p>
          
          <h2 style={{ color: c.heading, marginTop: '1.5rem' }}>1. {t('termsIntro').split('.')[0]}</h2>
          <p>{t('termsIntro')}</p>
          
          <h2 style={{ color: c.heading, marginTop: '1.5rem' }}>2. {t('acceptanceOfTerms').replace('2. ', '')}</h2>
          <p>{t('acceptanceText')}</p>
          
          <h2 style={{ color: c.heading, marginTop: '1.5rem' }}>3. {t('piNetworkUse').replace('3. ', '')}</h2>
          <p>{t('piNetworkText')}</p>
          
          <h2 style={{ color: c.heading, marginTop: '1.5rem' }}>4. {t('productInfo').replace('4. ', '')}</h2>
          <p>{t('productInfoText')}</p>
          
          <h2 style={{ color: c.heading, marginTop: '1.5rem' }}>5. {t('paymentProcessing').replace('5. ', '')}</h2>
          <p>{t('paymentText')}</p>
          
          <h2 style={{ color: c.heading, marginTop: '1.5rem' }}>6. {t('userResponsibilities').replace('6. ', '')}</h2>
          <p>{t('userRespText')}</p>
          
          <h2 style={{ color: c.heading, marginTop: '1.5rem' }}>7. {t('limitationOfLiability').replace('7. ', '')}</h2>
          <p>{t('liabilityText')}</p>
          
          <h2 style={{ color: c.heading, marginTop: '1.5rem' }}>8. {t('changesToTerms').replace('8. ', '')}</h2>
          <p>{t('changesText')}</p>
          
          <h2 style={{ color: c.heading, marginTop: '1.5rem' }}>9. {t('contactUs')}</h2>
          <p>{t('contactPrivacyText').replace('louablefactory@gmail.com', 'ahmedabdelmonem6815160@gmail.com')}</p>
          
          <h2 style={{ color: c.heading, marginTop: '1.5rem' }}>10. {t('governingLaw').replace('9. ', '')}</h2>
          <p>{t('governingText')}</p>
        </div>
      </div>
    </div>
  );
}
