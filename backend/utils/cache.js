/**
 * Simple in-memory cache with TTL support.
 * No external dependencies — lives in server memory.
 * Suitable for single-instance deployments at this scale.
 *
 * Usage:
 *   cache.set('key', data, 120)   // store for 120 seconds
 *   cache.get('key')              // returns data or null
 *   cache.invalidate('key')       // delete one key
 *   cache.invalidatePattern('products') // delete all keys containing 'products'
 */

const store = new Map();

const cache = {
  get(key) {
    const entry = store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }

    return entry.data;
  },

  set(key, data, ttlSeconds = 120) {
    store.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  invalidate(key) {
    store.delete(key);
  },

  // Invalidate all keys that include the given pattern string
  invalidatePattern(pattern) {
    for (const key of store.keys()) {
      if (key.includes(pattern)) {
        store.delete(key);
      }
    }
  },

  clear() {
    store.clear();
  },

  // Useful for debugging
  size() {
    return store.size;
  },
};

// Passive cleanup: sweep expired entries every 5 minutes
// Prevents memory growing unboundedly on long-running instances
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

module.exports = cache;
