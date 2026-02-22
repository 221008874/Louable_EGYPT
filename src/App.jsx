import { Routes, Route } from 'react-router-dom'
import { LocationProvider } from './context/LocationContext'
import LocationSplash from './pages/LocationSplash'
import Splash from './pages/Splash'
import Home from './pages/Home'
import CartPage from './pages/CartPage'
import ProductDetail from './pages/ProductDetail'
import AboutUs from './pages/AboutUs'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import OrderSuccess from './pages/OrderSuccess'
import PaymentSuccess from './pages/PaymentSuccess'
import PaymentCancel from './pages/PaymentCancel'

function App() {
  return (
    <LocationProvider>
      <Routes>
        {/* Initial location detection splash */}
        <Route path="/" element={<LocationSplash />} />
        
        {/* Main splash with currency display */}
        <Route path="/splash" element={<Splash />} />
        
        {/* Main app routes */}
        <Route path="/home" element={<Home />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/payment/cancel" element={<PaymentCancel />} />
      </Routes>
    </LocationProvider>
  )
}

export default App