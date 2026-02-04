// api/pi/complete.js
import { db } from '../../src/services/firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// CORS headers - defined at module level for reuse
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PUT,DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req, res) {
  // Log all requests for debugging
  console.log(`[COMPLETE] ${req.method} request from ${req.headers.origin || 'unknown origin'}`);
  
  // Handle OPTIONS preflight FIRST - before any other logic
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling OPTIONS preflight');
    
    // Set all CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    return res.status(204).end();
  }

  // Set CORS headers for ALL responses (including errors)
  try {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.setHeader('Content-Type', 'application/json');
  } catch (headerError) {
    console.error('Error setting headers:', headerError);
  }

  // Only allow POST
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
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body type:', typeof req.body);
    console.log('Raw body:', req.body);
    console.log('═══════════════════════════════════════');

    // Parse body safely
    let body = req.body;
    
    // Handle string body (shouldn't happen with bodyParser, but just in case)
    if (typeof body === 'string') {
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
    
    // Ensure body is an object
    if (!body || typeof body !== 'object') {
      body = {};
    }

    const { paymentId, txid, orderDetails } = body;
    
    console.log('Extracted paymentId:', paymentId);
    console.log('Extracted txid:', txid);

    // Validate required fields
    if (!paymentId) {
      console.error('❌ Missing paymentId');
      return res.status(400).json({ 
        error: 'Missing paymentId',
        receivedBody: body 
      });
    }

    if (!txid) {
      console.error('❌ Missing txid');
      return res.status(400).json({ 
        error: 'Missing txid',
        receivedBody: body 
      });
    }

    // Check API key
    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      console.error('❌ PI_API_KEY not set');
      return res.status(500).json({ 
        error: 'Server configuration error: PI_API_KEY not set',
        success: false 
      });
    }

    // Determine environment
    const isSandbox = process.env.PI_SANDBOX === 'true' || apiKey.includes('sandbox');
    const baseUrl = isSandbox ? 'https://api.sandbox.pi' : 'https://api.mainnet.pi';
    
    const url = `${baseUrl}/v2/payments/${paymentId}/complete`;
    console.log('📞 Calling Pi API:', url);
    console.log('Environment:', isSandbox ? 'SANDBOX' : 'MAINNET');

    // Call Pi Network API
    let piResponse;
    try {
      piResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ txid })
      });
    } catch (fetchError) {
      console.error('❌ Fetch error to Pi API:', fetchError);
      return res.status(502).json({
        error: 'Failed to connect to Pi Network API',
        details: fetchError.message
      });
    }

    console.log('Pi response status:', piResponse.status);

    // Handle Pi API errors
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
    let docRef;
    try {
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

      docRef = await addDoc(collection(db, 'orders'), order);
      console.log('✅ Order saved to Firebase:', docRef.id);
    } catch (firebaseError) {
      console.error('❌ Firebase error:', firebaseError);
      // Don't fail the whole request if Firebase fails, just log it
      // The payment was successful on Pi's side
    }

    return res.status(200).json({ 
      success: true, 
      orderId: `order_${Date.now()}`,
      firebaseId: docRef?.id || null,
      txid,
      piResult
    });
    
  } catch (error) {
    console.error('💥 Complete endpoint error:', error);
    console.error('Error stack:', error.stack);
    
    // Ensure we always return JSON even on crash
    return res.status(500).json({ 
      error: error.message || 'Failed to complete payment',
      success: false,
      type: error.constructor?.name || 'UnknownError'
    });
  }
}

// Vercel config
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};