// api/test.js
export default async function handler(req, res) {
  const API_KEY = 'lclux2tuwiv6qkxoeyhh6szzrdavuq1u94tkfq01qvgngj8bclqx8ngragv6c7pf';
  
  console.log('Testing API key length:', API_KEY.length);
  
  const response = await fetch('https://api.minepi.com/v2/me', {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  
  const result = await response.json();
  res.json({ 
    success: response.ok,
    status: response.status,
    result: result
  });
}