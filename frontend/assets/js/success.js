/**
 * Success Page
 *
 * Flow:
 * 1. Read ?reference= from URL (Paystack appends this on redirect)
 * 2. Poll backend for order confirmation (webhook may have a small delay)
 * 3. Render order summary, delivery details, WhatsApp button
 * 4. Clear cart on success
 */

const API_BASE = 'https://paphub-lav4.onrender.com/api';
const MAX_RETRIES = 8;
const RETRY_INTERVAL_MS = 3000; // 3 seconds between polls

let retryCount = 0;
let retryTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  Cart.init();

  const params = new URLSearchParams(window.location.search);
  const reference = params.get('reference') || sessionStorage.getItem('ph_ref');

  if (!reference) {
    showErrorState('No payment reference found. If you completed payment, contact us.');
    return;
  }

  document.getElementById('errorRef').textContent = reference;
  fetchOrder(reference);
});

// ─── Poll for order ────────────────────────────────────────────────────────
async function fetchOrder(reference) {
  try {
    const res = await fetch(`${API_BASE}/webhook/order/${reference}`);

    // 202 = webhook not yet processed, retry
    if (res.status === 202) {
      handleRetry(reference);
      return;
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showErrorState(data.message || 'Could not retrieve your order.');
      return;
    }

    const { order, whatsappUrl } = await res.json();

    // Clear retry timer if running
    if (retryTimer) clearTimeout(retryTimer);

    // Clear cart — payment confirmed
    Cart.clear();
    sessionStorage.removeItem('ph_ref');

    renderSuccess(order, whatsappUrl);
  } catch (err) {
    console.error('fetchOrder error:', err);
    handleRetry(reference);
  }
}

// ─── Retry logic ───────────────────────────────────────────────────────────
function handleRetry(reference) {
  retryCount++;

  if (retryCount >= MAX_RETRIES) {
    showErrorState(
      'Your payment was received but order confirmation is taking longer than expected. ' +
      'Please contact us with your payment reference.'
    );
    return;
  }

  // Show retry UI on first attempt
  if (retryCount === 1) {
    showState('retryState');
  }

  // Animate progress bar
  const progress = (retryCount / MAX_RETRIES) * 100;
  const bar = document.getElementById('retryBar');
  if (bar) bar.style.width = `${progress}%`;

  const countEl = document.getElementById('retryCount');
  if (countEl) countEl.textContent = `Checking... (${retryCount}/${MAX_RETRIES})`;

  retryTimer = setTimeout(() => fetchOrder(reference), RETRY_INTERVAL_MS);
}

// ─── Render success ────────────────────────────────────────────────────────
function renderSuccess(order, whatsappUrl) {
  // Populate header
  document.getElementById('orderIdDisplay').textContent = order.orderID;
  document.getElementById('confirmEmail').textContent = order.email;

  // Items
  const itemsContainer = document.getElementById('orderItems');
  itemsContainer.innerHTML = order.items.map((item) => `
    <div class="order-item">
      <div>
        <p class="order-item-name">${escapeHtml(item.name)}</p>
        <p class="order-item-meta">Qty: ${item.quantity} &times; ₦${formatPrice(item.price)}</p>
      </div>
      <span class="order-item-price">₦${formatPrice(item.price * item.quantity)}</span>
    </div>
  `).join('');

  // Total
  document.getElementById('orderTotal').textContent = `₦${formatPrice(order.totalAmount)}`;

  // Delivery details
  const deliveryContainer = document.getElementById('deliveryDetails');
  deliveryContainer.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Name</span>
      <span class="detail-value">${escapeHtml(order.customerName)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Email</span>
      <span class="detail-value">${escapeHtml(order.email)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Phone</span>
      <span class="detail-value">${escapeHtml(order.phone)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Address</span>
      <span class="detail-value">${escapeHtml(order.address)}</span>
    </div>
    ${order.landmark ? `
    <div class="detail-row">
      <span class="detail-label">Landmark</span>
      <span class="detail-value">${escapeHtml(order.landmark)}</span>
    </div>` : ''}
    <div class="detail-row">
      <span class="detail-label">Status</span>
      <span class="detail-value" style="color:var(--accent-green);font-weight:600;">
        <i class="fa-solid fa-circle-check"></i> Payment Confirmed
      </span>
    </div>
  `;

  // WhatsApp button
  const waBtn = document.getElementById('whatsappBtn');
  waBtn.href = whatsappUrl;

  showState('successState');
}

// ─── State management ──────────────────────────────────────────────────────
function showState(stateId) {
  ['loadingState', 'retryState', 'successState', 'errorState'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', id !== stateId);
  });
}

function showErrorState(message) {
  const msgEl = document.getElementById('errorMessage');
  if (msgEl) msgEl.textContent = message;
  showState('errorState');
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatPrice(n) {
  return Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
