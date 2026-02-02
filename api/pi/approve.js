// api/pi/approve.js
export default async function handler(req, res) {
  // Set headers
  res.setHeader('Content-Type', 'application/json');
  
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get paymentId from request
    const { paymentId } = req.body;
    
    if (!paymentId) {
      return res.status(400).json({ error: 'Missing paymentId' });
    }

    // Your API key (exactly as provided by Pi)
    const apiKey = 'lclux2tuwiv6qkxoeyhh6szzrdavuq1u94tkfq01qvgngj8bclqx8ngragv6c7pf';

    // Build URL without any template literals (to avoid spacing issues)
    const url = 'https://api.minepi.com/v2/payments/' + paymentId + '/approve';

    // Make request
    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      }
    });

    // Handle response
    if (piResponse.ok) {
      const result = await piResponse.json();
      return res.status(200).json({ status: 'approved' });
    } else {
      const errorText = await piResponse.text();
      console.error('Pi API Error:', errorText);
      return res.status(piResponse.status).json({ error: errorText });
    }

  } catch (error) {
    console.error('Server Error:', error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}