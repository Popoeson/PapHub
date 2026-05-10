/**
 * Toast notification system
 * Usage: showToast('Message here', 'success' | 'error' | 'info')
 */

const TOAST_ICONS = {
  success: 'fa-circle-check',
  error: 'fa-circle-xmark',
  info: 'fa-circle-info',
};

function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  toast.innerHTML = `
    <i class="fa-solid ${TOAST_ICONS[type]} toast-icon"></i>
    <span class="toast-message">${message}</span>
    <div class="toast-progress"></div>
  `;

  container.appendChild(toast);

  // Auto remove
  const removeTimer = setTimeout(() => removeToast(toast), duration);

  // Click to dismiss
  toast.addEventListener('click', () => {
    clearTimeout(removeTimer);
    removeToast(toast);
  });
}

function removeToast(toast) {
  toast.style.animation = 'toastOut 0.3s ease forwards';
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

window.showToast = showToast;
