const memCache = {};

export function getStoredItem(key, defaultValue = null) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    }
  } catch {}
  return memCache[key] !== undefined ? memCache[key] : defaultValue;
}

export function setStoredItem(key, value) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {}
  memCache[key] = value;
}
