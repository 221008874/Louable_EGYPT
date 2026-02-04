// api/pi/approve.js

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export default async function handler(req, res) {
  // Handle OPTIONS preflight immediately
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling OPTIONS preflight for approve');
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return res.status(204).end();
  }

  // Set CORS headers for all other responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  res.setHeader('Content-Type', 'application/json');

  console.log('═══════════════════════════════════════');
  console.log('🔍 APPROVE ENDPOINT CALLED');
  console.log('Method:', req.method);
  console.log('Origin:', req.headers.origin);
  console.log('═══════════════════════════════════════');

  // Only POST allowed
  if (req.method !== 'POST') {
    console.error('❌ Wrong method:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed',
      receivedMethod: req.method 
    });
  }

  try {
    // Parse body if needed
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

    const { paymentId } = body || {};
    
    if (!paymentId) {
      return res.status(400).json({ 
        error: 'Missing paymentId',
        receivedBody: body 
      });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'PI_API_KEY not set' 
      });
    }

    // Call Pi API
    const url = `https://api.minepi.com/v2/payments/${paymentId}/approve`;
    console.log('📞 Calling Pi API:', url);

    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (piResponse.ok) {
      const result = await piResponse.json();
      console.log('✅ Payment approved');
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
    console.error('💥 Exception:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

// Tell Vercel to parse JSON body
export const config = {
  api: {
    bodyParser: true,
  },
};