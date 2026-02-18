// Initialize Kashier payment session - FIXED VERSION
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      amount, 
      currency = 'EGP', 
      customerEmail, 
      customerPhone,
      orderId,
      description 
    } = req.body;

    // Validate required fields
    if (!amount || !customerEmail || !orderId) {
      return res.status(400).json({
        error: 'Missing required fields: amount, customerEmail, orderId'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }

    // Validate Egyptian phone if provided
    if (customerPhone) {
      const phoneRegex = /^01[0-2,5]{1}[0-9]{8}$/;
      if (!phoneRegex.test(customerPhone)) {
        return res.status(400).json({
          error: 'Invalid Egyptian phone number format (01xxxxxxxxx)'
        });
      }
    }

    const KASHIER_API_KEY = process.env.KASHIER_API_KEY;
    const MERCHANT_ID = process.env.KASHIER_MERCHANT_ID;
    const SECRET_KEY = process.env.KASHIER_SECRET_KEY;
    const FRONTEND_URL = process.env.FRONTEND_URL;

    if (!KASHIER_API_KEY || !MERCHANT_ID || !SECRET_KEY) {
      console.error('Missing Kashier credentials');
      return res.status(500).json({
        error: 'Server configuration error: Missing Kashier credentials'
      });
    }

    // FIXED: Removed trailing space and use correct Kashier checkout URL
    // Kashier uses hosted checkout page with query parameters
    const baseUrl = 'https://checkout.kashier.io';
    
    const paymentData = {
      merchantId: MERCHANT_ID,
      amount: amount.toString(), // Kashier expects string
      currency: currency,
      orderId: orderId,
      customerEmail: customerEmail,
      customerPhone: customerPhone || '',
      description: description || `Order #${orderId}`,
      returnUrl: `${FRONTEND_URL}/payment/success`,
      cancelUrl: `${FRONTEND_URL}/payment/cancel`,
      test: 'true' // Remove in production
    };

    // Generate signature (Kashier format: merchantId + orderId + amount + currency + secretKey)
    const crypto = await import('crypto');
    const signatureString = `${MERCHANT_ID}${orderId}${amount}${currency}${SECRET_KEY}`;
    const signature = crypto.createHash('sha256').update(signatureString).digest('hex');

    // Build checkout URL with query params
    const params = new URLSearchParams({
      ...paymentData,
      signature: signature
    });

    const checkoutUrl = `${baseUrl}?${params.toString()}`;

    console.log('Generated Kashier URL:', checkoutUrl); // Debug log

    res.status(200).json({
      success: true,
      checkoutUrl: checkoutUrl,
      orderId: orderId,
      amount: amount,
      currency: currency
    });

  } catch (error) {
    console.error('Kashier payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment initialization failed',
      details: error.message
    });
  }
}