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
    const { paymentId, txid, orderDetails } = req.body;
    
    console.log('📝 Complete:', { paymentId, txid: txid?.substring(0, 20) });

    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'Missing paymentId or txid' });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'PI_API_KEY not set' });
    }

    // ✅ Auto-detect environment from API key
    const isSandbox = apiKey.startsWith('sandbox_');
    const baseUrl = isSandbox 
      ? 'https://api.sandbox.minepi.com'
      : 'https://api.minepi.com';
    
    const url = `${baseUrl}/v2/payments/${paymentId}/complete-payment`;
    
    console.log('🌐 Environment:', isSandbox ? 'TESTNET' : 'MAINNET');

    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })
    });

    const responseText = await piResponse.text();

    if (piResponse.ok) {
      const piResult = JSON.parse(responseText);
      
      console.log('✅ Payment completed:', {
        paymentId,
        txid,
        amount: piResult.amount,
        network: isSandbox ? 'testnet' : 'mainnet'
      });
      
      return res.json({ 
        success: true, 
        orderId: `order_${Date.now()}`,
        paymentId,
        txid,
        network: isSandbox ? 'testnet' : 'mainnet',
        piData: piResult
      });
    } else {
      return res.status(piResponse.status).json({
        error: 'Pi completion failed',
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