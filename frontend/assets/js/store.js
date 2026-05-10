/**
 * Store Page
 * Loads products and categories from public API.
 * Manages cart modal, add to cart, and review display.
 */

const STORE_API = 'https://paphub-lav4.onrender.com/api/public';

let currentCategory = '';
let currentPage = 1;
let totalPages = 1;
let isLoading = false;

// ─── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Cart.init();
  loadCategories();
  loadProducts(1, true);
  loadReviews();
  initCartModal();
  initNavbarScroll();
  document.getElementById('year').textContent = new Date().getFullYear();
});

// ─── Navbar scroll effect ──────────────────────────────────────────────────
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    navbar.style.boxShadow = window.scrollY > 20
      ? '0 4px 24px rgba(103,72,70,0.14)'
      : '';
  }, { passive: true });
}

// ─── Categories ────────────────────────────────────────────────────────────
async function loadCategories() {
  try {
    const res = await fetch(`${STORE_API}/categories`);
    if (!res.ok) return;

    const { categories } = await res.json();
    const tabs = document.getElementById('categoryTabs');

    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = 'cat-tab';
      btn.textContent = cat.name;
      btn.dataset.category = cat._id;
      btn.setAttribute('role', 'tab');
      btn.addEventListener('click', () => selectCategory(cat._id, btn));
      tabs.appendChild(btn);
    });
  } catch (err) {
    console.error('loadCategories error:', err);
  }
}

function selectCategory(categoryId, btn) {
  currentCategory = categoryId;
  document.querySelectorAll('.cat-tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');
  loadProducts(1, true);
}

// ─── Products ──────────────────────────────────────────────────────────────
async function loadProducts(page = 1, reset = false) {
  if (isLoading) return;
  isLoading = true;

  const grid = document.getElementById('productGrid');
  const loadMoreBtn = document.getElementById('loadMoreBtn');

  if (reset) {
    currentPage = 1;
    grid.innerHTML = `
      <div class="product-skeleton"></div>
      <div class="product-skeleton"></div>
      <div class="product-skeleton"></div>
      <div class="product-skeleton"></div>
    `;
    loadMoreBtn.classList.add('hidden');
  }

  try {
    const params = new URLSearchParams({ page, limit: 12 });
    if (currentCategory) params.append('category', currentCategory);

    const res = await fetch(`${STORE_API}/products?${params}`);
    if (!res.ok) throw new Error('Failed to load products');

    const { products, pagination } = await res.json();

    currentPage = pagination.page;
    totalPages = pagination.pages;

    if (reset) grid.innerHTML = '';

    if (!products.length && reset) {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--rose-ebony-light);padding:48px">No products available in this category yet.</p>`;
      return;
    }

    products.forEach((product, i) => {
      const card = buildProductCard(product, i);
      grid.appendChild(card);
    });

    // Load more button
    if (currentPage < totalPages) {
      loadMoreBtn.classList.remove('hidden');
    } else {
      loadMoreBtn.classList.add('hidden');
    }
  } catch (err) {
    console.error('loadProducts error:', err);
    if (reset) {
      grid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:var(--accent-red);padding:48px">Failed to load products. Please refresh.</p>`;
    }
  } finally {
    isLoading = false;
    setLoadMoreLoading(false);
  }
}

function buildProductCard(product, index) {
  const card = document.createElement('div');
  card.className = 'product-card';
  card.style.animationDelay = `${index * 60}ms`;

  const discount = product.slashPrice
    ? Math.round(((product.slashPrice - product.price) / product.slashPrice) * 100)
    : null;

  const imgHtml = product.images?.[0]?.url
    ? `<img src="${product.images[0].url}" class="product-img" alt="${escapeHtml(product.name)}" loading="lazy" />`
    : `<div class="product-img-placeholder"><i class="fa-solid fa-bowl-food"></i></div>`;

  card.innerHTML = `
    <div class="product-img-wrap">
      ${imgHtml}
      ${!product.inStock ? '<span class="product-out-badge">Out of Stock</span>' : ''}
    </div>
    <div class="product-body">
      <p class="product-category">${escapeHtml(product.category?.name || '')}</p>
      <h3 class="product-name">${escapeHtml(product.name)}</h3>
      <p class="product-desc">${escapeHtml(product.description)}</p>
      <div class="product-pricing">
        <span class="product-price">₦${formatPrice(product.price)}</span>
        ${product.slashPrice ? `<span class="product-slash">₦${formatPrice(product.slashPrice)}</span>` : ''}
        ${discount ? `<span class="product-discount">${discount}% off</span>` : ''}
      </div>
    </div>
    <div class="product-footer">
      <button class="btn-add-cart" data-id="${product._id}" ${!product.inStock ? 'disabled' : ''}>
        <i class="fa-solid fa-basket-shopping"></i>
        ${product.inStock ? 'Add to Cart' : 'Out of Stock'}
      </button>
    </div>
  `;

  // Add to cart
  const btn = card.querySelector('.btn-add-cart');
  btn.addEventListener('click', () => handleAddToCart(product, btn));

  return card;
}

function handleAddToCart(product, btn) {
  Cart.addItem(product);
  showToast(`${product.name} added to cart.`, 'success');

  // Brief button feedback
  const original = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Added';
  btn.classList.add('added');
  btn.disabled = true;

  setTimeout(() => {
    btn.innerHTML = original;
    btn.classList.remove('added');
    btn.disabled = false;
  }, 1400);

  renderCartContents();
}

// Load more
document.getElementById('loadMoreBtn').addEventListener('click', () => {
  setLoadMoreLoading(true);
  loadProducts(currentPage + 1, false);
});

function setLoadMoreLoading(state) {
  const btn = document.getElementById('loadMoreBtn');
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = state;
  text.classList.toggle('hidden', state);
  loader.classList.toggle('hidden', !state);
}

// ─── Reviews ───────────────────────────────────────────────────────────────
async function loadReviews() {
  try {
    const res = await fetch(`${STORE_API}/reviews`);
    if (!res.ok) return;

    const { reviews } = await res.json();
    const grid = document.getElementById('reviewsGrid');
    const empty = document.getElementById('reviewsEmpty');

    if (!reviews.length) {
      empty.classList.remove('hidden');
      return;
    }

    reviews.forEach((review) => {
      const card = document.createElement('div');
      card.className = 'review-card glass';
      card.innerHTML = `
        <div class="review-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
        <p class="review-text">"${escapeHtml(review.reviewText)}"</p>
        <p class="review-author">Verified Customer</p>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    console.error('loadReviews error:', err);
  }
}

// ─── Cart modal ────────────────────────────────────────────────────────────
function initCartModal() {
  const overlay = document.getElementById('cartOverlay');
  const sections = ['hero', 'store', 'reviews', 'footer']; // elements to blur

  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('clearCartBtn').addEventListener('click', () => {
    Cart.clear();
    renderCartContents();
    showToast('Cart cleared.', 'info');
  });
  document.getElementById('checkoutBtn').addEventListener('click', () => {
    if (!Cart.getCount()) {
      showToast('Your cart is empty.', 'error');
      return;
    }
    window.location.href = '/pages/checkout.html';
  });

  // Close on overlay click (outside modal)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCart();
  });

  // Keyboard close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCart();
  });

  function openCart() {
    renderCartContents();
    overlay.classList.remove('hidden');
    document.body.classList.add('cart-open');
    // Blur background sections
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.add('store-blur');
    });
  }

  function closeCart() {
    overlay.classList.add('hidden');
    document.body.classList.remove('cart-open');
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.classList.remove('store-blur');
    });
  }
}

function renderCartContents() {
  const items = Cart.getItems();
  const body = document.getElementById('cartBody');
  const footer = document.getElementById('cartFooter');
  const empty = document.getElementById('cartEmpty');
  const totalEl = document.getElementById('cartTotal');

  if (!items.length) {
    body.innerHTML = '';
    footer.classList.add('hidden');
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  footer.classList.remove('hidden');

  body.innerHTML = items.map((item) => `
    <div class="cart-item" data-id="${item._id}">
      ${item.image
        ? `<img src="${item.image}" class="cart-item-img" alt="${escapeHtml(item.name)}" />`
        : `<div class="cart-item-img-placeholder"><i class="fa-solid fa-bowl-food"></i></div>`}
      <div class="cart-item-info">
        <p class="cart-item-name">${escapeHtml(item.name)}</p>
        <p class="cart-item-price">₦${formatPrice(item.price)} each</p>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="changeQty('${item._id}', ${item.quantity - 1})">
            <i class="fa-solid fa-minus"></i>
          </button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn" onclick="changeQty('${item._id}', ${item.quantity + 1})">
            <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item._id}')" title="Remove">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');

  totalEl.textContent = `₦${formatPrice(Cart.getTotal())}`;
}

function changeQty(productId, newQty) {
  Cart.updateQuantity(productId, newQty);
  renderCartContents();
}

function removeFromCart(productId) {
  Cart.removeItem(productId);
  renderCartContents();
  showToast('Item removed.', 'info');
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function formatPrice(n) {
  return Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2 });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
