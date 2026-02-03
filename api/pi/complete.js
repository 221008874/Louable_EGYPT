export default async function handler(req, res) {
  // CORS headers...
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId, txid, orderDetails } = req.body;
    
    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'Missing paymentId or txid' });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'PI_API_KEY not configured' });
    }

    // ✅ Fixed URL (no space)
    const url = `https://api.minepi.com/v2/payments/${paymentId}/complete`;
    
    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,  // ✅ Key, not Bearer
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })  // Body required for complete
    });

    if (!piResponse.ok) {
      const errorText = await piResponse.text();
      throw new Error(`Pi API error: ${errorText}`);
    }

    const piResult = await piResponse.json();
    
    // Save order logic here...
    
    return res.status(200).json({ 
      success: true, 
      orderId: `order_${Date.now()}`,
      txid 
    });
    
  } catch (error) {
    return res.status(500).json({ 
      error: error.message,
      success: false 
    });
  }
}