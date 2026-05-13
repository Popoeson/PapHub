/**
 * Admin Reviews Page
 */

let currentPage = 1;
let currentFilter = '';
let deletingReviewId = null;

// ─── Auth guard ────────────────────────────────────────────────────────────
(async () => {
  const ok = await requireAuth();
  if (!ok) return;
  loadReviews();
  initTabs();
  initDeleteModal();
  initLogout();
  initMobileMenu();
})();

// ─── Load reviews ──────────────────────────────────────────────────────────
async function loadReviews(page = 1) {
  currentPage = page;

  const list    = document.getElementById('reviewsList');
  const countEl = document.getElementById('reviewCount');

  list.innerHTML = `<div class="table-empty">
    <i class="fa-solid fa-circle-notch fa-spin"></i> Loading...
  </div>`;

  try {
    const params = new URLSearchParams({ page, limit: 20 });
    if (currentFilter !== '') params.append('approved', currentFilter);

    const res  = await request(`/reviews/admin?${params}`);
    const data = await res.json();

    if (!res.ok) {
      list.innerHTML = `<div class="table-empty">Failed to load reviews.</div>`;
      return;
    }

    const { reviews, pagination } = data;
    countEl.textContent = `${pagination.total} review${pagination.total === 1 ? '' : 's'}`;

    if (!reviews.length) {
      list.innerHTML = `<div class="table-empty">No reviews found.</div>`;
      renderPagination(pagination);
      return;
    }

    list.innerHTML = reviews.map((review) => `
      <div class="review-item" data-id="${review._id}">
        <div class="review-body">
          <div class="review-stars">
            ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
          </div>
          <div class="review-meta">
            <span class="review-order-id">${escapeHtml(review.orderID)}</span>
            <span class="review-date">${formatDate(review.createdAt)}</span>
            <span class="review-status ${review.approved ? 'approved' : 'pending'}">
              <i class="fa-solid ${review.approved ? 'fa-circle-check' : 'fa-clock'}"></i>
              ${review.approved ? 'Approved' : 'Pending'}
            </span>
          </div>
          <p class="review-text">"${escapeHtml(review.reviewText)}"</p>
          <p class="review-email">${escapeHtml(review.email)}</p>
        </div>
        <div class="review-actions">
          <button
            class="btn-approve ${review.approved ? 'hide' : 'approve'}"
            onclick="toggleApproval('${review._id}', this)"
          >
            <i class="fa-solid ${review.approved ? 'fa-eye-slash' : 'fa-circle-check'}"></i>
            ${review.approved ? 'Hide' : 'Approve'}
          </button>
          <button class="btn-icon btn-icon-delete" onclick="openDeleteReview('${review._id}')" title="Delete">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

    renderPagination(pagination);
  } catch (err) {
    console.error(err);
    list.innerHTML = `<div class="table-empty">Error loading reviews.</div>`;
  }
}

// ─── Pagination ────────────────────────────────────────────────────────────
function renderPagination({ page, pages }) {
  const container = document.getElementById('pagination');
  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="loadReviews(${page - 1})" ${page === 1 ? 'disabled' : ''}>
    <i class="fa-solid fa-chevron-left"></i>
  </button>`;

  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadReviews(${i})">${i}</button>`;
  }

  html += `<button class="page-btn" onclick="loadReviews(${page + 1})" ${page === pages ? 'disabled' : ''}>
    <i class="fa-solid fa-chevron-right"></i>
  </button>`;

  container.innerHTML = html;
}

// ─── Filter tabs ───────────────────────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.review-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.review-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      loadReviews(1);
    });
  });
}

// ─── Toggle approval ───────────────────────────────────────────────────────
async function toggleApproval(id, btn) {
  btn.disabled = true;

  try {
    const res  = await request(`/reviews/admin/${id}/toggle`, { method: 'PATCH' });
    const data = await res.json();

    if (res.ok) {
      showToast(data.message, 'success');
      loadReviews(currentPage);
    } else {
      showToast(data.message || 'Failed to update review.', 'error');
      btn.disabled = false;
    }
  } catch (err) {
    showToast('Server error.', 'error');
    btn.disabled = false;
  }
}

// ─── Delete modal ──────────────────────────────────────────────────────────
function initDeleteModal() {
  document.getElementById('closeDeleteReviewModal').addEventListener('click', closeDeleteModal);
  document.getElementById('cancelDeleteReview').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteReviewModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('deleteReviewModal')) closeDeleteModal();
  });

  document.getElementById('confirmDeleteReview').addEventListener('click', async () => {
    if (!deletingReviewId) return;
    const btn = document.getElementById('confirmDeleteReview');
    setLoading(btn, true);

    try {
      const res  = await request(`/reviews/admin/${deletingReviewId}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        closeDeleteModal();
        loadReviews(currentPage);
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

function openDeleteReview(id) {
  deletingReviewId = id;
  document.getElementById('deleteReviewModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteReviewModal').classList.add('hidden');
  deletingReviewId = null;
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
