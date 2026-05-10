/**
 * Cart Manager
 * Persists cart to localStorage so it survives page navigation.
 * Exposes a clean API used by store.js and checkout.js
 */

const Cart = (() => {
  const STORAGE_KEY = 'paphub_cart';

  function getItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveItems(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function addItem(product, quantity = 1) {
    const items = getItems();
    const existing = items.find((i) => i._id === product._id);

    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({
        _id: product._id,
        name: product.name,
        price: product.price,
        image: product.images?.[0]?.url || null,
        quantity,
      });
    }

    saveItems(items);
    updateBadge();
  }

  function removeItem(productId) {
    const items = getItems().filter((i) => i._id !== productId);
    saveItems(items);
    updateBadge();
  }

  function updateQuantity(productId, quantity) {
    if (quantity < 1) { removeItem(productId); return; }
    const items = getItems();
    const item = items.find((i) => i._id === productId);
    if (item) item.quantity = quantity;
    saveItems(items);
    updateBadge();
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    updateBadge();
  }

  function getTotal() {
    return getItems().reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  function getCount() {
    return getItems().reduce((sum, i) => sum + i.quantity, 0);
  }

  function updateBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const count = getCount();
    badge.textContent = count;
    badge.classList.toggle('hidden', count === 0);
  }

  // Call on page load to sync badge
  function init() {
    updateBadge();
  }

  return { getItems, addItem, removeItem, updateQuantity, clear, getTotal, getCount, init, updateBadge };
})();

window.Cart = Cart;
