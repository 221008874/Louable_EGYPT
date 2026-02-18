import { Routes, Route } from 'react-router-dom'
import Splash from './pages/Splash'
import Home from './pages/Home'
import CartPage from './pages/CartPage'
import ProductDetail from './pages/ProductDetail'
import AboutUs from './pages/AboutUs'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsOfService from './pages/TermsOfService'
import OrderSuccess from './pages/OrderSuccess'
import PaymentSuccess from './pages/PaymentSuccess'  // Add this
import PaymentCancel from './pages/PaymentCancel'      // Add this

function App() {
  return (
    <Routes>
      <Route path="/" element={<Splash />} />
      <Route path="/home" element={<Home />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/product/:id" element={<ProductDetail />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/order-success" element={<OrderSuccess />} />
      <Route path="/payment/success" element={<PaymentSuccess />} />  {/* Add */}
      <Route path="/payment/cancel" element={<PaymentCancel />} />    {/* Add */}
    </Routes>
  )
}

export default App