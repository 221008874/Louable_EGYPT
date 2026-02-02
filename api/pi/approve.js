import { PiNetwork } from 'pi-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    PiNetwork.init({ 
      version: "2.0", 
      sandbox: true, 
      apiKey: process.env.PI_API_KEY 
    });
    
    const { paymentId } = req.body;
    await PiNetwork.approvePayment(paymentId);
    res.json({ status: 'approved' });
  } catch (error) {
    console.error('Approve payment error:', error);
    res.status(500).json({ error: error.message });
  }
}