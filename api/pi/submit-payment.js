import pkg from 'pi-sdk'; // ✅ Default import
const { PiNetwork } = pkg; // ✅ Destructure from default export

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { paymentId } = req.body

    if (!paymentId) {
      return res.status(400).json({ error: 'Missing paymentId' })
    }

    PiNetwork.init({
      version: "2.0",
      sandbox: true,
      apiKey: process.env.PI_API_KEY
    })

    const result = await PiNetwork.submitPayment(paymentId)
    res.json({ status: result.status, message: 'Payment submitted successfully' })
  } catch (error) {
    console.error('Submit payment error:', error)
    res.status(500).json({ error: error.message || 'Failed to submit payment' })
  }
}