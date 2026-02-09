export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId } = req.body;
    
    console.log('📝 Approve:', { paymentId });

    if (!paymentId) {
      return res.status(400).json({ error: 'Missing paymentId' });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      console.error('❌ PI_API_KEY not set');
      return res.status(500).json({ error: 'PI_API_KEY not set' });
    }

    // ✅ FIXED: No trailing spaces
    const isSandbox = apiKey.startsWith('sandbox_');
    const baseUrl = isSandbox 
      ? 'https://api.sandbox.minepi.com'  // ✅ No space
      : 'https://api.minepi.com';         // ✅ No space
    
    const url = `${baseUrl}/v2/payments/${paymentId}/approve`;
    
    console.log('🌐 Environment:', isSandbox ? 'TESTNET' : 'MAINNET');
    console.log('🌐 API URL:', url);

    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await piResponse.text();
    
    if (piResponse.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ Approved:', result);
      return res.json({ 
        success: true,
        status: 'approved',
        paymentId,
        network: isSandbox ? 'testnet' : 'mainnet',
        data: result 
      });
    } else {
      console.error('❌ Pi API error:', responseText);
      return res.status(piResponse.status).json({ 
        error: 'Pi approval failed',
        details: responseText 
      });
    }
  } catch (error) {
    console.error('💥 Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export const config = {
  api: { bodyParser: true }
};