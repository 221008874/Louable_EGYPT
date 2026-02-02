// api/pi/approve.js
import pkg from 'pi-sdk'; // ✅ Default import
const { PiNetwork } = pkg; // ✅ Destructure from default export

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.PI_API_KEY) {
    console.error('❌ PI_API_KEY is missing');
    return res.status(500).json({ error: 'Server config error: Missing PI_API_KEY' });
  }

  try {
    PiNetwork.init({
      version: "2.0",
      sandbox: true,
      apiKey: process.env.PI_API_KEY
    });

    const { paymentId } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: 'Missing paymentId' });
    }

    await PiNetwork.approvePayment(paymentId);
    res.json({ status: 'approved' });

  } catch (error) {
    console.error('🔥 Approve failed:', error.message || error);
    res.status(500).json({ 
      error: error.message || 'Failed to approve payment',
      paymentId: req.body?.paymentId
    });
  }
}