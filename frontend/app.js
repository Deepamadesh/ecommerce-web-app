const API = 'https://ecommerce-web-app-i0q1.onrender.com/api';
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let selectedRating = 0;
let currentReviewProductId = null;

// ── Navigation ──────────────────────────────────────────────
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${name}`).classList.add('active');
  if (name === 'catalog') loadProducts();
  if (name === 'cart') renderCart();
  if (name === 'orders') loadOrders();
  if (name === 'admin') loadAdminProducts();
  if (name === 'checkout') renderCheckoutSummary();
}

function updateNav() {
  const loggedIn = !!token;
  document.getElementById('auth-link').style.display = loggedIn ? 'none' : '';
  document.getElementById('logout-link').style.display = loggedIn ? '' : 'none';
  document.getElementById('orders-link').style.display = loggedIn ? '' : 'none';
  document.getElementById('admin-link').style.display = (currentUser?.role === 'admin') ? '' : 'none';
}

function logout() {
  token = null; currentUser = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  updateNav(); showPage('catalog');
}

// ── API Helper ───────────────────────────────────────────────
async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#333';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Auth ─────────────────────────────────────────────────────
function authMode(mode) {
  document.getElementById('login-form').style.display = mode === 'login' ? '' : 'none';
  document.getElementById('register-form').style.display = mode === 'register' ? '' : 'none';
  document.querySelectorAll('.auth-toggle .tab-btn').forEach((b, i) =>
    b.classList.toggle('active', (i === 0) === (mode === 'login')));
  document.getElementById('auth-msg').textContent = '';
}

async function login(e) {
  e.preventDefault();
  try {
    const data = await apiFetch('/auth/login', 'POST', {
      email: document.getElementById('l-email').value,
      password: document.getElementById('l-password').value
    });
    token = data.token; currentUser = data.user;
    localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(currentUser));
    updateNav(); showPage('catalog'); toast(`Welcome back, ${currentUser.name}!`, 'success');
  } catch (err) { document.getElementById('auth-msg').textContent = err.message; }
}

async function register(e) {
  e.preventDefault();
  try {
    const data = await apiFetch('/auth/register', 'POST', {
      name: document.getElementById('r-name').value,
      email: document.getElementById('r-email').value,
      password: document.getElementById('r-password').value,
      role: document.getElementById('r-role').value
    });
    token = data.token; currentUser = data.user;
    localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(currentUser));
    updateNav(); showPage('catalog'); toast(`Welcome, ${currentUser.name}!`, 'success');
  } catch (err) { document.getElementById('auth-msg').textContent = err.message; }
}

// ── Products ─────────────────────────────────────────────────
async function loadProducts() {
  const search = document.getElementById('search-input')?.value || '';
  const category = document.getElementById('category-filter')?.value || '';
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (category) query.set('category', category);
  try {
    const products = await apiFetch('/products?' + query);
    document.getElementById('product-grid').innerHTML = products.length
      ? products.map(productCard).join('')
      : '<p>No products found.</p>';
  } catch { toast('Failed to load products', 'error'); }
}

function starsHtml(rating) {
  const full = Math.round(rating);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

function productCard(p) {
  const inWish = wishlist.includes(p._id);
  return `<div class="card">
    <img src="${p.image || 'https://placehold.co/220x180?text=Product'}" alt="${p.name}"/>
    <div class="card-body">
      <h4>${p.name}</h4>
      <div class="price">$${p.price.toFixed(2)}</div>
      ${p.avgRating > 0 ? `<div class="stars" title="${p.avgRating}/5">${starsHtml(p.avgRating)} <small>(${p.reviewCount})</small></div>` : ''}
      <div class="stock">${p.stock > 0 ? `${p.stock} in stock` : '<span style="color:#e94560">Out of stock</span>'}</div>
      <div class="desc">${p.description || ''}</div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem">
        <button class="btn-primary" onclick="addToCart('${p._id}','${p.name}',${p.price},${p.stock})"
          ${p.stock < 1 ? 'disabled' : ''}>Add to Cart</button>
        <button class="btn-wish ${inWish ? 'active' : ''}" onclick="toggleWishlist('${p._id}',this)"
          title="Wishlist">♥</button>
        <button onclick="openReviews('${p._id}','${p.name.replace(/'/g, "\\'")}')">Reviews</button>
      </div>
    </div>
  </div>`;
}

// ── Wishlist ─────────────────────────────────────────────────
function toggleWishlist(id, btn) {
  const idx = wishlist.indexOf(id);
  if (idx === -1) { wishlist.push(id); btn.classList.add('active'); toast('Added to wishlist ♥'); }
  else { wishlist.splice(idx, 1); btn.classList.remove('active'); toast('Removed from wishlist'); }
  localStorage.setItem('wishlist', JSON.stringify(wishlist));
}

// ── Cart ─────────────────────────────────────────────────────
function addToCart(id, name, price, stock) {
  const existing = cart.find(i => i.productId === id);
  if (existing) {
    if (existing.qty >= stock) return toast('Max stock reached');
    existing.qty++;
  } else {
    cart.push({ productId: id, name, price, qty: 1 });
  }
  saveCart(); toast(`${name} added to cart`, 'success');
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  document.getElementById('cart-badge').textContent = cart.reduce((s, i) => s + i.qty, 0);
}

function renderCart() {
  const el = document.getElementById('cart-items');
  if (!cart.length) {
    el.innerHTML = '<p>Your cart is empty.</p>';
    document.getElementById('cart-summary').innerHTML = '';
    return;
  }
  el.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="item-info"><strong>${item.name}</strong><br/>$${item.price.toFixed(2)} each</div>
      <div class="item-controls">
        <button onclick="changeQty(${idx},-1)">−</button>
        <span>${item.qty}</span>
        <button onclick="changeQty(${idx},1)">+</button>
        <button onclick="removeItem(${idx})" style="color:#e94560">✕</button>
      </div>
      <strong>$${(item.price * item.qty).toFixed(2)}</strong>
    </div>`).join('');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('cart-summary').innerHTML = `
    <div class="total">Total: $${total.toFixed(2)}</div>
    <button class="btn-primary" onclick="proceedToCheckout()">Proceed to Checkout</button>`;
}

function changeQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty < 1) cart.splice(idx, 1);
  saveCart(); renderCart();
}
function removeItem(idx) { cart.splice(idx, 1); saveCart(); renderCart(); }

function proceedToCheckout() {
  if (!token) { toast('Please login to checkout'); showPage('auth'); return; }
  showPage('checkout');
}

// ── Checkout Summary ─────────────────────────────────────────
function renderCheckoutSummary() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('checkout-summary').innerHTML = `
    ${cart.map(i => `<div class="s-item"><span>${i.name} x${i.qty}</span><span>$${(i.price*i.qty).toFixed(2)}</span></div>`).join('')}
    <div class="s-total"><span>Total</span><span>$${total.toFixed(2)}</span></div>`;
}

// ── Card Formatting ───────────────────────────────────────────
function formatCard(el) {
  let v = el.value.replace(/\D/g, '').substring(0, 16);
  el.value = v.replace(/(.{4})/g, '$1 ').trim();
}
function formatExpiry(el) {
  let v = el.value.replace(/\D/g, '').substring(0, 4);
  if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
  el.value = v;
}

// ── Payment + Place Order ─────────────────────────────────────
async function processPayment(e) {
  e.preventDefault();
  if (!cart.length) return toast('Cart is empty', 'error');
  const form = e.target;
  const btn = document.getElementById('pay-btn');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  btn.textContent = 'Processing...'; btn.disabled = true;
  try {
    // Step 1: process payment
    await apiFetch('/payment/process', 'POST', {
      cardNumber: document.getElementById('card-number').value,
      expiry: document.getElementById('card-expiry').value,
      cvv: document.getElementById('card-cvv').value,
      amount: total
    });
    // Step 2: place order
    await apiFetch('/orders', 'POST', {
      items: cart,
      shippingAddress: {
        street: form.street.value, city: form.city.value,
        state: form.state.value, zip: form.zip.value
      }
    });
    cart = []; saveCart(); form.reset();
    toast('Payment successful! Order placed 🎉', 'success');
    showPage('orders');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.textContent = 'Pay Now'; btn.disabled = false;
  }
}

// ── Orders ───────────────────────────────────────────────────
async function loadOrders() {
  try {
    const orders = await apiFetch('/orders/my');
    document.getElementById('orders-list').innerHTML = orders.length
      ? orders.map(orderCard).join('') : '<p>No orders yet.</p>';
  } catch { toast('Failed to load orders', 'error'); }
}

function orderCard(o) {
  const items = o.items.map(i => `${i.name} x${i.qty}`).join(', ');
  return `<div class="order-card">
    <div class="order-header">
      <span><strong>Order #${o._id.slice(-6).toUpperCase()}</strong><br/>
      <small>${new Date(o.createdAt).toLocaleDateString()}</small></span>
      <span class="status-badge status-${o.status}">${o.status}</span>
    </div>
    <div>${items}</div>
    <div style="margin-top:0.5rem;font-weight:700;">Total: $${o.total.toFixed(2)}</div>
    <div style="margin-top:0.5rem;font-size:0.85rem;color:#888">
      📦 ${o.shippingAddress?.street || ''}, ${o.shippingAddress?.city || ''}
    </div>
  </div>`;
}

// ── Reviews ───────────────────────────────────────────────────
async function openReviews(productId, productName) {
  currentReviewProductId = productId;
  selectedRating = 0;
  document.getElementById('modal-product-name').textContent = productName;
  document.getElementById('review-comment').value = '';
  updateStarUI(0);
  document.getElementById('review-modal').style.display = 'flex';
  document.getElementById('review-form-wrap').style.display = token ? '' : 'none';
  await loadReviews(productId);
}

function closeReviewModal(e) {
  if (e.target.id === 'review-modal')
    document.getElementById('review-modal').style.display = 'none';
}

async function loadReviews(productId) {
  try {
    const { reviews, avg, count } = await apiFetch(`/reviews/${productId}`);
    document.getElementById('modal-avg-rating').innerHTML =
      count > 0 ? `${starsHtml(avg)} <strong>${avg}</strong>/5 (${count} reviews)` : 'No reviews yet';
    document.getElementById('reviews-list').innerHTML = reviews.length
      ? reviews.map(r => `
        <div class="review-item">
          <div class="r-header">
            <span class="r-name">${r.userName} <span class="stars">${starsHtml(r.rating)}</span></span>
            <span class="r-date">${new Date(r.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="r-comment">${r.comment}</div>
        </div>`).join('')
      : '<p style="color:#aaa;font-size:0.9rem">No reviews yet. Be the first!</p>';
  } catch { toast('Failed to load reviews', 'error'); }
}

function setRating(val) {
  selectedRating = val;
  updateStarUI(val);
}

function updateStarUI(val) {
  document.querySelectorAll('#star-selector span').forEach((s, i) =>
    s.classList.toggle('active', i < val));
}

async function submitReview() {
  if (!selectedRating) return toast('Please select a star rating', 'error');
  const comment = document.getElementById('review-comment').value.trim();
  if (!comment) return toast('Please write a comment', 'error');
  try {
    await apiFetch(`/reviews/${currentReviewProductId}`, 'POST', { rating: selectedRating, comment });
    toast('Review submitted!', 'success');
    document.getElementById('review-comment').value = '';
    selectedRating = 0; updateStarUI(0);
    await loadReviews(currentReviewProductId);
    loadProducts();
  } catch (err) { toast(err.message, 'error'); }
}

// ── Admin ────────────────────────────────────────────────────
function adminTab(tab) {
  document.getElementById('admin-products').style.display = tab === 'products' ? '' : 'none';
  document.getElementById('admin-orders').style.display = tab === 'orders' ? '' : 'none';
  document.querySelectorAll('.admin-tabs .tab-btn').forEach((b, i) =>
    b.classList.toggle('active', (i === 0) === (tab === 'products')));
  if (tab === 'orders') loadAdminOrders();
}

async function loadAdminProducts() {
  try {
    const products = await apiFetch('/products');
    document.getElementById('admin-product-list').innerHTML = products.map(p => `
      <div class="card">
        <img src="${p.image || 'https://placehold.co/220x180?text=Product'}" alt="${p.name}"/>
        <div class="card-body">
          <h4>${p.name}</h4>
          <div class="price">$${p.price.toFixed(2)}</div>
          <div class="stock">Stock: ${p.stock}</div>
          ${p.avgRating > 0 ? `<div class="stars">${starsHtml(p.avgRating)} (${p.reviewCount})</div>` : ''}
          <div class="admin-actions">
            <button onclick="editProduct(${JSON.stringify(p).replace(/"/g, '&quot;')})">Edit</button>
            <button onclick="deleteProduct('${p._id}')" style="color:#e94560">Delete</button>
          </div>
        </div>
      </div>`).join('');
  } catch { toast('Failed to load products', 'error'); }
}

function editProduct(p) {
  document.getElementById('edit-id').value = p._id;
  document.getElementById('p-name').value = p.name;
  document.getElementById('p-price').value = p.price;
  document.getElementById('p-stock').value = p.stock;
  document.getElementById('p-category').value = p.category || '';
  document.getElementById('p-image').value = p.image || '';
  document.getElementById('p-desc').value = p.description || '';
  window.scrollTo(0, 0);
}

function resetProductForm() {
  document.getElementById('edit-id').value = '';
  document.getElementById('product-form').reset();
}

async function saveProduct(e) {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const body = {
    name: document.getElementById('p-name').value,
    price: parseFloat(document.getElementById('p-price').value),
    stock: parseInt(document.getElementById('p-stock').value),
    category: document.getElementById('p-category').value,
    image: document.getElementById('p-image').value,
    description: document.getElementById('p-desc').value
  };
  try {
    await apiFetch(id ? `/products/${id}` : '/products', id ? 'PUT' : 'POST', body);
    toast(id ? 'Product updated!' : 'Product created!', 'success');
    resetProductForm(); loadAdminProducts();
  } catch (err) { toast(err.message, 'error'); }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  try { await apiFetch(`/products/${id}`, 'DELETE'); toast('Deleted'); loadAdminProducts(); }
  catch (err) { toast(err.message, 'error'); }
}

async function loadAdminOrders() {
  try {
    const orders = await apiFetch('/orders');
    document.getElementById('admin-orders-list').innerHTML = orders.map(o => `
      <div class="order-card">
        <div class="order-header">
          <span><strong>#${o._id.slice(-6).toUpperCase()}</strong> — ${o.user?.name} (${o.user?.email})<br/>
          <small>${new Date(o.createdAt).toLocaleDateString()}</small></span>
          <span class="status-badge status-${o.status}">${o.status}</span>
        </div>
        <div>${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}</div>
        <div style="margin-top:0.5rem"><strong>$${o.total.toFixed(2)}</strong></div>
        <select onchange="updateOrderStatus('${o._id}', this.value)" style="margin-top:0.5rem;width:auto">
          ${['pending','processing','shipped','delivered','cancelled'].map(s =>
            `<option value="${s}" ${s===o.status?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>`).join('');
  } catch { toast('Failed to load orders', 'error'); }
}

async function updateOrderStatus(id, status) {
  try { await apiFetch(`/orders/${id}/status`, 'PUT', { status }); toast('Status updated', 'success'); }
  catch (err) { toast(err.message, 'error'); }
}

// ── Init ─────────────────────────────────────────────────────
updateNav();
saveCart();
loadProducts();
