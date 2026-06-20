const router = require('express').Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/auth');
const { sendOrderConfirmation, sendStatusUpdate } = require('../utils/email');

// Place order
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;
    let total = 0;
    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) return res.status(404).json({ message: `Product ${item.productId} not found` });
      if (product.stock < item.qty)
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      product.stock -= item.qty;
      await product.save();
      total += product.price * item.qty;
      orderItems.push({ product: product._id, name: product.name, price: product.price, qty: item.qty });
    }
    const order = await Order.create({ user: req.user._id, items: orderItems, total, shippingAddress });
    sendOrderConfirmation(req.user.email, order).catch(() => {});
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// My orders
router.get('/my', protect, async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort('-createdAt');
  res.json(orders);
});

// All orders (admin)
router.get('/', protect, admin, async (req, res) => {
  const orders = await Order.find().populate('user', 'name email').sort('-createdAt');
  res.json(orders);
});

// Update order status (admin)
router.put('/:id/status', protect, admin, async (req, res) => {
  const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).populate('user', 'email');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  sendStatusUpdate(order.user.email, order).catch(() => {});
  res.json(order);
});

// Get single order
router.get('/:id', protect, async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ message: 'Access denied' });
  res.json(order);
});

module.exports = router;
