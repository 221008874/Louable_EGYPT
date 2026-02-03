// api/pi/approve.js
// 🔍 ENHANCED DEBUG VERSION with extensive logging

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.setHeader('Content-Type', 'application/json');
  
  // Log incoming request
  console.log('═══════════════════════════════════════');
  console.log('🔍 APPROVE ENDPOINT CALLED');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('═══════════════════════════════════════');
  
  // Only POST allowed
  if (req.method !== 'POST') {
    console.error('❌ Wrong method:', req.method);
    return res.status(405).json({ 
      error: 'Method not allowed',
      receivedMethod: req.method,
      expectedMethod: 'POST'
    });
  }

  try {
    // Parse body if it's a string
    let body = req.body;
    if (typeof body === 'string') {
      console.log('⚠️ Body is string, parsing...');
      try {
        body = JSON.parse(body);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        return res.status(400).json({ 
          error: 'Invalid JSON in request body',
          details: parseError.message 
        });
      }
    }

    // Get paymentId
    const { paymentId } = body;
    
    console.log('📝 Extracted paymentId:', paymentId);
    
    if (!paymentId) {
      console.error('❌ Missing paymentId in body:', body);
      return res.status(400).json({ 
        error: 'Missing paymentId',
        receivedBody: body,
        hint: 'Send { "paymentId": "your_payment_id" }'
      });
    }

    // Validate paymentId format
    if (typeof paymentId !== 'string' || paymentId.trim() === '') {
      console.error('❌ Invalid paymentId format:', paymentId);
      return res.status(400).json({ 
        error: 'Invalid paymentId format',
        receivedPaymentId: paymentId,
        expectedType: 'non-empty string'
      });
    }

    // Get API key from environment
    const apiKey = process.env.PI_API_KEY;
    
    console.log('🔑 API Key check:');
    console.log('  - Has API Key:', !!apiKey);
    console.log('  - Key Length:', apiKey?.length || 0);
    console.log('  - Key Preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'MISSING');
    
    if (!apiKey) {
      console.error('❌ PI_API_KEY environment variable not set!');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'PI_API_KEY environment variable is not configured',
        hint: 'Set PI_API_KEY in your hosting platform environment variables'
      });
    }

    console.log('📞 Calling Pi API...');
    console.log('  - Payment ID:', paymentId);
    console.log('  - URL: https://api.minepi.com/v2/payments/' + paymentId + '/approve');

    // Build URL
// ✅ CORRECT URL - NO extra spaces  
const url = `https://api.minepi.com/v2/payments/${paymentId}/complete`;    
    // Make request to Pi API
    const piResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📥 Pi API Response:');
    console.log('  - Status:', piResponse.status);
    console.log('  - Status Text:', piResponse.statusText);
    console.log('  - OK:', piResponse.ok);

    // Handle response
    if (piResponse.ok) {
      const result = await piResponse.json();
      console.log('✅ SUCCESS! Payment approved');
      console.log('  - Result:', JSON.stringify(result, null, 2));
      
      return res.status(200).json({ 
        status: 'approved',
        paymentId,
        data: result,
        timestamp: new Date().toISOString()
      });
    } else {
      // Get error details
      const errorText = await piResponse.text();
      console.error('❌ Pi API Error Response:');
      console.error('  - Status Code:', piResponse.status);
      console.error('  - Error Text:', errorText);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
        console.error('  - Parsed Error:', JSON.stringify(errorDetails, null, 2));
      } catch {
        errorDetails = errorText;
      }
      
      return res.status(piResponse.status).json({ 
        error: 'Payment approval failed',
        statusCode: piResponse.status,
        details: errorDetails,
        paymentId,
        hint: 'Check Pi Developer Portal for payment status'
      });
    }
    
  } catch (error) {
    console.error('💥 EXCEPTION in approve endpoint:');
    console.error('  - Error Name:', error.name);
    console.error('  - Error Message:', error.message);
    console.error('  - Stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      name: error.name,
      timestamp: new Date().toISOString()
    });
  }
}