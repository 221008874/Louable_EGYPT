// api/pi/approve.js
// ✅ PRODUCTION VERSION with robust CORS handling

// CORS headers configuration
const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export default async function handler(req, res) {
  // 🚨 CRITICAL: Handle OPTIONS immediately and return
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling OPTIONS preflight');
    res.writeHead(204, corsHeaders);
    return res.end();
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

  // Only POST allowed for actual approval
  if (req.method !== 'POST') {
    console.error('❌ Wrong method:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed',
      receivedMethod: req.method 
    });
  }

  try {
    const { paymentId } = req.body || {};
    
    if (!paymentId) {
      return res.status(400).json({ error: 'Missing paymentId' });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'PI_API_KEY not configured' });
    }

    // ✅ Fixed URL
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
        error: 'Approval failed',
        details: errorText 
      });
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// ✅ Export config for Vercel (important!)
export const config = {
  api: {
    bodyParser: true,
  },
};