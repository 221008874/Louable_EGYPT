export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.PI_API_KEY;
  
  // Safe logging (never expose full key in logs)
  console.log('🔍 API Key configured:', !!apiKey);
  console.log('🔍 API Key length:', apiKey ? apiKey.length : 0);
  console.log('🔍 API Key prefix:', apiKey ? apiKey.substring(0, 8) : 'none');
  
  // Return safe info (never expose actual key)
  res.json({
    hasApiKey: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    keyPreview: apiKey ? apiKey.substring(0, 8) + '...' : null,
    environment: apiKey ? (apiKey.startsWith('sandbox_') ? 'sandbox' : 'mainnet') : 'unknown'
  });
}