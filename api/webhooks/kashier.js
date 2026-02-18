// Handle Kashier payment callbacks
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const { 
      orderId, 
      paymentStatus, 
      transactionId, 
      amount, 
      signature,
      failureReason
    } = req.body;

    // Verify signature
    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHash('sha256')
      .update(`${orderId}${paymentStatus}${process.env.KASHIER_SECRET_KEY}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid signature received');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Here you would update Firebase
    // For now, just log it
    console.log('Kashier webhook received:', {
      orderId,
      paymentStatus,
      transactionId,
      amount,
      failureReason
    });

    // TODO: Update order status in Firebase
    // const { db } = require('../../lib/firebase-admin');
    // await updateOrderStatus(db, orderId, paymentStatus, transactionId);

    res.status(200).json({ received: true, status: 'processed' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}