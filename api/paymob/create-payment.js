import axios from 'axios';

// Paymob Configuration (YOUR CREDENTIALS)
const PAYMOB_API_KEY = 'ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TVRFek1UY3hNU3dpYm1GdFpTSTZJbWx1YVhScFlXd2lmUS5sSGxnX3BFSXdxc21nYkxYbUdmbkM3Y3dNakhPMWJsMGl1T2VnYlhpRFBRYTJndkdlZmdFYVoxcjlUNXo2ajliQ0FxN29TVWtlYTBwOWEtNm9VZWtFQQ==';
const INTEGRATION_ID = 5543872;
const IFRAME_ID = 1007401;
const BASE_URL = 'https://accept.paymob.com/api';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, billingData, orderItems = [], currency = 'EGP' } = req.body;

    // Step 1: Auth
    const authRes = await axios.post(`${BASE_URL}/auth/tokens`, {
      api_key: PAYMOB_API_KEY
    });
    const token = authRes.data.token;

    // Step 2: Create Order
    const orderRes = await axios.post(`${BASE_URL}/ecommerce/orders`, {
      auth_token: token,
      delivery_needed: false,
      amount_cents: Math.round(amount * 100),
      currency,
      items: orderItems.map(item => ({
        name: item.name,
        amount_cents: Math.round(item.price * 100),
        description: item.description || '',
        quantity: item.quantity
      }))
    });
    const paymobOrderId = orderRes.data.id;

    // Step 3: Payment Key
    const keyRes = await axios.post(`${BASE_URL}/acceptance/payment_keys`, {
      auth_token: token,
      amount_cents: Math.round(amount * 100),
      expiration: 3600,
      order_id: paymobOrderId,
      billing_data: {
        apartment: billingData.apartment || 'NA',
        floor: billingData.floor || 'NA',
        building: billingData.building || 'NA',
        street: billingData.street || 'NA',
        city: billingData.city,
        state: billingData.state || billingData.city,
        country: billingData.country || 'EG',
        first_name: billingData.firstName,
        last_name: billingData.lastName,
        email: billingData.email,
        phone_number: billingData.phone
      },
      currency,
      integration_id: INTEGRATION_ID,
      lock_order_when_paid: true
    });

    const paymentToken = keyRes.data.token;

    return res.status(200).json({
      success: true,
      paymentToken,
      paymobOrderId: paymobOrderId.toString(),
      iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${IFRAME_ID}?payment_token=${paymentToken}`
    });

  } catch (error) {
    console.error('Paymob Error:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Payment creation failed',
      details: error.message 
    });
  }
}