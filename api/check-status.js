import { getPaymentStatus } from './paymob/webhook.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { paymobOrderId } = req.body;
    const status = getPaymentStatus(paymobOrderId);
    
    if (!status) {
      return res.status(404).json({ status: 'pending' });
    }

    return res.status(200).json(status);

  } catch (error) {
    return res.status(500).json({ error: 'Failed to check status' });
  }
}