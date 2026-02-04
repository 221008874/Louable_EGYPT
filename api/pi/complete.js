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
    console.log('🔄 Handling OPTIONS preflight');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(204).end();
  }

  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    console.error('❌ Wrong method:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed',
      receivedMethod: req.method 
    });
  }

  try {
    console.log('═══════════════════════════════════════');
    console.log('🔍 COMPLETE ENDPOINT CALLED');
    console.log('Method:', req.method);
    console.log('Body type:', typeof req.body);
    console.log('Body:', req.body);
    console.log('═══════════════════════════════════════');

    // ✅ FIXED: Handle body properly
    let body = req.body;
    
    // If body is a string (not parsed), parse it
    if (typeof body === 'string') {
      console.log('Parsing string body...');
      try {
        body = JSON.parse(body);
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError);
        return res.status(400).json({ 
          error: 'Invalid JSON in request body',
          details: parseError.message 
        });
      }
    }
    
    // If body is still null/undefined, create empty object
    if (!body) {
      body = {};
    }

    const { paymentId, txid, orderDetails } = body;
    
    console.log('Extracted paymentId:', paymentId);
    console.log('Extracted txid:', txid);
    console.log('Extracted orderDetails:', orderDetails);

    if (!paymentId || !txid) {
      console.error('❌ Missing paymentId or txid');
      return res.status(400).json({ 
        error: 'Missing paymentId or txid',
        receivedBody: body 
      });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      console.error('❌ PI_API_KEY not set');
      return res.status(500).json({ 
        error: 'PI_API_KEY not configured',
        success: false 
      });
    }

    // Complete payment with Pi
    const url = `https://api.mainnet.pi/v2/payments/${paymentId}/complete`;
    console.log('📞 Calling Pi API:', url);

    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })
    });

    console.log('Pi response status:', piResponse.status);

    if (!piResponse.ok) {
      const errorText = await piResponse.text();
      console.error('❌ Pi API error:', piResponse.status, errorText);
      
      return res.status(piResponse.status).json({ 
        error: 'Pi API error',
        status: piResponse.status,
        details: errorText 
      });
    }

    const piResult = await piResponse.json();
    console.log('✅ Pi payment completed:', piResult);

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
    console.log('✅ Order saved to Firebase:', docRef.id);

    return res.status(200).json({ 
      success: true, 
      orderId: order.orderId,
      firebaseId: docRef.id,
      txid 
    });
    
  } catch (error) {
    console.error('💥 Complete endpoint error:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({ 
      error: error.message || 'Failed to complete payment',
      success: false,
      type: error.constructor.name
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};