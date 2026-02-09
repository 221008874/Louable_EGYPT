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
    const { paymentId, txid } = req.body;
    
    console.log('📝 Complete request received:', { paymentId, txid: txid?.substring(0, 20) });

    if (!paymentId || !txid) {
      console.log('❌ Missing fields:', { paymentId: !!paymentId, txid: !!txid });
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: { paymentId: !!paymentId, txid: !!txid }
      });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      console.error('❌ PI_API_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // ✅ FIXED: Removed space in URL
    const url = `https://api.minepi.com/v2/payments/${paymentId}/complete`;
    
    console.log('🌐 Calling Pi API:', url);

    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })
    });

    const responseText = await piResponse.text();
    console.log('🌐 Pi API response:', piResponse.status, responseText.substring(0, 200));

    if (piResponse.ok) {
      const piResult = JSON.parse(responseText);
      console.log('✅ Completion successful');
      
      return res.status(200).json({ 
        success: true, 
        orderId: `order_${Date.now()}`,
        paymentId,
        txid,
        piData: piResult
      });
    } else {
      console.error('❌ Pi API error:', responseText);
      return res.status(piResponse.status).json({
        error: 'Pi completion failed',
        details: responseText
      });
    }
    
  } catch (error) {
    console.error('💥 Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}