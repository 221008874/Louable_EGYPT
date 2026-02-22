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
    flavorsAvailable: 'نكهات متاحة',
    selectFlavor: 'اختر النكهة',
    description: 'الوصف',
    price: 'السعر',
    quantity: 'الكمية',
    addToCart: 'حط في العربية',
    // FIX: Added missing translation key used in ProductCard & ProductDetail success notification
    addedToCart: 'تم الإضافة للعربية',
    premiumQuality: 'جودة ممتازة',
    loadingProductDetails: 'جاري تحميل تفاصيل المنتج...',
    productImage: 'صورة المنتج',
    review: 'تقييم',
    reviews: 'تقييمات',

    // Stock Management
    outOfStock: 'نفذت الكمية',
    onlyLeft: 'باقي {count} بس!',
    inStock: 'متوفر: {count}',
    availableInStock: 'متوفر في المخزن',
    currentlyUnavailable: 'المنتج ده مش متوفر دلوقتي',
    lowStockAlert: 'الكمية قليلة',
    onlyAvailable: 'متوفر {count} بس',
    maxReached: 'وصلت للحد الأقصى',
    maxAvailable: 'الحد الأقصى {count}',
    increaseQuantity: 'زود الكمية',

    // Cart
    cart: 'العربية',
    total: 'الإجمالي',
    checkout: 'أكمل الطلب',
    emptyCart: 'العربية فاضية',
    browseOurCollectionAndAddSomeItems: 'اختار من تشكيلتنا وضيف منتجات للعربية!',
    addProducts: 'ضيف منتجات للعربية!',
    remove: 'شيل',
    shoppingCart: 'عربية التسوق',
    item: 'منتج',
    items: 'منتجات',
    subtotal: 'المجموع الفرعي',
    shipping: 'الشحن',
    free: 'مجاني',
    processing: 'جاري المعالجة...',
    resolveStockIssues: 'حل مشاكل المخزن',
    stockIssuesDetected: 'تم اكتشاف مشاكل في المخزن',
    dismiss: 'إخفاء',
    qty: 'الكمية',
    each: 'للواحد',
    more: 'أكثر',
    discount: 'الخصم',
    haveCoupon: 'عندك كود خصم؟',
    enterCouponCode: 'ادخل كود الخصم',
    apply: 'تطبيق',
    invalidCoupon: 'الكود غير صحيح',
    orderSummary: 'ملخص الطلب',
    adjustQuantitiesBeforeCheckout: 'عدل الكميات قبل أكمل الطلب',
    productNotAvailable: 'المنتج غير متوفر',

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
    termsOfServiceTitle: 'شروط الاستخدام',
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
    orderDetails: 'تفاصيل الطلب',
    transaction: 'العملية:',
    totalPaid: 'المبلغ المدفوع:',

    // Terms of Service
    acceptanceOfTerms: 'قبول الشروط',
    paymentProcessing: 'معالجة الدفع',
    productInfo: 'معلومات المنتج',
    userResponsibilities: 'مسؤوليات المستخدم',
    limitationOfLiability: 'حدود المسؤولية',

    // Pi Status
    piConnected: '✅ Pi متصل',
    piFailed: '❌ Pi فشل',
    connecting: '⏳ جاري الاتصال...',

    // Delivery
    deliveryInformation: 'معلومات التوصيل',
    fullName: 'الاسم الكامل',
    age: 'العمر',
    phoneNumber: 'رقم الهاتف',
    detailedAddress: 'العنوان التفصيلي',
    selectLocationOnMap: 'حدد الموقع على الخريطة',
    geolocationNotSupported: 'الموقع الجغرافي غير مدعوم في متصفحك',
    loadingMap: 'جارٍ تحميل الخريطة',
    clickMapToSelectLocation: 'انقر على الخريطة لتحديد موقعك الدقيق',
    saveDeliveryInfo: 'حفظ معلومات التوصيل',
    completeDeliveryInfo: 'أكمل معلومات التوصيل',
    pleaseCompleteDeliveryInfo: 'يرجى إكمال معلومات التوصيل قبل المتابعة',
    nameRequired: 'الاسم الكامل مطلوب',
    validAgeRequired: 'يرجى إدخال عمر صالح (13-120)',
    validPhoneRequired: 'يرجى إدخال رقم هاتف صالح',
    addressRequired: 'العنوان التفصيلي مطلوب',
    locationRequired: 'يرجى تحديد موقعك على الخريطة',
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
    flavorsAvailable: 'flavors available',
    selectFlavor: 'Select Flavor',
    description: 'Description',
    price: 'Price',
    quantity: 'Quantity',
    addToCart: 'Add to Cart',
    // FIX: Added missing translation key used in ProductCard & ProductDetail success notification
    addedToCart: 'Added to cart',
    premiumQuality: 'Premium Quality',
    loadingProductDetails: 'Loading product details...',
    productImage: 'Product Image',
    review: 'review',
    reviews: 'reviews',

    // Stock Management
    outOfStock: 'Out of Stock',
    onlyLeft: 'Only {count} left!',
    inStock: 'In Stock: {count}',
    availableInStock: 'Available in Stock',
    currentlyUnavailable: 'This item is currently unavailable',
    lowStockAlert: 'Low Stock Alert',
    onlyAvailable: 'Only {count} available',
    maxReached: 'Max reached',
    maxAvailable: 'Max {count}',
    increaseQuantity: 'Increase quantity',

    // Cart
    cart: 'Cart',
    total: 'Total',
    checkout: 'Proceed to Checkout',
    emptyCart: 'Your cart is empty',
    browseOurCollectionAndAddSomeItems: 'Browse our collection and add some items!',
    addProducts: 'Add some products to your cart!',
    remove: 'Remove',
    shoppingCart: 'Shopping Cart',
    item: 'item',
    items: 'items',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    free: 'Free',
    processing: 'Processing...',
    resolveStockIssues: 'Resolve Stock Issues',
    stockIssuesDetected: 'Stock Issues Detected',
    dismiss: 'Dismiss',
    qty: 'Qty',
    each: 'each',
    more: 'more',
    discount: 'Discount',
    haveCoupon: 'Have a coupon code?',
    enterCouponCode: 'Enter coupon code',
    apply: 'Apply',
    invalidCoupon: 'Invalid coupon code',
    orderSummary: 'Order Summary',
    adjustQuantitiesBeforeCheckout: 'Adjust quantities before checkout',
    productNotAvailable: 'Product is not available',

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
    termsOfServiceTitle: 'Terms of Service',
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
    orderDetails: 'Order Details',
    transaction: 'Transaction:',
    totalPaid: 'Total Paid:',

    // Terms of Service
    acceptanceOfTerms: 'Acceptance of Terms',
    paymentProcessing: 'Payment Processing',
    productInfo: 'Product Information',
    userResponsibilities: 'User Responsibilities',
    limitationOfLiability: 'Limitation of Liability',

    // Pi Status
    piConnected: '✅ Pi Connected',
    piFailed: '❌ Pi Failed',
    connecting: '⏳ Connecting...',

    // Delivery
    deliveryInformation: 'Delivery Information',
    fullName: 'Full Name',
    age: 'Age',
    phoneNumber: 'Phone Number',
    detailedAddress: 'Detailed Address',
    selectLocationOnMap: 'Select Location on Map',
    geolocationNotSupported: 'Geolocation not supported in your browser',
    loadingMap: 'Loading map...',
    clickMapToSelectLocation: 'Click on the map to select your exact location',
    saveDeliveryInfo: 'Save Delivery Information',
    completeDeliveryInfo: 'Complete Delivery Info',
    pleaseCompleteDeliveryInfo: 'Please complete delivery information before checkout',
    nameRequired: 'Full name is required',
    validAgeRequired: 'Please enter a valid age (13-120)',
    validPhoneRequired: 'Please enter a valid phone number',
    addressRequired: 'Detailed address is required',
    locationRequired: 'Please select your location on the map',
  }
}

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('ar') // Default: Arabic

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