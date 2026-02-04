export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') {
    return res.json({ status: 'ready', piKeyConfigured: !!process.env.PI_API_KEY });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { paymentId } = req.body || {};
    if (!paymentId) return res.status(400).json({ error: 'Missing paymentId' });

    const apiKey = process.env.PI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'PI_API_KEY not set' });

    const isSandbox = apiKey.startsWith('sandbox_') || process.env.PI_SANDBOX === 'true';
    const baseUrl = isSandbox 
      ? 'https://api.sandbox.minepi.com' 
      : 'https://api.minepi.com';
    
    const piRes = await fetch(`${baseUrl}/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await piRes.json();
    
    if (!piRes.ok) {
      return res.status(piRes.status).json({ error: 'Pi API error', details: data });
    }

    return res.json({ status: 'approved', paymentId, data });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}