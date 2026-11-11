/**
 * Liquid Android Batch Renderer
 *
 * Serializes UI operations into a compact, numeric op-code batch
 * transmitted to the native Android UI thread once per frame.
 */

import {
  OP_CREATE_NODE,
  OP_CREATE_TEXT,
  OP_SET_PROP,
  OP_SET_STYLE,
  OP_SET_TEXT,
  OP_INSERT,
  OP_REMOVE,
  OP_LISTEN,
  OP_UNLISTEN,
  TYPE_VIEW,
  TYPE_TEXT,
  TYPE_IMAGE,
  TYPE_INPUT,
  TYPE_BUTTON,
  TYPE_SCROLL,
  TAG_TO_PRIMITIVE,
  Renderer
} from './renderer.js';
import { untrack, onDestroy } from './signals.js';

export class AndroidNode {
  constructor(nodeId, type, tagName = '') {
    this._nodeId = nodeId; // Immutable integer ID for native ops
    this.type = type;       // 'element' | 'text' | 'comment'
    this.tagName = tagName ? tagName.toLowerCase() : '';
    this.nativeType = TAG_TO_PRIMITIVE[this.tagName] || TYPE_VIEW;
    this.props = {};
    this.style = {};
    this.data = '';
    this.parentNode = null;
    this.children = [];
    this.nodeType = type === 'text' ? 3 : (type === 'comment' ? 8 : 1);
    this._listeners = new Map(); // eventName -> Set<handlerId>
  }

  get id() {
    return this.props['id'] !== undefined ? this.props['id'] : this._nodeId;
  }

  set id(val) {
    this.props['id'] = val;
  }

  get textContent() {
    if (this.nodeType === 3) return this.data;
    return this.children.map(c => c.textContent).join('');
  }

  set textContent(val) {
    if (this.nodeType === 3) {
      this.data = String(val ?? '');
    } else {
      this.children = [];
      this.data = String(val ?? '');
    }
  }

  get nextSibling() {
    if (!this.parentNode) return null;
    const idx = this.parentNode.children.indexOf(this);
    if (idx !== -1 && idx < this.parentNode.children.length - 1) {
      return this.parentNode.children[idx + 1];
    }
    return null;
  }

  get firstChild() {
    return this.children.length > 0 ? this.children[0] : null;
  }

  get lastChild() {
    return this.children.length > 0 ? this.children[this.children.length - 1] : null;
  }

  get childNodes() {
    return this.children;
  }

  get className() {
    return this.props['class'] || '';
  }

  set className(val) {
    this.props['class'] = val;
  }

  get value() {
    return this.props['value'] ?? '';
  }

  set value(val) {
    this.props['value'] = val;
  }

  get checked() {
    return Boolean(this.props['checked']);
  }

  set checked(val) {
    this.props['checked'] = Boolean(val);
  }

  setAttribute(name, value) {
    this.props[name] = value;
    if (this._renderer) {
      this._renderer.setProp(this, name, value);
    }
    if (name === 'href' && value && !this._hasHrefClickListener) {
      this._hasHrefClickListener = true;
      if (typeof this.addEventListener === 'function') {
        this.addEventListener('click', () => {
          const href = this.props['href'];
          if (href) {
            const target = href.startsWith('#') ? (href.slice(1) || '/') : href;
            if (typeof globalThis !== 'undefined' && globalThis.__liquid_router) {
              globalThis.__liquid_router.navigate(target);
            }
          }
        });
      }
    }
  }

  addEventListener(eventName, handler) {
    if (this._renderer) {
      return this._renderer.listen(this, eventName, handler);
    }
  }

  removeEventListener(eventName, handler) {
    if (this._renderer && this._listeners.has(eventName)) {
      const ids = Array.from(this._listeners.get(eventName));
      for (const hid of ids) {
        const entry = this._renderer.handlers.get(hid);
        if (entry && entry.rawHandler === handler) {
          this._renderer.unlisten(this, eventName, hid);
        }
      }
    }
  }

  getAttribute(name) {
    return this.props[name] !== undefined ? String(this.props[name]) : null;
  }

  hasAttribute(name) {
    return this.props[name] !== undefined && this.props[name] !== false && this.props[name] !== null;
  }

  removeAttribute(name) {
    delete this.props[name];
  }

  appendChild(child) {
    if (this._renderer) {
      this._renderer.insert(this, child, null);
    }
    return child;
  }

  insertBefore(child, anchor) {
    if (this._renderer) {
      this._renderer.insert(this, child, anchor);
    }
    return child;
  }

  removeChild(child) {
    if (this._renderer) {
      this._renderer.remove(child);
    }
    return child;
  }
}

export class AndroidBatchRenderer extends Renderer {
  constructor() {
    super();
    this.idCounter = 1;
    this.handlerCounter = 1;
    this.nodes = new Map();
    this.handlers = new Map();
    this.batchQueue = [];
    this.flushScheduled = false;
    this.batchDepth = 0;

    // Root node reservation (nodeId 1 = container)
    const rootNode = new AndroidNode(1, 'element', 'view');
    rootNode._renderer = this;
    this.nodes.set(1, rootNode);
    this.rootNode = rootNode;

    // Register global event dispatcher
    if (typeof globalThis !== 'undefined') {
      globalThis.__liquid_dispatch_event = this.dispatchNativeEvent.bind(this);
      globalThis.__liquid_android_renderer = this;
    }
  }

  createNode(type, props = {}) {
    const id = ++this.idCounter;
    const node = new AndroidNode(id, 'element', type);
    node._renderer = this;
    this.nodes.set(id, node);

    this.queueOp([OP_CREATE_NODE, node._nodeId, node.nativeType, node.tagName]);

    if (props && typeof props === 'object') {
      for (const [key, val] of Object.entries(props)) {
        this.setProp(node, key, val);
      }
    }
    return node;
  }

  createText(text = '') {
    const id = ++this.idCounter;
    const node = new AndroidNode(id, 'text', '');
    node._renderer = this;
    node.data = String(text ?? '');
    this.nodes.set(id, node);

    this.queueOp([OP_CREATE_TEXT, node._nodeId, node.data]);
    return node;
  }

  createComment(data = '') {
    const id = ++this.idCounter;
    const node = new AndroidNode(id, 'comment', '');
    node._renderer = this;
    node.data = String(data ?? '');
    this.nodes.set(id, node);
    return node;
  }

  setProp(node, name, value) {
    node.props[name] = value;
    this.queueOp([OP_SET_PROP, node._nodeId, name, value]);
  }

  setStyle(node, styleObject) {
    if (!styleObject) return;
    node.style = Object.assign(node.style || {}, styleObject);
    this.queueOp([OP_SET_STYLE, node._nodeId, styleObject]);
  }

  setText(node, text) {
    const str = String(text ?? '');
    node.data = str;
    this.queueOp([OP_SET_TEXT, node._nodeId, str]);
    if (node.nodeType === 3 && node.parentNode) {
      const parent = node.parentNode;
      if (parent.nativeType === TYPE_TEXT || parent.nativeType === TYPE_BUTTON) {
        const fullText = parent.textContent;
        this.queueOp([OP_SET_TEXT, parent._nodeId, fullText]);
      }
    }
  }

  insert(parent, child, anchor = null) {
    if (!parent || !child) return;

    if (child.parentNode && child.parentNode !== parent) {
      this.remove(child);
    }

    child.parentNode = parent;
    const children = parent.children;
    const oldIdx = children.indexOf(child);
    if (oldIdx !== -1) {
      children.splice(oldIdx, 1);
    }

    if (anchor && anchor.parentNode === parent) {
      const anchorIdx = children.indexOf(anchor);
      if (anchorIdx !== -1) {
        children.splice(anchorIdx, 0, child);
      } else {
        children.push(child);
      }
    } else {
      children.push(child);
    }

    this.queueOp([OP_INSERT, parent._nodeId, child._nodeId, anchor ? anchor._nodeId : 0]);

    // If parent is a text or button element, also update parent's full aggregated text
    if (parent.nativeType === TYPE_TEXT || parent.nativeType === TYPE_BUTTON) {
      const fullText = parent.textContent;
      this.queueOp([OP_SET_TEXT, parent._nodeId, fullText]);
    }
  }

  remove(node) {
    if (!node) return;
    const parent = node.parentNode;
    if (parent) {
      const idx = parent.children.indexOf(node);
      if (idx !== -1) {
        parent.children.splice(idx, 1);
      }
      node.parentNode = null;
    }
    this.queueOp([OP_REMOVE, node._nodeId]);
    if (parent && (parent.nativeType === TYPE_TEXT || parent.nativeType === TYPE_BUTTON)) {
      const fullText = parent.textContent;
      this.queueOp([OP_SET_TEXT, parent._nodeId, fullText]);
    }
  }

  listen(node, eventName, handler, modifiers = []) {
    const handlerId = ++this.handlerCounter;
    const hasOnce = modifiers.includes('once');
    const hasPrevent = modifiers.includes('prevent') || modifiers.includes('prev');
    const hasStop = modifiers.includes('stop');
    const hasEnter = modifiers.includes('enter');
    const hasEscape = modifiers.includes('escape');

    const wrappedHandler = (e) => {
      if (hasEnter && e && e.key !== 'Enter' && e.keyCode !== 13) return;
      if (hasEscape && e && e.key !== 'Escape' && e.keyCode !== 27) return;
      if (hasPrevent && e && typeof e.preventDefault === 'function') e.preventDefault();
      if (hasStop && e && typeof e.stopPropagation === 'function') e.stopPropagation();

      if (typeof handler === 'function') {
        untrack(() => handler(e));
      }

      if (hasOnce) {
        this.unlisten(node, eventName, handlerId);
      }
    };

    this.handlers.set(handlerId, { node, eventName, wrappedHandler, rawHandler: handler });

    if (!node._listeners.has(eventName)) {
      node._listeners.set(eventName, new Set());
    }
    node._listeners.get(eventName).add(handlerId);

    this.queueOp([OP_LISTEN, node._nodeId, eventName, handlerId]);

    const cleanup = () => {
      this.unlisten(node, eventName, handlerId);
    };

    onDestroy(cleanup);
    return cleanup;
  }

  unlisten(node, eventName, handlerId) {
    if (this.handlers.has(handlerId)) {
      this.handlers.delete(handlerId);
    }
    if (node._listeners && node._listeners.has(eventName)) {
      node._listeners.get(eventName).delete(handlerId);
    }
    this.queueOp([OP_UNLISTEN, node._nodeId, eventName, handlerId]);
  }

  queueOp(op) {
    this.batchQueue.push(op);
    if (this.batchDepth === 0) {
      this.scheduleFlush();
    }
  }

  batch(fn) {
    this.batchDepth++;
    try {
      return fn();
    } finally {
      this.batchDepth--;
      if (this.batchDepth === 0) {
        this.scheduleFlush();
      }
    }
  }

  scheduleFlush() {
    if (!this.flushScheduled) {
      this.flushScheduled = true;
      const doFlush = () => {
        this.flush();
      };
      if (typeof queueMicrotask === 'function') {
        queueMicrotask(doFlush);
      } else if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(doFlush);
      } else {
        setTimeout(doFlush, 0);
      }
    }
  }

  flush() {
    this.flushScheduled = false;
    if (this.batchQueue.length === 0) return [];

    const batch = this.batchQueue;
    this.batchQueue = [];

    if (typeof globalThis !== 'undefined' && globalThis.__liquid_native_bridge && typeof globalThis.__liquid_native_bridge.applyBatch === 'function') {
      try {
        console.log(`[LiquidDbg] Sending batch of ${batch.length} ops to native bridge`);
        globalThis.__liquid_native_bridge.applyBatch(JSON.stringify(batch));
      } catch (err) {
        console.error('[LiquidDbg] Error in applyBatch:', err);
      }
    }

    return batch;
  }

  dispatchNativeEvent(nodeId, eventName, payload) {
    console.log(`[LiquidDbg] JS dispatchNativeEvent: nodeId=${nodeId}, eventName=${eventName}`);
    const node = this.nodes.get(nodeId);
    if (!node) {
      console.warn(`[LiquidDbg] Node ${nodeId} not found in renderer.nodes`);
      return;
    }
    if (!node._listeners || !node._listeners.has(eventName)) {
      console.warn(`[LiquidDbg] Node ${nodeId} has no listeners for '${eventName}'`);
      return;
    }

    const event = Object.assign(
      {
        type: eventName,
        target: node,
        currentTarget: node,
        preventDefault() {},
        stopPropagation() {}
      },
      typeof payload === 'object' && payload !== null ? payload : {}
    );

    const handlerIds = Array.from(node._listeners.get(eventName));
    console.log(`[LiquidDbg] Found ${handlerIds.length} handlers for node ${nodeId} event '${eventName}'`);
    for (const hid of handlerIds) {
      const entry = this.handlers.get(hid);
      if (entry && typeof entry.wrappedHandler === 'function') {
        try {
          console.log(`[LiquidDbg] Executing handlerId=${hid} for node ${nodeId}`);
          entry.wrappedHandler(event);
          console.log(`[LiquidDbg] HandlerId=${hid} completed successfully`);
        } catch (err) {
          console.error(`[LiquidDbg] HandlerId=${hid} threw exception:`, err);
        }
      }
    }

    // Schedule flush for all ops triggered by event
    if (this.batchQueue.length > 0) {
      console.log(`[LiquidDbg] Event triggered ${this.batchQueue.length} UI ops, scheduling flush`);
      this.scheduleFlush();
    } else {
      console.log(`[LiquidDbg] Event produced 0 UI ops`);
    }
  }
}
