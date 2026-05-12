/**
 * Success Page
 *
 * Flow:
 * 1. Read ?reference= from URL (Paystack appends this on redirect)
 * 2. Poll backend for order confirmation (webhook may have a small delay)
 * 3. Render order summary, delivery details, WhatsApp button
 * 4. Clear cart on success
 * 5. Show exit modal if user tries to leave without sending WhatsApp
 */

const API_BASE = 'https://paphub-lav4.onrender.com/api';
const MAX_RETRIES = 8;
const RETRY_INTERVAL_MS = 3000;

let retryCount = 0;
let retryTimer = null;
let whatsappSent = false;
let exitModalActive = false;

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
  initExitModal();
});

// ─── Poll for order ────────────────────────────────────────────────────────
async function fetchOrder(reference) {
  try {
    const res = await fetch(`${API_BASE}/webhook/order/${reference}`);

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

    if (retryTimer) clearTimeout(retryTimer);

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

  if (retryCount === 1) showState('retryState');

  const progress = (retryCount / MAX_RETRIES) * 100;
  const bar = document.getElementById('retryBar');
  if (bar) bar.style.width = `${progress}%`;

  const countEl = document.getElementById('retryCount');
  if (countEl) countEl.textContent = `Checking... (${retryCount}/${MAX_RETRIES})`;

  retryTimer = setTimeout(() => fetchOrder(reference), RETRY_INTERVAL_MS);
}

// ─── Render success ────────────────────────────────────────────────────────
function renderSuccess(order, whatsappUrl) {
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

  // WhatsApp button — mark as sent when clicked
  const waBtn = document.getElementById('whatsappBtn');
  waBtn.href = whatsappUrl;
  waBtn.addEventListener('click', () => {
    whatsappSent = true;
    // Update button to reflect sent state
    setTimeout(() => {
      waBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Sent to WhatsApp';
      waBtn.style.background = 'var(--accent-green)';
      waBtn.style.boxShadow = '0 4px 16px rgba(61,140,95,0.35)';
    }, 500);
  });

  showState('successState');
}

// ─── Exit modal ────────────────────────────────────────────────────────────
function initExitModal() {
  const modal        = document.getElementById('exitModal');
  const sendBtn      = document.getElementById('exitSendWhatsApp');
  const leaveBtn     = document.getElementById('exitLeave');
  const closeBtn     = document.getElementById('exitModalClose');

  // Intercept back button / navigation
  // Push a state so we can catch the popstate
  history.pushState({ successPage: true }, '');

  window.addEventListener('popstate', (e) => {
    if (whatsappSent) return; // already sent — let them leave freely

    // Re-push state to prevent actual navigation
    history.pushState({ successPage: true }, '');
    showExitModal();
  });

  // Intercept anchor navigation (back to store button, etc.)
  document.addEventListener('click', (e) => {
    const anchor = e.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    // Ignore WhatsApp link and external links
    if (!href || href.startsWith('http') || href.startsWith('https') || href === '#') return;

    if (!whatsappSent) {
      e.preventDefault();
      // Store intended destination
      modal.dataset.destination = anchor.href;
      showExitModal();
    }
  });

  // Modal actions
  sendBtn.addEventListener('click', () => {
    hideExitModal();
    // Trigger WhatsApp button
    document.getElementById('whatsappBtn').click();
  });

  leaveBtn.addEventListener('click', () => {
    whatsappSent = true; // treat as acknowledged
    hideExitModal();
    const dest = modal.dataset.destination;
    if (dest) {
      window.location.href = dest;
    } else {
      history.back();
    }
  });

  closeBtn.addEventListener('click', hideExitModal);

  // Click outside modal to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideExitModal();
  });
}

function showExitModal() {
  if (exitModalActive) return;
  exitModalActive = true;
  document.getElementById('exitModal').classList.remove('hidden');
}

function hideExitModal() {
  exitModalActive = false;
  document.getElementById('exitModal').classList.add('hidden');
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
