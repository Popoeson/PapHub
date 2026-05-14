/**
 * Admin Orders Page
 */

let currentPage = 1;
let selectedIds = new Set();
let viewingOrderId = null;
let deletingOrderId = null;
let searchTimer = null;

// ─── Auth guard ────────────────────────────────────────────────────────────
(async () => {
  const ok = await requireAuth();
  if (!ok) return;
  applyRoleUI();
  loadOrders();
  initFilters();
  initBulkDelete();
  initSingleDelete();
  initOrderModal();
  initLogout();
  initMobileMenu();
})();

// ─── Load orders ───────────────────────────────────────────────────────────
async function loadOrders(page = 1) {
  currentPage = page;
  selectedIds.clear();
  updateBulkDeleteBtn();

  const tbody      = document.getElementById('ordersBody');
  const countEl    = document.getElementById('orderCount');
  const status     = document.getElementById('statusFilter').value;
  const search     = document.getElementById('searchInput').value.trim();

  tbody.innerHTML = `<tr><td colspan="7" class="table-empty">
    <i class="fa-solid fa-circle-notch fa-spin"></i> Loading...
  </td></tr>`;

  try {
    const params = new URLSearchParams({ page, limit: 20 });
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const res  = await request(`/admin/orders?${params}`);
    const data = await res.json();

    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Failed to load orders.</td></tr>`;
      return;
    }

    const { orders, pagination } = data;
    countEl.textContent = `${pagination.total} order${pagination.total === 1 ? '' : 's'}`;

    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No orders found.</td></tr>`;
      renderPagination(pagination);
      return;
    }

    tbody.innerHTML = orders.map((order) => `
      <tr data-id="${order._id}">
        <td class="col-check">
          <input type="checkbox" class="row-check" data-id="${order._id}" />
        </td>
        <td>
          <span class="order-id-link" onclick="openOrderDetail('${order._id}')">
            ${escapeHtml(order.orderID)}
          </span>
        </td>
        <td>
          <div class="customer-cell">
            <span class="customer-name">${escapeHtml(order.customerName)}</span>
            <span class="customer-email">${escapeHtml(order.email)}</span>
          </div>
        </td>
        <td>₦${formatPrice(order.totalAmount)}</td>
        <td>
          <span class="badge ${order.status === 'delivered' ? 'badge-green' : 'badge-pending'}">
            <i class="fa-solid ${order.status === 'delivered' ? 'fa-circle-check' : 'fa-clock'}"></i>
            ${order.status === 'delivered' ? 'Delivered' : 'Pending'}
          </span>
        </td>
        <td>${formatDate(order.createdAt)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-icon-edit" onclick="openOrderDetail('${order._id}')" title="View details">
              <i class="fa-solid fa-eye"></i>
            </button>
            <button class="btn-icon btn-icon-delete" onclick="openDeleteOrder('${order._id}', '${escapeHtml(order.orderID)}')" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    // Row checkboxes
    document.querySelectorAll('.row-check').forEach((cb) => {
      cb.addEventListener('change', () => {
        const id = cb.dataset.id;
        if (cb.checked) {
          selectedIds.add(id);
        } else {
          selectedIds.delete(id);
          document.getElementById('selectAll').checked = false;
        }
        updateBulkDeleteBtn();
      });
    });

    renderPagination(pagination);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Error loading orders.</td></tr>`;
  }
}

// ─── Pagination ────────────────────────────────────────────────────────────
function renderPagination({ page, pages }) {
  const container = document.getElementById('pagination');
  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="loadOrders(${page - 1})" ${page === 1 ? 'disabled' : ''}>
    <i class="fa-solid fa-chevron-left"></i>
  </button>`;

  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadOrders(${i})">${i}</button>`;
  }

  html += `<button class="page-btn" onclick="loadOrders(${page + 1})" ${page === pages ? 'disabled' : ''}>
    <i class="fa-solid fa-chevron-right"></i>
  </button>`;

  container.innerHTML = html;
}

// ─── Filters ───────────────────────────────────────────────────────────────
function initFilters() {
  document.getElementById('statusFilter').addEventListener('change', () => loadOrders(1));

  document.getElementById('searchInput').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => loadOrders(1), 400);
  });
}

// ─── Select all ────────────────────────────────────────────────────────────
document.getElementById('selectAll').addEventListener('change', (e) => {
  const checked = e.target.checked;
  document.querySelectorAll('.row-check').forEach((cb) => {
    cb.checked = checked;
    const id = cb.dataset.id;
    if (checked) {
      selectedIds.add(id);
    } else {
      selectedIds.delete(id);
    }
  });
  updateBulkDeleteBtn();
});

function updateBulkDeleteBtn() {
  const btn = document.getElementById('bulkDeleteBtn');
  const count = document.getElementById('selectedCount');
  count.textContent = selectedIds.size;
  btn.classList.toggle('hidden', selectedIds.size === 0);
}

// ─── Order detail modal ────────────────────────────────────────────────────
function initOrderModal() {
  document.getElementById('closeOrderModal').addEventListener('click', closeOrderModal);
  document.getElementById('closeOrderModalBtn').addEventListener('click', closeOrderModal);
  document.getElementById('orderModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('orderModal')) closeOrderModal();
  });
}

async function openOrderDetail(id) {
  viewingOrderId = id;
  document.getElementById('orderModalTitle').textContent = 'Loading...';
  document.getElementById('orderModalBody').innerHTML = `
    <div style="text-align:center;padding:40px;color:var(--rose-ebony-light);">
      <i class="fa-solid fa-circle-notch fa-spin" style="font-size:28px;"></i>
    </div>`;
  document.getElementById('orderModal').classList.remove('hidden');
  document.getElementById('deliverBtn').classList.add('hidden');

  try {
    const res  = await request(`/admin/orders/${id}`);
    const data = await res.json();

    if (!res.ok) {
      showToast('Failed to load order details.', 'error');
      closeOrderModal();
      return;
    }

    renderOrderModal(data.order);
  } catch (err) {
    console.error(err);
    showToast('Server error.', 'error');
    closeOrderModal();
  }
}

function renderOrderModal(order) {
  document.getElementById('orderModalTitle').textContent = `Order ${order.orderID}`;

  const deliverBtn = document.getElementById('deliverBtn');
  if (order.status === 'pending') {
    deliverBtn.classList.remove('hidden');
    deliverBtn.disabled = false;
    deliverBtn.querySelector('.btn-text').classList.remove('hidden');
    deliverBtn.querySelector('.btn-loader').classList.add('hidden');
  } else {
    deliverBtn.classList.add('hidden');
  }

  document.getElementById('orderModalBody').innerHTML = `
    <div class="order-detail-grid">

      <!-- Customer info -->
      <div class="order-detail-section">
        <h3><i class="fa-solid fa-user"></i> Customer</h3>
        <div class="order-detail-row">
          <span class="order-detail-label">Name</span>
          <span class="order-detail-value">${escapeHtml(order.customerName)}</span>
        </div>
        <div class="order-detail-row">
          <span class="order-detail-label">Email</span>
          <span class="order-detail-value">${escapeHtml(order.email)}</span>
        </div>
        <div class="order-detail-row">
          <span class="order-detail-label">Phone</span>
          <span class="order-detail-value">${escapeHtml(order.phone)}</span>
        </div>
        <div class="order-detail-row">
          <span class="order-detail-label">Status</span>
          <span class="order-detail-value">
            <span class="badge ${order.status === 'delivered' ? 'badge-green' : 'badge-pending'}">
              <i class="fa-solid ${order.status === 'delivered' ? 'fa-circle-check' : 'fa-clock'}"></i>
              ${order.status === 'delivered' ? 'Delivered' : 'Pending'}
            </span>
          </span>
        </div>
        <div class="order-detail-row">
          <span class="order-detail-label">Order Date</span>
          <span class="order-detail-value">${formatDate(order.createdAt)}</span>
        </div>
      </div>

      <!-- Delivery info -->
      <div class="order-detail-section">
        <h3><i class="fa-solid fa-location-dot"></i> Delivery</h3>
        <div class="order-detail-row">
          <span class="order-detail-label">Address</span>
          <span class="order-detail-value">${escapeHtml(order.address)}</span>
        </div>
        ${order.landmark ? `
        <div class="order-detail-row">
          <span class="order-detail-label">Landmark</span>
          <span class="order-detail-value">${escapeHtml(order.landmark)}</span>
        </div>` : ''}
        <div class="order-detail-row">
          <span class="order-detail-label">Paystack Ref</span>
          <span class="order-detail-value" style="font-size:0.78rem;word-break:break-all;">
            ${escapeHtml(order.paystackReference || '—')}
          </span>
        </div>
      </div>
    </div>

    <!-- Items -->
    <div class="order-detail-section" style="margin-bottom:0;">
      <h3><i class="fa-solid fa-basket-shopping"></i> Items Ordered</h3>
      <table class="order-items-table">
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align:center;">Qty</th>
            <th style="text-align:right;">Unit Price</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${order.items.map((item) => `
            <tr>
              <td>${escapeHtml(item.name)}</td>
              <td style="text-align:center;">${item.quantity}</td>
              <td style="text-align:right;">₦${formatPrice(item.price)}</td>
              <td style="text-align:right;font-weight:600;">₦${formatPrice(item.price * item.quantity)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="order-total-line">
        <span>Total Paid</span>
        <span>₦${formatPrice(order.totalAmount)}</span>
      </div>
    </div>
  `;
}

function closeOrderModal() {
  document.getElementById('orderModal').classList.add('hidden');
  viewingOrderId = null;
}

// ─── Mark as delivered ─────────────────────────────────────────────────────
document.getElementById('deliverBtn').addEventListener('click', async () => {
  if (!viewingOrderId) return;

  const btn = document.getElementById('deliverBtn');
  setLoading(btn, true);

  try {
    const res  = await request(`/admin/orders/${viewingOrderId}/deliver`, { method: 'PATCH' });
    const data = await res.json();

    if (res.ok) {
      showToast(data.message, 'success');
      closeOrderModal();
      loadOrders(currentPage);
    } else {
      showToast(data.message || 'Failed to update order.', 'error');
    }
  } catch (err) {
    showToast('Server error.', 'error');
  } finally {
    setLoading(btn, false);
  }
});

// ─── Single delete ─────────────────────────────────────────────────────────
function initSingleDelete() {
  document.getElementById('closeDeleteOrderModal').addEventListener('click', closeSingleDelete);
  document.getElementById('cancelDeleteOrder').addEventListener('click', closeSingleDelete);
  document.getElementById('deleteOrderModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('deleteOrderModal')) closeSingleDelete();
  });

  document.getElementById('confirmDeleteOrder').addEventListener('click', async () => {
    if (!deletingOrderId) return;
    const btn = document.getElementById('confirmDeleteOrder');
    setLoading(btn, true);

    try {
      const res  = await request(`/admin/orders/${deletingOrderId}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        closeSingleDelete();
        loadOrders(currentPage);
      } else {
        showToast(data.message || 'Failed to delete.', 'error');
      }
    } catch (err) {
      showToast('Server error.', 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}

function openDeleteOrder(id, orderID) {
  deletingOrderId = id;
  document.getElementById('deleteOrderId').textContent = orderID;
  document.getElementById('deleteOrderModal').classList.remove('hidden');
}

function closeSingleDelete() {
  document.getElementById('deleteOrderModal').classList.add('hidden');
  deletingOrderId = null;
}

// ─── Bulk delete ───────────────────────────────────────────────────────────
function initBulkDelete() {
  document.getElementById('bulkDeleteBtn').addEventListener('click', () => {
    document.getElementById('bulkDeleteCount').textContent = selectedIds.size;
    document.getElementById('bulkDeleteModal').classList.remove('hidden');
  });

  document.getElementById('closeBulkDeleteModal').addEventListener('click', closeBulkDelete);
  document.getElementById('cancelBulkDelete').addEventListener('click', closeBulkDelete);
  document.getElementById('bulkDeleteModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('bulkDeleteModal')) closeBulkDelete();
  });

  document.getElementById('confirmBulkDelete').addEventListener('click', async () => {
    if (!selectedIds.size) return;
    const btn = document.getElementById('confirmBulkDelete');
    setLoading(btn, true);

    try {
      const res  = await request('/admin/orders/bulk', {
        method: 'DELETE',
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        closeBulkDelete();
        selectedIds.clear();
        updateBulkDeleteBtn();
        document.getElementById('selectAll').checked = false;
        loadOrders(currentPage);
      } else {
        showToast(data.message || 'Failed to delete orders.', 'error');
      }
    } catch (err) {
      showToast('Server error.', 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}

function closeBulkDelete() {
  document.getElementById('bulkDeleteModal').classList.add('hidden');
}

// ─── Logout + mobile menu ──────────────────────────────────────────────────
function initLogout() {
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await Auth.logout();
    window.location.href = '/admin/login.html';
  });
}

function initMobileMenu() {
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function setLoading(btn, state) {
  btn.disabled = state;
  btn.querySelector('.btn-text')?.classList.toggle('hidden', state);
  btn.querySelector('.btn-loader')?.classList.toggle('hidden', !state);
}

function formatPrice(n) {
  return Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
