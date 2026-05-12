/* review.js */
const API = 'https://paphub-lav4.onrender.com';

// ── Star rating ───────────────────────────────────────────────────────────────
let selectedRating = 0;
const stars = document.querySelectorAll('#star-row i');

function renderStars(val) {
  stars.forEach(s => {
    const v = parseInt(s.dataset.val);
    s.className = v <= val ? 'fa-solid fa-star active' : 'fa-regular fa-star';
  });
}

stars.forEach(star => {
  star.addEventListener('mouseover', () => renderStars(parseInt(star.dataset.val)));
  star.addEventListener('mouseleave', () => renderStars(selectedRating));
  star.addEventListener('click', () => {
    selectedRating = parseInt(star.dataset.val);
    renderStars(selectedRating);
    hide('err-rating');
  });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const show = id => $(id).classList.add('visible');
const hide = id => $(id).classList.remove('visible');

function setError(fieldId, msg) {
  const el = $('err-' + fieldId);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
}
function clearErrors() {
  document.querySelectorAll('.field-error, .rating-error').forEach(e => {
    e.textContent = '';
    e.classList.remove('visible');
  });
}

function setLoading(loading) {
  const btn  = $('submit-btn');
  const text = $('submit-text');
  btn.disabled = loading;
  text.textContent = loading ? 'Submitting…' : 'Submit Review';
  btn.querySelector('i').className = loading
    ? 'fa-solid fa-spinner fa-spin'
    : 'fa-solid fa-paper-plane';
}

// ── Pre-fill order ID from URL param ─────────────────────────────────────────
const params = new URLSearchParams(window.location.search);
if (params.get('orderID')) $('orderID').value = params.get('orderID');
if (params.get('email'))   $('email').value   = params.get('email');

// ── Form submit ───────────────────────────────────────────────────────────────
$('review-form').addEventListener('submit', async e => {
  e.preventDefault();
  clearErrors();

  const orderID = $('orderID').value.trim();
  const email   = $('email').value.trim();
  const name    = $('name').value.trim();
  const comment = $('comment').value.trim();

  let valid = true;

  if (!orderID) { setError('orderID', 'Order ID is required.'); valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setError('email', 'Please enter a valid email.'); valid = false;
  }
  if (!name) { setError('name', 'Display name is required.'); valid = false; }
  if (!selectedRating) { show('err-rating'); valid = false; }
  if (!comment) { setError('comment', 'Please write a short review.'); valid = false; }

  if (!valid) return;

  setLoading(true);
  try {
    const res  = await fetch(`${API}/api/reviews/submit`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orderID, email, name, rating: selectedRating, comment }),
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || 'Submission failed.', 'error');
      return;
    }

    // Show success state
    $('form-state').style.display  = 'none';
    $('success-state').style.display = 'block';

  } catch {
    showToast('Network error. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});
