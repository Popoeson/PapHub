/**
 * Admin Dashboard
 * Wires up real stats and recent orders from /api/admin/orders/stats
 */

(async () => {
  const ok = await requireAuth();
  if (!ok) return;

  initLogout();
  initMobileMenu();
  loadDashboardStats();
})();

// ─── Load stats ────────────────────────────────────────────────────────────
async function loadDashboardStats() {
  try {
    const [statsRes, productsRes] = await Promise.all([
      request('/admin/orders/stats'),
      request('/admin/products?limit=1'),
    ]);

    // Products count
    if (productsRes && productsRes.ok) {
      const productsData = await productsRes.json();
      document.getElementById('statProducts').textContent =
        productsData.pagination?.total ?? '—';
    }

    // Orders stats
    if (statsRes && statsRes.ok) {
      const { stats, recentOrders } = await statsRes.json();

      document.getElementById('statOrders').textContent =
        stats.totalOrders ?? 0;

      document.getElementById('statRevenue').textContent =
        `₦${formatPrice(stats.totalRevenue ?? 0)}`;

      document.getElementById('statPending').textContent =
        stats.pendingOrders ?? 0;

      renderRecentOrders(recentOrders || []);
    }
  } catch (err) {
    console.error('Dashboard stats error:', err);
  }
}

// ─── Recent orders table ───────────────────────────────────────────────────
function renderRecentOrders(orders) {
  const tbody = document.getElementById('recentOrdersBody');

  if (!orders.length) {
    tbody.innerHTML = `<tr>
      <td colspan="5" class="table-empty">No orders yet.</td>
    </tr>`;
    return;
  }

  tbody.innerHTML = orders.map((order) => `
    <tr>
      <td>
        <a href="orders.html" class="order-id-link">${escapeHtml(order.orderID)}</a>
      </td>
      <td>${escapeHtml(order.customerName)}</td>
      <td>₦${formatPrice(order.totalAmount)}</td>
      <td>
        <span class="badge ${order.status === 'delivered' ? 'badge-green' : 'badge-pending'}">
          <i class="fa-solid ${order.status === 'delivered' ? 'fa-circle-check' : 'fa-clock'}"></i>
          ${order.status === 'delivered' ? 'Delivered' : 'Pending'}
        </span>
      </td>
      <td>${formatDate(order.createdAt)}</td>
    </tr>
  `).join('');
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

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatPrice(n) {
  return Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
