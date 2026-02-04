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
    console.log('🔍 APPROVE ENDPOINT CALLED');
    console.log('Method:', req.method);
    console.log('Body type:', typeof req.body);
    console.log('Body:', req.body);
    console.log('═══════════════════════════════════════');

    // Handle body properly
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
        error: 'Server configuration error',
        details: 'PI_API_KEY not set' 
      });
    }

    // Determine environment (sandbox vs mainnet)
    const isSandbox = process.env.PI_SANDBOX === 'true' || !process.env.PI_API_KEY.includes('mainnet');
    const baseUrl = isSandbox ? 'https://api.sandbox.pi' : 'https://api.mainnet.pi';
    
    // Call Pi API - FIXED: removed space in URL
    const url = `${baseUrl}/v2/payments/${paymentId}/approve`;
    console.log('📞 Calling Pi API:', url);
    console.log('Environment:', isSandbox ? 'SANDBOX' : 'MAINNET');

    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

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
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      type: error.constructor.name
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};