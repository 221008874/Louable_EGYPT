// src/context/LanguageContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'

// Translations - Egyptian Arabic (العامية المصرية) and English
const translations = {
  ar: {
    // App & Brand
    appName: 'شوب إيزي',
    Louable: 'لوابل',
    
    // Navigation & General
    home: 'الرئيسية',
    products: 'المنتجات',
    aboutUs: 'عنّا',
    contact: 'تواصل معنا',
    contactUs: 'تواصل معنا',
    backToHome: 'رجوع للرئيسية',
    backToProducts: 'رجوع للمنتجات',
    back: 'رجوع',
    viewDetails: 'شوف التفاصيل',
    goToCart: 'روح للعربية',
    continueShopping: 'كمل تسوق',
    
    // Hero & Home
    featuredProducts: 'المنتجات المميزة',
    discoverPremium: 'اكتشف تشكيلتنا الفاخرة من الشوكولاتة ✨',
    ourCollection: 'تشكيلتنا',
    noProductsAvailable: 'مفيش منتجات لسه',
    checkBackSoon: 'ارجع تاني قريب إن شاء الله!',
    loadingPremiumChocolates: 'جاري تحميل الشوكولاتة الفاخرة...',
    
    // Product Details
    piecesPerBox: 'عدد القطع في العلبة',
    pieces: 'قطعة',
    flavors: 'النكهات',
    description: 'الوصف',
    price: 'السعر',
    quantity: 'الكمية',
    addToCart: 'حط في العربية',
    premiumQuality: 'جودة ممتازة',
    loadingProductDetails: 'جاري تحميل تفاصيل المنتج...',
    
    // Stock Management
    outOfStock: 'نفذت الكمية',
    onlyLeft: 'باقي {count} بس!',
    inStock: 'متوفر: {count}',
    availableInStock: 'متوفر في المخزن',
    currentlyUnavailable: 'المنتج ده مش متوفر دلوقتي',
    lowStockAlert: 'الكمية قليلة',
    onlyAvailable: 'متوفر {count} بس',
    
    // Cart
    cart: 'العربية',
    total: 'الإجمالي',
    checkout: 'أكمل الطلب',
    emptyCart: 'العربية فاضية',
    addProducts: 'ضيف منتجات للعربية!',
    remove: 'شيل',
    
    // Theme
    theme: 'الوضع',
    lightMode: 'وضع النهار',
    darkMode: 'وضع الليل',
    
    // About Us
    aboutUsTitle: 'عنّا',
    ourMission: 'مهمتنا',
    missionDescription: 'في لوابل، بنقدم أحلى أنواع الشوكولاتة الفاخرة المصنوعة يدوياً من أجود مكونات الكاكاو. بنجمع بين التقاليد القديمة والابتكار الحديث عشان نخلق تجارب ماتتنساش.',
    ourVision: 'رؤيتنا',
    visionDescription: 'نوصل لكل بيت في مصر والشرق الأوسط، ونبقى العلامة التجارية الأولى للشوكولاتة الفاخرة، مع الحفاظ على أعلى معايير الجودة والاستدامة.',
    ourValues: 'قيمنا',
    valuesDescription: 'الجودة، الأصالة، الابتكار، والاستدامة دي قيمنا الأساسية اللي بنبني عليها كل حاجة بنعملها.',
    joinOurSweetJourney: 'انضم لرحلتنا الحلوة',
    experienceFinest: 'جرب أحلى الشوكولاتة المصنوعة بحب واهتمام. كل قطعة فيها قصة جودة وشغف.',
    exploreOurProducts: 'اكتشف منتجاتنا',
    
    // Footer
    footerTagline: 'بنصنع الشوكولاتة الفاخرة بشغف وتميز. كل قطعة فيها قصة جودة وطعم رائع.',
    quickLinks: 'لينكات سريعة',
    followUs: 'تابعنا',
    allRightsReserved: 'جميع الحقوق محفوظة',
    handcraftedWith: 'مصنوع بحب',
    
    // Legal
    privacyPolicy: 'سياسة الخصوصية',
    termsOfService: 'شروط الاستخدام',
    privacy: 'الخصوصية',
    lastUpdated: 'آخر تحديث',
    informationWeCollect: 'المعلومات اللي بنجمعها',
    infoCollectionText: 'بنجمع معلوماتك لما تستخدم تطبيقنا، زي المنتجات اللي ضفتها للعربية وتفاصيل الطلب. مش بنجمع أي معلومات شخصية حساسة.',
    howWeUseInfo: 'إزاي بنستخدم معلوماتك',
    useInfoText: 'بنستخدم المعلومات اللي بنجمعها عشان نحسن تجربة شرائك، ونعرض منتجات مناسبة، ونوفر دعم فني.',
    dataSharing: 'مشاركة البيانات',
    dataSharingText: 'مش بنشارك بياناتك مع أي طرف تالت. كل المعلومات متخزنة بأمان في قواعد بيانات Firebase بتاعتنا.',
    dataSecurity: 'أمن البيانات',
    securityText: 'بنستخدم أفضل ممارسات الأمان عشان نحمي بياناتك من الوصول غير المصرح بيه أو التعديل أو الإفصاح أو التدمير.',
    yourRights: 'حقوقك',
    rightsText: 'لك الحق تطلب حذف بياناتك أو تصحيحها في أي وقت عن طريق التواصل معانا.',
    contactPrivacyText: 'لأي استفسارات عن سياسة الخصوصية، ابعتنا على: louablefactory@gmail.com',
    
    // Order Success
    orderConfirmed: 'تم تأكيد الطلب!',
    thankYouPurchase: 'شكراً لشرائك. طلبك تم بنجاح.',
    orderId: 'رقم الطلب:',
    transaction: 'العملية:',
    totalPaid: 'المبلغ المدفوع:',
    
    // Terms of Service
    termsOfServiceTitle: 'شروط الاستخدام',
    termsIntro: 'أهلاً بيك في لوابل! الشروط دي بتحكم استخدامك لمنصة الشوكولاتة الإلكترونية بتاعتنا ("التطبيق") اللي متاح من خلال Pi Browser.',
    acceptanceOfTerms: '2. قبول الشروط',
    acceptanceText: 'باستخدامك للتطبيق، بتأكد إنك عندك 18 سنة على الأقل وموافق على الالتزام بالشروط دي.',
    piNetworkUse: '3. استخدام Pi Network',
    piNetworkText: 'التطبيق بتاعنا متكامل مع Pi Network Testnet لأغراض التطوير. كل المعاملات في المرحلة دي باستخدام Test Pi، ومش ليها قيمة مالية. المعاملات الحقيقية هتتفعل بعد الموافقة على Mainnet.',
    productInfo: '4. معلومات المنتج',
    productInfoText: 'بنحاول نكون دقيقين في وصف المنتجات والأسعار والتوفر. لكن بنحتفظ بالحق في تصحيح أي أخطاء وإلغاء الطلبات لو لزم الأمر.',
    paymentProcessing: '5. معالجة الدفع',
    paymentText: 'كل المدفوعات بتتم من خلال نظام الدفع الآمن بتاع Pi Network. بتوافق إننا نعمل معالجة للمدفوعات لطلباتك من خلال Pi Wallet بتاعتك.',
    userResponsibilities: '6. مسؤوليات المستخدم',
    userRespText: 'أنت مسؤول عن الحفاظ على سرية بيانات حساب Pi بتاعك وعن كل الأنشطة اللي بتحصل تحت حسابك.',
    limitationOfLiability: '7. حدود المسؤولية',
    liabilityText: 'التطبيق بتاعنا بيتقدم "كما هو" من غير أي ضمانات. مش مسؤولين عن أي أضرار غير مباشرة أو عرضية أو تبعية.',
    changesToTerms: '8. تغييرات الشروط',
    changesText: 'ممكن نعدل الشروط دي في أي وقت. الاستخدام المستمر للتطبيق يعتبر قبول للشروط المعدلة.',
    governingLaw: '9. القانون الحاكم',
    governingText: 'الشروط دي خاضعة لقوانين جمهورية مصر العربية.',
  },
  en: {
    // App & Brand
    appName: 'ShopEasy',
    Louable: 'Louable',
    
    // Navigation & General
    home: 'Home',
    products: 'Products',
    aboutUs: 'About Us',
    contact: 'Contact',
    contactUs: 'Contact Us',
    backToHome: 'Back to Home',
    backToProducts: 'Back to Products',
    back: 'Back',
    viewDetails: 'View Details',
    goToCart: 'Go to Cart',
    continueShopping: 'Continue Shopping',
    
    // Hero & Home
    featuredProducts: 'Featured Products',
    discoverPremium: 'Discover our premium chocolate collection ✨',
    ourCollection: 'Our Collection',
    noProductsAvailable: 'No products available yet',
    checkBackSoon: 'Check back soon for delicious chocolates!',
    loadingPremiumChocolates: 'Loading premium chocolates...',
    
    // Product Details
    piecesPerBox: 'Pieces per Box',
    pieces: 'pieces',
    flavors: 'Flavors',
    description: 'Description',
    price: 'Price',
    quantity: 'Quantity',
    addToCart: 'Add to Cart',
    premiumQuality: 'Premium Quality',
    loadingProductDetails: 'Loading product details...',
    
    // Stock Management
    outOfStock: 'Out of Stock',
    onlyLeft: 'Only {count} left!',
    inStock: 'In Stock: {count}',
    availableInStock: 'Available in Stock',
    currentlyUnavailable: 'This item is currently unavailable',
    lowStockAlert: 'Low Stock Alert',
    onlyAvailable: 'Only {count} available',
    
    // Cart
    cart: 'Cart',
    total: 'Total',
    checkout: 'Proceed to Checkout',
    emptyCart: 'Your cart is empty',
    addProducts: 'Add some products to your cart!',
    remove: 'Remove',
    
    // Theme
    theme: 'Theme',
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode',
    
    // About Us
    aboutUsTitle: 'About Us',
    ourMission: 'Our Mission',
    missionDescription: 'At Louable, we are committed to crafting premium artisanal chocolates using the finest cocoa ingredients. We blend time-honored traditions with modern innovation to create unforgettable experiences.',
    ourVision: 'Our Vision',
    visionDescription: 'To become the leading luxury chocolate brand in the Middle East, while maintaining the highest standards of quality and sustainability.',
    ourValues: 'Our Values',
    valuesDescription: 'Quality, authenticity, innovation, and sustainability are our core values that guide everything we do.',
    joinOurSweetJourney: 'Join Our Sweet Journey',
    experienceFinest: 'Experience the finest chocolates crafted with love and dedication. Every piece tells a story of quality and passion.',
    exploreOurProducts: 'Explore Our Products',
    
    // Footer
    footerTagline: 'Crafting premium chocolates with passion and excellence. Every piece tells a story of quality and taste.',
    quickLinks: 'Quick Links',
    followUs: 'Follow Us',
    allRightsReserved: 'All rights reserved',
    handcraftedWith: 'Handcrafted with',
    
    // Legal
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    privacy: 'Privacy',
    lastUpdated: 'Last Updated',
    informationWeCollect: 'Information We Collect',
    infoCollectionText: 'We collect information when you use our app, such as products added to your cart and order details. We do not collect any sensitive personal information.',
    howWeUseInfo: 'How We Use Your Information',
    useInfoText: 'We use the collected information to improve your shopping experience, show relevant products, and provide technical support.',
    dataSharing: 'Data Sharing',
    dataSharingText: 'We do not share your data with any third parties. All information is securely stored in our Firebase databases.',
    dataSecurity: 'Data Security',
    securityText: 'We follow industry best practices to protect your data from unauthorized access, alteration, disclosure, or destruction.',
    yourRights: 'Your Rights',
    rightsText: 'You have the right to request deletion or correction of your data at any time by contacting us.',
    contactPrivacyText: 'For any questions about this Privacy Policy, please email us at: louablefactory@gmail.com',
    
    // Order Success
    orderConfirmed: 'Order Confirmed!',
    thankYouPurchase: 'Thank you for your purchase. Your order has been successfully processed.',
    orderId: 'Order ID:',
    transaction: 'Transaction:',
    totalPaid: 'Total Paid:',
    
    // Terms of Service
    termsOfServiceTitle: 'Terms of Service',
    termsIntro: 'Welcome to Louable! These terms govern your use of our chocolate e-commerce platform ("App") accessible through the Pi Browser.',
    acceptanceOfTerms: '2. Acceptance of Terms',
    acceptanceText: 'By using our App, you confirm that you are at least 18 years old and agree to be bound by these terms.',
    piNetworkUse: '3. Use of Pi Network',
    piNetworkText: 'Our App integrates with the Pi Network Testnet for development purposes. All transactions during this phase use Test Pi, which has no monetary value. Real Pi transactions will only be enabled after proper Mainnet approval.',
    productInfo: '4. Product Information',
    productInfoText: 'We strive for accuracy in product descriptions, pricing, and availability. However, we reserve the right to correct any errors and cancel orders if necessary.',
    paymentProcessing: '5. Payment Processing',
    paymentText: 'All payments are processed through the Pi Network\'s secure payment system. You authorize us to process payments for your orders through your Pi Wallet.',
    userResponsibilities: '6. User Responsibilities',
    userRespText: 'You are responsible for maintaining the confidentiality of your Pi account credentials and for all activities that occur under your account.',
    limitationOfLiability: '7. Limitation of Liability',
    liabilityText: 'Our App is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages.',
    changesToTerms: '8. Changes to Terms',
    changesText: 'We may modify these terms at any time. Continued use of the App constitutes acceptance of the modified terms.',
    governingLaw: '9. Governing Law',
    governingText: 'These terms are governed by the laws of Egypt.',
  }
}

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en') // Default: English

  // Load saved language
  useEffect(() => {
    const saved = localStorage.getItem('language')
    if (saved === 'ar' || saved === 'en') {
      setLang(saved)
    }
  }, [])

  // Apply direction & language to body
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('language', lang)
  }, [lang])

  // Enhanced translation function with interpolation support
  const t = (key, params = {}) => {
    let text = translations[lang][key] || key
    
    // Handle interpolation for dynamic values like {count}
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param])
    })
    
    return text
  }

  const toggleLanguage = () => {
    setLang(prev => prev === 'ar' ? 'en' : 'ar')
  }

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
