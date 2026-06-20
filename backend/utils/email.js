const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendOrderConfirmation = async (to, order) => {
  if (!process.env.EMAIL_USER) return;
  const items = order.items.map(i =>
    `<tr><td>${i.name}</td><td>${i.qty}</td><td>$${i.price.toFixed(2)}</td></tr>`
  ).join('');
  await transporter.sendMail({
    from: `"ShopEase" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Order Confirmed #${order._id.toString().slice(-6).toUpperCase()}`,
    html: `
      <h2>Thank you for your order! 🎉</h2>
      <p>Order ID: <strong>#${order._id.toString().slice(-6).toUpperCase()}</strong></p>
      <table border="1" cellpadding="8" style="border-collapse:collapse">
        <tr><th>Product</th><th>Qty</th><th>Price</th></tr>
        ${items}
      </table>
      <h3>Total: $${order.total.toFixed(2)}</h3>
      <p>We'll notify you when your order ships!</p>
    `
  });
};

exports.sendStatusUpdate = async (to, order) => {
  if (!process.env.EMAIL_USER) return;
  await transporter.sendMail({
    from: `"ShopEase" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Order #${order._id.toString().slice(-6).toUpperCase()} - Status: ${order.status}`,
    html: `
      <h2>Order Status Updated</h2>
      <p>Your order <strong>#${order._id.toString().slice(-6).toUpperCase()}</strong>
      is now <strong>${order.status}</strong>.</p>
      <p>Total: $${order.total.toFixed(2)}</p>
    `
  });
};
