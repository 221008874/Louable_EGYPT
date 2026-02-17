import crypto from 'crypto';

// YOUR HMAC SECRET
const HMAC_SECRET = 'D3862C5DF152DD49BA8499FCECA6BAF6';

// HMAC Verification
const verifyHmac = (payload, secret) => {
  const { obj } = payload;
  const values = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    obj.order?.id || '',
    obj.owner,
    obj.pending,
    obj.source_data?.pan || '',
    obj.source_data?.sub_type || '',
    obj.source_data?.type || '',
    obj.success
  ].join('');

  return crypto.createHmac('sha512', secret).update(values).digest('hex');
};

// In-memory storage (use Redis or database in production)
const paymentStatus = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const receivedHmac = req.query.hmac;

  try {
    const calculatedHmac = verifyHmac(req.body, HMAC_SECRET);
    
    if (calculatedHmac !== receivedHmac) {
      console.error('Invalid HMAC');
      return res.status(400).send('Invalid HMAC');
    }

    const { obj } = req.body;
    const paymobOrderId = obj.order?.id?.toString();

    // Store in memory (frontend will poll this)
    paymentStatus.set(paymobOrderId, {
      success: obj.success,
      transactionId: obj.id.toString(),
      amount: obj.amount_cents / 100,
      currency: obj.currency,
      timestamp: Date.now()
    });

    // Clean up old entries (older than 1 hour)
    for (const [key, value] of paymentStatus.entries()) {
      if (Date.now() - value.timestamp > 3600000) {
        paymentStatus.delete(key);
      }
    }

    return res.status(200).send('OK');

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).send('Error');
  }
}

// Export for checking status
export const getPaymentStatus = (paymobOrderId) => paymentStatus.get(paymobOrderId);