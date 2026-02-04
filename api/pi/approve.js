// api/pi/approve.js

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

  // Accept GET for testing, POST for production
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', method: req.method });
  }

  try {
    // Get paymentId from body (POST) or query (GET)
    const paymentId = req.body?.paymentId || req.query?.paymentId;

    console.log('Method:', req.method);
    console.log('Body:', req.body);
    console.log('Query:', req.query);
    console.log('PaymentId:', paymentId);

    if (!paymentId) {
      return res.status(400).json({ 
        error: 'Missing paymentId',
        receivedBody: req.body,
        receivedQuery: req.query,
        method: req.method
      });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'PI_API_KEY not configured' });
    }

    // Call Pi API
    const url = `https://api.minepi.com/v2/payments/${paymentId}/approve`;
    
    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (piResponse.ok) {
      const result = await piResponse.json();
      return res.status(200).json({ 
        status: 'approved',
        paymentId,
        data: result 
      });
    } else {
      const errorText = await piResponse.text();
      return res.status(piResponse.status).json({ 
        error: 'Pi API error',
        status: piResponse.status,
        details: errorText 
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};