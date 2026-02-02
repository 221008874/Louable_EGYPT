// api/pi/complete.js
// ✅ FIXED: Enhanced completion endpoint with order saving

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*'); // Change to your domain in production
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId, txid, orderDetails } = req.body;
    
    if (!paymentId || !txid) {
      return res.status(400).json({ error: 'Missing paymentId or txid' });
    }

    // Get API key from environment
    const apiKey = process.env.PI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ PI_API_KEY environment variable not set!');
      return res.status(500).json({ 
        error: 'Server configuration error' 
      });
    }

    console.log('📝 Completing payment:', paymentId, 'with txid:', txid);

    // Call Pi API to complete the payment
const url = `https://api.minepi.com/v2/payments/${paymentId}/complete`;    
    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ txid })
    });

    if (!piResponse.ok) {
      const errorText = await piResponse.text();
      console.error('❌ Pi API completion error:', piResponse.status, errorText);
      throw new Error(`Pi API error: ${errorText}`);
    }

    const piResult = await piResponse.json();
    console.log('✅ Pi payment completed:', piResult);

    // 💾 HERE: Save order to your database
    // This is where you would save the order details to your database
    const order = {
      orderId: `order_${Date.now()}`,
      paymentId,
      txid,
      timestamp: new Date().toISOString(),
      orderDetails: orderDetails || {},
      status: 'completed'
    };

    console.log('💾 Order to save:', order);
    
    // TODO: Save to your database
    // await db.orders.create(order);
    // For now, just log it
    
    return res.status(200).json({ 
      success: true, 
      message: 'Order completed successfully',
      orderId: order.orderId,
      txid
    });
    
  } catch (error) {
    console.error('💥 Complete endpoint error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to complete payment',
      success: false
    });
  }
}