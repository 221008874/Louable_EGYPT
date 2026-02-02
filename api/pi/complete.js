// This handles post-payment completion
import pkg from 'pi-sdk'; // ✅ Default import
const { PiNetwork } = pkg; // ✅ Destructure from default export
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { paymentId, txid } = req.body;
    console.log("✅ Order completed successfully:", paymentId, txid);
    // Here you would update your database, send confirmation email, etc.
    res.json({ success: true, message: 'Order completed' });
  } catch (error) {
    console.error('Complete payment error:', error);
    res.status(500).json({ error: error.message });
  }
}