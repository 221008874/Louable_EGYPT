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
    
    console.log('📝 Approve request received:', { paymentId });

    if (!paymentId) {
      console.log('❌ Missing paymentId');
      return res.status(400).json({ error: 'Missing paymentId' });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      console.error('❌ PI_API_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // ✅ FIXED: Removed space in URL
    const url = `https://api.minepi.com/v2/payments/${paymentId}/approve`;
    
    console.log('🌐 Calling Pi API:', url);

    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const responseText = await piResponse.text();
    console.log('🌐 Pi API response:', piResponse.status, responseText.substring(0, 200));

    if (piResponse.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ Approval successful');
      return res.status(200).json({ 
        success: true,
        status: 'approved',
        paymentId,
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
    console.error('💥 Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}