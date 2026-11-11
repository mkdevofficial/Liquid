import { effect, createScope, signal, untrack, onDestroy } from './signals.js';
import { Renderer, getRenderer, setRenderer } from './renderer.js';
import { AndroidBatchRenderer } from './android-renderer.js';

export { Renderer, getRenderer, setRenderer };

const UNITLESS_NUMBER_STYLES = new Set([
  'opacity',
  'zIndex',
  'flex',
  'flexGrow',
  'flexShrink',
  'flexOrder',
  'fontWeight',
  'lineHeight',
  'zoom',
  'order'
]);

/**
 * Standard Web DOM Renderer.
 */
export class DOMRenderer extends Renderer {
  createNode(type) {
    const lower = type.toLowerCase();
    let el;
    if (lower === 'view') {
      el = document.createElement('div');
    } else if (lower === 'text') {
      el = document.createElement('span');
    } else if (lower === 'image') {
      el = document.createElement('img');
    } else if (lower === 'input') {
      el = document.createElement('input');
    } else if (lower === 'button') {
      el = document.createElement('button');
    } else if (lower === 'scroll') {
      el = document.createElement('div');
      el.style.overflowY = 'auto';
      el.style.overflowX = 'hidden';
      el.style.webkitOverflowScrolling = 'touch';
    } else {
      el = document.createElement(type);
    }
    return el;
  }

  createText(initialText = '') {
    return document.createTextNode(String(initialText ?? ''));
  }

  createComment(text = '') {
    return document.createComment(String(text ?? ''));
  }

  setProp(node, name, value) {
    const isProp = name === 'value' || name === 'checked' || name === 'selectedIndex';
    if (isProp) {
      const nextVal = value ?? (name === 'checked' ? false : '');
      if (node[name] !== nextVal) {
        node[name] = nextVal;
      }
    } else if (value === false || value === null || value === undefined) {
      node.removeAttribute(name);
    } else if (value === true) {
      node.setAttribute(name, '');
    } else {
      node.setAttribute(name, String(value));
    }
  }

  setStyle(node, styleObject) {
    if (!styleObject || !node.style) return;

    if (typeof styleObject === 'string') {
      node.style.cssText = styleObject;
      return;
    }

    if (typeof styleObject === 'object') {
      for (const [key, val] of Object.entries(styleObject)) {
        if (val === null || val === undefined || val === '') {
          node.style[key] = '';
        } else if (typeof val === 'number' && !UNITLESS_NUMBER_STYLES.has(key)) {
          node.style[key] = `${val}px`;
        } else {
          node.style[key] = String(val);
        }
      }
    }
  }

  setText(node, text) {
    const str = String(text ?? '');
    if (node.nodeType === 3) {
      node.data = str;
    } else {
      node.textContent = str;
    }
  }

  insert(parent, child, anchor = null) {
    if (!parent || !child) return;
    parent.insertBefore(child, anchor || null);
  }

  remove(node) {
    if (!node || !node.parentNode) return;
    node.parentNode.removeChild(node);
  }

  listen(el, eventName, handler, modifiers = []) {
    const hasPrevent = modifiers.includes('prevent') || modifiers.includes('prev');
    const hasStop = modifiers.includes('stop');
    const hasOnce = modifiers.includes('once');
    const hasSelf = modifiers.includes('self');

    // Key modifiers
    const hasEnter = modifiers.includes('enter');
    const hasEscape = modifiers.includes('escape') || modifiers.includes('esc');
    const hasTab = modifiers.includes('tab');
    const hasSpace = modifiers.includes('space');
    const hasDelete = modifiers.includes('delete');
    const hasUp = modifiers.includes('up');
    const hasDown = modifiers.includes('down');
    const hasLeft = modifiers.includes('left');
    const hasRight = modifiers.includes('right');

    const hasKeyModifiers = hasEnter || hasEscape || hasTab || hasSpace || hasDelete || hasUp || hasDown || hasLeft || hasRight;

    function wrappedListener(e) {
      if (hasSelf && e && e.target !== el) return;

      if (hasKeyModifiers && e) {
        if (e.isComposing) return;

        const key = typeof e.key === 'string' ? e.key : '';
        const keyCode = typeof e.keyCode === 'number' ? e.keyCode : 0;
        const which = typeof e.which === 'number' ? e.which : 0;

        if (hasEnter) {
          const isEnter = key === 'Enter' || key === 'enter' || keyCode === 13 || which === 13;
          if (!isEnter) return;
        }
        if (hasEscape) {
          const isEsc = key === 'Escape' || key === 'Esc' || keyCode === 27 || which === 27;
          if (!isEsc) return;
        }
        if (hasTab) {
          const isTab = key === 'Tab' || keyCode === 9 || which === 9;
          if (!isTab) return;
        }
        if (hasSpace) {
          const isSpace = key === ' ' || key === 'Spacebar' || keyCode === 32 || which === 32;
          if (!isSpace) return;
        }
        if (hasDelete) {
          const isDelete = key === 'Delete' || key === 'Backspace' || keyCode === 8 || keyCode === 46;
          if (!isDelete) return;
        }
        if (hasUp) {
          const isUp = key === 'ArrowUp' || key === 'Up' || keyCode === 38 || which === 38;
          if (!isUp) return;
        }
        if (hasDown) {
          const isDown = key === 'ArrowDown' || key === 'Down' || keyCode === 40 || which === 40;
          if (!isDown) return;
        }
        if (hasLeft) {
          const isLeft = key === 'ArrowLeft' || key === 'Left' || keyCode === 37 || which === 37;
          if (!isLeft) return;
        }
        if (hasRight) {
          const isRight = key === 'ArrowRight' || key === 'Right' || keyCode === 39 || which === 39;
          if (!isRight) return;
        }
      }

      if (hasPrevent && e && typeof e.preventDefault === 'function') e.preventDefault();
      if (hasStop && e && typeof e.stopPropagation === 'function') e.stopPropagation();

      if (typeof handler === 'function') {
        untrack(() => handler(e));
      }
    }

    if (typeof el.addEventListener === 'function') {
      el.addEventListener(eventName, wrappedListener, { once: hasOnce });
    }

    const cleanup = () => {
      if (typeof el.removeEventListener === 'function') {
        el.removeEventListener(eventName, wrappedListener);
      }
    };

    onDestroy(cleanup);
    return cleanup;
  }

  unlisten(node, event, handler) {
    if (node && typeof node.removeEventListener === 'function') {
      node.removeEventListener(event, handler);
    }
  }

  batch(fn) {
    return fn();
  }

  flush() {}
}

/**
 * Return current active renderer or initialize appropriate default.
 */
function resolveRenderer() {
  let r = getRenderer();
  if (!r) {
    if (typeof globalThis !== 'undefined' && globalThis.__liquid_native_bridge) {
      r = new AndroidBatchRenderer();
    } else if (typeof document !== 'undefined') {
      r = new DOMRenderer();
    } else {
      r = new AndroidBatchRenderer();
    }
    setRenderer(r);
  }
  return r;
}

/**
 * Create an element with optional attributes and classes.
 */
export function element(tag, scopeAttr, classes) {
  const r = resolveRenderer();
  const el = r.createNode(tag);
  if (scopeAttr) {
    r.setProp(el, scopeAttr, '');
  }
  if (classes && classes.length > 0) {
    r.setProp(el, 'class', classes.join(' '));
  }
  return el;
}

/**
 * Create a text node.
 */
export function text(initialText = '') {
  const r = resolveRenderer();
  return r.createText(initialText);
}

/**
 * Create an anchor (comment) node for control flow blocks.
 */
export function comment(data = '') {
  const r = resolveRenderer();
  if (typeof r.createComment === 'function') {
    return r.createComment(data);
  }
  if (typeof document !== 'undefined') {
    return document.createComment(data);
  }
  return r.createText('');
}

/**
 * Bind a reactive text expression.
 */
export function bindText(targetNode, getter) {
  const r = resolveRenderer();
  effect(() => {
    const val = getter();
    r.setText(targetNode, val);
  });
}

/**
 * Bind an attribute or property reactively.
 */
export function bindAttr(el, name, getter) {
  const r = resolveRenderer();
  effect(() => {
    const val = getter();
    r.setProp(el, name, val);
  });
}

/**
 * Set style object on element.
 */
export function setStyle(el, styleObject) {
  const r = resolveRenderer();
  r.setStyle(el, styleObject);
}

/**
 * Bind reactive style object on element.
 */
export function bindStyle(el, getter) {
  const r = resolveRenderer();
  effect(() => {
    const val = getter();
    r.setStyle(el, val);
  });
}

/**
 * Attach an event listener.
 */
export function listen(el, eventName, handler, modifiers = []) {
  const r = resolveRenderer();
  return r.listen(el, eventName, handler, modifiers);
}

/**
 * Two-way bind an input element to a signal.
 */
export function bindInput(el, sig, prop = 'value') {
  const isCheckbox = prop === 'checked' || (el.type === 'checkbox' && prop === 'value');
  if (isCheckbox) {
    bindAttr(el, 'checked', () => sig());
    listen(el, 'change', (e) => {
      const checked = e.target ? Boolean(e.target.checked) : Boolean(e.checked);
      sig.set(checked);
    });
  } else {
    bindAttr(el, 'value', () => sig());
    const ev = (el.tagName === 'SELECT' || (el.tagName && el.tagName.toUpperCase() === 'SELECT')) ? 'change' : 'input';
    listen(el, ev, (e) => {
      const val = e.target ? e.target.value : (e.value ?? '');
      sig.set(val);
    });
  }
}

/**
 * Insert child into parent before anchor.
 */
export function insert(parent, node, anchor = null) {
  const r = resolveRenderer();
  r.insert(parent, node, anchor);
}

/**
 * Append multiple children to a parent element.
 */
export function append(parent, ...children) {
  const r = resolveRenderer();
  for (const child of children) {
    if (child) r.insert(parent, child, null);
  }
}

/**
 * Remove a node from its parent.
 */
export function remove(node) {
  const r = resolveRenderer();
  r.remove(node);
}

/**
 * Create a reactive if-block at an anchor point.
 */
export function createIfBlock(anchor, conditionFn, thenFn, elseFn = null) {
  const r = resolveRenderer();
  let currentScope = null;
  let currentNodes = [];
  let currentBranch = null;
  let isDestroyed = false;

  function cleanup() {
    if (currentScope) {
      currentScope.dispose();
      currentScope = null;
    }
    for (const node of currentNodes) {
      r.remove(node);
    }
    currentNodes = [];
  }

  effect(() => {
    if (isDestroyed) return;
    const condition = Boolean(conditionFn());
    if (condition === currentBranch) {
      return;
    }

    cleanup();
    currentBranch = condition;

    const renderFn = condition ? thenFn : elseFn;
    if (renderFn) {
      currentScope = createScope(() => {
        const result = renderFn();
        const nodes = Array.isArray(result) ? result : [result];
        currentNodes = nodes;

        let retryCount = 0;
        const insertNodes = () => {
          if (isDestroyed || currentNodes !== nodes) return;
          const parent = anchor.parentNode;
          if (parent) {
            for (const n of nodes) {
              if (n) r.insert(parent, n, anchor);
            }
          } else if (retryCount++ < 20) {
            queueMicrotask(insertNodes);
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

  onDestroy(() => {
    isDestroyed = true;
    cleanup();
  });
}

/**
 * Create a keyed reactive each-block with minimal mutations.
 */
export function createEachBlock(anchor, listFn, keyFn, renderItemFn) {
  const r = resolveRenderer();
  let itemsMap = new Map();
  let isDestroyed = false;

  function cleanup() {
    for (const { scope, nodes } of itemsMap.values()) {
      scope.dispose();
      for (const n of nodes) {
        r.remove(n);
      }
    }
    itemsMap.clear();
  }

  effect(() => {
    if (isDestroyed) return;
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

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      let key = keyFn ? keyFn(item, i) : i;

      if (key === undefined || key === null) {
        if (keyFn) {
          console.warn(`[Liquid Warning] Key function returned ${key} for item at index ${i}. Falling back to index.`);
        }
        key = i;
      }

      let mapKey = key;
      if (seenKeys.has(key)) {
        console.warn(`[Liquid Warning] Duplicate key "${String(key)}" detected in <each> block at index ${i}. Keys must be unique to ensure proper reconciliation.`);
        mapKey = `${key}__liquid_dup_${i}`;
      }
      seenKeys.add(key);

      if (itemsMap.has(mapKey)) {
        const existing = itemsMap.get(mapKey);
        existing.itemSignal.set(item);
        existing.indexSignal.set(i);
        newItemsMap.set(mapKey, existing);
        newOrder.push(existing);
        itemsMap.delete(mapKey);
      } else {
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

    // Remove deleted items
    for (const { scope, nodes } of itemsMap.values()) {
      scope.dispose();
      for (const n of nodes) {
        r.remove(n);
      }
    }

    // Position nodes before anchor
    let retryCount = 0;
    const currentOrder = newOrder;
    const orderNodes = () => {
      if (isDestroyed) return;
      const parent = anchor.parentNode;
      if (!parent) {
        if (retryCount++ < 20) {
          queueMicrotask(orderNodes);
        }
        return;
      }

      let cursor = anchor;
      for (let i = currentOrder.length - 1; i >= 0; i--) {
        const { nodes } = currentOrder[i];
        for (let j = nodes.length - 1; j >= 0; j--) {
          const n = nodes[j];
          if (n.nextSibling !== cursor) {
            r.insert(parent, n, cursor);
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

  onDestroy(() => {
    isDestroyed = true;
    cleanup();
  });
}

/**
 * Slot rendering helper.
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
 */
export function mount(Component, target, props = {}) {
  const r = resolveRenderer();
  let rootNodes = [];
  const scope = createScope(() => {
    const rendered = Component(props);
    rootNodes = Array.isArray(rendered) ? rendered : [rendered];
    for (const node of rootNodes) {
      if (node) r.insert(target, node, null);
    }
  });

  return {
    unmount() {
      scope.dispose();
      for (const node of rootNodes) {
        r.remove(node);
      }
      rootNodes = [];
    }
  };
}
