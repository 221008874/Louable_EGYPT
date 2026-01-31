// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { CartProvider } from './context/CartContext'
import { LanguageProvider } from './context/LanguageContext' // 👈 new
import App from './App'
import { PiNetwork } from 'pi-sdk'
import './index.css'

PiNetwork.init({
  version: "2.0",
  sandbox: true, // Use Testnet
  clientId: "YOUR_PI_APP_CLIENT_ID" // Get from Pi Developer Portal
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider> {/* 👈 wrap here */}
        <ThemeProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </ThemeProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
)