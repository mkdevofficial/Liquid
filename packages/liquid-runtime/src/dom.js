import { effect, createScope, signal, onDestroy } from './signals.js';

/**
 * Create a DOM element with optional attributes and class names.
 *
 * @param {string} tag
 * @param {string} [scopeAttr]
 * @param {string[]} [classes]
 * @returns {HTMLElement}
 */
export function element(tag, scopeAttr, classes) {
  const el = document.createElement(tag);
  if (scopeAttr) {
    el.setAttribute(scopeAttr, '');
  }
  if (classes && classes.length > 0) {
    el.className = classes.join(' ');
  }
  return el;
}

/**
 * Create a text node.
 *
 * @param {string} [initialText='']
 * @returns {Text}
 */
export function text(initialText = '') {
  return document.createTextNode(String(initialText ?? ''));
}

/**
 * Bind a reactive text expression to a text node or element.
 *
 * @param {Text | HTMLElement} targetNode
 * @param {() => any} getter
 */
export function bindText(targetNode, getter) {
  effect(() => {
    const val = getter();
    const str = String(val ?? '');
    if (targetNode.nodeType === 3) {
      targetNode.data = str;
    } else {
      targetNode.textContent = str;
    }
  });
}

/**
 * Bind an attribute or property reactively to a DOM element.
 *
 * @param {HTMLElement} el
 * @param {string} name
 * @param {() => any} getter
 */
export function bindAttr(el, name, getter) {
  const isProp = name === 'value' || name === 'checked' || name === 'selectedIndex';
  effect(() => {
    const val = getter();
    if (isProp) {
      el[name] = val ?? (name === 'checked' ? false : '');
    } else if (val === false || val === null || val === undefined) {
      el.removeAttribute(name);
    } else if (val === true) {
      el.setAttribute(name, '');
    } else {
      el.setAttribute(name, String(val));
    }
  });
}

/**
 * Attach an event listener to an element with modifier support.
 *
 * @param {HTMLElement} el
 * @param {string} eventName
 * @param {(e: Event) => void} handler
 * @param {string[]} [modifiers=[]]
 * @returns {() => void} Cleanup function
 */
export function listen(el, eventName, handler, modifiers = []) {
  const hasPrevent = modifiers.includes('prevent') || modifiers.includes('prev');
  const hasStop = modifiers.includes('stop');
  const hasOnce = modifiers.includes('once');

  function wrappedListener(e) {
    if (hasPrevent) e.preventDefault();
    if (hasStop) e.stopPropagation();
    handler(e);
  }

  el.addEventListener(eventName, wrappedListener, { once: hasOnce });

  const cleanup = () => {
    el.removeEventListener(eventName, wrappedListener);
  };

  onDestroy(cleanup);
  return cleanup;
}

/**
 * Two-way bind an input element to a signal.
 *
 * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} el
 * @param {any} sig
 * @param {string} [prop='value']
 */
export function bindInput(el, sig, prop = 'value') {
  if (prop === 'checked' || (el.type === 'checkbox' && prop === 'value')) {
    bindAttr(el, 'checked', () => sig());
    listen(el, 'change', (e) => {
      sig.set(e.target.checked);
    });
  } else {
    bindAttr(el, 'value', () => sig());
    const ev = el.tagName === 'SELECT' ? 'change' : 'input';
    listen(el, ev, (e) => {
      sig.set(e.target.value);
    });
  }
}

/**
 * Insert a node before an anchor node in parent.
 *
 * @param {Node} parent
 * @param {Node} node
 * @param {Node} [anchor]
 */
export function insert(parent, node, anchor = null) {
  parent.insertBefore(node, anchor);
}

/**
 * Append multiple children to a parent element.
 *
 * @param {Node} parent
 * @param {...Node} children
 */
export function append(parent, ...children) {
  for (const child of children) {
    if (child) parent.appendChild(child);
  }
}

/**
 * Create a reactive if-block at an anchor point.
 *
 * @param {Comment} anchor
 * @param {() => any} conditionFn
 * @param {() => Node[]} thenFn
 * @param {() => Node[]} [elseFn]
 */
export function createIfBlock(anchor, conditionFn, thenFn, elseFn = null) {
  let currentScope = null;
  let currentNodes = [];
  let currentBranch = null; // true, false, or null

  function cleanup() {
    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }
    for (const node of currentNodes) {
      if (node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }
    currentNodes = [];
  }

  effect(() => {
    const condition = Boolean(conditionFn());
    if (condition === currentBranch) {
      return; // no branch change
    }

    cleanup();
    currentBranch = condition;

    const renderFn = condition ? thenFn : elseFn;
    if (renderFn) {
      currentScope = createScope(() => {
        const result = renderFn();
        const nodes = Array.isArray(result) ? result : [result];
        currentNodes = nodes;

        const insertNodes = () => {
          const parent = anchor.parentNode;
          if (parent) {
            for (const n of nodes) {
              if (n) parent.insertBefore(n, anchor);
            }
          }
        };

        if (anchor.parentNode) {
          insertNodes();
        } else {
          queueMicrotask(insertNodes);
        }
      });
    }
  });

  onDestroy(cleanup);
}

/**
 * Create a keyed reactive each-block with minimal DOM mutations.
 *
 * @param {Comment} anchor
 * @param {() => any[]} listFn
 * @param {(item: any, index: number) => any} keyFn
 * @param {(itemSignal: any, indexSignal: any) => Node[]} renderItemFn
 */
export function createEachBlock(anchor, listFn, keyFn, renderItemFn) {
  let itemsMap = new Map(); // key -> { scope, nodes, itemSignal, indexSignal }

  function cleanup() {
    for (const { scope, nodes } of itemsMap.values()) {
      scope.dispose();
      for (const n of nodes) {
        if (n.parentNode) n.parentNode.removeChild(n);
      }
    }
    itemsMap.clear();
  }

  effect(() => {
    const rawList = listFn() ?? [];
    let list;

    if (Array.isArray(rawList)) {
      list = rawList;
    } else if (rawList instanceof Set) {
      list = Array.from(rawList);
    } else if (rawList instanceof Map) {
      list = Array.from(rawList.values());
    } else {
      if (rawList !== null && rawList !== undefined && rawList !== false) {
        console.warn(`[Liquid Warning] <each> block expected an Array, but received ${typeof rawList} (${String(rawList)}). Non-array values are not iterated.`);
      }
      list = [];
    }

    const newItemsMap = new Map();
    const newOrder = [];
    const seenKeys = new Set();

    // First pass: identify reused vs new items
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      let key = keyFn ? keyFn(item, i) : i;

      // Handle missing/undefined keys
      if (key === undefined || key === null) {
        if (keyFn) {
          console.warn(`[Liquid Warning] Key function returned ${key} for item at index ${i}. Falling back to index.`);
        }
        key = i;
      }

      // Handle duplicate keys: warn and disambiguate so items are not dropped
      let mapKey = key;
      if (seenKeys.has(key)) {
        console.warn(`[Liquid Warning] Duplicate key "${String(key)}" detected in <each> block at index ${i}. Keys must be unique to ensure proper DOM reconciliation.`);
        mapKey = `${key}__liquid_dup_${i}`;
      }
      seenKeys.add(key);

      if (itemsMap.has(mapKey)) {
        // Reuse existing item
        const existing = itemsMap.get(mapKey);
        existing.itemSignal.set(item);
        existing.indexSignal.set(i);
        newItemsMap.set(mapKey, existing);
        newOrder.push(existing);
        itemsMap.delete(mapKey);
      } else {
        // Create new item
        const itemSignal = signal(item);
        const indexSignal = signal(i);
        let nodes = [];
        let itemScope = createScope(() => {
          const rendered = renderItemFn(itemSignal, indexSignal);
          nodes = Array.isArray(rendered) ? rendered : [rendered];
        });

        const record = { scope: itemScope, nodes, itemSignal, indexSignal };
        newItemsMap.set(mapKey, record);
        newOrder.push(record);
      }
    }

    // Second pass: remove items no longer in list
    for (const { scope, nodes } of itemsMap.values()) {
      scope.dispose();
      for (const n of nodes) {
        if (n.parentNode) n.parentNode.removeChild(n);
      }
    }

    // Third pass: position nodes in correct DOM order before anchor
    const orderNodes = () => {
      const parent = anchor.parentNode;
      if (!parent) return;

      let cursor = anchor;
      for (let i = newOrder.length - 1; i >= 0; i--) {
        const { nodes } = newOrder[i];
        for (let j = nodes.length - 1; j >= 0; j--) {
          const n = nodes[j];
          if (n.nextSibling !== cursor) {
            parent.insertBefore(n, cursor);
          }
          cursor = n;
        }
      }
    };

    if (anchor.parentNode) {
      orderNodes();
    } else {
      queueMicrotask(orderNodes);
    }

    itemsMap = newItemsMap;
  });

  onDestroy(cleanup);
}

/**
 * Slot rendering helper.
 *
 * @param {object} props
 * @param {string} [name='default']
 * @param {() => Node[]} [fallback]
 * @returns {Node[]}
 */
export function createSlot(props, name = 'default', fallback = null) {
  const slotFn = props && props[name];
  if (typeof slotFn === 'function') {
    const result = slotFn();
    return Array.isArray(result) ? result : [result];
  }
  if (fallback) {
    const result = fallback();
    return Array.isArray(result) ? result : [result];
  }
  return [];
}

/**
 * Mount a Liquid component to a target container.
 *
 * @param {Function} Component
 * @param {HTMLElement} target
 * @param {object} [props={}]
 * @returns {{ unmount: () => void }}
 */
export function mount(Component, target, props = {}) {
  let rootNodes = [];
  const scope = createScope(() => {
    const rendered = Component(props);
    rootNodes = Array.isArray(rendered) ? rendered : [rendered];
    for (const node of rootNodes) {
      if (node) target.appendChild(node);
    }
  });

  return {
    unmount() {
      scope.dispose();
      for (const node of rootNodes) {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
      rootNodes = [];
    }
  };
}
