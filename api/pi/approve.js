export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ error: 'Missing paymentId' });
    }

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'PI_API_KEY not configured' });
    }

    // ✅ FIXED: No extra spaces
    const url = `https://api.minepi.com/v2/payments/${paymentId}/approve`;
    
    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`, // ✅ Bearer, not Key
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
    return res.status(500).json({ error: error.message });
  }
}