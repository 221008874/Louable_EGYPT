// api/pi/complete.js - Minimal version
export default async function handler(req, res) {
  // CORS headers FIRST - before anything else
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check env var
    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'PI_API_KEY not set in Vercel env' });
    }

    // Parse body manually (Vercel sometimes doesn't parse JSON)
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    
    const { paymentId, txid } = body || {};
    
    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'Missing paymentId or txid', received: body });
    }

    // Call Pi API using native fetch (Node 18+)
    const isSandbox = apiKey.includes('sandbox');
    const baseUrl = isSandbox ? 'https://api.sandbox.pi' : 'https://api.mainnet.pi';
    
    const piRes = await fetch(`${baseUrl}/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })
    });

    const piData = await piRes.json();

    if (!piRes.ok) {
      return res.status(piRes.status).json({ 
        error: 'Pi API error', 
        details: piData 
      });
    }

    return res.status(200).json({
      success: true,
      paymentId,
      txid,
      piData
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}