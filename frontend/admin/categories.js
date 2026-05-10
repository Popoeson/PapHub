/**
 * Admin Products Page
 */

let currentPage = 1;
let editingProductId = null;
let deletingProductId = null;
let selectedFiles = [];       // new files to upload
let existingImages = [];      // images already on product (edit mode)
let removedPublicIds = [];    // existing images marked for removal

// ─── Auth guard ────────────────────────────────────────────────────────────
(async () => {
  const ok = await requireAuth();
  if (!ok) return;
  await loadCategories();
  loadProducts();
  initLogout();
  initMobileMenu();
  initImageUpload();
})();

// ─── Load categories for filter and form ──────────────────────────────────
async function loadCategories() {
  try {
    const res = await request('/admin/categories');
    const data = await res.json();
    if (!res.ok) return;

    const filterSelect = document.getElementById('categoryFilter');
    const formSelect = document.getElementById('productCategory');

    data.categories.forEach((cat) => {
      const opt1 = new Option(cat.name, cat._id);
      const opt2 = new Option(cat.name, cat._id);
      filterSelect.appendChild(opt1);
      formSelect.appendChild(opt2);
    });
  } catch (err) {
    console.error('loadCategories error:', err);
  }
}

// ─── Load products ─────────────────────────────────────────────────────────
async function loadProducts(page = 1) {
  currentPage = page;
  const tbody = document.getElementById('productsBody');
  const countEl = document.getElementById('productCount');
  const category = document.getElementById('categoryFilter').value;

  tbody.innerHTML = `<tr><td colspan="7" class="table-empty"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading...</td></tr>`;

  try {
    const params = new URLSearchParams({ page, limit: 20 });
    if (category) params.append('category', category);

    const res = await request(`/admin/products?${params}`);
    const data = await res.json();

    if (!res.ok) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Failed to load products.</td></tr>`;
      return;
    }

    const { products, pagination } = data;
    countEl.textContent = `${pagination.total} product${pagination.total === 1 ? '' : 's'}`;

    if (!products.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No products found.</td></tr>`;
      renderPagination(pagination);
      return;
    }

    tbody.innerHTML = products.map((p) => `
      <tr>
        <td>
          ${p.images?.[0]
            ? `<img src="${p.images[0].url}" class="product-thumb" alt="${escapeHtml(p.name)}" />`
            : `<div class="product-thumb-placeholder"><i class="fa-solid fa-image"></i></div>`}
        </td>
        <td>${escapeHtml(p.name)}</td>
        <td>${p.category?.name || '—'}</td>
        <td>₦${formatPrice(p.price)}</td>
        <td>${p.slashPrice ? `<s style="color:var(--rose-ebony-light)">₦${formatPrice(p.slashPrice)}</s>` : '—'}</td>
        <td>
          <label class="stock-toggle" title="${p.inStock ? 'In stock' : 'Out of stock'}">
            <input type="checkbox" ${p.inStock ? 'checked' : ''} onchange="toggleStock('${p._id}', this)" />
            <span class="stock-track"></span>
          </label>
        </td>
        <td>
          <div class="action-btns">
            <button class="btn-icon btn-icon-edit" onclick="openEditProduct('${p._id}')" title="Edit">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn-icon btn-icon-delete" onclick="openDeleteProduct('${p._id}', '${escapeHtml(p.name)}')" title="Delete">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    renderPagination(pagination);
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Error loading products.</td></tr>`;
  }
}

// ─── Pagination ────────────────────────────────────────────────────────────
function renderPagination({ page, pages }) {
  const container = document.getElementById('pagination');
  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="loadProducts(${page - 1})" ${page === 1 ? 'disabled' : ''}>
    <i class="fa-solid fa-chevron-left"></i>
  </button>`;

  for (let i = 1; i <= pages; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="loadProducts(${i})">${i}</button>`;
  }

  html += `<button class="page-btn" onclick="loadProducts(${page + 1})" ${page === pages ? 'disabled' : ''}>
    <i class="fa-solid fa-chevron-right"></i>
  </button>`;

  container.innerHTML = html;
}

// ─── Category filter ───────────────────────────────────────────────────────
document.getElementById('categoryFilter').addEventListener('change', () => loadProducts(1));

// ─── Stock toggle ──────────────────────────────────────────────────────────
async function toggleStock(productId, checkbox) {
  try {
    const res = await request(`/admin/products/${productId}/toggle-stock`, { method: 'PATCH' });
    const data = await res.json();

    if (res.ok) {
      showToast(data.message, 'success');
    } else {
      checkbox.checked = !checkbox.checked; // revert
      showToast(data.message || 'Failed to update stock.', 'error');
    }
  } catch (err) {
    checkbox.checked = !checkbox.checked;
    showToast('Server error.', 'error');
  }
}

// ─── Image upload ──────────────────────────────────────────────────────────
function initImageUpload() {
  const area = document.getElementById('imageUploadArea');
  const input = document.getElementById('imageInput');

  area.addEventListener('click', () => input.click());

  area.addEventListener('dragover', (e) => {
    e.preventDefault();
    area.classList.add('drag-over');
  });

  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));

  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    handleFileSelection(Array.from(e.dataTransfer.files));
  });

  input.addEventListener('change', () => {
    handleFileSelection(Array.from(input.files));
    input.value = ''; // reset so same file can be re-selected
  });
}

function handleFileSelection(files) {
  const imageError = document.getElementById('imageError');
  const totalSlots = 4 - existingImages.length;
  const remaining = totalSlots - selectedFiles.length;

  if (remaining <= 0) {
    showToast('Maximum 4 images allowed.', 'error');
    return;
  }

  const allowed = files.slice(0, remaining);
  const invalid = files.find((f) => !f.type.startsWith('image/'));

  if (invalid) {
    imageError.textContent = 'Only image files are allowed.';
    return;
  }

  imageError.textContent = '';
  selectedFiles = [...selectedFiles, ...allowed];
  renderImagePreviews();
}

function renderImagePreviews() {
  const grid = document.getElementById('imagePreviewGrid');
  grid.innerHTML = '';

  // Existing images (edit mode)
  existingImages.forEach((img, i) => {
    const div = document.createElement('div');
    div.className = 'preview-item';
    div.innerHTML = `
      <img src="${img.url}" alt="Product image" />
      <button type="button" class="preview-remove" onclick="removeExisting(${i})">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    grid.appendChild(div);
  });

  // New file previews
  selectedFiles.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    const div = document.createElement('div');
    div.className = 'preview-item';
    div.innerHTML = `
      <img src="${url}" alt="New image" />
      <button type="button" class="preview-remove" onclick="removeNew(${i})">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    grid.appendChild(div);
  });
}

function removeExisting(index) {
  const removed = existingImages.splice(index, 1)[0];
  removedPublicIds.push(removed.publicId);
  renderImagePreviews();
}

function removeNew(index) {
  selectedFiles.splice(index, 1);
  renderImagePreviews();
}

// ─── Add product modal ─────────────────────────────────────────────────────
const productModal = document.getElementById('productModal');

document.getElementById('openAddModal').addEventListener('click', openAddProduct);
document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
document.getElementById('cancelProductModal').addEventListener('click', closeProductModal);

function openAddProduct() {
  editingProductId = null;
  selectedFiles = [];
  existingImages = [];
  removedPublicIds = [];
  document.getElementById('productModalTitle').textContent = 'Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('inStockToggle').checked = true;
  document.getElementById('imagePreviewGrid').innerHTML = '';
  clearProductErrors();
  productModal.classList.remove('hidden');
}

async function openEditProduct(id) {
  editingProductId = id;
  selectedFiles = [];
  removedPublicIds = [];
  clearProductErrors();
  document.getElementById('productModalTitle').textContent = 'Edit Product';
  document.getElementById('imagePreviewGrid').innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
  productModal.classList.remove('hidden');

  try {
    const res = await request(`/admin/products/${id}`);
    const data = await res.json();

    if (!res.ok) {
      showToast('Failed to load product.', 'error');
      closeProductModal();
      return;
    }

    const p = data.product;
    existingImages = p.images ? [...p.images] : [];

    document.getElementById('editingProductId').value = p._id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productDescription').value = p.description;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productSlashPrice').value = p.slashPrice || '';
    document.getElementById('productCategory').value = p.category._id;
    document.getElementById('inStockToggle').checked = p.inStock;

    renderImagePreviews();
  } catch (err) {
    console.error(err);
    showToast('Server error.', 'error');
    closeProductModal();
  }
}

function closeProductModal() {
  productModal.classList.add('hidden');
  editingProductId = null;
  selectedFiles = [];
  existingImages = [];
  removedPublicIds = [];
}

productModal.addEventListener('click', (e) => {
  if (e.target === productModal) closeProductModal();
});

// ─── Product form submit ───────────────────────────────────────────────────
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!validateProductForm()) return;

  const saveBtn = document.getElementById('saveProductBtn');
  setLoading(saveBtn, true);

  try {
    const formData = new FormData();
    formData.append('name', document.getElementById('productName').value.trim());
    formData.append('description', document.getElementById('productDescription').value.trim());
    formData.append('price', document.getElementById('productPrice').value);
    formData.append('category', document.getElementById('productCategory').value);
    formData.append('inStock', document.getElementById('inStockToggle').checked);

    const slash = document.getElementById('productSlashPrice').value;
    if (slash) formData.append('slashPrice', slash);

    selectedFiles.forEach((file) => formData.append('images', file));

    if (editingProductId) {
      removedPublicIds.forEach((id) => formData.append('removeImages', id));
    }

    const endpoint = editingProductId
      ? `/admin/products/${editingProductId}`
      : '/admin/products';

    const method = editingProductId ? 'PATCH' : 'POST';

    // Note: don't set Content-Type — browser sets it with boundary for FormData
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method,
      headers: { Authorization: `Bearer ${getAccessToken()}` },
      credentials: 'include',
      body: formData,
    });

    const data = await res.json();

    if (res.ok) {
      showToast(data.message, 'success');
      closeProductModal();
      loadProducts(currentPage);
    } else {
      showToast(data.message || 'Failed to save product.', 'error');
    }
  } catch (err) {
    console.error(err);
    showToast('Server error. Try again.', 'error');
  } finally {
    setLoading(saveBtn, false);
  }
});

function validateProductForm() {
  clearProductErrors();
  let valid = true;

  if (!document.getElementById('productName').value.trim()) {
    document.getElementById('productNameError').textContent = 'Product name is required.';
    valid = false;
  }
  if (!document.getElementById('productDescription').value.trim()) {
    document.getElementById('productDescError').textContent = 'Description is required.';
    valid = false;
  }
  if (!document.getElementById('productPrice').value) {
    document.getElementById('productPriceError').textContent = 'Price is required.';
    valid = false;
  }
  if (!document.getElementById('productCategory').value) {
    document.getElementById('productCategoryError').textContent = 'Category is required.';
    valid = false;
  }

  return valid;
}

function clearProductErrors() {
  ['productNameError', 'productDescError', 'productPriceError', 'productCategoryError', 'imageError'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

// ─── Delete product modal ──────────────────────────────────────────────────
const deleteProductModal = document.getElementById('deleteProductModal');

function openDeleteProduct(id, name) {
  deletingProductId = id;
  document.getElementById('deleteProductName').textContent = name;
  deleteProductModal.classList.remove('hidden');
}

document.getElementById('closeDeleteProductModal').addEventListener('click', closeDeleteProductModal);
document.getElementById('cancelDeleteProduct').addEventListener('click', closeDeleteProductModal);

function closeDeleteProductModal() {
  deleteProductModal.classList.add('hidden');
  deletingProductId = null;
}

deleteProductModal.addEventListener('click', (e) => {
  if (e.target === deleteProductModal) closeDeleteProductModal();
});

document.getElementById('confirmDeleteProduct').addEventListener('click', async () => {
  if (!deletingProductId) return;
  const btn = document.getElementById('confirmDeleteProduct');
  setLoading(btn, true);

  try {
    const res = await request(`/admin/products/${deletingProductId}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok) {
      showToast(data.message, 'success');
      closeDeleteProductModal();
      loadProducts(currentPage);
    } else {
      showToast(data.message || 'Failed to delete.', 'error');
    }
  } catch (err) {
    showToast('Server error.', 'error');
  } finally {
    setLoading(btn, false);
  }
});

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
  btn.querySelector('.btn-text').classList.toggle('hidden', state);
  btn.querySelector('.btn-loader').classList.toggle('hidden', !state);
}

function formatPrice(n) {
  return Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function escapeHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
