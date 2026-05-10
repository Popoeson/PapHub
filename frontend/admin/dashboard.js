/**
 * Admin Dashboard
 * Loads whatever stats are available now.
 * Full stats endpoint wired in Slice 8 when orders exist.
 */

(async () => {
  const ok = await requireAuth();
  if (!ok) return;

  initLogout();
  initMobileMenu();
  loadAvailableStats();
})();

// ─── Load stats ────────────────────────────────────────────────────────────
// Products count is available now. Orders stats come in Slice 8.
async function loadAvailableStats() {
  try {
    const res = await request('/admin/products?limit=1');
    if (res && res.ok) {
      const data = await res.json();
      document.getElementById('statProducts').textContent =
        data.pagination?.total ?? '—';
    }
  } catch (err) {
    console.error('Stats error:', err);
  }

  // Orders stats — will return real values once Slice 8 dashboard endpoint exists
  // For now show zero placeholders so the page doesn't look broken
  document.getElementById('statOrders').textContent  = '0';
  document.getElementById('statRevenue').textContent = '₦0';
  document.getElementById('statPending').textContent = '0';
}

// ─── Logout ────────────────────────────────────────────────────────────────
function initLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await Auth.logout();
    window.location.href = '/admin/login.html';
  });
}

// ─── Mobile menu ───────────────────────────────────────────────────────────
function initMobileMenu() {
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}
