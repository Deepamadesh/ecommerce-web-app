const router = require('express').Router();
const { protect } = require('../middleware/auth');

// Simulate payment processing (replace with real Stripe in production)
router.post('/process', protect, async (req, res) => {
  const { cardNumber, expiry, cvv, amount } = req.body;

  // Basic validation
  if (!cardNumber || !expiry || !cvv)
    return res.status(400).json({ message: 'Card details required' });
  if (cardNumber.replace(/\s/g, '').length !== 16)
    return res.status(400).json({ message: 'Invalid card number' });
  if (!/^\d{2}\/\d{2}$/.test(expiry))
    return res.status(400).json({ message: 'Invalid expiry format (MM/YY)' });

  // Simulate decline for test card 4000000000000002
  if (cardNumber.replace(/\s/g, '') === '4000000000000002')
    return res.status(402).json({ message: 'Card declined' });

  // Simulate processing delay
  await new Promise(r => setTimeout(r, 800));

  res.json({
    success: true,
    transactionId: 'TXN-' + Date.now(),
    amount,
    message: 'Payment successful'
  });
});

module.exports = router;
