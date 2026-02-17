// api/paymob/create-payment.js
import axios from 'axios';

const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY;
const INTEGRATION_ID = parseInt(process.env.PAYMOB_INTEGRATION_ID);
const IFRAME_ID = parseInt(process.env.PAYMOB_IFRAME_ID);
const BASE_URL = 'https://accept.paymob.com/api';
export default async function handler(req, res) {
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
        city: billingData.city || 'Cairo',
        state: billingData.state || billingData.city || 'Cairo',
        country: billingData.country || 'EG',
        first_name: billingData.firstName,
        last_name: billingData.lastName,
        email: billingData.email,
        phone_number: billingData.phone
      },
      currency,
      integration_id: INTEGRATION_ID,
      lock_order_when_paid: true,
      redirection_url: billingData.redirectUrl || 'https://elhamdindustriesegp.vercel.app/payment-callback',
      notification_url: 'https://elhamdindustriesegp.vercel.app/api/paymob/webhook'
    });

    const paymentToken = keyRes.data.token;

    return res.status(200).json({
      success: true,
      paymentToken,
      paymobOrderId: paymobOrderId.toString(),
      iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${IFRAME_ID}?payment_token=${paymentToken}` // ✅ No extra spaces
    });

   } catch (error) {
    console.error('Paymob Error:', error.response?.data || error.message);
    return res.status(500).json({ 
      error: 'Payment creation failed',
      details: error.response?.data || error.message 
    });
  }
}