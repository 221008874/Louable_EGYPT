// api/pi/approve.js
import { db } from '../../src/services/firebase.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS,PUT,DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Max-Age': '86400',
};

export default async function handler(req, res) {
  console.log(`[APPROVE] ${req.method} request from ${req.headers.origin || 'unknown origin'}`);
  
  // Handle OPTIONS preflight FIRST
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling OPTIONS preflight');
    
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    
    return res.status(204).end();
  }

  // Set CORS headers for ALL responses
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
    console.log('🔍 APPROVE ENDPOINT CALLED');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', req.body);
    console.log('═══════════════════════════════════════');

    // Parse body
    let body = req.body;
    
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (parseError) {
        return res.status(400).json({ 
          error: 'Invalid JSON in request body',
          details: parseError.message 
        });
      }
    }
    
    if (!body || typeof body !== 'object') {
      body = {};
    }

    const { paymentId } = body;
    
    console.log('Extracted paymentId:', paymentId);

    if (!paymentId) {
      console.error('❌ Missing paymentId');
      return res.status(400).json({ 
        error: 'Missing paymentId',
        receivedBody: body 
      });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      console.error('❌ PI_API_KEY not set');
      return res.status(500).json({ 
        error: 'Server configuration error: PI_API_KEY not set' 
      });
    }

    // Determine environment
    const isSandbox = process.env.PI_SANDBOX === 'true' || apiKey.includes('sandbox');
    const baseUrl = isSandbox ? 'https://api.sandbox.pi' : 'https://api.mainnet.pi';
    
    const url = `${baseUrl}/v2/payments/${paymentId}/approve`;
    console.log('📞 Calling Pi API:', url);

    // Call Pi API
    let piResponse;
    try {
      piResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return res.status(502).json({
        error: 'Failed to connect to Pi Network API',
        details: fetchError.message
      });
    }

    console.log('Pi response status:', piResponse.status);

    if (piResponse.ok) {
      const result = await piResponse.json();
      console.log('✅ Payment approved:', result);
      
      return res.status(200).json({ 
        status: 'approved',
        paymentId,
        data: result 
      });
    } else {
      const errorText = await piResponse.text();
      console.error('❌ Pi API Error:', piResponse.status, errorText);
      
      return res.status(piResponse.status).json({ 
        error: 'Payment approval failed',
        statusCode: piResponse.status,
        details: errorText 
      });
    }
    
  } catch (error) {
    console.error('💥 Exception in approve:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      type: error.constructor?.name || 'UnknownError'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};