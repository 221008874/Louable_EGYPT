import pkg from 'pi-sdk'; // ✅ Default import
const { PiNetwork } = pkg; // ✅ Destructure from default export

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { amount, recipient, memo } = req.body

    if (!amount || !recipient) {
      return res.status(400).json({ error: 'Missing required fields: amount, recipient' })
    }

    // Initialize Pi SDK with your real credentials
    PiNetwork.init({
      version: "2.0",
      sandbox: true,
      apiKey: process.env.PI_API_KEY // We'll use API Key for Vercel
    })

    const payment = await PiNetwork.createPayment({
      amount: String(amount),
      memo: memo || 'Chocolate order test',
      recipient,
      meta: { purpose: 'ecommerce_test' }
    })

    res.json({ paymentId: payment.id, status: 'CREATED' })
  } catch (error) {
    console.error('Create payment error:', error)
    res.status(500).json({ error: error.message || 'Failed to create payment' })
  }
}