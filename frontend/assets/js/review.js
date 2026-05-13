/**
 * Review Page
 * Step 1: Verify order ID + email
 * Step 2: Star rating + review text
 * Step 3: Success confirmation
 */

const API_BASE = 'https://paphub-lav4.onrender.com/api';

let selectedRating = 0;
let verifiedOrderID = '';
let verifiedEmail = '';

document.addEventListener('DOMContentLoaded', () => {
  initVerifyForm();
  initStarRating();
  initReviewForm();
});

// ─── Step 1: Verify order ──────────────────────────────────────────────────
function initVerifyForm() {
  const form = document.getElementById('verifyForm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const orderID = document.getElementById('orderID').value.trim();
    const email   = document.getElementById('verifyEmail').value.trim();

    let valid = true;

    if (!orderID) {
      showError('orderIDError', 'Order ID is required.');
      valid = false;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showError('verifyEmailError', 'Enter a valid email address.');
      valid = false;
    }

    if (!valid) return;

    const btn = document.getElementById('verifyBtn');
    setLoading(btn, true);

    try {
      // We verify by attempting to submit with a placeholder — 
      // actually we use a lightweight verify by checking the order endpoint
      // We just store values and let the submit endpoint do the real validation
      verifiedOrderID = orderID.toUpperCase();
      verifiedEmail   = email.toLowerCase();

      document.getElementById('confirmedOrderID').textContent = verifiedOrderID;
      showStep('reviewStep');
    } finally {
      setLoading(btn, false);
    }
  });

  document.getElementById('backToVerify').addEventListener('click', () => {
    showStep('verifyStep');
    resetReviewForm();
  });
}

// ─── Star rating ───────────────────────────────────────────────────────────
function initStarRating() {
  const stars = document.querySelectorAll('.star');

  stars.forEach((star) => {
    star.addEventListener('mouseenter', () => highlightStars(parseInt(star.dataset.value)));
    star.addEventListener('mouseleave', () => highlightStars(selectedRating));
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.value);
      highlightStars(selectedRating);
      document.getElementById('ratingError').textContent = '';
    });
  });
}

function highlightStars(value) {
  document.querySelectorAll('.star').forEach((star, i) => {
    const starVal = i + 1;
    const icon = star.querySelector('i');
    if (starVal <= value) {
      icon.className = 'fa-solid fa-star';
      star.classList.add('active');
    } else {
      icon.className = 'fa-regular fa-star';
      star.classList.remove('active');
    }
  });
}

// ─── Step 2: Submit review ─────────────────────────────────────────────────
function initReviewForm() {
  const textarea = document.getElementById('reviewText');
  const charCount = document.getElementById('charCount');

  textarea.addEventListener('input', () => {
    charCount.textContent = textarea.value.length;
    document.getElementById('reviewTextError').textContent = '';
  });

  document.getElementById('reviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const reviewText = document.getElementById('reviewText').value.trim();
    let valid = true;

    if (!selectedRating) {
      document.getElementById('ratingError').textContent = 'Please select a star rating.';
      valid = false;
    }

    if (!reviewText) {
      document.getElementById('reviewTextError').textContent = 'Please write your review.';
      valid = false;
    }

    if (!valid) return;

    const btn = document.getElementById('submitReviewBtn');
    setLoading(btn, true);

    try {
      const res = await fetch(`${API_BASE}/reviews/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderID: verifiedOrderID,
          email: verifiedEmail,
          reviewText,
          rating: selectedRating,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        showStep('successStep');
      } else {
        // If validation fails at submit, send user back to verify step with error
        if (res.status === 404 || res.status === 400 || res.status === 409) {
          showStep('verifyStep');
          showToast(data.message, 'error');
        } else {
          showToast(data.message || 'Something went wrong.', 'error');
        }
      }
    } catch (err) {
      console.error('submitReview error:', err);
      showToast('Unable to reach server. Please try again.', 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}

function resetReviewForm() {
  selectedRating = 0;
  highlightStars(0);
  document.getElementById('reviewText').value = '';
  document.getElementById('charCount').textContent = '0';
  clearErrors();
}

// ─── Step management ───────────────────────────────────────────────────────
function showStep(stepId) {
  ['verifyStep', 'reviewStep', 'successStep'].forEach((id) => {
    document.getElementById(id).classList.toggle('hidden', id !== stepId);
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function showError(id, message) {
  const el = document.getElementById(id);
  if (el) el.textContent = message;
}

function clearErrors() {
  ['orderIDError', 'verifyEmailError', 'ratingError', 'reviewTextError'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

function setLoading(btn, state) {
  btn.disabled = state;
  btn.querySelector('.btn-text')?.classList.toggle('hidden', state);
  btn.querySelector('.btn-loader')?.classList.toggle('hidden', !state);
}
