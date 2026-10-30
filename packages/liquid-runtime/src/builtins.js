import { signal, effect, onDestroy } from './signals.js';

/**
 * Minimal shared store pattern built on signals for cross-component state.
 *
 * @template T
 * @param {T} initialState
 * @returns {T & { $: (key: string) => any }}
 */
export function createStore(initialState) {
  const signalMap = new Map();
  const methods = {};

  for (const [key, value] of Object.entries(initialState)) {
    if (typeof value === 'function') {
      methods[key] = value;
    } else {
      signalMap.set(key, signal(value));
    }
  }

  const store = new Proxy(methods, {
    get(target, prop) {
      if (prop === '$') {
        return (k) => signalMap.get(k);
      }
      if (typeof prop === 'string' && prop.startsWith('$')) {
        const rawKey = prop.slice(1);
        if (signalMap.has(rawKey)) {
          return signalMap.get(rawKey);
        }
      }
      if (prop in target) {
        return target[prop].bind(store);
      }
      if (signalMap.has(prop)) {
        return signalMap.get(prop)();
      }
      return undefined;
    },

    set(target, prop, newValue) {
      if (signalMap.has(prop)) {
        signalMap.get(prop).set(newValue);
        return true;
      }
      signalMap.set(prop, signal(newValue));
      return true;
    }
  });

  return store;
}

/**
 * Head management helper.
 * Reactively updates document.title and <meta> tags based on signal state.
 *
 * @param {object} config
 * @param {string | (() => string)} [config.title]
 * @param {Record<string, string | (() => string)>} [config.meta]
 * @param {Record<string, string | (() => string)>} [config.link]
 */
export function head({ title, meta = {}, link = {} }) {
  if (typeof document === 'undefined') return;

  const createdElements = [];

  const dispose = effect(() => {
    // 1. Title
    if (title !== undefined) {
      const titleVal = typeof title === 'function' ? title() : title;
      document.title = String(titleVal ?? '');
    }

    // 2. Meta tags
    for (const [name, contentOrFn] of Object.entries(meta)) {
      const val = typeof contentOrFn === 'function' ? contentOrFn() : contentOrFn;
      let metaEl = document.querySelector(`meta[name="${name}"]`);
      if (!metaEl) {
        metaEl = document.createElement('meta');
        metaEl.setAttribute('name', name);
        document.head.appendChild(metaEl);
        createdElements.push(metaEl);
      }
      metaEl.setAttribute('content', String(val ?? ''));
    }

    // 3. Link tags
    for (const [rel, hrefOrFn] of Object.entries(link)) {
      const val = typeof hrefOrFn === 'function' ? hrefOrFn() : hrefOrFn;
      let linkEl = document.querySelector(`link[rel="${rel}"]`);
      if (!linkEl) {
        linkEl = document.createElement('link');
        linkEl.setAttribute('rel', rel);
        document.head.appendChild(linkEl);
        createdElements.push(linkEl);
      }
      linkEl.setAttribute('href', String(val ?? ''));
    }
  });

  const cleanup = () => {
    dispose();
    for (const el of createdElements) {
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  };

  onDestroy(cleanup);
  return cleanup;
}
