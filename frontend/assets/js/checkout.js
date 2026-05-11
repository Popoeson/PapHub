/**
 * Checkout Page
 * Renders order summary from cart.
 * Submits delivery details + cart item IDs to backend.
 * Backend validates prices and initializes Paystack.
 * Redirects to Paystack hosted payment page.
 */

const API_BASE = 'https://paphub-lav4.onrender.com/api';

// ─── Guard: redirect if cart is empty ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Cart.init();

  const items = Cart.getItems();
  if (!items.length) {
    showToast('Your cart is empty.', 'error');
    setTimeout(() => { window.location.href = '/'; }, 1500);
    return;
  }

  renderOrderSummary(items);
  initForm();
});

// ─── Order summary ─────────────────────────────────────────────────────────
function renderOrderSummary(items) {
  const container = document.getElementById('summaryItems');
  const subtotalEl = document.getElementById('summarySubtotal');
  const totalEl = document.getElementById('summaryTotal');

  container.innerHTML = items.map((item) => `
    <div class="summary-item">
      ${item.image
        ? `<img src="${item.image}" class="summary-item-img" alt="${escapeHtml(item.name)}" loading="lazy" />`
        : `<div class="summary-item-placeholder"><i class="fa-solid fa-bowl-food"></i></div>`}
      <div class="summary-item-info">
        <p class="summary-item-name">${escapeHtml(item.name)}</p>
        <p class="summary-item-meta">Qty: ${item.quantity} &times; ₦${formatPrice(item.price)}</p>
      </div>
      <span class="summary-item-price">₦${formatPrice(item.price * item.quantity)}</span>
    </div>
  `).join('');

  const total = Cart.getTotal();
  subtotalEl.textContent = `₦${formatPrice(total)}`;
  totalEl.textContent = `₦${formatPrice(total)}`;
}

// ─── Form validation ───────────────────────────────────────────────────────
function validateForm() {
  let valid = true;
  clearErrors();

  const name    = document.getElementById('customerName').value.trim();
  const email   = document.getElementById('email').value.trim();
  const phone   = document.getElementById('phone').value.trim();
  const address = document.getElementById('address').value.trim();

  if (!name) {
    showError('nameError', 'Full name is required.');
    valid = false;
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('emailError', 'Enter a valid email address.');
    valid = false;
  }

  if (!phone || !/^[0-9+\s\-()]{7,20}$/.test(phone)) {
    showError('phoneError', 'Enter a valid phone number.');
    valid = false;
  }

  if (!address) {
    showError('addressError', 'Delivery address is required.');
    valid = false;
  }

  return valid;
}

function showError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

function clearErrors() {
  ['nameError', 'emailError', 'phoneError', 'addressError'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

// ─── Form submit ───────────────────────────────────────────────────────────
function initForm() {
  const form  = document.getElementById('checkoutForm');
  const btn   = document.getElementById('payBtn');
  const text  = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const items = Cart.getItems();
    if (!items.length) {
      showToast('Your cart is empty.', 'error');
      return;
    }

    // Set loading state
    btn.disabled = true;
    text.classList.add('hidden');
    loader.classList.remove('hidden');

    try {
      const payload = {
        customerName: document.getElementById('customerName').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        landmark: document.getElementById('landmark').value.trim(),
        // Only send productId and quantity — server fetches prices
        items: items.map((i) => ({
          productId: i._id,
          quantity: i.quantity,
        })),
      };

      const res = await fetch(`${API_BASE}/checkout/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.message || 'Failed to initialize payment.', 'error');
        return;
      }

      // Store reference so success page can verify
      sessionStorage.setItem('ph_ref', data.reference);

      // Redirect to Paystack hosted payment page
      window.location.href = data.authorizationUrl;
    } catch (err) {
      console.error('Checkout error:', err);
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      text.classList.remove('hidden');
      loader.classList.add('hidden');
    }
  });

  // Clear errors on input
  ['customerName', 'email', 'phone', 'address'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', () => {
      const errId = id === 'customerName' ? 'nameError' : `${id}Error`;
      showError(errId, '');
    });
  });
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
