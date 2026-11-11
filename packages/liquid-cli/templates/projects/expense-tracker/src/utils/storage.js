const memoryStore = {};

export function loadData(key, fallback = null) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem) {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    }
  } catch {}
  return memoryStore[key] !== undefined ? memoryStore[key] : fallback;
}

export function saveData(key, value) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.setItem) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch {}
  memoryStore[key] = value;
}
