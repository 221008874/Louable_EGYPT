import fetch from 'node-fetch';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    return res.json({ status: 'ready', piKeyConfigured: !!process.env.PI_API_KEY });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { paymentId, txid, orderDetails } = body || {};

    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'Missing paymentId or txid' });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'PI_API_KEY not set' });

    // CORRECT Pi Network API endpoints
    const isSandbox = apiKey.includes('sandbox');
    const baseUrl = isSandbox 
      ? 'https://api.sandbox.minepi.com' 
      : 'https://api.minepi.com';
    
    const url = `${baseUrl}/v2/payments/${paymentId}/complete`;
    
    console.log('Calling Pi API:', url);
    console.log('Environment:', isSandbox ? 'SANDBOX' : 'MAINNET');

    const piRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })
    });

    const piData = await piRes.json();

    if (!piRes.ok) {
      console.error('Pi API error:', piRes.status, piData);
      return res.status(piRes.status).json({ 
        error: 'Pi API error', 
        status: piRes.status,
        details: piData 
      });
    }

    console.log('Pi success:', piData.identifier);

    // Save to Firebase (optional)
    let firebaseId = null;
    try {
      if (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_SERVICE_ACCOUNT) {
        const { db } = await import('../lib/firebase-admin.js');
        const { FieldValue } = await import('firebase-admin/firestore');
        
        const docRef = await db.collection('orders').add({
          orderId: `order_${Date.now()}`,
          paymentId,
          txid,
          items: orderDetails?.items || [],
          totalPrice: orderDetails?.totalPrice || 0,
          status: 'completed',
          createdAt: FieldValue.serverTimestamp()
        });
        firebaseId = docRef.id;
        console.log('Saved to Firebase:', firebaseId);
      }
    } catch (fbError) {
      console.log('Firebase skipped:', fbError.message);
    }

    return res.json({ 
      success: true, 
      paymentId, 
      txid, 
      firebaseId,
      piData 
    });
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      error: error.message,
      type: error.code || 'UNKNOWN'
    });
  }
}

export const config = {
  api: { bodyParser: true }
};