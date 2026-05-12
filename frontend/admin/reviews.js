/* reviews.js — Admin Reviews Management */

const API = 'https://paphub-lav4.onrender.com';

let currentPage   = 1;
let currentFilter = 'all';
let deleteTarget  = null;

// ── Auth guard ────────────────────────────────────────────────────────────────
(async () => {
  try {
    await apiFetch(`${API}/api/auth/me`);
  } catch {
    window.location.href = 'login.html';
  }
})();

// ── Sidebar / mobile ──────────────────────────────────────────────────────────
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
});
document.getElementById('sidebar-overlay').addEventListener('click', () => {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
});
document.getElementById('logout-btn').addEventListener('click', async () => {
  await apiFetch(`${API}/api/auth/logout`, { method: 'POST' }).catch(() => {});
  window.location.href = 'login.html';
});

// ── Filter tabs ───────────────────────────────────────────────────────────────
document.querySelectorAll('.filter-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    currentPage   = 1;
    loadReviews();
  });
});

// ── Load reviews ──────────────────────────────────────────────────────────────
async function loadReviews() {
  const tbody = document.getElementById('reviews-tbody');
  tbody.innerHTML = `<tr><td colspan="7" class="table-empty"><i class="fa-solid fa-spinner fa-spin"></i> Loading…</td></tr>`;

  try {
    const qs  = new URLSearchParams({ page: currentPage, limit: 20 });
    if (currentFilter !== 'all') qs.set('approved', currentFilter);

    const data = await apiFetch(`${API}/api/admin/reviews?${qs}`);

    if (!data.reviews.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No reviews found.</td></tr>`;
      document.getElementById('pagination').innerHTML = '';
      return;
    }

    tbody.innerHTML = data.reviews.map(r => `
      <tr id="row-${r._id}">
        <td><strong>${esc(r.name)}</strong><br/><small style="color:#7a6060">${esc(r.email)}</small></td>
        <td>${renderStars(r.rating)}</td>
        <td><div class="review-comment">${esc(r.comment)}</div></td>
        <td><code>${esc(r.orderID)}</code></td>
        <td>${new Date(r.createdAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</td>
        <td>
          <span class="badge ${r.approved ? 'badge-approved' : 'badge-pending'}">
            ${r.approved ? 'Approved' : 'Pending'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <button
              class="btn btn-sm ${r.approved ? 'btn-secondary' : 'btn-primary'}"
              onclick="toggleApproval('${r._id}', ${r.approved})"
              title="${r.approved ? 'Unapprove' : 'Approve'}"
            >
              <i class="fa-solid ${r.approved ? 'fa-eye-slash' : 'fa-check'}"></i>
              ${r.approved ? 'Unapprove' : 'Approve'}
            </button>
            <button
              class="btn btn-sm btn-danger"
              onclick="openDeleteModal('${r._id}')"
              title="Delete review"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    renderPagination(data.pagination);

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Failed to load reviews.</td></tr>`;
    showToast('Could not load reviews.', 'error');
    console.error(err);
  }
}

// ── Stars helper ──────────────────────────────────────────────────────────────
function renderStars(rating) {
  let html = '<span class="stars-display">';
  for (let i = 1; i <= 5; i++) {
    html += i <= rating
      ? '<i class="fa-solid fa-star"></i>'
      : '<i class="fa-regular fa-star empty"></i>';
  }
  return html + '</span>';
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Toggle approval ───────────────────────────────────────────────────────────
async function toggleApproval(id, currentApproved) {
  try {
    await apiFetch(`${API}/api/admin/reviews/${id}/toggle-approval`, { method: 'PATCH' });
    showToast(currentApproved ? 'Review unapproved.' : 'Review approved!', 'success');
    loadReviews();
  } catch (err) {
    showToast('Failed to update review.', 'error');
  }
}

// ── Delete ────────────────────────────────────────────────────────────────────
function openDeleteModal(id) {
  deleteTarget = id;
  document.getElementById('delete-modal').classList.add('open');
}

document.getElementById('cancel-delete').addEventListener('click', () => {
  deleteTarget = null;
  document.getElementById('delete-modal').classList.remove('open');
});

document.getElementById('confirm-delete').addEventListener('click', async () => {
  if (!deleteTarget) return;
  document.getElementById('delete-modal').classList.remove('open');
  try {
    await apiFetch(`${API}/api/admin/reviews/${deleteTarget}`, { method: 'DELETE' });
    showToast('Review deleted.', 'success');
    deleteTarget = null;
    loadReviews();
  } catch {
    showToast('Failed to delete review.', 'error');
  }
});

// ── Pagination ────────────────────────────────────────────────────────────────
function renderPagination({ page, pages }) {
  const el = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = '';
  html += `<button class="page-btn" ${page === 1 ? 'disabled' : ''} onclick="goPage(${page - 1})">
             <i class="fa-solid fa-chevron-left"></i>
           </button>`;

  for (let p = 1; p <= pages; p++) {
    html += `<button class="page-btn ${p === page ? 'active' : ''}" onclick="goPage(${p})">${p}</button>`;
  }

  html += `<button class="page-btn" ${page === pages ? 'disabled' : ''} onclick="goPage(${page + 1})">
             <i class="fa-solid fa-chevron-right"></i>
           </button>`;

  el.innerHTML = html;
}

function goPage(p) {
  currentPage = p;
  loadReviews();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadReviews();
