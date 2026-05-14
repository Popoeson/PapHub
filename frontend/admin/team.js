/**
 * Admin Team Management Page
 * Superadmin only — guarded on backend and frontend.
 */

let deletingAdminId = null;
let currentAdminEmail = null;

(async () => {
  const ok = await requireAuth();
  if (!ok) return;

  // Get current admin info to identify self in the list
  const meRes = await Auth.getMe();
  if (meRes && meRes.ok) {
    const { admin } = await meRes.json();
    currentAdminEmail = admin.email;

    // Redirect regular admins away — they shouldn't be here
    if (admin.role !== 'superadmin') {
      window.location.href = '/admin/dashboard.html';
      return;
    }
  }

  loadAdmins();
  initAddModal();
  initDeleteModal();
  initLogout();
  initMobileMenu();
})();

// ─── Load admins ───────────────────────────────────────────────────────────
async function loadAdmins() {
  const tbody   = document.getElementById('adminsBody');
  const countEl = document.getElementById('adminCount');

  try {
    const res  = await request('/auth/admins');
    const data = await res.json();

    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Failed to load team.</td></tr>`;
      return;
    }

    const { admins } = data;
    countEl.textContent = `${admins.length} team member${admins.length === 1 ? '' : 's'}`;

    tbody.innerHTML = admins.map((admin) => `
      <tr>
        <td>
          ${escapeHtml(admin.name)}
          ${admin.email === currentAdminEmail
            ? '<span class="you-badge">You</span>'
            : ''}
        </td>
        <td>${escapeHtml(admin.email)}</td>
        <td>
          <span class="role-badge ${admin.role === 'superadmin' ? 'role-superadmin' : 'role-admin'}">
            <i class="fa-solid ${admin.role === 'superadmin' ? 'fa-shield' : 'fa-user'}"></i>
            ${admin.role === 'superadmin' ? 'Super Admin' : 'Admin'}
          </span>
        </td>
        <td>${formatDate(admin.createdAt)}</td>
        <td>
          ${admin.email !== currentAdminEmail && admin.role !== 'superadmin'
            ? `<button class="btn-icon btn-icon-delete" onclick="openDeleteAdmin('${admin._id}', '${escapeHtml(admin.name)}')" title="Remove">
                <i class="fa-solid fa-trash"></i>
               </button>`
            : '<span style="color:var(--rose-ebony-light);font-size:0.8rem;">—</span>'}
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Error loading team.</td></tr>`;
  }
}

// ─── Add admin modal ───────────────────────────────────────────────────────
function initAddModal() {
  const modal = document.getElementById('addAdminModal');

  document.getElementById('openAddModal').addEventListener('click', () => {
    document.getElementById('addAdminForm').reset();
    clearErrors();
    modal.classList.remove('hidden');
  });

  document.getElementById('closeAddModal').addEventListener('click', () => modal.classList.add('hidden'));
  document.getElementById('cancelAddModal').addEventListener('click', () => modal.classList.add('hidden'));
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

  document.getElementById('addAdminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const name     = document.getElementById('adminName').value.trim();
    const email    = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const role     = document.getElementById('adminRole').value;

    let valid = true;

    if (!name) {
      document.getElementById('adminNameError').textContent = 'Name is required.';
      valid = false;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      document.getElementById('adminEmailError').textContent = 'Valid email is required.';
      valid = false;
    }
    if (!password || password.length < 8) {
      document.getElementById('adminPasswordError').textContent = 'Password must be at least 8 characters.';
      valid = false;
    }

    if (!valid) return;

    const btn = document.getElementById('addAdminBtn');
    setLoading(btn, true);

    try {
      const res  = await request('/auth/create-admin', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        modal.classList.add('hidden');
        loadAdmins();
      } else {
        showToast(data.message || 'Failed to create account.', 'error');
      }
    } catch (err) {
      showToast('Server error.', 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}

// ─── Delete admin modal ────────────────────────────────────────────────────
function initDeleteModal() {
  document.getElementById('closeDeleteAdminModal').addEventListener('click', closeDeleteModal);
  document.getElementById('cancelDeleteAdmin').addEventListener('click', closeDeleteModal);
  document.getElementById('deleteAdminModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('deleteAdminModal')) closeDeleteModal();
  });

  document.getElementById('confirmDeleteAdmin').addEventListener('click', async () => {
    if (!deletingAdminId) return;
    const btn = document.getElementById('confirmDeleteAdmin');
    setLoading(btn, true);

    try {
      const res  = await request(`/auth/admins/${deletingAdminId}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        showToast(data.message, 'success');
        closeDeleteModal();
        loadAdmins();
      } else {
        showToast(data.message || 'Failed to remove admin.', 'error');
      }
    } catch (err) {
      showToast('Server error.', 'error');
    } finally {
      setLoading(btn, false);
    }
  });
}

function openDeleteAdmin(id, name) {
  deletingAdminId = id;
  document.getElementById('deleteAdminName').textContent = name;
  document.getElementById('deleteAdminModal').classList.remove('hidden');
}

function closeDeleteModal() {
  document.getElementById('deleteAdminModal').classList.add('hidden');
  deletingAdminId = null;
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
function clearErrors() {
  ['adminNameError', 'adminEmailError', 'adminPasswordError'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

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
