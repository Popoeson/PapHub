/**
 * Admin Categories Page
 */

let editingId = null;
let deletingId = null;

// ─── Auth guard ────────────────────────────────────────────────────────────
(async () => {
  const ok = await requireAuth();
  if (!ok) return;
  applyRoleUI();
  loadCategories();
  initLogout();
  initMobileMenu();
})();

// ─── Load categories ───────────────────────────────────────────────────────
async function loadCategories() {
  const tbody = document.getElementById('categoriesBody');
  const countEl = document.getElementById('categoryCount');

  try {
    const res = await request('/admin/categories');
    const data = await res.json();

    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Failed to load categories.</td></tr>`;
      return;
    }

    const { categories } = data;
    countEl.textContent = `${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}`;

    if (!categories.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="table-empty">No categories yet. Add one to get started.</td></tr>`;
      return;
    }

    tbody.innerHTML = categories.map((cat) => `
      <tr>
        <td>${escapeHtml(cat.name)}</td>
        <td><code>${cat.slug}</code></td>
        <td>${formatDate(cat.createdAt)}</td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-icon-edit" onclick="openEdit('${cat._id}', '${escapeHtml(cat.name)}')" title="Edit">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon btn-icon-delete" onclick="openDelete('${cat._id}', '${escapeHtml(cat.name)}')" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Error loading categories.</td></tr>`;
  }
}

// ─── Add / Edit modal ──────────────────────────────────────────────────────
const modal       = document.getElementById('categoryModal');
const modalTitle  = document.getElementById('modalTitle');
const form        = document.getElementById('categoryForm');
const nameInput   = document.getElementById('categoryName');
const nameError   = document.getElementById('nameError');
const saveBtn     = document.getElementById('saveBtn');
const editingInput = document.getElementById('editingId');

document.getElementById('openAddModal').addEventListener('click', openAdd);
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);

function openAdd() {
  editingId = null;
  editingInput.value = '';
  modalTitle.textContent = 'Add Category';
  nameInput.value = '';
  nameError.textContent = '';
  modal.classList.remove('hidden');
  nameInput.focus();
}

function openEdit(id, name) {
  editingId = id;
  editingInput.value = id;
  modalTitle.textContent = 'Edit Category';
  nameInput.value = name;
  nameError.textContent = '';
  modal.classList.remove('hidden');
  nameInput.focus();
}

function closeModal() {
  modal.classList.add('hidden');
  editingId = null;
}

modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = nameInput.value.trim();

  if (!name) {
    nameError.textContent = 'Category name is required.';
    return;
  }

  setLoading(saveBtn, true);

  try {
    const endpoint = editingId ? `/admin/categories/${editingId}` : '/admin/categories';
    const method = editingId ? 'PATCH' : 'POST';

    const res = await request(endpoint, {
      method,
      body: JSON.stringify({ name }),
    });

    const data = await res.json();

    if (res.ok) {
      showToast(data.message, 'success');
      closeModal();
      loadCategories();
    } else {
      nameError.textContent = data.message || 'Something went wrong.';
    }
  } catch (err) {
    console.error(err);
    showToast('Server error. Try again.', 'error');
  } finally {
    setLoading(saveBtn, false);
  }
});

// ─── Delete modal ──────────────────────────────────────────────────────────
const deleteModal   = document.getElementById('deleteModal');
const deleteNameEl  = document.getElementById('deleteName');
const confirmBtn    = document.getElementById('confirmDelete');

document.getElementById('closeDeleteModal').addEventListener('click', closeDeleteModal);
document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);

function openDelete(id, name) {
  deletingId = id;
  deleteNameEl.textContent = name;
  deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
  deleteModal.classList.add('hidden');
  deletingId = null;
}

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

confirmBtn.addEventListener('click', async () => {
  if (!deletingId) return;

  setLoading(confirmBtn, true);

  try {
    const res = await request(`/admin/categories/${deletingId}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      showToast(data.message, 'success');
      closeDeleteModal();
      loadCategories();
    } else {
      showToast(data.message, 'error');
      closeDeleteModal();
    }
  } catch (err) {
    console.error(err);
    showToast('Server error. Try again.', 'error');
  } finally {
    setLoading(confirmBtn, false);
  }
});

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
function setLoading(btn, state) {
  btn.disabled = state;
  btn.querySelector('.btn-text').classList.toggle('hidden', state);
  btn.querySelector('.btn-loader').classList.toggle('hidden', !state);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
