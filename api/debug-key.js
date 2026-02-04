// api/debug-key.js
export default function handler(req, res) {
  const apiKey = process.env.PI_API_KEY;
  
  // Safe logging (never expose full key in logs)
  console.log('🔍 API Key configured:', !!apiKey);
  console.log('🔍 API Key length:', apiKey ? apiKey.length : 0);
  
  // Return safe info (never expose actual key)
  res.json({
    hasApiKey: !!apiKey,
    keyLength: apiKey ? apiKey.length : 0,
    keyPreview: apiKey ? apiKey.substring(0, 8) + '...' : null
  });
}