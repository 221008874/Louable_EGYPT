// api/pi/complete.js
import { db } from '../../src/services/firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export default async function handler(req, res) {
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(204).end();
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  // Accept both GET and POST
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }

  try {
    // Get data from body (POST) or query (GET)
    const paymentId = req.body?.paymentId || req.query?.paymentId;
    const txid = req.body?.txid || req.query?.txid;
    const orderDetails = req.body?.orderDetails || {};

    console.log('Complete - Method:', req.method);
    console.log('Complete - PaymentId:', paymentId);
    console.log('Complete - TXID:', txid);

    if (!paymentId || !txid) {
      return res.status(400).json({ 
        error: 'Missing paymentId or txid',
        receivedBody: req.body,
        receivedQuery: req.query
      });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'PI_API_KEY not configured' });
    }

    // Complete payment with Pi
    const url = `https://api.minepi.com/v2/payments/${paymentId}/complete`;
    
    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })
    });

    if (!piResponse.ok) {
      const errorText = await piResponse.text();
      return res.status(piResponse.status).json({ 
        error: 'Pi API error',
        status: piResponse.status,
        details: errorText 
      });
    }

    const piResult = await piResponse.json();

    // Save to Firebase
    const order = {
      orderId: `order_${Date.now()}`,
      paymentId,
      txid,
      piTransaction: piResult,
      items: orderDetails?.items || [],
      totalPrice: orderDetails?.totalPrice || 0,
      totalItems: orderDetails?.totalItems || 0,
      status: 'completed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, 'orders'), order);
    console.log('✅ Order saved:', docRef.id);

    return res.status(200).json({ 
      success: true, 
      orderId: order.orderId,
      firebaseId: docRef.id,
      txid 
    });
    
  } catch (error) {
    console.error('💥 Complete endpoint error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to complete payment',
      success: false 
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};