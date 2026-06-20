const router = require('express').Router();
const Review = require('../models/Review');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');

// Get reviews for a product
router.get('/:productId', async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId }).sort('-createdAt');
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : 0;
  res.json({ reviews, avg, count: reviews.length });
});

// Add review (must be logged in)
router.post('/:productId', protect, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const existing = await Review.findOne({ product: req.params.productId, user: req.user._id });
    if (existing) return res.status(400).json({ message: 'You already reviewed this product' });
    const review = await Review.create({
      product: req.params.productId,
      user: req.user._id,
      userName: req.user.name,
      rating, comment
    });
    // Update product avg rating
    const all = await Review.find({ product: req.params.productId });
    const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
    await Product.findByIdAndUpdate(req.params.productId, { avgRating: avg.toFixed(1), reviewCount: all.length });
    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete review (admin or own)
router.delete('/:id', protect, async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found' });
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Not allowed' });
  await review.deleteOne();
  res.json({ message: 'Review deleted' });
});

module.exports = router;
