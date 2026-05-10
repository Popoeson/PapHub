/**
 * Admin Login Page
 * Handles form submission, validation feedback, and token storage.
 */

(async () => {
  // If already authenticated, go straight to dashboard
  if (getAccessToken()) {
    window.location.href = '/admin/dashboard.html';
    return;
  }

  // Try silent refresh — if refresh token cookie is valid, skip login
  const silentOk = await Auth.refresh();
  if (silentOk) {
    window.location.href = '/admin/dashboard.html';
    return;
  }
})();

// ─── DOM refs ──────────────────────────────────────────────────────────────
const form        = document.getElementById('loginForm');
const emailInput  = document.getElementById('email');
const passInput   = document.getElementById('password');
const emailErr    = document.getElementById('emailError');
const passErr     = document.getElementById('passwordError');
const loginBtn    = document.getElementById('loginBtn');
const btnText     = loginBtn.querySelector('.btn-text');
const btnLoader   = loginBtn.querySelector('.btn-loader');
const toggleBtn   = document.getElementById('togglePassword');
const eyeIcon     = document.getElementById('eyeIcon');

// ─── Password visibility toggle ────────────────────────────────────────────
toggleBtn.addEventListener('click', () => {
  const isPassword = passInput.type === 'password';
  passInput.type = isPassword ? 'text' : 'password';
  eyeIcon.className = isPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
});

// ─── Inline validation ─────────────────────────────────────────────────────
function clearErrors() {
  emailErr.textContent = '';
  passErr.textContent  = '';
  emailInput.style.borderColor = '';
  passInput.style.borderColor  = '';
}

function showFieldError(input, errorEl, message) {
  errorEl.textContent = message;
  input.style.borderColor = 'var(--accent-red)';
}

function validateForm() {
  let valid = true;
  clearErrors();

  const email = emailInput.value.trim();
  const pass  = passInput.value;

  if (!email) {
    showFieldError(emailInput, emailErr, 'Email is required.');
    valid = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showFieldError(emailInput, emailErr, 'Enter a valid email address.');
    valid = false;
  }

  if (!pass) {
    showFieldError(passInput, passErr, 'Password is required.');
    valid = false;
  }

  return valid;
}

// ─── Button loading state ──────────────────────────────────────────────────
function setLoading(state) {
  loginBtn.disabled = state;
  btnText.classList.toggle('hidden', state);
  btnLoader.classList.toggle('hidden', !state);
}

// ─── Form submit ───────────────────────────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!validateForm()) return;

  const email    = emailInput.value.trim();
  const password = passInput.value;

  setLoading(true);

  try {
    const res = await Auth.login(email, password);

    if (!res) {
      showToast('Unable to reach server. Check your connection.', 'error');
      return;
    }

    const data = await res.json();

    if (res.ok) {
      setAccessToken(data.accessToken);
      showToast('Login successful. Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/admin/dashboard.html';
      }, 1000);
    } else if (res.status === 429) {
      showToast(data.message, 'error');
    } else {
      showToast(data.message || 'Invalid credentials.', 'error');
    }
  } catch (err) {
    console.error('Login error:', err);
    showToast('Something went wrong. Please try again.', 'error');
  } finally {
    setLoading(false);
  }
});

// Clear field error on input
emailInput.addEventListener('input', () => {
  emailErr.textContent = '';
  emailInput.style.borderColor = '';
});

passInput.addEventListener('input', () => {
  passErr.textContent = '';
  passInput.style.borderColor = '';
});
