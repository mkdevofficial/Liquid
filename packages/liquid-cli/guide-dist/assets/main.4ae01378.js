let activeSubscriber = null;
let currentScope = null;
let batchDepth = 0;
const pendingEffects = new Set();
function getActiveSubscriber() {
  return activeSubscriber;
}
function getCurrentScope() {
  return currentScope;
}
function signal(initialValue, equals = Object.is) {
  let value = initialValue;
  const subscribers = new Set();
  function read() {
    if (activeSubscriber) {
      subscribers.add(activeSubscriber);
      activeSubscriber.dependencies.add(subscribers);
    }
    return value;
  }
  function write(nextValue) {
    if (!equals(value, nextValue)) {
      value = nextValue;
      notifySubscribers();
    }
    return value;
  }
  function notifySubscribers() {
    const subs = Array.from(subscribers);
    for (const sub of subs) {
      sub.notify();
    }
    if (batchDepth === 0) {
      flushEffects();
    }
  }
  const accessor = function(newValue) {
    if (arguments.length > 0) {
      return write(newValue);
    }
    return read();
  };
  accessor.set = (next) => write(next);
  accessor.update = (updater) => write(updater(value));
  accessor.peek = () => value;
  accessor.isSignal = true;
  Object.defineProperty(accessor, 'value', {
    get: () => read(),
    set: (next) => write(next),
    configurable: true,
    enumerable: true
  });
  return accessor;
}
function computed(computeFn, equals = Object.is) {
  let value;
  let dirty = true;
  const subscribers = new Set();
  const dependencies = new Set();
  const node = {
    dependencies,
    notify() {
      if (!dirty) {
        dirty = true;
        const subs = Array.from(subscribers);
        for (const sub of subs) {
          sub.notify();
        }
      }
    }
  };
  function evaluate() {
    for (const dep of dependencies) {
      dep.delete(node);
    }
    dependencies.clear();
    const prevSubscriber = activeSubscriber;
    activeSubscriber = node;
    try {
      const nextValue = computeFn();
      dirty = false;
      if (!equals(value, nextValue)) {
        value = nextValue;
      }
    } finally {
      activeSubscriber = prevSubscriber;
    }
  }
  function read() {
    if (dirty) {
      evaluate();
    }
    if (activeSubscriber) {
      subscribers.add(activeSubscriber);
      activeSubscriber.dependencies.add(subscribers);
    }
    return value;
  }
  const accessor = function() {
    return read();
  };
  accessor.peek = () => {
    if (dirty) evaluate();
    return value;
  };
  accessor.isComputed = true;
  Object.defineProperty(accessor, 'value', {
    get: () => read(),
    configurable: true,
    enumerable: true
  });
  return accessor;
}
function effect(effectFn) {
  let cleanup = null;
  let disposed = false;
  const dependencies = new Set();
  const node = {
    dependencies,
    notify() {
      if (disposed) return;
      if (batchDepth > 0) {
        pendingEffects.add(run);
      } else {
        run();
      }
    }
  };
  function run() {
    if (disposed) return;
    if (typeof cleanup === 'function') {
      try {
        cleanup();
      } catch (err) {
        console.error('Error during effect cleanup:', err);
      }
      cleanup = null;
    }
    for (const dep of dependencies) {
      dep.delete(node);
    }
    dependencies.clear();
    const prevSubscriber = activeSubscriber;
    activeSubscriber = node;
    try {
      cleanup = effectFn();
    } finally {
      activeSubscriber = prevSubscriber;
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    if (typeof cleanup === 'function') {
      try {
        cleanup();
      } catch (err) {
        console.error('Error during effect disposal:', err);
      }
      cleanup = null;
    }
    for (const dep of dependencies) {
      dep.delete(node);
    }
    dependencies.clear();
    pendingEffects.delete(run);
  }
  if (currentScope) {
    currentScope.effects.add(dispose);
  }
  run();
  return dispose;
}
function batch(fn) {
  batchDepth++;
  try {
    return fn();
  } finally {
    batchDepth--;
    if (batchDepth === 0) {
      flushEffects();
    }
  }
}
function flushEffects() {
  if (pendingEffects.size === 0) return;
  const queue = Array.from(pendingEffects);
  pendingEffects.clear();
  for (const eff of queue) {
    eff();
  }
}
function untrack(fn) {
  const prevSubscriber = activeSubscriber;
  activeSubscriber = null;
  try {
    return fn();
  } finally {
    activeSubscriber = prevSubscriber;
  }
}
function createScope(fn) {
  const scope = {
    effects: new Set(),
    cleanups: [],
    dispose() {
      const cleanups = [...scope.cleanups];
      scope.cleanups = [];
      for (const cleanup of cleanups) {
        try {
          cleanup();
        } catch (err) {
          console.error('Error during scope cleanup:', err);
        }
      }
      const effects = Array.from(scope.effects);
      scope.effects.clear();
      for (const disposeEff of effects) {
        disposeEff();
      }
    }
  };
  const prevScope = currentScope;
  currentScope = scope;
  try {
    fn?.(scope);
  } finally {
    currentScope = prevScope;
  }
  return scope;
}
function onDestroy(fn) {
  if (currentScope) {
    currentScope.cleanups.push(fn);
  }
}
function onMount(fn) {
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(() => {
      const cleanup = fn();
      if (typeof cleanup === 'function' && currentScope) {
        currentScope.cleanups.push(cleanup);
      }
    });
  } else {
    const cleanup = fn();
    if (typeof cleanup === 'function' && currentScope) {
      currentScope.cleanups.push(cleanup);
    }
  }
}
function element(tag, scopeAttr, classes) {
  const el = document.createElement(tag);
  if (scopeAttr) {
    el.setAttribute(scopeAttr, '');
  }
  if (classes && classes.length > 0) {
    el.className = classes.join(' ');
  }
  return el;
}
function text(initialText = '') {
  return document.createTextNode(String(initialText ?? ''));
}
function bindText(targetNode, getter) {
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
function bindAttr(el, name, getter) {
  const isProp = name === 'value' || name === 'checked' || name === 'selectedIndex';
  effect(() => {
    const val = getter();
    if (isProp) {
      const nextVal = val ?? (name === 'checked' ? false : '');
      if (el[name] !== nextVal) {
        el[name] = nextVal;
      }
    } else if (val === false || val === null || val === undefined) {
      el.removeAttribute(name);
    } else if (val === true) {
      el.setAttribute(name, '');
    } else {
      el.setAttribute(name, String(val));
    }
  });
}
function listen(el, eventName, handler, modifiers = []) {
  const hasPrevent = modifiers.includes('prevent') || modifiers.includes('prev');
  const hasStop = modifiers.includes('stop');
  const hasOnce = modifiers.includes('once');
  const hasSelf = modifiers.includes('self');
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
    if (hasPrevent) e.preventDefault();
    if (hasStop) e.stopPropagation();
    if (typeof handler === 'function') {
      untrack(() => handler(e));
    }
  }
  el.addEventListener(eventName, wrappedListener, { once: hasOnce });
  const cleanup = () => {
    el.removeEventListener(eventName, wrappedListener);
  };
  onDestroy(cleanup);
  return cleanup;
}
function bindInput(el, sig, prop = 'value') {
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
function insert(parent, node, anchor = null) {
  parent.insertBefore(node, anchor);
}
function append(parent, ...children) {
  for (const child of children) {
    if (child) parent.appendChild(child);
  }
}
function createIfBlock(anchor, conditionFn, thenFn, elseFn = null) {
  let currentScope = null;
  let currentNodes = [];
  let currentBranch = null; // true, false, or null
  let isDestroyed = false;
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
    if (isDestroyed) return;
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
        let retryCount = 0;
        const insertNodes = () => {
          if (isDestroyed || currentNodes !== nodes) return;
          const parent = anchor.parentNode;
          if (parent) {
            for (const n of nodes) {
              if (n) parent.insertBefore(n, anchor);
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
function createEachBlock(anchor, listFn, keyFn, renderItemFn) {
  let itemsMap = new Map(); // key -> { scope, nodes, itemSignal, indexSignal }
  let isDestroyed = false;
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
        console.warn(`[Liquid Warning] Duplicate key "${String(key)}" detected in <each> block at index ${i}. Keys must be unique to ensure proper DOM reconciliation.`);
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
    for (const { scope, nodes } of itemsMap.values()) {
      scope.dispose();
      for (const n of nodes) {
        if (n.parentNode) n.parentNode.removeChild(n);
      }
    }
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
  onDestroy(() => {
    isDestroyed = true;
    cleanup();
  });
}
function createSlot(props, name = 'default', fallback = null) {
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
function mount(Component, target, props = {}) {
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
function createStore(initialState) {
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
function head({ title, meta = {}, link = {} }) {
  if (typeof document === 'undefined') return;
  const createdElements = [];
  const dispose = effect(() => {
    if (title !== undefined) {
      const titleVal = typeof title === 'function' ? title() : title;
      document.title = String(titleVal ?? '');
    }
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
function matchRoute(pattern, pathname) {
  if (pattern === '*' || pattern === '(.*)') {
    return { matches: true, params: {} };
  }
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);
  if (patternSegments.length !== pathSegments.length) {
    return { matches: false, params: {} };
  }
  const params = {};
  for (let i = 0; i < patternSegments.length; i++) {
    const pat = patternSegments[i];
    const seg = pathSegments[i];
    if (pat.startsWith(':')) {
      const paramName = pat.slice(1);
      params[paramName] = decodeURIComponent(seg);
    } else if (pat !== seg) {
      return { matches: false, params: {} };
    }
  }
  return { matches: true, params };
}
function parseQuery(searchStr) {
  const query = {};
  if (!searchStr) return query;
  const cleaned = searchStr.replace(/^\?/, '');
  for (const part of cleaned.split('&')) {
    if (!part) continue;
    const [k, v] = part.split('=');
    query[decodeURIComponent(k)] = v !== undefined ? decodeURIComponent(v) : true;
  }
  return query;
}
function createRouter({ routes = [], mode = 'hash' }) {
  const currentUrl = signal(getCurrentLocation(mode));
  function updateLocation() {
    currentUrl.set(getCurrentLocation(mode));
  }
  if (typeof window !== 'undefined') {
    if (mode === 'hash') {
      window.addEventListener('hashchange', updateLocation);
    } else {
      window.addEventListener('popstate', updateLocation);
    }
  }
  const currentRoute = computed(() => {
    const raw = currentUrl();
    const [pathPart, queryPart] = raw.split('?');
    const pathname = pathPart || '/';
    const query = parseQuery(queryPart);
    for (const route of routes) {
      const match = matchRoute(route.path, pathname);
      if (match.matches) {
        return {
          path: pathname,
          params: match.params,
          query,
          component: route.component,
          route
        };
      }
    }
    return {
      path: pathname,
      params: {},
      query,
      component: null,
      route: null
    };
  });
  const currentPath = computed(() => currentRoute().path);
  const currentParams = computed(() => currentRoute().params);
  const currentComponent = computed(() => currentRoute().component);
  function navigate(to, { replace = false } = {}) {
    if (typeof window === 'undefined') {
      currentUrl.set(to);
      return;
    }
    if (mode === 'hash') {
      const targetHash = to.startsWith('#') ? to : `#${to}`;
      if (replace) {
        window.location.replace(targetHash);
      } else {
        window.location.hash = targetHash;
      }
    } else {
      if (replace) {
        window.history.replaceState(null, '', to);
      } else {
        window.history.pushState(null, '', to);
      }
      updateLocation();
    }
  }
  function back() {
    if (typeof window !== 'undefined') window.history.back();
  }
  function forward() {
    if (typeof window !== 'undefined') window.history.forward();
  }
  function destroy() {
    if (typeof window !== 'undefined') {
      if (mode === 'hash') {
        window.removeEventListener('hashchange', updateLocation);
      } else {
        window.removeEventListener('popstate', updateLocation);
      }
    }
  }
  function RouterView(props = {}) {
    const anchor = document.createComment('router-view');
    let currentRenderedNodes = [];
    const initialRoute = currentRoute();
    const initialComp = initialRoute.component;
    if (initialComp) {
      const rendered = untrack(() => initialComp({ ...props, params: initialRoute.params, query: initialRoute.query }));
      currentRenderedNodes = Array.isArray(rendered) ? rendered : [rendered];
    }
    let isInitial = true;
    effect(() => {
      const route = currentRoute();
      const Comp = route.component;
      if (isInitial) {
        isInitial = false;
        return; // Already rendered synchronously on creation
      }
      for (const n of currentRenderedNodes) {
        if (n.parentNode) n.parentNode.removeChild(n);
      }
      currentRenderedNodes = [];
      if (Comp) {
        const rendered = untrack(() => Comp({ ...props, params: route.params, query: route.query }));
        const nodes = Array.isArray(rendered) ? rendered : [rendered];
        currentRenderedNodes = nodes;
        const parent = anchor.parentNode;
        if (parent) {
          for (const n of nodes) {
            if (n) parent.insertBefore(n, anchor);
          }
        }
      }
    });
    return [...currentRenderedNodes, anchor];
  }
  function Link({ to, text: linkText = '', classes = [], children = null }) {
    const a = element('a', null, classes);
    const href = mode === 'hash' ? (to.startsWith('#') ? to : `#${to}`) : to;
    a.setAttribute('href', href);
    if (linkText) {
      a.appendChild(text(linkText));
    }
    a.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      navigate(to);
    });
    return a;
  }
  return {
    mode,
    currentUrl,
    currentRoute,
    currentPath,
    currentParams,
    currentComponent,
    navigate,
    back,
    forward,
    destroy,
    RouterView,
    Link
  };
}
function getCurrentLocation(mode) {
  if (typeof window === 'undefined') return '/';
  if (mode === 'hash') {
    const h = window.location.hash;
    return h.slice(1) || '/';
  }
  return window.location.pathname + window.location.search;
}
const ERROR_LIST = [
  {
    id: 'LQ-101',
    category: 'compiler',
    titleAr: 'استخدام علامات Tab في الإزاحة',
    titleEn: 'Tab Characters in Indentation',
    summaryAr: 'تم استخدام علامة Tab أو خلط مسافات مع علامات Tab في بداية السطر.',
    summaryEn: 'Tab characters or mixed tabs/spaces were used for indentation.',
    causeAr: 'إطار عمل Liquid يعتمد على إزاحة صارمة بمقدار مسافتين (2 Spaces) لكل مستوى. علامات Tab تسبب اختلالات في التنسيق عبر المحررات وأنظمة التشغيل المختلفة ولذلك يتم رفضها صراحة.',
    causeEn: 'Liquid requires strict 2-space indentation. Tabs cause inconsistent alignment and visual nesting ambiguities across different terminals and editors.',
    badCode: `div.box
\th1 عنوان باستخدام Tab (غير مسموح)`,
    goodCode: `div.box
  h1 عنوان باستخدام مسافتين صحيحتين`,
    fixAr: 'قم بضبط محرر الأكواد على استبدال علامات Tab بمسافات (Insert Spaces) بمقدار 2 مسافات، واستبدل كافة علامات Tab الحالية بمسافات عادية.',
    fixEn: 'Configure your editor to use spaces instead of tabs with an indent size of 2, and convert existing tabs to spaces.'
  },
  {
    id: 'LQ-102',
    category: 'compiler',
    titleAr: 'عنوان قسم غير معروف في ملف المكون',
    titleEn: 'Unknown Section Header',
    summaryAr: 'يحتوي ملف .liq على عنوان قسم غير مدعوم.',
    summaryEn: 'Unrecognized section header delimiter.',
    causeAr: 'يتكون ملف .liq من 3 أقسام صالحة فقط مفصولة بثلاث شرطات: "--- logic" للمنطق البرمجي، "--- style" للأنماط المعزولة، و "--- ui" للواجهة. أي عنوان آخر يُعد خطأ.',
    causeEn: 'A .liq component file only permits three section delimiters: "--- logic", "--- style", and "--- ui".',
    badCode: `--- html
h1 وسم في قسم غير معروف!`,
    goodCode: `--- ui
h1 وسم في قسم الواجهة الرسمي`,
    fixAr: 'استخدم فقط العناوين الرسمية الثلاثة: --- logic, --- style, --- ui.',
    fixEn: 'Use only standard delimiters: --- logic, --- style, --- ui.'
  },
  {
    id: 'LQ-103',
    category: 'compiler',
    titleAr: 'مستوى إزاحة غير متوافق',
    titleEn: 'Inconsistent Indentation Level',
    summaryAr: 'مقدار الإزاحة لا يتطابق مع أي مستوى حاوٍ خارجي أو يقفز بمقدار غير زوجي.',
    summaryEn: 'Indentation level does not match any outer nesting level or step.',
    causeAr: 'يجب أن تزداد الإزاحة بمقدار مسافتين دقيقاً لكل عنصر ابن، وأن تتراجع بدقة إلى أحد مستويات العناصر الأب السابقة.',
    causeEn: 'Indentation must increase by exactly 2 spaces per level and dedent to an existing outer level.',
    badCode: `div.container
    div.card
   p إزاحة 3 مسافات خاطئة`,
    goodCode: `div.container
  div.card
    p إزاحة 4 مسافات صحيحة`,
    fixAr: 'تأكد من أن كل مستوى تفرع يستخدم مضاعفات العدد 2 من المسافات (0, 2, 4, 6, 8...).',
    fixEn: 'Ensure all nested elements use multiples of 2 spaces (0, 2, 4, 6, 8...).'
  },
  {
    id: 'LQ-104',
    category: 'compiler',
    titleAr: 'صياغة غير صحيحة لتكرار each',
    titleEn: 'Malformed \'each\' Statement Syntax',
    summaryAr: 'صياغة كتلة التكرار each غير مكتملة أو مكتوبة بأسلوب أطر أخرى.',
    summaryEn: 'Malformed each-loop expression syntax.',
    causeAr: 'يتطلب Liquid صياغة واضحة ومحددة: each <collection> as <item> [, <index>] [(<key>)].',
    causeEn: 'Liquid requires: each <collection> as <item> [, <index>] [(<key>)]. Missing "as" or key expression throws this error.',
    badCode: `each item in items
  li {item.name}`,
    goodCode: `each items as item (item.id)
  li {item.name}`,
    fixAr: 'اكتب الكلمة as بعد المصفوفة، ثم اسم العنصر المفرد، ثم المفتاح الفريد بين قوسين (item.id).',
    fixEn: 'Use the "as" keyword followed by the item identifier and a unique key in parentheses: each items as item (item.id).'
  },
  {
    id: 'LQ-105',
    category: 'compiler',
    titleAr: 'استخدام أقواس الزوايا < > في الشروط أو التكرار',
    titleEn: 'HTML Angle Brackets in Control Flow',
    summaryAr: 'تمت كتابة <if> أو <each> أو <else> بأقواس زوايا HTML.',
    summaryEn: 'Angle brackets (<if>, <each>) used for control flow statements.',
    causeAr: 'يعتمد Liquid أسلوب المسافات الخالي من الأقواس (Pug-style). استخدام الأقواس يجعل المصرف يظنها عناصر DOM مخصصة ويحاول استدعاء document.createElement(\'<if\') مما يؤدي لخطأ InvalidCharacterError.',
    causeEn: 'Liquid uses clean indentation without angle brackets or closing tags. Writing <if> creates an invalid DOM element instead of a reactive conditional branch.',
    badCode: `// خطأ:
<if isLoggedIn>
  button تسجيل الخروج
</if>`,
    goodCode: `// صحيح:
if isLoggedIn
  button تسجيل الخروج`,
    fixAr: 'احذف أقواس الزوايا ووسم الإغلاق واكتب الكلمة المفتاحية if أو else أو each مباشرة متبوعة بإزاحة المحتوى.',
    fixEn: 'Remove angle brackets and closing tags. Write "if condition" and indent children by 2 spaces.'
  },
  {
    id: 'LQ-106',
    category: 'compiler',
    titleAr: 'نص غير مقتبس يبدأ بـ $ أو @',
    titleEn: 'Reserved Directive Prefix in Plain Text',
    summaryAr: 'تمت كتابة كلمة تبدأ برمز $ أو @ كأول كلمة في نص فرعي.',
    summaryEn: 'Word starting with $ or @ parsed as directive instead of text.',
    causeAr: 'الرموز $ و @ في بداية الكلمات مخصصة للتوجيهات ($bind و @event). كتابة نص مثل $100 تجعل المحلل يظنه توجيهاً ناقصاً.',
    causeEn: 'Leading $ and @ denote $bind and @event directives. Literal text starting with these symbols must be quoted.',
    badCode: `span.price $100`,
    goodCode: `span.price "$100"
span.price {'$' + 100}`,
    fixAr: 'ضع النص بين علامات اقتباس مزدوجة مثل "$100" أو استخدم تعبير جافاسكريبت مثل {\'$\' + amount}.',
    fixEn: 'Wrap the text in double quotes "$100" or use string concatenation {\'$\' + amount}.'
  },
  {
    id: 'LQ-107',
    category: 'compiler',
    titleAr: 'اختصار غير صالح لمعرف ID أو فئة Class',
    titleEn: 'Invalid ID or Class Shorthand',
    summaryAr: 'تم وضع رمز # أو . بدون كتابة اسم المعرف أو الفئة بعده.',
    summaryEn: 'Expected identifier after # or . in shorthand selector.',
    causeAr: 'في اختصارات الوسوم (مثل div#app.container)، يجب أن يتبع الرمز # اسم المعرف ويتبع الرمز . اسم الفئة فوراً.',
    causeEn: 'Shorthand selectors require an alphanumeric identifier immediately following # or .',
    badCode: `div#
button.`,
    goodCode: `div#app
button.btn-primary`,
    fixAr: 'اكتب اسم الفئة أو المعرف مباشرة بعد الرمز بدون مسافات.',
    fixEn: 'Provide a valid identifier name immediately after # or .'
  },
  {
    id: 'LQ-108',
    category: 'compiler',
    titleAr: 'كلمة مفتاحية في موقع غير صالح',
    titleEn: 'Unexpected Keyword Location',
    summaryAr: 'تم العثور على else أو elseif بدون وجود if يسبقها.',
    summaryEn: 'Found else or elseif without matching preceding if block.',
    causeAr: 'كتلة else و elseif تتطلب وجود كتلة if مباشرة في نفس المستوى من الإزاحة لتكون تابعة لها.',
    causeEn: 'An else or elseif branch must be directly preceded by an if or elseif at the same indent level.',
    badCode: `p مرحباً
else
  p غير مسبوق بشرط!`,
    goodCode: `if isReady
  p جاهز
else
  p قيد الانتظار`,
    fixAr: 'تأكد من أن الشرط يبدأ بـ if أولاً وأن كافة تفريعات else تكون في نفس مستوى الإزاحة.',
    fixEn: 'Ensure an if statement precedes else and both share the exact same indentation level.'
  },
  {
    id: 'LQ-201',
    category: 'runtime',
    titleAr: 'قراءة إشارة غير معرفة أو خالية',
    titleEn: 'Signal Read on Undefined Variable',
    summaryAr: 'تم استدعاء إشارة أو قراءة .value على متغير يحمل undefined.',
    summaryEn: 'Attempted to invoke accessor or read .value on undefined.',
    causeAr: 'محاولة قراءة إشارة لم يتم إنشاؤها عبر signal() أو تم تعريفها دون قيمة مبدئية في قسم المنطق.',
    causeEn: 'Accessing a signal property or calling it before initialization or passing undefined.',
    badCode: `let user;
const name = computed(() => user.value.name);`,
    goodCode: `const user = signal({ name: 'ضيف' });
const name = computed(() => user.value.name);`,
    fixAr: 'قم بتهيئة الإشارة دائماً بقيمة مبدئية عبر signal(initialValue) وتأكد من استيراد signal من @mkdevofficial/liquid.',
    fixEn: 'Always initialize signals with default values using signal(initialValue).'
  },
  {
    id: 'LQ-202',
    category: 'runtime',
    titleAr: 'حلقة تفاعلية لا نهائية داخل effect()',
    titleEn: 'Infinite Reactive Cycle in Effect',
    summaryAr: 'تم تعديل إشارة داخل effect يتتبع نفس الإشارة، مما سبب تكراراً لا نهائياً.',
    summaryEn: 'Writing to a tracked signal inside an effect creates an infinite update loop.',
    causeAr: 'عندما يقوم effect بقراءة إشارة، فإنه يشترك فيها تلقائياً. وإذا قام بتعديل نفس الإشارة، فسيتم تشغيله مجدداً إلى ما لا نهاية.',
    causeEn: 'Effects automatically track every signal accessed. Mutating the tracked signal inside triggers another run indefinitely.',
    badCode: `effect(() => {
  count.value = count.value + 1; // حلقة لا نهائية!
});`,
    goodCode: `// استخدم computed لاشتقاق القيم
const doubled = computed(() => count.value * 2);
effect(() => {
  const current = untrack(() => count.value);
  saveToDatabase(current);
});`,
    fixAr: 'إذا كنت تشتق قيمة فاستخدم computed بدلاً من effect. وإذا كنت تقرأ القيمة لإرسالها فقط فاستخدم untrack(() => sig.value).',
    fixEn: 'Use computed for derived values. Use untrack(() => sig.value) if reading without subscribing.'
  },
  {
    id: 'LQ-203',
    category: 'runtime',
    titleAr: 'مفتاح مكرر في قائمة each',
    titleEn: 'Duplicate Key in Keyed List',
    summaryAr: 'يوجد عنصران أو أكثر في المصفوفة يشتركان في نفس المفتاح الفريد (Key).',
    summaryEn: 'Multiple items in an each-block share the identical key value.',
    causeAr: 'تعتمد خوارزمية تسوية الـ DOM في Liquid على تفرد المفتاح لكل عنصر للحفاظ على سلامة عقد الـ DOM والذاكرة. تكرار المفتاح يسبب سلوكاً غير متوقع.',
    causeEn: 'Liquid keyed reconciliation relies on strict uniqueness per key. Duplicate keys corrupt DOM node associations.',
    badCode: `const items = signal([
  { id: 1, name: 'A' },
  { id: 1, name: 'B' } // مفتاح 1 مكرر!
]);`,
    goodCode: `const items = signal([
  { id: 1, name: 'A' },
  { id: 2, name: 'B' } // معرفات فريدة
]);`,
    fixAr: 'تأكد من أن كل عنصر يمتلك معرفاً فريداً id، أو استخدم فهرس المصفوفة كبديل: each items as item, idx (idx).',
    fixEn: 'Ensure every item in the array has a globally unique ID, or fallback to index: each items as item, idx (idx).'
  },
  {
    id: 'LQ-301',
    category: 'router',
    titleAr: 'المسار المطلوب غير موجود (404)',
    titleEn: 'Route Not Found (404)',
    summaryAr: 'لم يتطابق الرابط المطلوب في المتصفح مع أي مسار مسجل في الموجه.',
    summaryEn: 'Requested URL hash does not match any registered route pattern.',
    causeAr: 'تم طلب مسار مثل #/profile دون أن يكون هناك مسار مطابق في مصفوفة routes لـ createRouter.',
    causeEn: 'No route pattern matches the requested pathname, and no catch-all route was provided.',
    badCode: `const routes = [
  { path: '/', component: Home }
];`,
    goodCode: `const routes = [
  { path: '/', component: Home },
  { path: '*', component: NotFound } // مسار شامل لأي رابط آخر
];`,
    fixAr: 'أضف مساراً شاملاً { path: "*", component: NotFound } في نهاية مصفوفة المسارات لمعالجة كافة الروابط غير المعروفة.',
    fixEn: 'Add a catch-all route { path: "*", component: NotFound } at the end of your routes array.'
  },
  {
    id: 'LQ-401',
    category: 'cli',
    titleAr: 'المنفذ المطلوب محجوز من برنامج آخر',
    titleEn: 'Port Already in Use',
    summaryAr: 'محاولة تشغيل خادم التطوير أو الدليل على منفذ مشغول بالفعل.',
    summaryEn: 'The requested TCP port is already bound by another process.',
    causeAr: 'يوجد برنامج آخر (أو جلسة سابقة لـ Liquid) تستخدم نفس المنفذ (مثل 3000 أو 4000).',
    causeEn: 'Another instance or application is actively listening on this port.',
    badCode: `liquid guide --port 4000 # (المنفذ مشغول بالفعل)`,
    goodCode: `liquid guide --port 4005 # (منفذ بديل متاح)`,
    fixAr: 'حدد منفذاً آخر عبر خيار --port <رقم>، أو أغلق البرنامج الذي يشغل المنفذ الحالي.',
    fixEn: 'Pass an alternative free port using --port <number> (e.g. --port 4005), or terminate the conflicting process.'
  },
  {
    id: 'LQ-402',
    category: 'cli',
    titleAr: 'ملف نقطة البداية للمشروع غير موجود',
    titleEn: 'Project Entry Point Not Found',
    summaryAr: 'تشغيل أداة liquid خارج مجلد مشروع صالح.',
    summaryEn: 'src/main.js or App.liq not found in current directory.',
    causeAr: 'تشغيل أمر liquid dev أو liquid build في مجلد لا يحتوي على هيكل مشروع Liquid (ملف src/main.js مفقود).',
    causeEn: 'Running CLI build/dev commands outside the root folder of a valid Liquid application.',
    badCode: `cd ~
liquid dev # لا يوجد مشروع هنا!`,
    goodCode: `cd my-site
liquid dev # يعمل بسلاسة داخل مجلد المشروع`,
    fixAr: 'انتقل إلى مجلد المشروع الصحيح أولاً بواسطة cd <اسم-المشروع>، أو أنشئ مشروعاً جديداً عبر liquid create my-site.',
    fixEn: 'Navigate into the project directory with cd <project-name>, or initialize a new app using liquid create <name>.'
  }
];
function getErrorById(id) {
  if (!id) return null;
  const target = id.trim().toUpperCase();
  return ERROR_LIST.find(e => e.id === target) || null;
}
const translations = {
  ar: {
    siteTitle: 'Liquid 🫟 — تعلم كيف تصنع موقعك الخاص',
    siteTagline: 'إطار العمل الحديث وفائق الإيجاز للويب مبني على Signals وبدون Virtual DOM',
    navHome: 'الرئيسية',
    navGuide: 'الدليل التعليمي',
    navPlay: '🎮 الأكاديمية (Play)',
    navPlayground: 'المعمل التفاعلي',
    navCheatsheet: 'مرجع الأوامر',
    navErrors: 'دليل الأخطاء',
    navDeploy: 'النشر والإنتاج',
    navGithub: 'المستودع',
    toggleTheme: 'تبديل المظهر',
    toggleLang: 'English',
    copiedText: 'تم النسخ إلى الحافظة! ✓',
    copyCode: 'نسخ الكود',
    livePreview: 'معاينة حية',
    viewCode: 'عرض الكود',
    tryItOut: 'جرب بنفسك',
    heroBadge: '🫟 الإصدار 0.2.0 — جاهز للإنتاج',
    heroTitle: 'اصنع موقع ويب متكامل، سريع، وفائق الإيجاز',
    heroDesc: 'Liquid يجمع بين قوة الإشارات التفاعلية (Signals) والبنية المدمجة لملفات .liq (المنطق + الأنماط + الواجهة) لتطوير مواقع ويب سريعة البرق بدون أي اعتماديات خارجية أو تعقيد.',
    btnStartLearning: 'ابدأ التعلم الآن 🚀',
    btnTryPlayground: 'جرب المعمل التفاعلي ⚡',
    quickStartCommand: 'npm install -g @mkdevofficial/liquid-cli && liquid create my-website',
    feat1Title: 'ملف واحد لكل مكون (.liq)',
    feat1Desc: 'توديع التشتت بين عشرات الملفات! يجمع المنطق (JS)، الأنماط المعزولة (CSS)، وقالب الواجهة في ملف واحد واضح.',
    feat2Title: 'تفاعلية فائقة عبر Signals',
    feat2Desc: 'تحديث دقيق ومباشر لعناصر الـ DOM المتغيرة فقط بدون الحاجة لمحاكاة شجرة افتراضية (Virtual DOM) ثقيلة.',
    feat3Title: 'بناء وإنتاج بدون اعتماديات أصلية',
    feat3Desc: 'يعمل 100% بكود جافاسكريبت نقي (ESM). يثبت ويعمل فوراً على أي خادم، هاتف محمول (Termux)، أو حاسوب شخصي.',
    threeStepTitle: 'اصنع موقعك الأول في 3 خطوات بسيطة',
    step1Num: '1',
    step1Title: 'تثبيت وإنشاء المشروع',
    step1Desc: 'استخدم سطر أوامر Liquid لإنشاء مشروعك الجاهز في ثوانٍ معدودة:',
    step2Num: '2',
    step2Title: 'بدء خادم التطوير المحلي',
    step2Desc: 'ادخل إلى مجلد المشروع وشغّل خادم التطوير الفوري مع التحديث المباشر (HMR):',
    step3Num: '3',
    step3Title: 'اكتب كود الواجهة والمنطق',
    step3Desc: 'افتح ملف src/App.liq وشاهد تغييراتك تظهر في المتصفح في أجزاء من الثانية:',
    chaptersTitle: 'فهرس الدليل الشامل',
    chOverview: '١. ما هو Liquid وفلسفته؟',
    chStructure: '٢. هيكل المشروع والملفات الأساسية',
    chAnatomy: '٣. تشريح مكون .liq (المنطق، الأنماط، الواجهة)',
    chSignals: '٤. إدارة الحالة والتفاعلية (Signals)',
    chDirectives: '٥. التوجيهات والأحداث والقوائم',
    chRouting: '٦. بناء موقع متعدد الصفحات (Routing)',
    chStyling: '٧. التصميم وعزل الأنماط (Scoped CSS)',
    chDeployment: '٨. البناء للإنتاج والاستضافة',
    playgroundTitle: 'المعمل التفاعلي للأمثلة الحية',
    playgroundDesc: 'استكشف مكونات حقيقية تعمل بـ Liquid وجرب التفاعل معها وانسخ الكود الجاهز لمشروعك:',
    tabCounter: 'عداد تفاعلي (Counter)',
    tabTodo: 'قائمة مهام (Todo List)',
    tabForm: 'نموذج مع التحقق (Live Form)',
    tabCalculator: 'حاسبة نفقات سريعة (Budget)',
    cheatsheetTitle: 'المرجع السريع لقواعد Liquid',
    cheatsheetDesc: 'نظرة سريعة على جميع الأوامر، التوجيهات، والخصائص التي تحتاجها لبناء أي موقع.',
    footerMadeWith: 'صُنع بكل فخر بواسطة إطار عمل Liquid 🫟 — بدون أي مكتبة خارجية.',
    footerDocs: 'دليل التوثيق الرسمي لـ Liquid'
  },
  en: {
    siteTitle: 'Liquid 🫟 — Learn How to Build Websites with Liquid',
    siteTagline: 'The ultra-concise, signal-based web framework without a Virtual DOM',
    navHome: 'Home',
    navGuide: 'Guide & Tutorial',
    navPlay: '🎮 Arena (Play)',
    navPlayground: 'Playground',
    navCheatsheet: 'Cheatsheet',
    navErrors: 'Error Catalog',
    navDeploy: 'Deployment',
    navGithub: 'GitHub',
    toggleTheme: 'Toggle Theme',
    toggleLang: 'العربية',
    copiedText: 'Copied to clipboard! ✓',
    copyCode: 'Copy Code',
    livePreview: 'Live Preview',
    viewCode: 'View Code',
    tryItOut: 'Try It Out',
    heroBadge: '🫟 Version 0.2.0 — Production Ready',
    heroTitle: 'Build Complete, Fast, Ultra-Concise Websites',
    heroDesc: 'Liquid unites the reactive power of Signals with single-file .liq components (logic + scoped styles + template) to craft lightning-fast web apps with zero native dependencies.',
    btnStartLearning: 'Start Learning 🚀',
    btnTryPlayground: 'Try Playground ⚡',
    quickStartCommand: 'npm install -g @mkdevofficial/liquid-cli && liquid create my-website',
    feat1Title: 'Single File Components (.liq)',
    feat1Desc: 'No more jumping between files! Logic (JS), Scoped Styles (CSS), and UI Templates live in one clean, readable file.',
    feat2Title: 'Fine-Grained Signals Reactivity',
    feat2Desc: 'Surgically updates only the exact DOM nodes that change, completely eliminating heavy Virtual DOM reconciliation.',
    feat3Title: 'Zero Native Dependencies',
    feat3Desc: 'Pure modern JavaScript (ESM). Installs and runs instantly on any server, phone (Termux), or desktop.',
    threeStepTitle: 'Build Your First Site in 3 Simple Steps',
    step1Num: '1',
    step1Title: 'Install & Scaffold Project',
    step1Desc: 'Use the official Liquid CLI to generate a ready-to-run project in seconds:',
    step2Num: '2',
    step2Title: 'Start Fast Dev Server',
    step2Desc: 'Enter your project folder and launch the instant dev server with hot module reloading:',
    step3Num: '3',
    step3Title: 'Write Your Component Code',
    step3Desc: 'Open src/App.liq and watch your changes render in your browser in milliseconds:',
    chaptersTitle: 'Documentation Chapters',
    chOverview: '1. What is Liquid & Core Philosophy',
    chStructure: '2. Project Structure & Core Files',
    chAnatomy: '3. Anatomy of a .liq Component',
    chSignals: '4. Reactive State & Signals',
    chDirectives: '5. Directives, Events & Lists',
    chRouting: '6. Multi-Page Routing',
    chStyling: '7. Scoped Styling & Themes',
    chDeployment: '8. Production Build & Hosting',
    playgroundTitle: 'Interactive Live Playground',
    playgroundDesc: 'Explore real Liquid components in action, interact with live state, and copy the code to your app:',
    tabCounter: 'Interactive Counter',
    tabTodo: 'Todo List',
    tabForm: 'Validated Form',
    tabCalculator: 'Quick Budget Calculator',
    cheatsheetTitle: 'Liquid Syntax Cheatsheet',
    cheatsheetDesc: 'Quick reference for all directives, signal primitives, CLI commands, and lifecycle methods.',
    footerMadeWith: 'Proudly built with the Liquid 🫟 framework — 100% pure JS with zero UI libraries.',
    footerDocs: 'Official Liquid Documentation'
  }
};
function t(key) {
  const current = translations[lang.value] || translations.ar;
  return current[key] || translations.ar[key] || key;
}
let audioCtx = null;
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}
function playSound(type = 'success', enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (type === 'success') {
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.18, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.36);
      });
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.25);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.26);
    } else if (type === 'levelup') {
      const notes = [
        { f: 523.25, t: 0.00, d: 0.12 },
        { f: 659.25, t: 0.12, d: 0.12 },
        { f: 783.99, t: 0.24, d: 0.12 },
        { f: 1046.5, t: 0.38, d: 0.45 }
      ];
      notes.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + t);
        gain.gain.setValueAtTime(0.25, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + d + 0.01);
      });
    } else if (type === 'exam') {
      const freqs = [392, 523.25, 659.25, 783.99, 1046.5, 1318.5];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.09);
        gain.gain.setValueAtTime(0.2, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.52);
      });
    }
  } catch (err) {
  }
}
const STORAGE_KEY = 'liquid_play_profile_v1';
function getInitialProfile() {
  return {
    xp: 0,
    streak: 1,
    soundEnabled: true,
    completedEpisodes: {}, // { 's1-e1': true, ... }
    passedExams: {},        // { 's1': true, ... }
    examScores: {},         // { 's1': 100, ... }
    unlockedSeasons: { 1: true },
    activeSeasonId: 1
  };
}
function loadProfile() {
  if (typeof window === 'undefined') return getInitialProfile();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialProfile();
    const data = JSON.parse(raw);
    return { ...getInitialProfile(), ...data };
  } catch {
    return getInitialProfile();
  }
}
function saveProfile(profile) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}
function getRankInfo(xp = 0) {
  if (xp >= 3000) {
    return { level: 5, titleAr: 'أسطورة ليكويد 👑', titleEn: 'Liquid Legend 👑', nextXp: 5000, currentBase: 3000, color: '#f59e0b' };
  }
  if (xp >= 1500) {
    return { level: 4, titleAr: 'مهندس الواجهات 🏛️', titleEn: 'UI Architect 🏛️', nextXp: 3000, currentBase: 1500, color: '#8b5cf6' };
  }
  if (xp >= 700) {
    return { level: 3, titleAr: 'بارع الـ Signals ⚡', titleEn: 'Reactivity Pro ⚡', nextXp: 1500, currentBase: 700, color: '#06b6d4' };
  }
  if (xp >= 250) {
    return { level: 2, titleAr: 'مبرمج صاعد 🚀', titleEn: 'Rising Apprentice 🚀', nextXp: 700, currentBase: 250, color: '#10b981' };
  }
  return { level: 1, titleAr: 'مستكشف مبتدئ 🌱', titleEn: 'Liquid Scout 🌱', nextXp: 250, currentBase: 0, color: '#0284c7' };
}
const SEASONS = [
  {
    id: 1,
    titleAr: 'الموسم الأول: أول قطرة — الأساسيات والصياغة الأنيقة',
    titleEn: 'Season 1: First Drop — Foundations & Syntax',
    badge: '💧',
    badgeNameAr: 'شارة كشاف ليكويد',
    badgeNameEn: 'Liquid Scout Badge',
    descriptionAr: 'تعلم كيف تتخلص من زوائد HTML والأقواس، واكتب واجهات مستخدم فائقة الإيجاز مع مسافتين إزاحة فقط.',
    descriptionEn: 'Say goodbye to closing tags and angle brackets. Master indent-based UI syntax in under 3 minutes per bite.',
    totalXp: 400,
    examThreshold: 80, // % required to pass
    episodes: [
      {
        id: 's1-e1',
        titleAr: 'قاعدة المسافات البادئة (2-Space Indent)',
        titleEn: 'The Indentation Rule (2 Spaces)',
        xp: 50,
        type: 'code',
        summaryAr: 'في Liquid الهيكل يتم تحديده بمسافتين فقط. لا وجود لأقواس الفتح والإغلاق ولا وسوم الإغلاق.',
        summaryEn: 'In Liquid, structure is purely indentation. 2 spaces indent child elements. No <> tags.',
        theoryAr: `في لغة Liquid، كل سطر يمثل عنصراً واحداً.
العنصر الأب يبدأ في بداية السطر، وأي عنصر ابن يوضع تحته بإزاحة مقدارها **مسافتان بالضبط** (2 spaces).
إذا استخدمت الـ Tab أو مسافات غير متناسقة سيرشدك المترجم فوراً بالخطأ **LQ-101**.`,
        theoryEn: `In Liquid, each line represents one element.
Children are indented with exactly **2 spaces**.
Tabs or erratic indents trigger error **LQ-101**.`,
        starterCode: `--- ui
div.card
  h1 أهلاً بك في Liquid
  p ابدأ رحلتك التفاعلية هنا`,
        challengePromptAr: 'عدل الكود أدناه لإضافة زر باسم `button.btn-start` تحته نص "ابدأ الآن" مع الالتزام التام بالإزاحة الصحيحة (مسافتان تحت div.card).',
        challengePromptEn: 'Update the code below to add a `button.btn-start` with text "Start Now", keeping proper 2-space indentation.',
        validate(code) {
          try {
            const res = compile(code);
            const hasButton = code.includes('button.btn-start') || code.includes('button');
            const hasProperIndent = code.match(/\n {2}button/);
            if (!hasButton) {
              return { success: false, msgAr: 'يجب إضافة وسم button في الكود', msgEn: 'You must add a button element' };
            }
            if (!hasProperIndent) {
              return { success: false, msgAr: 'تأكد من وضع مسافتين بالضبط (2 spaces) قبل زر button ليكون ابناً لـ div.card', msgEn: 'Ensure exactly 2 spaces indent before button' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ مترجم: ${e.message}`, msgEn: `Compiler Error: ${e.message}` };
          }
        }
      },
      {
        id: 's1-e2',
        titleAr: 'اختصارات الكلاس والمعرّف (.class & #id)',
        titleEn: 'Shorthand Class & ID (.class & #id)',
        xp: 50,
        type: 'quiz',
        summaryAr: 'ضع نقطة للكلاس وشباك للمعرّف ملاصقة لاسم الوسم بدون كتابة class="...".',
        summaryEn: 'Append .class and #id directly to the tag name without attribute ceremony.',
        theoryAr: `بدلاً من كتابة:
\`<div class="alert alert-success" id="banner"></div>\`
في Liquid تكتبها في سطر واحد فائق الإيجاز:
\`div.alert.alert-success#banner مرحباً بك!\``,
        theoryEn: `Instead of bulky HTML attributes, in Liquid you write:
\`div.alert.alert-success#banner Welcome!\``,
        questionAr: 'ما هي الطريقة الصحيحة لكتابة عنصر span يحمل كلاس `badge` ومعرف `primary` مع النص "جديد"؟',
        questionEn: 'Which is the correct way to write a span with class `badge`, id `primary`, and text "New"?',
        options: [
          'span.badge#primary جديد',
          'span class="badge" id="primary" جديد',
          'span .badge #primary جديد',
          '<span class="badge" id="primary">جديد</span>'
        ],
        correctIndex: 0,
        explanationAr: 'في Liquid تلصق الكلاس والمعرف بالوسم مباشرة بدون مسافات: span.badge#primary.',
        explanationEn: 'In Liquid, shorthand classes and IDs are chained directly to tag name.'
      },
      {
        id: 's1-e3',
        titleAr: 'حقن المتغيرات الحية {interpolation}',
        titleEn: 'Data Interpolation {interpolation}',
        xp: 50,
        type: 'code',
        summaryAr: 'استخدم الأقواس المجعدة {expression} لعرض أي تعبير جافاسكريبت داخل النص أو الخصائص.',
        summaryEn: 'Use curly braces {expression} to evaluate and render any dynamic JS expression.',
        theoryAr: `في أقسام UI، يمكنك تضمين أي متغير أو تعبير جافاسكريبت داخل الأقواس \`{...}\`:
\`\`\`liquid
--- logic
const name = 'أحمد';
const year = 2026;
--- ui
div.profile
  h2 مرحباً {name} في عام {year}
\`\`\``,
        theoryEn: `Within UI sections, embed dynamic expressions inside \`{...}\`:
\`\`\`liquid
--- logic
const user = 'Sara';
--- ui
h1 Hello {user}
\`\`\``,
        starterCode: `--- logic
const framework = 'Liquid';
const speed = 'فائق السرعة';
--- ui
div.hero
  h1 {framework} هو إطار عمل
`,
        challengePromptAr: 'أكمل سطر الـ h1 ليصبح: `{framework} هو إطار عمل {speed}` ثم افحص النتيجة.',
        challengePromptEn: 'Complete the h1 line to read: `{framework} is {speed}`.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes('{speed}')) {
              return { success: false, msgAr: 'تأكد من حقن التعبير {speed} داخل النص', msgEn: 'Ensure {speed} is interpolated in text' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Compile error: ${e.message}` };
          }
        }
      },
      {
        id: 's1-e4',
        titleAr: 'ربط الأحداث المباشر (@click)',
        titleEn: 'Event Binding with @ (@click)',
        xp: 50,
        type: 'quiz',
        summaryAr: 'استخدم البادئة @ متبوعة باسم الحدث (@click, @input, @submit).',
        summaryEn: 'Prefix event names with @, such as @click, @keydown.enter, @input.',
        theoryAr: `في Liquid، لا نحتاج لكتابة \`onclick="handleClick()"\`.
نستخدم رمز \`@\` المباشر:
\`\`\`liquid
button.btn @click=saveData حفظ التعديلات
\`\`\`
كما يدعم Liquid معدّلات الأحداث مثل \`@click.stop\` و \`@keydown.enter\` تلقائياً!`,
        theoryEn: `Liquid uses @ prefix for ultra-fast events:
\`\`\`liquid
button.btn @click=saveData Save
\`\`\`
Event modifiers like \`@click.prevent\` and \`@keydown.enter\` work automatically!`,
        questionAr: 'كيف نربط دالة `toggleMenu` بحدث النقر على زر في Liquid؟',
        questionEn: 'How do you bind the function `toggleMenu` to a button click in Liquid?',
        options: [
          'button @click=toggleMenu فتح القائمة',
          'button (click)=toggleMenu فتح القائمة',
          'button v-on:click=toggleMenu فتح القائمة',
          'button onclick="toggleMenu()" فتح القائمة'
        ],
        correctIndex: 0,
        explanationAr: 'في لغة Liquid يُكتب الحدث مباشرة بالبادئة @ كالتالي: @click=toggleMenu.',
        explanationEn: 'Liquid binds events using the @ prefix directly.'
      }
    ],
    exam: {
      id: 's1-boss',
      titleAr: '🏆 امتحان نهاية الموسم الأول: قطرة الإتقان',
      titleEn: '🏆 Season 1 Boss Exam: Drop of Mastery',
      rewardXp: 200,
      questions: [
        {
          qAr: 'كم عدد المسافات البادئة الإلزامية لتعريف عنصر ابن في Liquid؟',
          qEn: 'How many indentation spaces strictly define a child element in Liquid?',
          options: ['مسافة واحدة (1 space)', 'مسافتان بالضبط (2 spaces)', 'أربع مسافات (4 spaces)', 'حسب رغبة المبرمج'],
          correct: 1,
          expAr: 'قاعدة Liquid الصارمة هي مسافتان بالضبط (2 spaces) لكل مستوى تداخل.'
        },
        {
          qAr: 'أي من الأكواد التالية ينشئ زراً بالمعرف `submit-btn` والكلاس `btn-success`؟',
          qEn: 'Which syntax creates a button with id `submit-btn` and class `btn-success`?',
          options: ['button#submit-btn.btn-success إرسال', 'button.submit-btn#btn-success إرسال', 'button id="submit-btn" class="btn-success"', '<button id="submit-btn" class="btn-success">'],
          correct: 0,
          expAr: 'الكلاس يبدأ بنقطة والمعرف يبدأ بشباك: button#submit-btn.btn-success.'
        },
        {
          qAr: 'ما هو كود الخطأ الذي يطلقه مترجم Liquid عند خلط الـ Tabs والمسافات؟',
          qEn: 'Which error code is thrown when mixing tabs and spaces in indentation?',
          options: ['LQ-101', 'LQ-202', 'LQ-301', 'LQ-404'],
          correct: 0,
          expAr: 'الخطأ LQ-101 هو مخصص لـ "Mixed tabs and spaces in indentation".'
        },
        {
          qAr: 'ماذا يحدث إذا قمنا بتضمين تعبير متغير داخل الأقواس {2 + 3} في قالب الواجهة؟',
          qEn: 'What happens when evaluating {2 + 3} in a Liquid template?',
          options: ['يظهر النص الحرفي {2 + 3}', 'يتم حساب التعبير وعرض الرقم 5', 'يحدث خطأ أثناء الترجمة', 'يتم تجاهل السطر'],
          correct: 1,
          expAr: 'أي تعبير داخل {} هو كود JavaScript نقي يُقيّم تلقائياً.'
        },
        {
          qAr: 'ما هو التنسيق الصحيح لمنع السلوك الافتراضي لنموذج Form عند إرساله؟',
          qEn: 'How do you prevent the default event on form submit in Liquid?',
          options: ['form @submit.prevent=handleSubmit', 'form @submit(preventDefault)=handleSubmit', 'form onsubmit="return false;"', 'form !submit=handleSubmit'],
          correct: 0,
          expAr: 'يدعم Liquid معدلات الأحداث المدمجة مثل @submit.prevent مباشرة.'
        }
      ]
    }
  },
  {
    id: 2,
    titleAr: 'الموسم الثاني: نبض التفاعلية — الإشارات وسحر الـ Signals',
    titleEn: 'Season 2: Reactivity Pulse — The Magic of Signals',
    badge: '⚡',
    badgeNameAr: 'شارة كيميائي التفاعلية',
    badgeNameEn: 'Reactivity Alchemist Badge',
    descriptionAr: 'اكتشف كيف يحدث Liquid عناصر DOM فقط دون Virtual DOM، وأتقن signal و computed و effect و $bind.',
    descriptionEn: 'Master fine-grained reactivity. No virtual DOM overhead. Learn signal, computed, effect, and $bind.',
    totalXp: 600,
    examThreshold: 80,
    episodes: [
      {
        id: 's2-e1',
        titleAr: 'إنشاء الإشارة وقراءتها signal()',
        titleEn: 'Creating and Reading Signals',
        xp: 75,
        type: 'code',
        summaryAr: 'signal(initialValue) يعطيك دالة تقرأ قيمتها باستدعائها count() وتحدثها بـ count.value++.',
        summaryEn: 'signal(init) creates a reactive primitive read via count() and updated via count.value++.',
        theoryAr: `الإشارات (Signals) هي قلب Liquid:
\`\`\`javascript
const score = signal(10);
console.log(score()); // قراءة: 10
score.value += 5;     // تحديث: 15
score.set(20);        // أو بدالة set
\`\`\`
عندما تتغير الإشارة، يتحدث فقط النص المحدد في المتصفح بسرعة خيالية!`,
        theoryEn: `Signals represent fine-grained reactive state:
\`\`\`javascript
const score = signal(10);
score(); // read
score.value += 5; // write
\`\`\``,
        starterCode: `--- logic
const clicks = signal(0);
function tap() {
  clicks.value++;
}
--- ui
div.counter
  p النقرات: {clicks()}
  button @click=tap انقر هنا`,
        challengePromptAr: 'تأكد من وجود الإشارة clicks ودالة tap ثم اضغط فحص الكود.',
        challengePromptEn: 'Verify the clicks signal and tap handler, then click check.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes('signal(') || !code.includes('clicks')) {
              return { success: false, msgAr: 'يجب تعريف إشارة باسم clicks عبر signal(...)', msgEn: 'Must define clicks signal' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Error: ${e.message}` };
          }
        }
      },
      {
        id: 's2-e2',
        titleAr: 'القيم المشتقة الذكية computed()',
        titleEn: 'Smart Derived Values computed()',
        xp: 75,
        type: 'quiz',
        summaryAr: 'computed تحسب القيمة تلقائياً وتخزنها مؤقتاً (Cached) ولا تعيد الحساب إلا إذا تغيرت الإشارة الأصلية.',
        summaryEn: 'computed derives state lazily and memoizes result until dependencies change.',
        theoryAr: `إذا كانت لديك إشارة \`price\` وتريد حساب السعر مع الضريبة:
\`\`\`javascript
const price = signal(100);
const total = computed(() => price() * 1.15);
\`\`\`
الدالة \`computed\` ذكية جداً: لا تعيد الحساب أبداً إلا إذا تغيرت قيمة \`price\`!`,
        theoryEn: `computed calculates derived state automatically:
\`\`\`javascript
const price = signal(100);
const total = computed(() => price() * 1.15);
\`\`\``,
        questionAr: 'ما هي الميزة الأساسية لـ computed() مقارنة بكتابة دالة عادية؟',
        questionEn: 'What is the main advantage of computed() over a regular function?',
        options: [
          'تخزين الناتج مؤقتاً (Memoization) وعدم إعادة الحساب إلا عند تغير الإشارات المعتمدة عليها',
          'أنها تعمل فقط داخل لغات أخرى غير JavaScript',
          'أنها تمنع المستخدم من تحديث الصفحة',
          'ليس هناك أي فرق بينهما'
        ],
        correctIndex: 0,
        explanationAr: 'computed تقوم بالتخزين المؤقت وتتبع التبعيات بدقة ولا تعيد التنفيذ إلا عند الحاجة.',
        explanationEn: 'computed tracks dependencies and caches results for peak performance.'
      },
      {
        id: 's2-e3',
        titleAr: 'المؤثرات الجانبية effect() ودورة الحياة',
        titleEn: 'Side Effects & effect()',
        xp: 75,
        type: 'quiz',
        summaryAr: 'effect تراقب الإشارات وتنفذ كوداً جانبياً (مثل التخزين في localStorage أو تحديث عنوان الصفحة).',
        summaryEn: 'effect automatically runs and re-runs when any referenced signal changes.',
        theoryAr: `عندما تحتاج لتسجيل البيانات، تحديث عنوان التبويب، أو مزامنة localStorage:
\`\`\`javascript
const username = signal('سارة');
effect(() => {
  document.title = 'مرحباً ' + username();
});
\`\`\`
في كل مرة يتغير \`username\`، يُعاد تشغيل الـ effect تلقائياً!`,
        theoryEn: `Effects run side-effects whenever referenced signals change:
\`\`\`javascript
effect(() => {
  localStorage.setItem('theme', theme());
});
\`\`\``,
        questionAr: 'كيف نتجنب حدوث حلقة لا نهائية (Infinite Loop LQ-202) عند قراءة إشارة داخل effect وتحديثها؟',
        questionEn: 'How do you avoid infinite reactive loops (LQ-202) inside an effect?',
        options: [
          'استخدام untrack(() => signal()) لقراءة الإشارة بدون الاشتراك في مراقبتها',
          'حذف الإشارة بالكامل من الذاكرة',
          'وضع الـ effect داخل وسم h1',
          'تحويل الملف إلى صيغة HTML تقليدية'
        ],
        correctIndex: 0,
        explanationAr: 'تسمح دالة untrack(...) بقراءة الإشارة دون تسجيلها كتابع في الـ effect.',
        explanationEn: 'untrack(...) reads a signal without registering a dependency.'
      },
      {
        id: 's2-e4',
        titleAr: 'الربط المزدوج الفوري $bind',
        titleEn: 'Two-Way Binding with $bind',
        xp: 75,
        type: 'code',
        summaryAr: 'توجيه $bind=mySignal يربط حقول الإدخال بالإشارة تلقائياً ذهاباً وإياباً.',
        summaryEn: '$bind=mySignal synchronizes input value with signal bi-directionally.',
        theoryAr: `بدلاً من ربط \`value={text()}\` وكتابة \`@input=...\`:
\`\`\`liquid
--- logic
const query = signal('');
--- ui
div.search
  input type="text" $bind=query placeholder="ابحث..."
  p أنت تبحث عن: {query()}
\`\`\`
أي حرف يكتبه المستخدم ينتقل للإشارة، وأي تعديل برمجي ينعكس في الحقل فوراً!`,
        theoryEn: `Effortless two-way binding:
\`\`\`liquid
input type="text" $bind=query
\`\`\``,
        starterCode: `--- logic
const note = signal('ملاحظة أولية');
--- ui
div.editor
  input type="text" $bind=note
  p المعاينة: {note()}
`,
        challengePromptAr: 'تحقق من كود الربط $bind واضغط فحص لتأكيد صلاحية الربط.',
        challengePromptEn: 'Check the $bind syntax and compile.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes('$bind=')) {
              return { success: false, msgAr: 'يجب أن يحتوي الكود على توجيه $bind=', msgEn: 'Must contain $bind= directive' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Compile error: ${e.message}` };
          }
        }
      }
    ],
    exam: {
      id: 's2-boss',
      titleAr: '🏆 امتحان نهاية الموسم الثاني: صانع التفاعلية',
      titleEn: '🏆 Season 2 Boss Exam: Reactivity Architect',
      rewardXp: 300,
      questions: [
        {
          qAr: 'كيف يتم تحديث قيمة إشارة count في Liquid؟',
          qEn: 'How do you update a signal count in Liquid?',
          options: ['count.value = 5 أو count.set(5)', 'count = 5', 'update(count, 5)', 'count.change(5)'],
          correct: 0,
          expAr: 'يمكن استخدام الخاصية المباشرة count.value = 5 أو الدالة count.set(5).'
        },
        {
          qAr: 'ما الفرق الجوهري بين Liquid وأطر العمل مثل React في تحديث الـ DOM؟',
          qEn: 'What is the core difference between Liquid and React in DOM updates?',
          options: ['Liquid يحدث فقط العقدة المتأثرة مباشرة دون شجرة وهمية Virtual DOM', 'Liquid يعيد تصيير الصفحة بالكامل من الخادم', 'Liquid يتطلب بطاقة شاشة مخصصة', 'لا يوجد أي فرق تقني'],
          correct: 0,
          expAr: 'Liquid يستخدم Fine-grained Reactivity دقيقة تحدّث نص أو خاصية الـ DOM مباشرة وبسرعة خارقة.'
        },
        {
          qAr: 'ما هو كود الخطأ الدال على وجود حلقة تفاعلية لا نهائية (Cyclic Dependency)؟',
          qEn: 'Which error code indicates an infinite reactive loop?',
          options: ['LQ-202', 'LQ-101', 'LQ-401', 'LQ-302'],
          correct: 0,
          expAr: 'الخطأ LQ-202 هو خطأ الحلقة التفاعلية اللانهائية.'
        },
        {
          qAr: 'أي توجيه في Liquid يوفر الربط ثنائي الاتجاه لحقول الإدخال وصناديق الاختيار؟',
          qEn: 'Which directive provides two-way binding in Liquid?',
          options: ['$bind', '@bind', ':model', '#bind'],
          correct: 0,
          expAr: 'التوجيه المخصص في Liquid هو $bind=signalName.'
        },
        {
          qAr: 'متى يتم تنفيذ الدالة الممررة إلى effect() لأول مرة؟',
          qEn: 'When does the function passed to effect() execute for the first time?',
          options: ['فور استدعائها مباشرة وتسجيل التبعيات', 'بعد مرور 5 ثوانٍ', 'فقط عند نقر زر الفأرة', 'لا تنفذ إلا عند إغلاق المتصفح'],
          correct: 0,
          expAr: 'دالة effect() تنفذ على الفور (Synchronously) لتتبع الإشارات المقروءة بداخلها.'
        }
      ]
    }
  },
  {
    id: 3,
    titleAr: 'الموسم الثالث: البناء المعماري — الشروط والحلقات والمكونات',
    titleEn: 'Season 3: Architecture — Blocks, Loops & Components',
    badge: '🧩',
    badgeNameAr: 'شارة مهندس المكونات',
    badgeNameEn: 'Component Architect Badge',
    descriptionAr: 'احترف شروط if/else وحلقات each ذات المفاتيح الفريدة واستيراد المكونات مع Props و Slots.',
    descriptionEn: 'Master if/else branches, keyed each loops, component decomposition with props and slots.',
    totalXp: 800,
    examThreshold: 80,
    episodes: [
      {
        id: 's3-e1',
        titleAr: 'الشروط الذكية (if / elseif / else)',
        titleEn: 'Conditional Blocks (if / elseif / else)',
        xp: 100,
        type: 'code',
        summaryAr: 'شروط بسيطة ومعبرة بدون أقواس: if condition متبوعة بالعناصر المزاحة.',
        summaryEn: 'Expressive conditionals: if condition followed by indented block.',
        theoryAr: `في واجهات Liquid، تكتب الشروط بانسيابية كاملة:
\`\`\`liquid
--- ui
div.panel
  if isLoggedIn()
    p مرحباً بك يا {user.name}
    button @click=logout تسجيل الخروج
  else
    button @click=login تسجيل الدخول
\`\`\`
لا حوجة لأقواس أو كلمات إغلاق؛ مستوى المسافات البادئة هو الذي يحدد نطاق كل شرط!`,
        theoryEn: `Clean indentation-based conditionals:
\`\`\`liquid
if condition
  h1 Active
else
  h1 Inactive
\`\`\``,
        starterCode: `--- logic
const score = signal(85);
--- ui
div.result
  if score() >= 90
    span.badge ممتاز 🌟
  elseif score() >= 50
    span.badge ناجح ✓
  else
    span.badge أعد المحاولة 🔄
`,
        challengePromptAr: 'افحص كود الشروط الثلاثية if / elseif / else واضغط على فحص الكود.',
        challengePromptEn: 'Verify the conditional block syntax and check.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes('if ') || !code.includes('else')) {
              return { success: false, msgAr: 'يجب أن يحتوي الكود على شروط if و else', msgEn: 'Must include if and else' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Error: ${e.message}` };
          }
        }
      },
      {
        id: 's3-e2',
        titleAr: 'الحلقات السريعة فائقة الدقة (each ... (key))',
        titleEn: 'Keyed List Loops (each ... (key))',
        xp: 100,
        type: 'quiz',
        summaryAr: 'تكرار القوائم بكفاءة: each items() as item (item.id). المفتاح يمنع إعادة بناء العناصر.',
        summaryEn: 'Efficient list loops with keys preserve DOM elements on updates.',
        theoryAr: `صياغة حلقة التكرار في Liquid:
\`\`\`liquid
ul.tasks
  each tasks() as task (task.id)
    li.item {task.title}
\`\`\`
المفتاح \`(task.id)\` في نهاية السطر يضمن أن إضافة عنصر جديد لن تعيد إنشاء بقية عناصر القائمة، بل تحركها فقط في الـ DOM بأعلى كفاءة!
تكرار المفتاح يطلق التحذير الذكي **LQ-204**.`,
        theoryEn: `Keyed list rendering:
\`\`\`liquid
each items() as item (item.id)
  li {item.name}
\`\`\``,
        questionAr: 'ما هي الفائدة الحيوية لكتابة المفتاح الفريد (item.id) في حلقة each؟',
        questionEn: 'What is the vital purpose of providing a unique key (item.id) in each?',
        options: [
          'الحفاظ على عناصر DOM القائمة وإعادة استخدامها بدلاً من هدم القائمة وإعادة بنائها بالكامل',
          'لتغيير لون النصوص إلى الأزرق',
          'لإلغاء فحص الأخطاء في الكود',
          'لتشغيل الصوت في المتصفح'
        ],
        correctIndex: 0,
        explanationAr: 'المفتاح الفريد يسمح لخوارزمية المصالحة (Reconciliation) بربط كل كائن بعنصره الحقيقي في DOM بدقة مطلقة.',
        explanationEn: 'Unique keys enable precise keyed DOM reconciliation without recreating nodes.'
      },
      {
        id: 's3-e3',
        titleAr: 'تجزئة الكود والمكونات الفرعية (Props)',
        titleEn: 'Components & Props',
        xp: 100,
        type: 'code',
        summaryAr: 'استورد أي ملف .liq واستخدمه مباشرة كوسم مع تمرير الخصائص title="...".',
        summaryEn: 'Import any .liq file and use it as a custom tag with props.',
        theoryAr: `في Liquid المكون هو مجرد ملف \`.liq\` آخر:
\`\`\`liquid
--- logic
--- ui
div.team
  UserCard name="علي" role="مطور واجهات"
  UserCard name="منى" role="مهندسة نظم"
\`\`\`
تصل الخصائص إلى المكون الفرعي كمُدخلات نقية يمكن الوصول إليها باسم المتغير!`,
        theoryEn: `Components in Liquid are first-class .liq files:
\`\`\`liquid
--- logic
--- ui
Header title="My App"
\`\`\``,
        starterCode: `--- logic
--- ui
div.container
  Card title="مشروعي الأول" category="frontend"
`,
        challengePromptAr: 'تحقق من صياغة استدعاء المكون وتمرير الخصائص (Props) واضغط فحص.',
        challengePromptEn: 'Verify component invocation and props syntax.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes('Card ') || !code.includes('title=')) {
              return { success: false, msgAr: 'تأكد من تمرير الخاصية title إلى Card', msgEn: 'Pass title prop to Card' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Error: ${e.message}` };
          }
        }
      },
      {
        id: 's3-e4',
        titleAr: 'فتحات تضمين القوالب (Slots)',
        titleEn: 'Slot Transclusion (Slots)',
        xp: 100,
        type: 'quiz',
        summaryAr: 'وسم slot داخل المكون يتيح للآباء حقن أي محتوى فرعي بحرية تامة.',
        summaryEn: 'The slot tag enables flexible child content transclusion.',
        theoryAr: `عندما تصنع قالباً عاماً مثل نافذة منبثقة أو بطاقة:
\`\`\`liquid
--- ui (Modal.liq)
div.modal-box
  h2 {title}
  div.body
    slot
\`\`\`
الآن يستطيع أي مكون استخدامه وحقن أي عناصر تحته:
\`\`\`liquid
Modal title="تنبيه"
  p هذا النص سيتم حقنه داخل مكان الـ slot!
\`\`\``,
        theoryEn: `Slots allow passing markup into components:
\`\`\`liquid
div.card
  slot
\`\`\``,
        questionAr: 'أين سيتم عرض الأطفال الممررين تحت مكون معين؟',
        questionEn: 'Where are the children passed to a component rendered?',
        options: [
          'في المكان المخصص لوسم slot داخل المكون الفرعي',
          'في نهاية الصفحة دائماً',
          'في عنوان التبويب document.title',
          'يتم حذفهم تلقائياً'
        ],
        correctIndex: 0,
        explanationAr: 'وسم slot يحدد النقطة الدقيقة التي يتم فيها تضمين واجهة الأب داخل الابن.',
        explanationEn: 'The slot tag specifies the exact placeholder for transcluded content.'
      }
    ],
    exam: {
      id: 's3-boss',
      titleAr: '🏆 امتحان نهاية الموسم الثالث: مهندس النظم والمكونات',
      titleEn: '🏆 Season 3 Boss Exam: Master Component Architect',
      rewardXp: 400,
      questions: [
        {
          qAr: 'كيف نكتب حلقة تكرار قائمة المهام `todos` مع مفتاح المعرف `todo.id` في Liquid؟',
          qEn: 'How do you write a keyed each loop for todos with id in Liquid?',
          options: [
            'each todos() as todo (todo.id)',
            'for todo in todos():',
            'todos.map(todo => (key=todo.id))',
            'each todo of todos'
          ],
          correct: 0,
          expAr: 'الصيغة القياسية في Liquid هي: each items() as item (item.id).'
        },
        {
          qAr: 'ما هو كود الخطأ الذي يظهر عند وجود خطأ في كتابة صيغة حلقة each؟',
          qEn: 'Which error code appears for a malformed each block?',
          options: ['LQ-104', 'LQ-101', 'LQ-201', 'LQ-402'],
          correct: 0,
          expAr: 'الخطأ LQ-104 مخصص لـ "Malformed each block syntax".'
        },
        {
          qAr: 'هل يمكن تمرير قيم الإشارات التفاعلية كـ Props للمكونات الفرعية؟',
          qEn: 'Can reactive signals be passed as props to child components?',
          options: [
            'نعم، إما بتمرير دالة الإشارة نفسها أو قيمتها الحالية ويتم تتبعها بدقة',
            'لا، المكونات تقبل النصوص فقط',
            'فقط إذا كانت القيمة رقماً زوجياً',
            'يجب تحويلها إلى سلسلة JSON دائماً'
          ],
          correct: 0,
          expAr: 'نعم، تمرير الإشارات أو القيم المحسوبة مدعوم بشكل أصيل ومرن.'
        },
        {
          qAr: 'ماذا يحدث إذا تكرر المفتاح نفسه لعدة عناصر داخل حلقة each؟',
          qEn: 'What happens if duplicate keys are used in an each loop?',
          options: [
            'يطلق Liquid التحذير LQ-204 لتنبيه المبرمج مع الحفاظ على استقرار التطبيق',
            'ينهار المتصفح بالكامل',
            'يتم حذف قاعدة البيانات',
            'يتوقف خادم الإنترنت'
          ],
          correct: 0,
          expAr: 'يقوم Liquid بمعالجة الخطأ بذكاء وإطلاق تنبيه تشخيصي LQ-204 مع معرف بديل.'
        },
        {
          qAr: 'في شروط if / elseif / else، كيف يتم تمييز نهاية كل فرع؟',
          qEn: 'In if / elseif / else blocks, how is the end of each branch recognized?',
          options: [
            'عبر العودة إلى مستوى المسافات البادئة السابق (Indentation dedent)',
            'بكتابة endif;',
            'بوضع قوس مغلق }',
            'بكتابة الكلمة المحجوزة stop'
          ],
          correct: 0,
          expAr: 'تعتمد لغة Liquid كلياً على الإزاحة البادئة دون الحاجة لأي وسوم إغلاق أو أقواس.'
        }
      ]
    }
  },
  {
    id: 4,
    titleAr: 'الموسم الرابع: الإتقان الشامل — التوجيه والحالة والإنتاج',
    titleEn: 'Season 4: Complete Mastery — Routing, Store & Production',
    badge: '👑',
    badgeNameAr: 'شارة غراند ماستر ليكويد',
    badgeNameEn: 'Liquid Grandmaster Badge',
    descriptionAr: 'أنشئ تطبيقات كاملة متعددة الصفحات مع createRouter و createStore و Scoped CSS والإنتاج فائق الخفة.',
    descriptionEn: 'Build full single-page apps with router, global store, scoped CSS, and sub-5KB production bundles.',
    totalXp: 1000,
    examThreshold: 80,
    episodes: [
      {
        id: 's4-e1',
        titleAr: 'الموجّه الذكي عالي السرعة (Liquid Router)',
        titleEn: 'The Lightweight Router (createRouter)',
        xp: 125,
        type: 'code',
        summaryAr: 'دعم كامل للـ SPA عبر createRouter({ routes, mode: "hash" }) و RouterView.',
        summaryEn: 'Built-in SPA routing with hash and history modes and dynamic params.',
        theoryAr: `إنشاء تطبيق متعدد الصفحات في Liquid:
\`\`\`javascript
const { RouterView, navigate } = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: About }
  ],
  mode: 'hash'
});
\`\`\`
ثم تضع \`RouterView\` في صفحتك الرئيسية لتتولى عرض المكون المطابق للمسار تلقائياً!`,
        theoryEn: `Setting up routes in Liquid:
\`\`\`javascript
const { RouterView, navigate } = createRouter({ routes, mode: 'hash' });
\`\`\``,
        starterCode: `--- logic
const routes = [
  { path: '/', component: null },
  { path: '/dashboard', component: null },
  { path: '*', component: null }
];
const router = createRouter({ routes });
--- ui
div.app
  p نظام التوجيه جاهز
`,
        challengePromptAr: 'تأكد من وجود مسار بديل للـ 404 عبر path: "*" ثم اضغط فحص الكود.',
        challengePromptEn: 'Ensure a wildcard route path: "*" is present, then check.',
        validate(code) {
          try {
            compile(code);
            if (!code.includes("'*'") && !code.includes('"*"')) {
              return { success: false, msgAr: 'يجب أن تحتوي قائمة المسارات على المسار البديل "*"', msgEn: 'Must include wildcard route "*"' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Error: ${e.message}` };
          }
        }
      },
      {
        id: 's4-e2',
        titleAr: 'المخزن العام المشترك (createStore)',
        titleEn: 'Shared State Store (createStore)',
        xp: 125,
        type: 'quiz',
        summaryAr: 'إدارة الحالة المركزية لمشاركتها عبر كافة الصفحات والمكونات بسلاسة.',
        summaryEn: 'Centralized state management accessible anywhere in your component tree.',
        theoryAr: `عندما تحتاج لمشاركة بيانات المستخدم أو السلة عبر صفحات التطبيق:
\`\`\`javascript
const userStore = createStore({
  name: 'عمر',
  cart: []
}, {
  addToCart(store, item) {
    store.cart.value = [...store.cart.value, item];
  }
});
\`\`\`
أي مكون يستورد \`userStore\` يرى نفس الإشارات المتفاعلة بدون تكرار!`,
        theoryEn: `Global reactive store:
\`\`\`javascript
const store = createStore(initialState, actions);
\`\`\``,
        questionAr: 'ما هي الفائدة الرئيسية لاستخدام createStore بدلاً من تمرير الـ Props يدوياً؟',
        questionEn: 'What is the primary advantage of createStore over prop drilling?',
        options: [
          'تجنب تمرير البيانات عبر طبقات متعددة من المكونات (Prop Drilling) وإتاحة وصول مباشر للحالة',
          'تحويل لغة التطبيق إلى لغة ثنائية',
          'تقليل سرعة الإنترنت',
          'حذف ملفات الـ CSS'
        ],
        correctIndex: 0,
        explanationAr: 'createStore يوفر وصولاً مباشراً للحالة المشتركة من أي مكون دون الحاجة لتمريرها يدوياً عبر كل أب.',
        explanationEn: 'createStore provides direct reactive state access avoiding prop drilling.'
      },
      {
        id: 's4-e3',
        titleAr: 'الأنماط المعزولة ودعم RTL العربي',
        titleEn: 'Scoped CSS & RTL Direction',
        xp: 125,
        type: 'code',
        summaryAr: 'قسم --- style يُعزل تلقائياً بنظام scoped hash ويمنع تسرب التنسيقات بين المكونات.',
        summaryEn: 'The --- style section is automatically scoped with zero style bleeding.',
        theoryAr: `في أي ملف \`.liq\`، قسم الأنماط محمي ومعزول بالكامل:
\`\`\`liquid
--- style
.title {
  color: #0284c7;
  font-weight: 800;
}
--- ui
h1.title أنا منسق بأمان بدون التأثير على أي عنصر آخر في الموقع
\`\`\`
مترجم Liquid يضيف تلقائياً محدد الـ scope الفريد لكل قاعدة CSS دون أن تشغل بالك!`,
        theoryEn: `Zero-leak scoped CSS:
\`\`\`liquid
--- style
.title { color: #0284c7; }
\`\`\``,
        starterCode: `--- style
.cyber-card {
  background: #0f172a;
  color: #38bdf8;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #0284c7;
}
--- ui
div.cyber-card
  h2 بطاقة معزولة التنسيق
`,
        challengePromptAr: 'افحص كود التنسيق المعزول ثم اضغط فحص.',
        challengePromptEn: 'Verify scoped styles syntax and check.',
        validate(code) {
          try {
            const res = compile(code);
            if (!res.css || !res.css.includes('cyber-card')) {
              return { success: false, msgAr: 'يجب أن يُنتج المترجم قواعد CSS لكلاس cyber-card', msgEn: 'Must produce CSS for cyber-card' };
            }
            return { success: true };
          } catch (e) {
            return { success: false, msgAr: `خطأ ترجمة: ${e.message}`, msgEn: `Error: ${e.message}` };
          }
        }
      },
      {
        id: 's4-e4',
        titleAr: 'الإنتاج عالي السرعة وأدوات الـ CLI',
        titleEn: 'Ultra-Fast Production & CLI',
        xp: 125,
        type: 'quiz',
        summaryAr: 'liquid build ينتج حزمة نقية وخفيفة بحجم أقل من 5 كيلوبايت، جاهزة لأي سيرفر VPS.',
        summaryEn: 'liquid build produces tiny <5KB bundles ready for zero-config VPS deployment.',
        theoryAr: `أوامر Liquid الأساسية للمطور:
- \`liquid create my-app\`: إنشاء مشروع جاهز بأفضل الممارسات.
- \`liquid dev\`: تشغيل خادم التطوير مع التحديث الفوري (HMR).
- \`liquid guide\`: فتح الدليل التفاعلي وموسوعة الأخطاء على المنفذ 4000.
- \`liquid guide --play\`: فتح أكاديمية التعلّم التفاعلية.
- \`liquid build\`: تجميع المشروع للإنتاج بسرعة فائقة (<150ms).
- \`lqe\` (أو \`liquid edit\`): محرر التيرمينال التفاعلي المخصص للهواتف وسيرفرات الـ VPS!`,
        theoryEn: `Core CLI commands: create, dev, guide, guide --play, build, and lqe.`,
        questionAr: 'ما هو الأمر الذي يقوم بتشغيل أكاديمية التعلّم التفاعلية ومواسم الـ XP مباشرة على المنفذ 4000؟',
        questionEn: 'Which command launches the gamified microlearning arena on port 4000?',
        options: [
          'liquid guide --play',
          'liquid run-game',
          'npm start --game-mode',
          'liquid play-music'
        ],
        correctIndex: 0,
        explanationAr: 'الأمر المعتمد هو liquid guide --play (أو اختصاره liquid play).',
        explanationEn: 'The verified command is liquid guide --play.'
      }
    ],
    exam: {
      id: 's4-boss',
      titleAr: '👑 الامتحان الكبير: تتويج غراند ماستر ليكويد (Grandmaster)',
      titleEn: '👑 Grandmaster Exam: The Ultimate Liquid Trial',
      rewardXp: 500,
      questions: [
        {
          qAr: 'ما هو حجم نواة بيئة التشغيل لـ Liquid في الإنتاج؟',
          qEn: 'What is the gzipped core runtime size of Liquid in production?',
          options: [
            'أقل من 5 كيلوبايت مضغوطة (< 5 KB gzipped)',
            'أكثر من 150 كيلوبايت',
            'نصف غيغابايت',
            'يتطلب تثبيت برامج خارجية على جهاز العميل'
          ],
          correct: 0,
          expAr: 'نواة Liquid بالكامل (Signals + DOM Helpers + Keyed Reconciliation) بحجم قياسي أقل من 5KB!'
        },
        {
          qAr: 'كيف يعزل مترجم Liquid قواعد CSS في كل مكون لمنع تداخل الأنماط؟',
          qEn: 'How does the Liquid compiler scope CSS rules to prevent bleeding?',
          options: [
            'بتوليد هاش فريد مثل [lq-xxxxx] وإضافته تلقائياً لكافة المحددات وعناصر الـ DOM المقابلة',
            'بتحويل كل التنسيقات إلى ملف وورد',
            'بمنع استخدام الألوان في الموقع',
            'بإلغاء خاصية التنسيق نهائياً'
          ],
          correct: 0,
          expAr: 'يتم احتساب هاش فريد لكل مكون وحقنه في محددات الـ CSS والوسوم الناتجة.'
        },
        {
          qAr: 'ما هو كود الخطأ الذي يظهر عندما يكون المنفذ المطلوب محجوزاً بالفعل من تطبيق آخر (EADDRINUSE)؟',
          qEn: 'Which error code indicates the requested port is already in use (EADDRINUSE)?',
          options: ['LQ-401', 'LQ-102', 'LQ-204', 'LQ-301'],
          correct: 0,
          expAr: 'الخطأ LQ-401 مخصص لـ "Port already in use".'
        },
        {
          qAr: 'هل يتطلب إطار عمل Liquid وجود Node.js أو بيئة خاصة في متصفح الزائر؟',
          qEn: 'Does Liquid require Node.js on the client browser?',
          options: [
            'لا، كود الإنتاج الناتج هو كود JavaScript متوافق نقي (Standard ESM) يعمل في أي متصفح حديث',
            'نعم، يجب تثبيت Node.js لدى كل زائر للموقع',
            'يعمل فقط عبر شبكة خاصة',
            'يحتاج لتنزيل إضافات للمتصفح'
          ],
          correct: 0,
          expAr: 'حزم Liquid المجمعة هي Standard Pure ESM خفيفة متوافقة 100% مع كافة المتصفحات.'
        },
        {
          qAr: 'ما هي الأداة المضمنة في Liquid لتحرير الأكواد مباشرة من التيرمينال وسيرفرات الـ VPS وهواتف أندرويد؟',
          qEn: 'Which built-in terminal editor is designed for VPS servers and Android Termux?',
          options: [
            'lqe (المحرر التفاعلي liquid-edit)',
            'vim-liquid-plugin',
            'vscode-cloud-daemon',
            'notepad-terminal'
          ],
          correct: 0,
          expAr: 'الأداة lqe (liquid-edit) هي محرر تيرمينال مصمم خصيصاً للمطورين على السيرفرات والهواتف.'
        }
      ]
    }
  }
];
function getSeason(id) {
  return SEASONS.find(s => s.id === Number(id)) || SEASONS[0];
}
function getMaxXp() {
  return SEASONS.reduce((acc, s) => {
    const epXp = s.episodes.reduce((eAcc, ep) => eAcc + ep.xp, 0);
    return acc + epXp + (s.exam ? s.exam.rewardXp : 0);
  }, 0);
}
const routes = [
  { path: '/', component: Home },
  { path: '/guide', component: Guide },
  { path: '/play', component: Play },
  { path: '/playground', component: Playground },
  { path: '/cheatsheet', component: Cheatsheet },
  { path: '/errors', component: Errors },
  { path: '/deploy', component: Deployment },
  { path: '*', component: NotFound }
];
const router = createRouter({ routes, mode: 'hash' });
const {
  navigate,
  Link,
  RouterView,
  currentPath,
  currentParams,
  currentRoute
} = router;
const storedTheme = typeof localStorage !== 'undefined' ? localStorage.getItem('liquid_docs_theme') : null;
const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
const theme = signal(storedTheme || (prefersDark ? 'dark' : 'dark'));
const storedLang = typeof localStorage !== 'undefined' ? localStorage.getItem('liquid_docs_lang') : null;
const lang = signal(storedLang || 'ar');
const toastMessage = signal(null);
let toastTimer = null;
function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  toastMessage.value = message;
  toastTimer = setTimeout(() => {
    toastMessage.value = null;
    toastTimer = null;
  }, 2400);
}
function copyToClipboard(text, successMsg = 'تم النسخ إلى الحافظة! ✓') {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg);
    }).catch(() => {
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
}
function fallbackCopy(text, successMsg) {
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast(successMsg);
  } catch (err) {
    showToast('فشل النسخ!');
  }
}
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}
function toggleLang() {
  lang.value = lang.value === 'ar' ? 'en' : 'ar';
}
const activeChapter = signal('overview');
const searchQuery = signal('');
if (typeof window !== 'undefined') {
  effect(() => {
    const currentTheme = theme.value;
    document.documentElement.setAttribute('data-theme', currentTheme);
    try {
      localStorage.setItem('liquid_docs_theme', currentTheme);
    } catch {}
  });
  effect(() => {
    const currentLang = lang.value;
    document.documentElement.setAttribute('lang', currentLang);
    document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
    try {
      localStorage.setItem('liquid_docs_lang', currentLang);
    } catch {}
  });
}
function App(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const _root = [];
  const _el0 = element("div", "data-l-19ndgbc", ["app-wrapper"]);
  const _c1 = Header({  });
  if (Array.isArray(_c1)) append(_el0, ..._c1); else if (_c1) append(_el0, _c1);
  const _el2 = element("main", "data-l-19ndgbc", ["main-content"]);
  const _c3 = RouterView({  });
  if (Array.isArray(_c3)) append(_el2, ..._c3); else if (_c3) append(_el2, _c3);
  _el0.appendChild(_el2);
  const _el4 = element("footer", "data-l-19ndgbc", ["site-footer"]);
  const _el5 = element("div", "data-l-19ndgbc", ["footer-container"]);
  const _el6 = element("div", "data-l-19ndgbc", ["footer-info"]);
  const _el7 = element("div", "data-l-19ndgbc", ["footer-brand"]);
  const _el8 = element("span", "data-l-19ndgbc", null);
  const _t9 = text("🫟");
  _el8.appendChild(_t9);
  _el7.appendChild(_el8);
  const _el10 = element("span", "data-l-19ndgbc", null);
  const _t11 = text("Liquid Framework");
  _el10.appendChild(_t11);
  _el7.appendChild(_el10);
  _el6.appendChild(_el7);
  const _el12 = element("p", "data-l-19ndgbc", ["footer-tagline"]);
  const _t13 = text('');
  bindText(_t13, () => (t('siteTagline')));
  _el12.appendChild(_t13);
  _el6.appendChild(_el12);
  _el5.appendChild(_el6);
  const _el14 = element("div", "data-l-19ndgbc", ["footer-links"]);
  const _el15 = element("button", "data-l-19ndgbc", ["footer-link"]);
  _el15.setAttribute("type", "button");
  listen(_el15, "click", (e) => { navigate('/'); }, []);
  const _t16 = text('');
  bindText(_t16, () => (t('navHome')));
  _el15.appendChild(_t16);
  _el14.appendChild(_el15);
  const _el17 = element("button", "data-l-19ndgbc", ["footer-link"]);
  _el17.setAttribute("type", "button");
  listen(_el17, "click", (e) => { navigate('/guide'); }, []);
  const _t18 = text('');
  bindText(_t18, () => (t('navGuide')));
  _el17.appendChild(_t18);
  _el14.appendChild(_el17);
  const _el19 = element("button", "data-l-19ndgbc", ["footer-link"]);
  _el19.setAttribute("type", "button");
  listen(_el19, "click", (e) => { navigate('/playground'); }, []);
  const _t20 = text('');
  bindText(_t20, () => (t('navPlayground')));
  _el19.appendChild(_t20);
  _el14.appendChild(_el19);
  const _el21 = element("button", "data-l-19ndgbc", ["footer-link"]);
  _el21.setAttribute("type", "button");
  listen(_el21, "click", (e) => { navigate('/cheatsheet'); }, []);
  const _t22 = text('');
  bindText(_t22, () => (t('navCheatsheet')));
  _el21.appendChild(_t22);
  _el14.appendChild(_el21);
  const _el23 = element("button", "data-l-19ndgbc", ["footer-link"]);
  _el23.setAttribute("type", "button");
  listen(_el23, "click", (e) => { navigate('/deploy'); }, []);
  const _t24 = text('');
  bindText(_t24, () => (t('navDeploy')));
  _el23.appendChild(_t24);
  _el14.appendChild(_el23);
  _el5.appendChild(_el14);
  const _el25 = element("div", "data-l-19ndgbc", ["footer-copy"]);
  const _t26 = text('');
  bindText(_t26, () => (t('footerMadeWith')));
  _el25.appendChild(_t26);
  _el5.appendChild(_el25);
  _el4.appendChild(_el5);
  _el0.appendChild(_el4);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function Header(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const mobileMenuOpen = signal(false);
  function toggleMobile() {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  }
  function goTo(path) {
    navigate(path);
    mobileMenuOpen.value = false;
  }
  const _root = [];
  const _el0 = element("header", "data-l-1aob09u", ["nav-header"]);
  const _el1 = element("div", "data-l-1aob09u", ["nav-container"]);
  const _el2 = element("div", "data-l-1aob09u", ["brand"]);
  listen(_el2, "click", (e) => { goTo('/'); }, []);
  const _el3 = element("span", "data-l-1aob09u", ["brand-icon"]);
  const _t4 = text("🫟");
  _el3.appendChild(_t4);
  _el2.appendChild(_el3);
  const _el5 = element("span", "data-l-1aob09u", ["brand-title"]);
  const _t6 = text("Liquid");
  _el5.appendChild(_t6);
  _el2.appendChild(_el5);
  const _el7 = element("span", "data-l-1aob09u", ["brand-badge"]);
  const _t8 = text("v0.2.0");
  _el7.appendChild(_t8);
  _el2.appendChild(_el7);
  _el1.appendChild(_el2);
  const _el9 = element("nav", "data-l-1aob09u", ["nav-links"]);
  const _el10 = element("button", "data-l-1aob09u", ["nav-link"]);
  bindAttr(_el10, "class", () => ("nav-link" + ((currentPath() === '/' ? 'active' : '') ? ' ' + (currentPath() === '/' ? 'active' : '') : '')));
  listen(_el10, "click", (e) => { goTo('/'); }, []);
  const _t11 = text('');
  bindText(_t11, () => (t('navHome')));
  _el10.appendChild(_t11);
  _el9.appendChild(_el10);
  const _el12 = element("button", "data-l-1aob09u", ["nav-link"]);
  bindAttr(_el12, "class", () => ("nav-link" + ((currentPath() === '/guide' ? 'active' : '') ? ' ' + (currentPath() === '/guide' ? 'active' : '') : '')));
  listen(_el12, "click", (e) => { goTo('/guide'); }, []);
  const _t13 = text('');
  bindText(_t13, () => (t('navGuide')));
  _el12.appendChild(_t13);
  _el9.appendChild(_el12);
  const _el14 = element("button", "data-l-1aob09u", ["nav-link"]);
  bindAttr(_el14, "class", () => ("nav-link" + ((currentPath() === '/play' ? 'active' : '') ? ' ' + (currentPath() === '/play' ? 'active' : '') : '')));
  listen(_el14, "click", (e) => { goTo('/play'); }, []);
  const _t15 = text('');
  bindText(_t15, () => (t('navPlay')));
  _el14.appendChild(_t15);
  _el9.appendChild(_el14);
  const _el16 = element("button", "data-l-1aob09u", ["nav-link"]);
  bindAttr(_el16, "class", () => ("nav-link" + ((currentPath() === '/playground' ? 'active' : '') ? ' ' + (currentPath() === '/playground' ? 'active' : '') : '')));
  listen(_el16, "click", (e) => { goTo('/playground'); }, []);
  const _t17 = text('');
  bindText(_t17, () => (t('navPlayground')));
  _el16.appendChild(_t17);
  _el9.appendChild(_el16);
  const _el18 = element("button", "data-l-1aob09u", ["nav-link"]);
  bindAttr(_el18, "class", () => ("nav-link" + ((currentPath() === '/cheatsheet' ? 'active' : '') ? ' ' + (currentPath() === '/cheatsheet' ? 'active' : '') : '')));
  listen(_el18, "click", (e) => { goTo('/cheatsheet'); }, []);
  const _t19 = text('');
  bindText(_t19, () => (t('navCheatsheet')));
  _el18.appendChild(_t19);
  _el9.appendChild(_el18);
  const _el20 = element("button", "data-l-1aob09u", ["nav-link"]);
  bindAttr(_el20, "class", () => ("nav-link" + ((currentPath() === '/errors' ? 'active' : '') ? ' ' + (currentPath() === '/errors' ? 'active' : '') : '')));
  listen(_el20, "click", (e) => { goTo('/errors'); }, []);
  const _t21 = text('');
  bindText(_t21, () => (t('navErrors')));
  _el20.appendChild(_t21);
  _el9.appendChild(_el20);
  const _el22 = element("button", "data-l-1aob09u", ["nav-link"]);
  bindAttr(_el22, "class", () => ("nav-link" + ((currentPath() === '/deploy' ? 'active' : '') ? ' ' + (currentPath() === '/deploy' ? 'active' : '') : '')));
  listen(_el22, "click", (e) => { goTo('/deploy'); }, []);
  const _t23 = text('');
  bindText(_t23, () => (t('navDeploy')));
  _el22.appendChild(_t23);
  _el9.appendChild(_el22);
  _el1.appendChild(_el9);
  const _el24 = element("div", "data-l-1aob09u", ["actions"]);
  const _el25 = element("button", "data-l-1aob09u", ["action-btn"]);
  _el25.setAttribute("type", "button");
  _el25.setAttribute("title", "تبديل اللغة / Toggle Language");
  listen(_el25, "click", toggleLang, []);
  const _el26 = element("span", "data-l-1aob09u", null);
  const _t27 = text("🌐");
  _el26.appendChild(_t27);
  _el25.appendChild(_el26);
  const _el28 = element("span", "data-l-1aob09u", null);
  const _t29 = text('');
  bindText(_t29, () => (t('toggleLang')));
  _el28.appendChild(_t29);
  _el25.appendChild(_el28);
  _el24.appendChild(_el25);
  const _el30 = element("button", "data-l-1aob09u", ["action-btn"]);
  _el30.setAttribute("type", "button");
  _el30.setAttribute("title", "المظهر / Theme");
  listen(_el30, "click", toggleTheme, []);
  const _el31 = element("span", "data-l-1aob09u", null);
  const _t32 = text('');
  bindText(_t32, () => (theme.value === 'dark' ? '☀️' : '🌙'));
  _el31.appendChild(_t32);
  _el30.appendChild(_el31);
  _el24.appendChild(_el30);
  const _el33 = element("button", "data-l-1aob09u", ["mobile-toggle"]);
  _el33.setAttribute("type", "button");
  _el33.setAttribute("aria-label", "Menu");
  listen(_el33, "click", toggleMobile, []);
  const _el34 = element("span", "data-l-1aob09u", null);
  const _t35 = text('');
  bindText(_t35, () => (mobileMenuOpen.value ? '✕' : '☰'));
  _el34.appendChild(_t35);
  _el33.appendChild(_el34);
  _el24.appendChild(_el33);
  _el1.appendChild(_el24);
  _el0.appendChild(_el1);
  const _anchor36 = document.createComment('if');
  _el0.appendChild(_anchor36);
  createIfBlock(_anchor36, () => (mobileMenuOpen.value), () => {
    const _thenNodes37 = [];
    const _el38 = element("div", "data-l-1aob09u", ["mobile-drawer"]);
    const _el39 = element("button", "data-l-1aob09u", ["mobile-link"]);
    bindAttr(_el39, "class", () => ("mobile-link" + ((currentPath() === '/' ? 'active' : '') ? ' ' + (currentPath() === '/' ? 'active' : '') : '')));
    listen(_el39, "click", (e) => { goTo('/'); }, []);
    const _t40 = text('');
    bindText(_t40, () => (t('navHome')));
    _el39.appendChild(_t40);
    _el38.appendChild(_el39);
    const _el41 = element("button", "data-l-1aob09u", ["mobile-link"]);
    bindAttr(_el41, "class", () => ("mobile-link" + ((currentPath() === '/guide' ? 'active' : '') ? ' ' + (currentPath() === '/guide' ? 'active' : '') : '')));
    listen(_el41, "click", (e) => { goTo('/guide'); }, []);
    const _t42 = text('');
    bindText(_t42, () => (t('navGuide')));
    _el41.appendChild(_t42);
    _el38.appendChild(_el41);
    const _el43 = element("button", "data-l-1aob09u", ["mobile-link"]);
    bindAttr(_el43, "class", () => ("mobile-link" + ((currentPath() === '/play' ? 'active' : '') ? ' ' + (currentPath() === '/play' ? 'active' : '') : '')));
    listen(_el43, "click", (e) => { goTo('/play'); }, []);
    const _t44 = text('');
    bindText(_t44, () => (t('navPlay')));
    _el43.appendChild(_t44);
    _el38.appendChild(_el43);
    const _el45 = element("button", "data-l-1aob09u", ["mobile-link"]);
    bindAttr(_el45, "class", () => ("mobile-link" + ((currentPath() === '/playground' ? 'active' : '') ? ' ' + (currentPath() === '/playground' ? 'active' : '') : '')));
    listen(_el45, "click", (e) => { goTo('/playground'); }, []);
    const _t46 = text('');
    bindText(_t46, () => (t('navPlayground')));
    _el45.appendChild(_t46);
    _el38.appendChild(_el45);
    const _el47 = element("button", "data-l-1aob09u", ["mobile-link"]);
    bindAttr(_el47, "class", () => ("mobile-link" + ((currentPath() === '/cheatsheet' ? 'active' : '') ? ' ' + (currentPath() === '/cheatsheet' ? 'active' : '') : '')));
    listen(_el47, "click", (e) => { goTo('/cheatsheet'); }, []);
    const _t48 = text('');
    bindText(_t48, () => (t('navCheatsheet')));
    _el47.appendChild(_t48);
    _el38.appendChild(_el47);
    const _el49 = element("button", "data-l-1aob09u", ["mobile-link"]);
    bindAttr(_el49, "class", () => ("mobile-link" + ((currentPath() === '/errors' ? 'active' : '') ? ' ' + (currentPath() === '/errors' ? 'active' : '') : '')));
    listen(_el49, "click", (e) => { goTo('/errors'); }, []);
    const _t50 = text('');
    bindText(_t50, () => (t('navErrors')));
    _el49.appendChild(_t50);
    _el38.appendChild(_el49);
    const _el51 = element("button", "data-l-1aob09u", ["mobile-link"]);
    bindAttr(_el51, "class", () => ("mobile-link" + ((currentPath() === '/deploy' ? 'active' : '') ? ' ' + (currentPath() === '/deploy' ? 'active' : '') : '')));
    listen(_el51, "click", (e) => { goTo('/deploy'); }, []);
    const _t52 = text('');
    bindText(_t52, () => (t('navDeploy')));
    _el51.appendChild(_t52);
    _el38.appendChild(_el51);
    const _el53 = element("div", "data-l-1aob09u", ["mobile-actions"]);
    const _el54 = element("button", "data-l-1aob09u", ["action-btn"]);
    _el54.setAttribute("style", "flex: 1;");
    _el54.setAttribute("type", "button");
    listen(_el54, "click", toggleLang, []);
    const _el55 = element("span", "data-l-1aob09u", null);
    const _t56 = text("🌐");
    _el55.appendChild(_t56);
    _el54.appendChild(_el55);
    const _el57 = element("span", "data-l-1aob09u", null);
    const _t58 = text('');
    bindText(_t58, () => (t('toggleLang')));
    _el57.appendChild(_t58);
    _el54.appendChild(_el57);
    _el53.appendChild(_el54);
    const _el59 = element("button", "data-l-1aob09u", ["action-btn"]);
    _el59.setAttribute("style", "flex: 1;");
    _el59.setAttribute("type", "button");
    listen(_el59, "click", toggleTheme, []);
    const _el60 = element("span", "data-l-1aob09u", null);
    const _t61 = text('');
    bindText(_t61, () => (theme.value === 'dark' ? '☀️ فاتح' : '🌙 داكن'));
    _el60.appendChild(_t61);
    _el59.appendChild(_el60);
    _el53.appendChild(_el59);
    _el38.appendChild(_el53);
    _thenNodes37.push(_el38);
    return _thenNodes37;
  }, null);
  const _anchor62 = document.createComment('if');
  _el0.appendChild(_anchor62);
  createIfBlock(_anchor62, () => (toastMessage.value), () => {
    const _thenNodes63 = [];
    const _el64 = element("div", "data-l-1aob09u", ["toast"]);
    const _t65 = text('');
    bindText(_t65, () => (toastMessage.value));
    _el64.appendChild(_t65);
    _thenNodes63.push(_el64);
    return _thenNodes63;
  }, null);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function LiveCalculator(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const income = signal(5000);
  const rent = signal(1500);
  const food = signal(800);
  const utilities = signal(400);
  const totalExpenses = computed(() => Number(rent.value) + Number(food.value) + Number(utilities.value));
  const savings = computed(() => Number(income.value) - totalExpenses());
  const savingsRate = computed(() => {
    const inc = Number(income.value);
    if (inc <= 0) return 0;
    return Math.max(0, Math.round((savings() / inc) * 100));
  });
  const _root = [];
  const _el0 = element("div", "data-l-1nyhjbb", ["calc-box"]);
  const _el1 = element("div", "data-l-1nyhjbb", ["calc-title"]);
  const _el2 = element("span", "data-l-1nyhjbb", null);
  const _t3 = text("حاسبة الميزانية الفورية");
  _el2.appendChild(_t3);
  _el1.appendChild(_el2);
  const _el4 = element("span", "data-l-1nyhjbb", ["calc-rate"]);
  const _t5 = text("نسبة الادخار: ");
  _el4.appendChild(_t5);
  const _t6 = text('');
  bindText(_t6, () => (savingsRate()));
  _el4.appendChild(_t6);
  const _t7 = text("%");
  _el4.appendChild(_t7);
  _el1.appendChild(_el4);
  _el0.appendChild(_el1);
  const _el8 = element("div", "data-l-1nyhjbb", ["calc-grid"]);
  const _el9 = element("div", "data-l-1nyhjbb", ["input-group"]);
  const _el10 = element("span", "data-l-1nyhjbb", ["input-label"]);
  const _t11 = text("الدخل الشهري ($)");
  _el10.appendChild(_t11);
  _el9.appendChild(_el10);
  const _el12 = element("input", "data-l-1nyhjbb", ["calc-input"]);
  _el12.setAttribute("type", "number");
  bindInput(_el12, income, "bind");
  _el9.appendChild(_el12);
  _el8.appendChild(_el9);
  const _el13 = element("div", "data-l-1nyhjbb", ["input-group"]);
  const _el14 = element("span", "data-l-1nyhjbb", ["input-label"]);
  const _t15 = text("الإيجار ($)");
  _el14.appendChild(_t15);
  _el13.appendChild(_el14);
  const _el16 = element("input", "data-l-1nyhjbb", ["calc-input"]);
  _el16.setAttribute("type", "number");
  bindInput(_el16, rent, "bind");
  _el13.appendChild(_el16);
  _el8.appendChild(_el13);
  const _el17 = element("div", "data-l-1nyhjbb", ["input-group"]);
  const _el18 = element("span", "data-l-1nyhjbb", ["input-label"]);
  const _t19 = text("الطعام والتموين ($)");
  _el18.appendChild(_t19);
  _el17.appendChild(_el18);
  const _el20 = element("input", "data-l-1nyhjbb", ["calc-input"]);
  _el20.setAttribute("type", "number");
  bindInput(_el20, food, "bind");
  _el17.appendChild(_el20);
  _el8.appendChild(_el17);
  const _el21 = element("div", "data-l-1nyhjbb", ["input-group"]);
  const _el22 = element("span", "data-l-1nyhjbb", ["input-label"]);
  const _t23 = text("الفواتير والخدمات ($)");
  _el22.appendChild(_t23);
  _el21.appendChild(_el22);
  const _el24 = element("input", "data-l-1nyhjbb", ["calc-input"]);
  _el24.setAttribute("type", "number");
  bindInput(_el24, utilities, "bind");
  _el21.appendChild(_el24);
  _el8.appendChild(_el21);
  _el0.appendChild(_el8);
  const _el25 = element("div", "data-l-1nyhjbb", ["calc-summary"]);
  const _el26 = element("div", "data-l-1nyhjbb", ["sum-item"]);
  const _el27 = element("span", "data-l-1nyhjbb", ["sum-lbl"]);
  const _t28 = text("إجمالي النفقات");
  _el27.appendChild(_t28);
  _el26.appendChild(_el27);
  const _el29 = element("span", "data-l-1nyhjbb", ["sum-val","exp"]);
  const _t30 = text('');
  bindText(_t30, () => ('$' + totalExpenses()));
  _el29.appendChild(_t30);
  _el26.appendChild(_el29);
  _el25.appendChild(_el26);
  const _el31 = element("div", "data-l-1nyhjbb", ["sum-item"]);
  const _el32 = element("span", "data-l-1nyhjbb", ["sum-lbl"]);
  const _t33 = text("المتبقي (الادخار)");
  _el32.appendChild(_t33);
  _el31.appendChild(_el32);
  const _el34 = element("span", "data-l-1nyhjbb", ["sum-val","sav"]);
  const _t35 = text('');
  bindText(_t35, () => ('$' + savings()));
  _el34.appendChild(_t35);
  _el31.appendChild(_el34);
  _el25.appendChild(_el31);
  _el0.appendChild(_el25);
  const _el36 = element("div", "data-l-1nyhjbb", ["bar-track"]);
  const _el37 = element("div", "data-l-1nyhjbb", ["bar-fill"]);
  bindAttr(_el37, "style", () => (`width: ${Math.min(100, savingsRate())}%;`));
  _el36.appendChild(_el37);
  _el0.appendChild(_el36);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function LiveCounter(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const count = signal(0);
  const double = computed(() => count.value * 2);
  const isPositive = computed(() => count.value > 0);
  const isNegative = computed(() => count.value < 0);
  function inc() {
    count.value++;
  }
  function dec() {
    count.value--;
  }
  function reset() {
    count.value = 0;
  }
  const _root = [];
  const _el0 = element("div", "data-l-r27yxz", ["counter-box"]);
  const _el1 = element("span", "data-l-r27yxz", ["badge-demo"]);
  const _t2 = text("⚡ مثال حي: الإشارات والتفاعل التلقائي");
  _el1.appendChild(_t2);
  _el0.appendChild(_el1);
  const _el3 = element("div", "data-l-r27yxz", ["counter-display"]);
  const _el4 = element("span", "data-l-r27yxz", ["counter-num"]);
  bindAttr(_el4, "class", () => ("counter-num" + ((isPositive() ? 'pos' : (isNegative() ? 'neg' : '')) ? ' ' + (isPositive() ? 'pos' : (isNegative() ? 'neg' : '')) : '')));
  const _t5 = text('');
  bindText(_t5, () => (count.value));
  _el4.appendChild(_t5);
  _el3.appendChild(_el4);
  const _el6 = element("span", "data-l-r27yxz", ["counter-sub"]);
  const _t7 = text('');
  bindText(_t7, () => (count.value));
  _el6.appendChild(_t7);
  const _t8 = text(" × 2 = ");
  _el6.appendChild(_t8);
  const _t9 = text('');
  bindText(_t9, () => (double()));
  _el6.appendChild(_t9);
  _el3.appendChild(_el6);
  _el0.appendChild(_el3);
  const _el10 = element("div", "data-l-r27yxz", ["btn-group"]);
  const _el11 = element("button", "data-l-r27yxz", ["ctrl-btn"]);
  _el11.setAttribute("type", "button");
  _el11.setAttribute("title", "انقاص");
  listen(_el11, "click", dec, []);
  const _t12 = text("-");
  _el11.appendChild(_t12);
  _el10.appendChild(_el11);
  const _el13 = element("button", "data-l-r27yxz", ["ctrl-btn","reset-btn"]);
  _el13.setAttribute("type", "button");
  listen(_el13, "click", reset, []);
  const _t14 = text("إعادة تعيين");
  _el13.appendChild(_t14);
  _el10.appendChild(_el13);
  const _el15 = element("button", "data-l-r27yxz", ["ctrl-btn"]);
  _el15.setAttribute("type", "button");
  _el15.setAttribute("title", "زيادة");
  listen(_el15, "click", inc, []);
  const _t16 = text("+");
  _el15.appendChild(_t16);
  _el10.appendChild(_el15);
  _el0.appendChild(_el10);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function LiveForm(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const username = signal('');
  const email = signal('');
  const role = signal('developer');
  const submitted = signal(false);
  const isUsernameValid = computed(() => username.value.trim().length >= 3);
  const isEmailValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()));
  const isFormValid = computed(() => isUsernameValid() && isEmailValid());
  function handleSubmit() {
    if (isFormValid()) {
      submitted.value = true;
    }
  }
  function handleReset() {
    username.value = '';
    email.value = '';
    role.value = 'developer';
    submitted.value = false;
  }
  const _root = [];
  const _el0 = element("div", "data-l-yltavn", ["form-box"]);
  const _el1 = element("div", "data-l-yltavn", ["form-header"]);
  const _el2 = element("h3", "data-l-yltavn", ["form-title"]);
  const _t3 = text("نموذج تفاعلي مع التحقق الفوري");
  _el2.appendChild(_t3);
  _el1.appendChild(_el2);
  const _el4 = element("p", "data-l-yltavn", ["form-desc"]);
  const _t5 = text("يجري التحقق مع كل حرف مكتوب عبر الإشارات بدون إعادة تصيير الصفحة.");
  _el4.appendChild(_t5);
  _el1.appendChild(_el4);
  _el0.appendChild(_el1);
  const _anchor6 = document.createComment('if');
  _el0.appendChild(_anchor6);
  createIfBlock(_anchor6, () => (submitted.value), () => {
    const _thenNodes7 = [];
    const _el8 = element("div", "data-l-yltavn", ["result-card"]);
    const _el9 = element("h4", "data-l-yltavn", ["res-title"]);
    const _t10 = text("تم إرسال البيانات بنجاح! ✓");
    _el9.appendChild(_t10);
    _el8.appendChild(_el9);
    const _el11 = element("p", "data-l-yltavn", ["res-info"]);
    const _t12 = text("مرحباً ");
    _el11.appendChild(_t12);
    const _t13 = text('');
    bindText(_t13, () => (username.value));
    _el11.appendChild(_t13);
    const _t14 = text("! تم تسجيل بريدك (");
    _el11.appendChild(_t14);
    const _t15 = text('');
    bindText(_t15, () => (email.value));
    _el11.appendChild(_t15);
    const _t16 = text(") بدور ");
    _el11.appendChild(_t16);
    const _t17 = text('');
    bindText(_t17, () => (role.value));
    _el11.appendChild(_t17);
    const _t18 = text(".");
    _el11.appendChild(_t18);
    _el8.appendChild(_el11);
    const _el19 = element("button", "data-l-yltavn", ["reset-link"]);
    _el19.setAttribute("type", "button");
    listen(_el19, "click", handleReset, []);
    const _t20 = text("تسجيل حساب آخر");
    _el19.appendChild(_t20);
    _el8.appendChild(_el19);
    _thenNodes7.push(_el8);
    return _thenNodes7;
  }, () => {
    const _elseNodes21 = [];
    const _el22 = element("div", "data-l-yltavn", ["field"]);
    const _el23 = element("span", "data-l-yltavn", ["field-label"]);
    const _t24 = text("اسم المستخدم (3 أحرف على الأقل)");
    _el23.appendChild(_t24);
    _el22.appendChild(_el23);
    const _el25 = element("input", "data-l-yltavn", ["field-input"]);
    _el25.setAttribute("type", "text");
    _el25.setAttribute("placeholder", "مثال: ahmed_coder");
    bindInput(_el25, username, "bind");
    _el22.appendChild(_el25);
    const _anchor26 = document.createComment('if');
    _el22.appendChild(_anchor26);
    createIfBlock(_anchor26, () => (username.value.length > 0 && !isUsernameValid()), () => {
      const _thenNodes27 = [];
      const _el28 = element("span", "data-l-yltavn", ["field-error"]);
      const _t29 = text("الاسم يجب أن يتكون من 3 أحرف على الأقل!");
      _el28.appendChild(_t29);
      _thenNodes27.push(_el28);
      return _thenNodes27;
    }, null);
    _elseNodes21.push(_el22);
    const _el30 = element("div", "data-l-yltavn", ["field"]);
    const _el31 = element("span", "data-l-yltavn", ["field-label"]);
    const _t32 = text("البريد الإلكتروني");
    _el31.appendChild(_t32);
    _el30.appendChild(_el31);
    const _el33 = element("input", "data-l-yltavn", ["field-input"]);
    _el33.setAttribute("type", "email");
    _el33.setAttribute("placeholder", "name@example.com");
    bindInput(_el33, email, "bind");
    _el30.appendChild(_el33);
    const _anchor34 = document.createComment('if');
    _el30.appendChild(_anchor34);
    createIfBlock(_anchor34, () => (email.value.length > 0 && !isEmailValid()), () => {
      const _thenNodes35 = [];
      const _el36 = element("span", "data-l-yltavn", ["field-error"]);
      const _t37 = text("الرجاء كتابة بريد إلكتروني صالح!");
      _el36.appendChild(_t37);
      _thenNodes35.push(_el36);
      return _thenNodes35;
    }, null);
    _elseNodes21.push(_el30);
    const _el38 = element("div", "data-l-yltavn", ["field"]);
    const _el39 = element("span", "data-l-yltavn", ["field-label"]);
    const _t40 = text("الدور / التخصص");
    _el39.appendChild(_t40);
    _el38.appendChild(_el39);
    const _el41 = element("select", "data-l-yltavn", ["field-select"]);
    bindInput(_el41, role, "bind");
    const _el42 = element("option", "data-l-yltavn", null);
    _el42.setAttribute("value", "developer");
    const _t43 = text("مطور واجهات ويب (Frontend)");
    _el42.appendChild(_t43);
    _el41.appendChild(_el42);
    const _el44 = element("option", "data-l-yltavn", null);
    _el44.setAttribute("value", "fullstack");
    const _t45 = text("مطور متكامل (Full-Stack)");
    _el44.appendChild(_t45);
    _el41.appendChild(_el44);
    const _el46 = element("option", "data-l-yltavn", null);
    _el46.setAttribute("value", "designer");
    const _t47 = text("مصمم واجهات (UI/UX)");
    _el46.appendChild(_t47);
    _el41.appendChild(_el46);
    const _el48 = element("option", "data-l-yltavn", null);
    _el48.setAttribute("value", "student");
    const _t49 = text("طالب / متعلم جديد");
    _el48.appendChild(_t49);
    _el41.appendChild(_el48);
    _el38.appendChild(_el41);
    _elseNodes21.push(_el38);
    const _el50 = element("button", "data-l-yltavn", ["submit-btn"]);
    _el50.setAttribute("type", "button");
    bindAttr(_el50, "disabled", () => (!isFormValid()));
    listen(_el50, "click", handleSubmit, []);
    const _t51 = text("إرسال التسجيل");
    _el50.appendChild(_t51);
    _elseNodes21.push(_el50);
    return _elseNodes21;
  });
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function LiveTodo(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  let nextId = 3;
  const inputVal = signal('');
  const todos = signal([
    { id: 1, text: 'إنشاء مشروع Liquid جديد', done: true },
    { id: 2, text: 'تعلم استخدام الإشارات والدوال المحسوبة', done: false }
  ]);
  const remaining = computed(() => todos.value.filter(t => !t.done).length);
  function addTodo() {
    const text = inputVal.value.trim();
    if (!text) return;
    todos.value = [...todos.value, { id: nextId++, text, done: false }];
    inputVal.value = '';
  }
  function toggleTodo(id) {
    todos.value = todos.value.map(t => t.id === id ? { ...t, done: !t.done } : t);
  }
  function deleteTodo(id) {
    todos.value = todos.value.filter(t => t.id !== id);
  }
  const _root = [];
  const _el0 = element("div", "data-l-1ohur4", ["todo-box"]);
  const _el1 = element("div", "data-l-1ohur4", ["todo-header"]);
  const _el2 = element("h3", "data-l-1ohur4", ["todo-title"]);
  const _t3 = text("قائمة المهام التفاعلية");
  _el2.appendChild(_t3);
  _el1.appendChild(_el2);
  const _el4 = element("span", "data-l-1ohur4", ["todo-badge"]);
  const _t5 = text('');
  bindText(_t5, () => (remaining()));
  _el4.appendChild(_t5);
  const _t6 = text(" متبقية");
  _el4.appendChild(_t6);
  _el1.appendChild(_el4);
  _el0.appendChild(_el1);
  const _el7 = element("div", "data-l-1ohur4", ["todo-form"]);
  const _el8 = element("input", "data-l-1ohur4", ["todo-input"]);
  _el8.setAttribute("type", "text");
  _el8.setAttribute("placeholder", "اكتب مهمة جديدة واضغط Enter...");
  listen(_el8, "keydown", addTodo, ["enter"]);
  bindInput(_el8, inputVal, "bind");
  _el7.appendChild(_el8);
  const _el9 = element("button", "data-l-1ohur4", ["add-btn"]);
  _el9.setAttribute("type", "button");
  listen(_el9, "click", addTodo, []);
  const _t10 = text("إضافة");
  _el9.appendChild(_t10);
  _el7.appendChild(_el9);
  _el0.appendChild(_el7);
  const _el11 = element("div", "data-l-1ohur4", ["todo-list"]);
  const _anchor12 = document.createComment('if');
  _el11.appendChild(_anchor12);
  createIfBlock(_anchor12, () => (todos.value.length === 0), () => {
    const _thenNodes13 = [];
    const _el14 = element("div", "data-l-1ohur4", ["empty-notice"]);
    const _t15 = text("🎉 أحسنت! اكتملت جميع المهام بنجاح.");
    _el14.appendChild(_t15);
    _thenNodes13.push(_el14);
    return _thenNodes13;
  }, () => {
    const _elseNodes16 = [];
    const _anchor17 = document.createComment('each');
    _elseNodes16.push(_anchor17);
    createEachBlock(_anchor17, () => (todos.value), (item, _idx) => (item.id), (itemSig, _idxSig) => {
      const item = new Proxy(itemSig, {
        get(target, prop) {
          if (prop === 'isSignal') return true;
          if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') {
            return () => target();
          }
          const val = target();
          if (val != null && prop in Object(val)) {
            const res = val[prop];
            return typeof res === 'function' ? res.bind(val) : res;
          }
          return val;
        },
        apply(target) { return target(); }
      });
      const _idx = new Proxy(_idxSig, {
        apply(target) { return target(); },
        get(target, prop) {
          if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') return () => target();
          const val = target();
          if (val != null && prop in Object(val)) {
            const res = val[prop];
            return typeof res === 'function' ? res.bind(val) : res;
          }
          return val;
        }
      });
      const _eachNodes18 = [];
      const _el19 = element("div", "data-l-1ohur4", ["todo-item"]);
      const _el20 = element("div", "data-l-1ohur4", ["todo-content"]);
      listen(_el20, "click", (e) => { toggleTodo(item.id); }, []);
      const _el21 = element("input", "data-l-1ohur4", ["todo-check"]);
      _el21.setAttribute("type", "checkbox");
      bindAttr(_el21, "checked", () => (item.done));
      _el20.appendChild(_el21);
      const _el22 = element("span", "data-l-1ohur4", ["todo-text"]);
      bindAttr(_el22, "class", () => ("todo-text" + ((item.done ? 'done' : '') ? ' ' + (item.done ? 'done' : '') : '')));
      const _t23 = text('');
      bindText(_t23, () => (item.text));
      _el22.appendChild(_t23);
      _el20.appendChild(_el22);
      _el19.appendChild(_el20);
      const _el24 = element("button", "data-l-1ohur4", ["del-btn"]);
      _el24.setAttribute("type", "button");
      _el24.setAttribute("title", "حذف");
      listen(_el24, "click", (e) => { deleteTodo(item.id); }, []);
      const _t25 = text("✕");
      _el24.appendChild(_t25);
      _el19.appendChild(_el24);
      _eachNodes18.push(_el19);
      return _eachNodes18;
    });
    return _elseNodes16;
  });
  _el0.appendChild(_el11);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function Cheatsheet(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const _root = [];
  const _el0 = element("div", "data-l-jwpk6v", ["sheet-page"]);
  const _el1 = element("div", "data-l-jwpk6v", ["sheet-head"]);
  const _el2 = element("h1", "data-l-jwpk6v", ["sheet-title"]);
  const _t3 = text('');
  bindText(_t3, () => (t('cheatsheetTitle')));
  _el2.appendChild(_t3);
  _el1.appendChild(_el2);
  const _el4 = element("p", "data-l-jwpk6v", ["sheet-desc"]);
  const _t5 = text('');
  bindText(_t5, () => (t('cheatsheetDesc')));
  _el4.appendChild(_t5);
  _el1.appendChild(_el4);
  _el0.appendChild(_el1);
  const _el6 = element("div", "data-l-jwpk6v", ["sheet-grid"]);
  const _el7 = element("div", "data-l-jwpk6v", ["card"]);
  const _el8 = element("h2", "data-l-jwpk6v", ["card-title"]);
  const _el9 = element("span", "data-l-jwpk6v", null);
  const _t10 = text("⚡");
  _el9.appendChild(_t10);
  _el8.appendChild(_el9);
  const _el11 = element("span", "data-l-jwpk6v", null);
  const _t12 = text("أوامر سطر الأوامر (CLI Commands)");
  _el11.appendChild(_t12);
  _el8.appendChild(_el11);
  _el7.appendChild(_el8);
  const _el13 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el14 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el15 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t16 = text("إنشاء مشروع جديد");
  _el15.appendChild(_t16);
  _el14.appendChild(_el15);
  const _el17 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t18 = text("Scaffold");
  _el17.appendChild(_t18);
  _el14.appendChild(_el17);
  _el13.appendChild(_el14);
  const _el19 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el20 = element("code", "data-l-jwpk6v", null);
  const _t21 = text("liquid create my-site");
  _el20.appendChild(_t21);
  _el19.appendChild(_el20);
  const _el22 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el22.setAttribute("type", "button");
  listen(_el22, "click", (e) => { copyToClipboard('liquid create my-site'); }, []);
  const _t23 = text("نسخ");
  _el22.appendChild(_t23);
  _el19.appendChild(_el22);
  _el13.appendChild(_el19);
  _el7.appendChild(_el13);
  const _el24 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el25 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el26 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t27 = text("تشغيل خادم التطوير");
  _el26.appendChild(_t27);
  _el25.appendChild(_el26);
  const _el28 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t29 = text("Dev Server");
  _el28.appendChild(_t29);
  _el25.appendChild(_el28);
  _el24.appendChild(_el25);
  const _el30 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el31 = element("code", "data-l-jwpk6v", null);
  const _t32 = text("liquid dev --port 3000");
  _el31.appendChild(_t32);
  _el30.appendChild(_el31);
  const _el33 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el33.setAttribute("type", "button");
  listen(_el33, "click", (e) => { copyToClipboard('liquid dev'); }, []);
  const _t34 = text("نسخ");
  _el33.appendChild(_t34);
  _el30.appendChild(_el33);
  _el24.appendChild(_el30);
  _el7.appendChild(_el24);
  const _el35 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el36 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el37 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t38 = text("بناء الموقع للإنتاج");
  _el37.appendChild(_t38);
  _el36.appendChild(_el37);
  const _el39 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t40 = text("Production Bundle");
  _el39.appendChild(_t40);
  _el36.appendChild(_el39);
  _el35.appendChild(_el36);
  const _el41 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el42 = element("code", "data-l-jwpk6v", null);
  const _t43 = text("liquid build --outDir dist");
  _el42.appendChild(_t43);
  _el41.appendChild(_el42);
  const _el44 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el44.setAttribute("type", "button");
  listen(_el44, "click", (e) => { copyToClipboard('liquid build'); }, []);
  const _t45 = text("نسخ");
  _el44.appendChild(_t45);
  _el41.appendChild(_el44);
  _el35.appendChild(_el41);
  _el7.appendChild(_el35);
  const _el46 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el47 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el48 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t49 = text("تجربة حزمة الإنتاج");
  _el48.appendChild(_t49);
  _el47.appendChild(_el48);
  const _el50 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t51 = text("Preview Server");
  _el50.appendChild(_t51);
  _el47.appendChild(_el50);
  _el46.appendChild(_el47);
  const _el52 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el53 = element("code", "data-l-jwpk6v", null);
  const _t54 = text("liquid preview");
  _el53.appendChild(_t54);
  _el52.appendChild(_el53);
  const _el55 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el55.setAttribute("type", "button");
  listen(_el55, "click", (e) => { copyToClipboard('liquid preview'); }, []);
  const _t56 = text("نسخ");
  _el55.appendChild(_t56);
  _el52.appendChild(_el55);
  _el46.appendChild(_el52);
  _el7.appendChild(_el46);
  const _el57 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el58 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el59 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t60 = text("التحقق من صحة ملفات .liq");
  _el59.appendChild(_t60);
  _el58.appendChild(_el59);
  const _el61 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t62 = text("Type & Syntax Check");
  _el61.appendChild(_t62);
  _el58.appendChild(_el61);
  _el57.appendChild(_el58);
  const _el63 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el64 = element("code", "data-l-jwpk6v", null);
  const _t65 = text("liquid check");
  _el64.appendChild(_t65);
  _el63.appendChild(_el64);
  const _el66 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el66.setAttribute("type", "button");
  listen(_el66, "click", (e) => { copyToClipboard('liquid check'); }, []);
  const _t67 = text("نسخ");
  _el66.appendChild(_t67);
  _el63.appendChild(_el66);
  _el57.appendChild(_el63);
  _el7.appendChild(_el57);
  const _el68 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el69 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el70 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t71 = text("فتح محرر الأكواد المدمج");
  _el70.appendChild(_t71);
  _el69.appendChild(_el70);
  const _el72 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t73 = text("Phone-first TUI Editor");
  _el72.appendChild(_t73);
  _el69.appendChild(_el72);
  _el68.appendChild(_el69);
  const _el74 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el75 = element("code", "data-l-jwpk6v", null);
  const _t76 = text("liquid edit src/App.liq");
  _el75.appendChild(_t76);
  _el74.appendChild(_el75);
  const _el77 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el77.setAttribute("type", "button");
  listen(_el77, "click", (e) => { copyToClipboard('liquid edit src/App.liq'); }, []);
  const _t78 = text("نسخ");
  _el77.appendChild(_t78);
  _el74.appendChild(_el77);
  _el68.appendChild(_el74);
  _el7.appendChild(_el68);
  _el6.appendChild(_el7);
  const _el79 = element("div", "data-l-jwpk6v", ["card"]);
  const _el80 = element("h2", "data-l-jwpk6v", ["card-title"]);
  const _el81 = element("span", "data-l-jwpk6v", null);
  const _t82 = text("📡");
  _el81.appendChild(_t82);
  _el80.appendChild(_el81);
  const _el83 = element("span", "data-l-jwpk6v", null);
  const _t84 = text("التفاعلية وإدارة الحالة (Reactivity API)");
  _el83.appendChild(_t84);
  _el80.appendChild(_el83);
  _el79.appendChild(_el80);
  const _el85 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el86 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el87 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t88 = text("إنشاء إشارة");
  _el87.appendChild(_t88);
  _el86.appendChild(_el87);
  const _el89 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t90 = text("signal(val)");
  _el89.appendChild(_t90);
  _el86.appendChild(_el89);
  _el85.appendChild(_el86);
  const _el91 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el92 = element("code", "data-l-jwpk6v", null);
  const _t93 = text("const count = signal(0);");
  _el92.appendChild(_t93);
  _el91.appendChild(_el92);
  const _el94 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el94.setAttribute("type", "button");
  listen(_el94, "click", (e) => { copyToClipboard('const count = signal(0);'); }, []);
  const _t95 = text("نسخ");
  _el94.appendChild(_t95);
  _el91.appendChild(_el94);
  _el85.appendChild(_el91);
  _el79.appendChild(_el85);
  const _el96 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el97 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el98 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t99 = text("قراءة وتعديل الإشارة");
  _el98.appendChild(_t99);
  _el97.appendChild(_el98);
  const _el100 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t101 = text("Get / Set");
  _el100.appendChild(_t101);
  _el97.appendChild(_el100);
  _el96.appendChild(_el97);
  const _el102 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el103 = element("code", "data-l-jwpk6v", null);
  const _t104 = text("count.value++; // أو count()");
  _el103.appendChild(_t104);
  _el102.appendChild(_el103);
  const _el105 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el105.setAttribute("type", "button");
  listen(_el105, "click", (e) => { copyToClipboard('count.value++;'); }, []);
  const _t106 = text("نسخ");
  _el105.appendChild(_t106);
  _el102.appendChild(_el105);
  _el96.appendChild(_el102);
  _el79.appendChild(_el96);
  const _el107 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el108 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el109 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t110 = text("قيمة مشتقة محسوبة");
  _el109.appendChild(_t110);
  _el108.appendChild(_el109);
  const _el111 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t112 = text("computed(fn)");
  _el111.appendChild(_t112);
  _el108.appendChild(_el111);
  _el107.appendChild(_el108);
  const _el113 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el114 = element("code", "data-l-jwpk6v", null);
  const _t115 = text("const double = computed(() => count.value * 2);");
  _el114.appendChild(_t115);
  _el113.appendChild(_el114);
  const _el116 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el116.setAttribute("type", "button");
  listen(_el116, "click", (e) => { copyToClipboard('const double = computed(() => count.value * 2);'); }, []);
  const _t117 = text("نسخ");
  _el116.appendChild(_t117);
  _el113.appendChild(_el116);
  _el107.appendChild(_el113);
  _el79.appendChild(_el107);
  const _el118 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el119 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el120 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t121 = text("تأثير جانبي");
  _el120.appendChild(_t121);
  _el119.appendChild(_el120);
  const _el122 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t123 = text("effect(fn)");
  _el122.appendChild(_t123);
  _el119.appendChild(_el122);
  _el118.appendChild(_el119);
  const _el124 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el125 = element("code", "data-l-jwpk6v", null);
  const _t126 = text("effect(() => console.log(count.value));");
  _el125.appendChild(_t126);
  _el124.appendChild(_el125);
  const _el127 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el127.setAttribute("type", "button");
  listen(_el127, "click", (e) => { copyToClipboard('effect(() => console.log(count.value));'); }, []);
  const _t128 = text("نسخ");
  _el127.appendChild(_t128);
  _el124.appendChild(_el127);
  _el118.appendChild(_el124);
  _el79.appendChild(_el118);
  _el6.appendChild(_el79);
  const _el129 = element("div", "data-l-jwpk6v", ["card"]);
  const _el130 = element("h2", "data-l-jwpk6v", ["card-title"]);
  const _el131 = element("span", "data-l-jwpk6v", null);
  const _t132 = text("🎯");
  _el131.appendChild(_t132);
  _el130.appendChild(_el131);
  const _el133 = element("span", "data-l-jwpk6v", null);
  const _t134 = text("توجيهات القالب (Directives & Events)");
  _el133.appendChild(_t134);
  _el130.appendChild(_el133);
  _el129.appendChild(_el130);
  const _el135 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el136 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el137 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t138 = text("ربط حدث النقر");
  _el137.appendChild(_t138);
  _el136.appendChild(_el137);
  const _el139 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t140 = text("\"@click\"");
  _el139.appendChild(_t140);
  _el136.appendChild(_el139);
  _el135.appendChild(_el136);
  const _el141 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el142 = element("code", "data-l-jwpk6v", null);
  const _t143 = text("button @click=handleClick زر");
  _el142.appendChild(_t143);
  _el141.appendChild(_el142);
  const _el144 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el144.setAttribute("type", "button");
  listen(_el144, "click", (e) => { copyToClipboard('button @click=handleClick زر'); }, []);
  const _t145 = text("نسخ");
  _el144.appendChild(_t145);
  _el141.appendChild(_el144);
  _el135.appendChild(_el141);
  _el129.appendChild(_el135);
  const _el146 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el147 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el148 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t149 = text("منع السلوك الافتراضي");
  _el148.appendChild(_t149);
  _el147.appendChild(_el148);
  const _el150 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t151 = text("\".prevent\"");
  _el150.appendChild(_t151);
  _el147.appendChild(_el150);
  _el146.appendChild(_el147);
  const _el152 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el153 = element("code", "data-l-jwpk6v", null);
  const _t154 = text("form @submit.prevent=save");
  _el153.appendChild(_t154);
  _el152.appendChild(_el153);
  const _el155 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el155.setAttribute("type", "button");
  listen(_el155, "click", (e) => { copyToClipboard('form @submit.prevent=save'); }, []);
  const _t156 = text("نسخ");
  _el155.appendChild(_t156);
  _el152.appendChild(_el155);
  _el146.appendChild(_el152);
  _el129.appendChild(_el146);
  const _el157 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el158 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el159 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t160 = text("مفتاح محدد (Enter)");
  _el159.appendChild(_t160);
  _el158.appendChild(_el159);
  const _el161 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t162 = text("\"@keydown.enter\"");
  _el161.appendChild(_t162);
  _el158.appendChild(_el161);
  _el157.appendChild(_el158);
  const _el163 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el164 = element("code", "data-l-jwpk6v", null);
  const _t165 = text("input @keydown.enter=submit");
  _el164.appendChild(_t165);
  _el163.appendChild(_el164);
  const _el166 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el166.setAttribute("type", "button");
  listen(_el166, "click", (e) => { copyToClipboard('input @keydown.enter=submit'); }, []);
  const _t167 = text("نسخ");
  _el166.appendChild(_t167);
  _el163.appendChild(_el166);
  _el157.appendChild(_el163);
  _el129.appendChild(_el157);
  const _el168 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el169 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el170 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t171 = text("ربط الحقول ثنائي الاتجاه");
  _el170.appendChild(_t171);
  _el169.appendChild(_el170);
  const _el172 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t173 = text("\"$bind\"");
  _el172.appendChild(_t173);
  _el169.appendChild(_el172);
  _el168.appendChild(_el169);
  const _el174 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el175 = element("code", "data-l-jwpk6v", null);
  const _t176 = text("input type=\"text\" $bind=name");
  _el175.appendChild(_t176);
  _el174.appendChild(_el175);
  const _el177 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el177.setAttribute("type", "button");
  listen(_el177, "click", (e) => { copyToClipboard('input type="text" $bind=name'); }, []);
  const _t178 = text("نسخ");
  _el177.appendChild(_t178);
  _el174.appendChild(_el177);
  _el168.appendChild(_el174);
  _el129.appendChild(_el168);
  _el6.appendChild(_el129);
  const _el179 = element("div", "data-l-jwpk6v", ["card"]);
  const _el180 = element("h2", "data-l-jwpk6v", ["card-title"]);
  const _el181 = element("span", "data-l-jwpk6v", null);
  const _t182 = text("🗺️");
  _el181.appendChild(_t182);
  _el180.appendChild(_el181);
  const _el183 = element("span", "data-l-jwpk6v", null);
  const _t184 = text("موجه الصفحات (Liquid Router)");
  _el183.appendChild(_t184);
  _el180.appendChild(_el183);
  _el179.appendChild(_el180);
  const _el185 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el186 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el187 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t188 = text("إنشاء الموجه");
  _el187.appendChild(_t188);
  _el186.appendChild(_el187);
  const _el189 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t190 = text("createRouter");
  _el189.appendChild(_t190);
  _el186.appendChild(_el189);
  _el185.appendChild(_el186);
  const _el191 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el192 = element("code", "data-l-jwpk6v", null);
  const _t193 = text("const r = createRouter(");
  _el192.appendChild(_t193);
  const _t194 = text('');
  bindText(_t194, () => (routes));
  _el192.appendChild(_t194);
  const _t195 = text(");");
  _el192.appendChild(_t195);
  _el191.appendChild(_el192);
  const _el196 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el196.setAttribute("type", "button");
  listen(_el196, "click", (e) => { copyToClipboard('const router = createRouter({ routes });'); }, []);
  const _t197 = text("نسخ");
  _el196.appendChild(_t197);
  _el191.appendChild(_el196);
  _el185.appendChild(_el191);
  _el179.appendChild(_el185);
  const _el198 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el199 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el200 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t201 = text("التنقل البرمجي");
  _el200.appendChild(_t201);
  _el199.appendChild(_el200);
  const _el202 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t203 = text("navigate(path)");
  _el202.appendChild(_t203);
  _el199.appendChild(_el202);
  _el198.appendChild(_el199);
  const _el204 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el205 = element("code", "data-l-jwpk6v", null);
  const _t206 = text("navigate('/about');");
  _el205.appendChild(_t206);
  _el204.appendChild(_el205);
  const _el207 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el207.setAttribute("type", "button");
  listen(_el207, "click", (e) => { copyToClipboard("navigate('/about');"); }, []);
  const _t208 = text("نسخ");
  _el207.appendChild(_t208);
  _el204.appendChild(_el207);
  _el198.appendChild(_el204);
  _el179.appendChild(_el198);
  const _el209 = element("div", "data-l-jwpk6v", ["item-row"]);
  const _el210 = element("div", "data-l-jwpk6v", ["item-header"]);
  const _el211 = element("span", "data-l-jwpk6v", ["item-label"]);
  const _t212 = text("عرض الصفحة النشطة");
  _el211.appendChild(_t212);
  _el210.appendChild(_el211);
  const _el213 = element("span", "data-l-jwpk6v", ["item-desc"]);
  const _t214 = text("RouterView");
  _el213.appendChild(_t214);
  _el210.appendChild(_el213);
  _el209.appendChild(_el210);
  const _el215 = element("div", "data-l-jwpk6v", ["snippet"]);
  const _el216 = element("code", "data-l-jwpk6v", null);
  const _t217 = text("RouterView");
  _el216.appendChild(_t217);
  _el215.appendChild(_el216);
  const _el218 = element("button", "data-l-jwpk6v", ["mini-copy"]);
  _el218.setAttribute("type", "button");
  listen(_el218, "click", (e) => { copyToClipboard('RouterView'); }, []);
  const _t219 = text("نسخ");
  _el218.appendChild(_t219);
  _el215.appendChild(_el218);
  _el209.appendChild(_el215);
  _el179.appendChild(_el209);
  _el6.appendChild(_el179);
  _el0.appendChild(_el6);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function Deployment(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const nginxConfig = `server {
      listen 80;
      server_name my-liquid-site.com;
      root /var/www/my-liquid-site/dist;
      index index.html;
      location / {
          try_files $uri $uri/ /index.html;
      }
      # تخزين الأصول المشفرة بالهاش مؤقتاً
      location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
          expires 1y;
          add_header Cache-Control "public, no-transform";
      }
  }`;
  const _root = [];
  const _el0 = element("div", "data-l-xx6g60", ["deploy-page"]);
  const _el1 = element("div", "data-l-xx6g60", ["deploy-head"]);
  const _el2 = element("h1", "data-l-xx6g60", ["deploy-title"]);
  const _t3 = text("النشر والإنتاج (Production & Deployment)");
  _el2.appendChild(_t3);
  _el1.appendChild(_el2);
  const _el4 = element("p", "data-l-xx6g60", ["deploy-desc"]);
  const _t5 = text("كيفية تحويل موقع Liquid إلى حزمة إنتاج فائقة السرعة واستضافته على الإنترنت مجاناً.");
  _el4.appendChild(_t5);
  _el1.appendChild(_el4);
  _el0.appendChild(_el1);
  const _el6 = element("div", "data-l-xx6g60", ["deploy-section"]);
  const _el7 = element("h2", "data-l-xx6g60", ["section-h2"]);
  const _el8 = element("span", "data-l-xx6g60", null);
  const _t9 = text("📦");
  _el8.appendChild(_t9);
  _el7.appendChild(_el8);
  const _el10 = element("span", "data-l-xx6g60", null);
  const _t11 = text("1. توليد حزمة الإنتاج");
  _el10.appendChild(_t11);
  _el7.appendChild(_el10);
  _el6.appendChild(_el7);
  const _el12 = element("p", "data-l-xx6g60", ["section-p"]);
  const _t13 = text("يقوم مصرف ومجمع Liquid بضغط ملفات JavaScript واستخراج كافة أنماط CSS المعزولة وتوليد أسماء ملفات مشفرة بالهاش لمنع مشاكل التخزين المؤقت:");
  _el12.appendChild(_t13);
  _el6.appendChild(_el12);
  const _el14 = element("div", "data-l-xx6g60", ["code-box"]);
  const _el15 = element("code", "data-l-xx6g60", null);
  const _t16 = text("liquid build");
  _el15.appendChild(_t16);
  _el14.appendChild(_el15);
  const _el17 = element("button", "data-l-xx6g60", ["copy-btn"]);
  _el17.setAttribute("type", "button");
  listen(_el17, "click", (e) => { copyToClipboard('liquid build'); }, []);
  const _t18 = text("نسخ");
  _el17.appendChild(_t18);
  _el14.appendChild(_el17);
  _el6.appendChild(_el14);
  const _el19 = element("p", "data-l-xx6g60", ["section-p"]);
  const _t20 = text("يمكنك أيضاً تجربة النسخة المنتجة محلياً لمحاكاة أداء الخادم الحقيقي:");
  _el19.appendChild(_t20);
  _el6.appendChild(_el19);
  const _el21 = element("div", "data-l-xx6g60", ["code-box"]);
  const _el22 = element("code", "data-l-xx6g60", null);
  const _t23 = text("liquid preview");
  _el22.appendChild(_t23);
  _el21.appendChild(_el22);
  const _el24 = element("button", "data-l-xx6g60", ["copy-btn"]);
  _el24.setAttribute("type", "button");
  listen(_el24, "click", (e) => { copyToClipboard('liquid preview'); }, []);
  const _t25 = text("نسخ");
  _el24.appendChild(_t25);
  _el21.appendChild(_el24);
  _el6.appendChild(_el21);
  _el0.appendChild(_el6);
  const _el26 = element("div", "data-l-xx6g60", ["deploy-section"]);
  const _el27 = element("h2", "data-l-xx6g60", ["section-h2"]);
  const _el28 = element("span", "data-l-xx6g60", null);
  const _t29 = text("☁️");
  _el28.appendChild(_t29);
  _el27.appendChild(_el28);
  const _el30 = element("span", "data-l-xx6g60", null);
  const _t31 = text("2. النشر على منصات الاستضافة السحابية");
  _el30.appendChild(_t31);
  _el27.appendChild(_el30);
  _el26.appendChild(_el27);
  const _el32 = element("p", "data-l-xx6g60", ["section-p"]);
  const _t33 = text("نظراً لأن ناتج البناء في مجلد dist هو موقع ثابت (Pure Static Site)، يمكنك استضافته مجاناً وبنقرة واحدة:");
  _el32.appendChild(_t33);
  _el26.appendChild(_el32);
  const _el34 = element("div", "data-l-xx6g60", ["platforms-grid"]);
  const _el35 = element("div", "data-l-xx6g60", ["platform-card"]);
  const _el36 = element("h3", "data-l-xx6g60", null);
  const _t37 = text("▲ Vercel");
  _el36.appendChild(_t37);
  _el35.appendChild(_el36);
  const _el38 = element("p", "data-l-xx6g60", null);
  const _t39 = text("اربط مستودع GitHub واختر إعداد Output Directory إلى dist واترك الباقي تلقائياً.");
  _el38.appendChild(_t39);
  _el35.appendChild(_el38);
  _el34.appendChild(_el35);
  const _el40 = element("div", "data-l-xx6g60", ["platform-card"]);
  const _el41 = element("h3", "data-l-xx6g60", null);
  const _t42 = text("🌐 Netlify");
  _el41.appendChild(_t42);
  _el40.appendChild(_el41);
  const _el43 = element("p", "data-l-xx6g60", null);
  const _t44 = text("اختر المجلد dist كنقطة نشر، وأمر البناء npm run build.");
  _el43.appendChild(_t44);
  _el40.appendChild(_el43);
  _el34.appendChild(_el40);
  const _el45 = element("div", "data-l-xx6g60", ["platform-card"]);
  const _el46 = element("h3", "data-l-xx6g60", null);
  const _t47 = text("🐙 GitHub Pages");
  _el46.appendChild(_t47);
  _el45.appendChild(_el46);
  const _el48 = element("p", "data-l-xx6g60", null);
  const _t49 = text("استخدم أداة gh-pages لنشر محتويات مجلد dist إلى فرع gh-pages مجاناً.");
  _el48.appendChild(_t49);
  _el45.appendChild(_el48);
  _el34.appendChild(_el45);
  const _el50 = element("div", "data-l-xx6g60", ["platform-card"]);
  const _el51 = element("h3", "data-l-xx6g60", null);
  const _t52 = text("⚡ Cloudflare Pages");
  _el51.appendChild(_t52);
  _el50.appendChild(_el51);
  const _el53 = element("p", "data-l-xx6g60", null);
  const _t54 = text("استضافة سريعة على شبكة Cloudflare العالمية مع شهادة SSL مجانية وتحديث فوري.");
  _el53.appendChild(_t54);
  _el50.appendChild(_el53);
  _el34.appendChild(_el50);
  _el26.appendChild(_el34);
  _el0.appendChild(_el26);
  const _el55 = element("div", "data-l-xx6g60", ["deploy-section"]);
  const _el56 = element("h2", "data-l-xx6g60", ["section-h2"]);
  const _el57 = element("span", "data-l-xx6g60", null);
  const _t58 = text("🖥️");
  _el57.appendChild(_t58);
  _el56.appendChild(_el57);
  const _el59 = element("span", "data-l-xx6g60", null);
  const _t60 = text("3. النشر على خادم VPS أو Nginx");
  _el59.appendChild(_t60);
  _el56.appendChild(_el59);
  _el55.appendChild(_el56);
  const _el61 = element("p", "data-l-xx6g60", ["section-p"]);
  const _t62 = text("إذا كنت تستضيف موقعك على خادم لينكس خاص، هذا ملف تكوين Nginx الكامل مع دعم التوجيه للتطبيقات أحادية الصفحة (SPA):");
  _el61.appendChild(_t62);
  _el55.appendChild(_el61);
  const _el63 = element("pre", "data-l-xx6g60", ["nginx-pre"]);
  const _el64 = element("code", "data-l-xx6g60", null);
  const _t65 = text('');
  bindText(_t65, () => (nginxConfig));
  _el64.appendChild(_t65);
  _el63.appendChild(_el64);
  _el55.appendChild(_el63);
  _el0.appendChild(_el55);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function Errors(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const searchInput = signal('');
  const selectedCategory = signal('all'); // 'all' | 'compiler' | 'runtime' | 'router' | 'cli'
  const expandedErrorId = signal(null);
  if (typeof window !== 'undefined') {
    function readHashParam() {
      const hash = window.location.hash || '';
      const qIndex = hash.indexOf('?');
      if (qIndex !== -1) {
        const params = new URLSearchParams(hash.slice(qIndex));
        const id = params.get('id');
        if (id) {
          searchInput.value = id.trim().toUpperCase();
          expandedErrorId.value = id.trim().toUpperCase();
        }
      }
    }
    readHashParam();
    window.addEventListener('hashchange', readHashParam);
  }
  const filteredErrors = computed(() => {
    const query = searchInput.value.trim().toLowerCase();
    const cat = selectedCategory.value;
    return ERROR_LIST.filter(err => {
      if (cat !== 'all' && err.category !== cat) {
        return false;
      }
      if (!query) return true;
      return (
        err.id.toLowerCase().includes(query) ||
        err.titleAr.toLowerCase().includes(query) ||
        err.titleEn.toLowerCase().includes(query) ||
        err.summaryAr.toLowerCase().includes(query) ||
        err.causeAr.toLowerCase().includes(query)
      );
    });
  });
  function setCategory(cat) {
    selectedCategory.value = cat;
  }
  function selectId(id) {
    searchInput.value = id;
    expandedErrorId.value = id;
  }
  function clearSearch() {
    searchInput.value = '';
    selectedCategory.value = 'all';
  }
  function getErrorUrl(id) {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/#/errors?id=${id}`;
    }
    return `http://localhost:4000/#/errors?id=${id}`;
  }
  const _root = [];
  const _el0 = element("div", "data-l-nxqvyd", ["errors-page"]);
  const _el1 = element("header", "data-l-nxqvyd", ["page-head"]);
  const _el2 = element("span", "data-l-nxqvyd", ["page-tag"]);
  const _t3 = text("تشخيص الأخطاء والحلول");
  _el2.appendChild(_t3);
  _el1.appendChild(_el2);
  const _el4 = element("h1", "data-l-nxqvyd", ["page-title"]);
  const _t5 = text("دليل معرفات الأخطاء (Error Catalog)");
  _el4.appendChild(_t5);
  _el1.appendChild(_el4);
  const _el6 = element("p", "data-l-nxqvyd", ["page-desc"]);
  const _t7 = text("يحمل كل خطأ في Liquid معرّفاً فريداً (مثل LQ-101). اكتب المعرّف هنا لتعرف سبب الخطأ وكود الحل الفوري.");
  _el6.appendChild(_t7);
  _el1.appendChild(_el6);
  _el0.appendChild(_el1);
  const _el8 = element("div", "data-l-nxqvyd", ["search-card"]);
  const _el9 = element("div", "data-l-nxqvyd", ["search-input-wrap"]);
  const _el10 = element("span", "data-l-nxqvyd", ["search-icon"]);
  const _t11 = text("🔍");
  _el10.appendChild(_t11);
  _el9.appendChild(_el10);
  const _el12 = element("input", "data-l-nxqvyd", ["search-input"]);
  _el12.setAttribute("type", "text");
  _el12.setAttribute("placeholder", "اكتب رمز الخطأ (مثال: LQ-101) أو ابحث بالعنوان...");
  bindInput(_el12, searchInput, "bind");
  _el9.appendChild(_el12);
  const _anchor13 = document.createComment('if');
  _el9.appendChild(_anchor13);
  createIfBlock(_anchor13, () => (searchInput.value), () => {
    const _thenNodes14 = [];
    const _el15 = element("button", "data-l-nxqvyd", ["clear-btn"]);
    _el15.setAttribute("type", "button");
    listen(_el15, "click", clearSearch, []);
    const _t16 = text("مسح");
    _el15.appendChild(_t16);
    _thenNodes14.push(_el15);
    return _thenNodes14;
  }, null);
  _el8.appendChild(_el9);
  const _el17 = element("div", "data-l-nxqvyd", ["filter-pills"]);
  const _el18 = element("button", "data-l-nxqvyd", ["pill-btn"]);
  bindAttr(_el18, "class", () => ("pill-btn" + ((selectedCategory.value === 'all' ? 'active' : '') ? ' ' + (selectedCategory.value === 'all' ? 'active' : '') : '')));
  _el18.setAttribute("type", "button");
  listen(_el18, "click", (e) => { setCategory('all'); }, []);
  const _t19 = text("الكل");
  _el18.appendChild(_t19);
  _el17.appendChild(_el18);
  const _el20 = element("button", "data-l-nxqvyd", ["pill-btn"]);
  bindAttr(_el20, "class", () => ("pill-btn" + ((selectedCategory.value === 'compiler' ? 'active' : '') ? ' ' + (selectedCategory.value === 'compiler' ? 'active' : '') : '')));
  _el20.setAttribute("type", "button");
  listen(_el20, "click", (e) => { setCategory('compiler'); }, []);
  const _t21 = text("المصرف والبناء (LQ-100s)");
  _el20.appendChild(_t21);
  _el17.appendChild(_el20);
  const _el22 = element("button", "data-l-nxqvyd", ["pill-btn"]);
  bindAttr(_el22, "class", () => ("pill-btn" + ((selectedCategory.value === 'runtime' ? 'active' : '') ? ' ' + (selectedCategory.value === 'runtime' ? 'active' : '') : '')));
  _el22.setAttribute("type", "button");
  listen(_el22, "click", (e) => { setCategory('runtime'); }, []);
  const _t23 = text("التفاعلية والـ DOM (LQ-200s)");
  _el22.appendChild(_t23);
  _el17.appendChild(_el22);
  const _el24 = element("button", "data-l-nxqvyd", ["pill-btn"]);
  bindAttr(_el24, "class", () => ("pill-btn" + ((selectedCategory.value === 'router' ? 'active' : '') ? ' ' + (selectedCategory.value === 'router' ? 'active' : '') : '')));
  _el24.setAttribute("type", "button");
  listen(_el24, "click", (e) => { setCategory('router'); }, []);
  const _t25 = text("الموجه والمسارات (LQ-300s)");
  _el24.appendChild(_t25);
  _el17.appendChild(_el24);
  const _el26 = element("button", "data-l-nxqvyd", ["pill-btn"]);
  bindAttr(_el26, "class", () => ("pill-btn" + ((selectedCategory.value === 'cli' ? 'active' : '') ? ' ' + (selectedCategory.value === 'cli' ? 'active' : '') : '')));
  _el26.setAttribute("type", "button");
  listen(_el26, "click", (e) => { setCategory('cli'); }, []);
  const _t27 = text("أوامر الطرفية (LQ-400s)");
  _el26.appendChild(_t27);
  _el17.appendChild(_el26);
  _el8.appendChild(_el17);
  _el0.appendChild(_el8);
  const _el28 = element("div", "data-l-nxqvyd", ["quick-codes"]);
  const _el29 = element("span", "data-l-nxqvyd", ["quick-label"]);
  const _t30 = text("انتقال سريع لرمز:");
  _el29.appendChild(_t30);
  _el28.appendChild(_el29);
  const _el31 = element("button", "data-l-nxqvyd", ["code-chip"]);
  _el31.setAttribute("type", "button");
  listen(_el31, "click", (e) => { selectId('LQ-101'); }, []);
  const _t32 = text("LQ-101");
  _el31.appendChild(_t32);
  _el28.appendChild(_el31);
  const _el33 = element("button", "data-l-nxqvyd", ["code-chip"]);
  _el33.setAttribute("type", "button");
  listen(_el33, "click", (e) => { selectId('LQ-102'); }, []);
  const _t34 = text("LQ-102");
  _el33.appendChild(_t34);
  _el28.appendChild(_el33);
  const _el35 = element("button", "data-l-nxqvyd", ["code-chip"]);
  _el35.setAttribute("type", "button");
  listen(_el35, "click", (e) => { selectId('LQ-104'); }, []);
  const _t36 = text("LQ-104");
  _el35.appendChild(_t36);
  _el28.appendChild(_el35);
  const _el37 = element("button", "data-l-nxqvyd", ["code-chip"]);
  _el37.setAttribute("type", "button");
  listen(_el37, "click", (e) => { selectId('LQ-105'); }, []);
  const _t38 = text("LQ-105");
  _el37.appendChild(_t38);
  _el28.appendChild(_el37);
  const _el39 = element("button", "data-l-nxqvyd", ["code-chip"]);
  _el39.setAttribute("type", "button");
  listen(_el39, "click", (e) => { selectId('LQ-201'); }, []);
  const _t40 = text("LQ-201");
  _el39.appendChild(_t40);
  _el28.appendChild(_el39);
  const _el41 = element("button", "data-l-nxqvyd", ["code-chip"]);
  _el41.setAttribute("type", "button");
  listen(_el41, "click", (e) => { selectId('LQ-202'); }, []);
  const _t42 = text("LQ-202");
  _el41.appendChild(_t42);
  _el28.appendChild(_el41);
  const _el43 = element("button", "data-l-nxqvyd", ["code-chip"]);
  _el43.setAttribute("type", "button");
  listen(_el43, "click", (e) => { selectId('LQ-301'); }, []);
  const _t44 = text("LQ-301");
  _el43.appendChild(_t44);
  _el28.appendChild(_el43);
  const _el45 = element("button", "data-l-nxqvyd", ["code-chip"]);
  _el45.setAttribute("type", "button");
  listen(_el45, "click", (e) => { selectId('LQ-401'); }, []);
  const _t46 = text("LQ-401");
  _el45.appendChild(_t46);
  _el28.appendChild(_el45);
  _el0.appendChild(_el28);
  const _anchor47 = document.createComment('if');
  _el0.appendChild(_anchor47);
  createIfBlock(_anchor47, () => (filteredErrors.value.length === 0), () => {
    const _thenNodes48 = [];
    const _el49 = element("div", "data-l-nxqvyd", ["empty-box"]);
    const _el50 = element("div", "data-l-nxqvyd", ["empty-icon"]);
    const _t51 = text("🔎");
    _el50.appendChild(_t51);
    _el49.appendChild(_el50);
    const _el52 = element("h3", "data-l-nxqvyd", ["empty-title"]);
    const _t53 = text("لم يتم العثور على أخطاء تطابق بحثك!");
    _el52.appendChild(_t53);
    _el49.appendChild(_el52);
    const _el54 = element("p", "data-l-nxqvyd", ["empty-desc"]);
    const _t55 = text("جرب البحث بكلمات عامة مثل \"Tab\" أو \"Signal\" أو \"each\".");
    _el54.appendChild(_t55);
    _el49.appendChild(_el54);
    const _el56 = element("button", "data-l-nxqvyd", ["pill-btn","active"]);
    _el56.setAttribute("type", "button");
    listen(_el56, "click", clearSearch, []);
    const _t57 = text("عرض كافة الأخطاء");
    _el56.appendChild(_t57);
    _el49.appendChild(_el56);
    _thenNodes48.push(_el49);
    return _thenNodes48;
  }, () => {
    const _elseNodes58 = [];
    const _el59 = element("div", "data-l-nxqvyd", ["error-list"]);
    const _anchor60 = document.createComment('each');
    _el59.appendChild(_anchor60);
    createEachBlock(_anchor60, () => (filteredErrors.value), (err, _idx) => (err.id), (errSig, _idxSig) => {
      const err = new Proxy(errSig, {
        get(target, prop) {
          if (prop === 'isSignal') return true;
          if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') {
            return () => target();
          }
          const val = target();
          if (val != null && prop in Object(val)) {
            const res = val[prop];
            return typeof res === 'function' ? res.bind(val) : res;
          }
          return val;
        },
        apply(target) { return target(); }
      });
      const _idx = new Proxy(_idxSig, {
        apply(target) { return target(); },
        get(target, prop) {
          if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') return () => target();
          const val = target();
          if (val != null && prop in Object(val)) {
            const res = val[prop];
            return typeof res === 'function' ? res.bind(val) : res;
          }
          return val;
        }
      });
      const _eachNodes61 = [];
      const _el62 = element("div", "data-l-nxqvyd", ["error-card"]);
      bindAttr(_el62, "id", () => (err.id));
      const _el63 = element("div", "data-l-nxqvyd", ["card-top"]);
      const _el64 = element("div", "data-l-nxqvyd", ["meta-badges"]);
      const _el65 = element("span", "data-l-nxqvyd", ["id-badge"]);
      const _t66 = text('');
      bindText(_t66, () => (err.id));
      _el65.appendChild(_t66);
      _el64.appendChild(_el65);
      const _el67 = element("span", "data-l-nxqvyd", ["cat-badge"]);
      const _t68 = text('');
      bindText(_t68, () => (err.category));
      _el67.appendChild(_t68);
      _el64.appendChild(_el67);
      _el63.appendChild(_el64);
      const _el69 = element("div", "data-l-nxqvyd", ["card-actions"]);
      const _el70 = element("button", "data-l-nxqvyd", ["copy-link-btn"]);
      _el70.setAttribute("type", "button");
      listen(_el70, "click", (e) => { copyToClipboard(getErrorUrl(err.id), 'تم نسخ رابط الخطأ! ✓'); }, []);
      const _t71 = text("نسخ رابط التوثيق 🔗");
      _el70.appendChild(_t71);
      _el69.appendChild(_el70);
      _el63.appendChild(_el69);
      _el62.appendChild(_el63);
      const _el72 = element("h2", "data-l-nxqvyd", ["err-title"]);
      const _t73 = text('');
      bindText(_t73, () => (err.titleAr));
      _el72.appendChild(_t73);
      _el62.appendChild(_el72);
      const _el74 = element("p", "data-l-nxqvyd", ["err-title-en"]);
      const _t75 = text('');
      bindText(_t75, () => (err.titleEn));
      _el74.appendChild(_t75);
      _el62.appendChild(_el74);
      const _el76 = element("p", "data-l-nxqvyd", ["err-summary"]);
      const _t77 = text('');
      bindText(_t77, () => (err.summaryAr));
      _el76.appendChild(_t77);
      _el62.appendChild(_el76);
      const _el78 = element("div", "data-l-nxqvyd", ["explain-box"]);
      const _el79 = element("div", "data-l-nxqvyd", ["explain-label"]);
      const _t80 = text("❓ لماذا يحدث هذا الخطأ؟");
      _el79.appendChild(_t80);
      _el78.appendChild(_el79);
      const _el81 = element("p", "data-l-nxqvyd", ["explain-text"]);
      const _t82 = text('');
      bindText(_t82, () => (err.causeAr));
      _el81.appendChild(_t82);
      _el78.appendChild(_el81);
      _el62.appendChild(_el78);
      const _el83 = element("div", "data-l-nxqvyd", ["codes-grid"]);
      const _el84 = element("div", "data-l-nxqvyd", ["code-col","bad"]);
      const _el85 = element("div", "data-l-nxqvyd", ["code-col-head"]);
      const _el86 = element("span", "data-l-nxqvyd", null);
      const _t87 = text("❌ كود خاطئ يسبب المشكلة");
      _el86.appendChild(_t87);
      _el85.appendChild(_el86);
      _el84.appendChild(_el85);
      const _el88 = element("pre", "data-l-nxqvyd", ["code-pre"]);
      const _el89 = element("code", "data-l-nxqvyd", null);
      const _t90 = text('');
      bindText(_t90, () => (err.badCode));
      _el89.appendChild(_t90);
      _el88.appendChild(_el89);
      _el84.appendChild(_el88);
      _el83.appendChild(_el84);
      const _el91 = element("div", "data-l-nxqvyd", ["code-col","good"]);
      const _el92 = element("div", "data-l-nxqvyd", ["code-col-head"]);
      const _el93 = element("span", "data-l-nxqvyd", null);
      const _t94 = text("✅ الكود الصحيح");
      _el93.appendChild(_t94);
      _el92.appendChild(_el93);
      _el91.appendChild(_el92);
      const _el95 = element("pre", "data-l-nxqvyd", ["code-pre"]);
      const _el96 = element("code", "data-l-nxqvyd", null);
      const _t97 = text('');
      bindText(_t97, () => (err.goodCode));
      _el96.appendChild(_t97);
      _el95.appendChild(_el96);
      _el91.appendChild(_el95);
      _el83.appendChild(_el91);
      _el62.appendChild(_el83);
      const _el98 = element("div", "data-l-nxqvyd", ["fix-box"]);
      const _el99 = element("div", "data-l-nxqvyd", ["fix-head"]);
      const _t100 = text("💡 خطوات الحل السريع");
      _el99.appendChild(_t100);
      _el98.appendChild(_el99);
      const _el101 = element("p", "data-l-nxqvyd", ["fix-desc"]);
      const _t102 = text('');
      bindText(_t102, () => (err.fixAr));
      _el101.appendChild(_t102);
      _el98.appendChild(_el101);
      _el62.appendChild(_el98);
      _eachNodes61.push(_el62);
      return _eachNodes61;
    });
    _elseNodes58.push(_el59);
    return _elseNodes58;
  });
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function Guide(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  function selectChapter(ch) {
    activeChapter.value = ch;
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
  const SEC_LOGIC = '---' + ' logic';
  const SEC_STYLE = '---' + ' style';
  const SEC_UI = '---' + ' ui';
  const codeInstall = `# 1. تثبيت سطر أوامر Liquid عاماً على جهازك
  npm install -g liquid-cli
  # 2. إنشاء مشروع موقع جديد جاهز للتشغيل
  liquid create my-website
  # 3. الدخول إلى مجلد المشروع وبدء خادم التطوير
  cd my-website
  npm run dev`;
  const codeTree = `my-website/
  ├── index.html          # الصفحة الحاوية وعنصر التثبيت (#app)
  ├── liquid.config.js    # إعدادات المنفذ والاستضافة والبناء
  ├── package.json        # معلومات المشروع واعتماديات Liquid
  ├── public/             # الملفات الثابتة والصور والأيقونات
  └── src/
      ├── main.js         # نقطة الدخول (Entry Point) وربط التطبيق
      └── App.liq         # المكون الجذري الرئيسي للموقع`;
  const codeIndexHtml = `<!DOCTYPE html>
  <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>موقعي بـ Liquid</title>
    </head>
    <body>
      <div id="app"></div>
      <script type="module" src="/src/main.js"></script>
    </body>
  </html>`;
  const codeMainJs = `
  mount(App, document.getElementById('app'));`;
  const codeCardLiq = `${SEC_LOGIC}
  const likes = signal(0);
  function giveLike() {
    likes.value++;
  }
  ${SEC_STYLE}
  .card {
    background: #ffffff;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  }
  .btn-like {
    background: #0284c7;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    cursor: pointer;
  }
  ${SEC_UI}
  div.card
    h2 بطاقة تفاعلية
    p عدد الإعجابات: {likes.value}
    button.btn-like @click=giveLike إعجاب ❤️`;
  const codeSignal = `
  const count = signal(0);
  console.log(count.value); // 0 (أو يمكنك استدعاؤها كدالة: count())
  count.value++; // أصبحت 1`;
  const codeComputed = `
  const price = signal(100);
  const taxRate = signal(0.15);
  const total = computed(() => price.value + (price.value * taxRate.value));`;
  const codeEffect = `
  const theme = signal('dark');
  effect(() => {
    localStorage.setItem('user_theme', theme.value);
    document.body.className = theme.value;
  });`;
  const codeDirectives = `// حدث النقر البسيط
  button @click=increment زيادة العداد
  form @submit.prevent=handleSubmit
  input @keydown.enter=addTodo`;
  const codeBind = `input type="text" $bind=searchQuery
  p أنت تبحث عن: {searchQuery.value}`;
  const codeIf = `if isLoggedIn.value
    h2 مرحباً بك مجدداً يا {username.value}!
    button @click=logout تسجيل الخروج
  else
    p الرجاء تسجيل الدخول للمتابعة.
    button @click=login تسجيل الدخول`;
  const codeEach = `each products.value as p (p.id)
    div.product-card
      h3 {p.title}
      span السعر: {'$' + p.price}`;
  const codeRouter = `
  const routes = [
    { path: '/', component: HomePage },
    { path: '/about', component: AboutPage },
    { path: '*', component: NotFound }
  ];
  export const router = createRouter({ routes, mode: 'hash' });
  export const { RouterView, navigate, currentPath } = router;`;
  const codeAppRouter = `${SEC_LOGIC}
  ${SEC_UI}
  div.site-wrapper
    header
      button @click=navigate('/') الرئيسية
      button @click=navigate('/about') حول الموقع
    main
      RouterView`;
  const codeStyling = `${SEC_STYLE}
  :global(:root) {
    --bg-page: #ffffff;
    --text-main: #0f172a;
    --primary: #0284c7;
  }
  :global([data-theme="dark"]) {
    --bg-page: #0b0f19;
    --text-main: #f8fafc;
    --primary: #38bdf8;
  }
  body {
    background: var(--bg-page);
    color: var(--text-main);
    margin: 0;
    font-family: sans-serif;
  }`;
  const codeBuild = `# إنشاء حزمة الإنتاج في مجلد dist/
  liquid build
  # تجربة حزمة الإنتاج محلياً للتأكد من كل شيء
  liquid preview`;
  const codeLqe = `# فتح محرر liquid-edit المدمج
  liquid edit src/App.liq
  # أو بالأمر المختصر
  lqe src/App.liq`;
  const codePlatforms = `Vercel: قم بتعيين Output Directory إلى dist
  Netlify: اختر المجلد dist للنشر الفوري
  GitHub Pages: ارفع محتويات dist إلى فرع gh-pages
  Cloudflare Pages: قم بربط المستودع مع أمر liquid build`;
  const _root = [];
  const _el0 = element("div", "data-l-1ayf5gy", ["guide-container"]);
  const _el1 = element("aside", "data-l-1ayf5gy", ["guide-sidebar"]);
  const _el2 = element("div", "data-l-1ayf5gy", ["sidebar-title"]);
  const _t3 = text('');
  bindText(_t3, () => (t('chaptersTitle')));
  _el2.appendChild(_t3);
  _el1.appendChild(_el2);
  const _el4 = element("button", "data-l-1ayf5gy", ["ch-btn"]);
  bindAttr(_el4, "class", () => ("ch-btn" + ((activeChapter.value === 'overview' ? 'active' : '') ? ' ' + (activeChapter.value === 'overview' ? 'active' : '') : '')));
  _el4.setAttribute("type", "button");
  listen(_el4, "click", (e) => { selectChapter('overview'); }, []);
  const _el5 = element("span", "data-l-1ayf5gy", ["ch-icon"]);
  const _t6 = text("🫟");
  _el5.appendChild(_t6);
  _el4.appendChild(_el5);
  const _el7 = element("span", "data-l-1ayf5gy", null);
  const _t8 = text('');
  bindText(_t8, () => (t('chOverview')));
  _el7.appendChild(_t8);
  _el4.appendChild(_el7);
  _el1.appendChild(_el4);
  const _el9 = element("button", "data-l-1ayf5gy", ["ch-btn"]);
  bindAttr(_el9, "class", () => ("ch-btn" + ((activeChapter.value === 'structure' ? 'active' : '') ? ' ' + (activeChapter.value === 'structure' ? 'active' : '') : '')));
  _el9.setAttribute("type", "button");
  listen(_el9, "click", (e) => { selectChapter('structure'); }, []);
  const _el10 = element("span", "data-l-1ayf5gy", ["ch-icon"]);
  const _t11 = text("📁");
  _el10.appendChild(_t11);
  _el9.appendChild(_el10);
  const _el12 = element("span", "data-l-1ayf5gy", null);
  const _t13 = text('');
  bindText(_t13, () => (t('chStructure')));
  _el12.appendChild(_t13);
  _el9.appendChild(_el12);
  _el1.appendChild(_el9);
  const _el14 = element("button", "data-l-1ayf5gy", ["ch-btn"]);
  bindAttr(_el14, "class", () => ("ch-btn" + ((activeChapter.value === 'anatomy' ? 'active' : '') ? ' ' + (activeChapter.value === 'anatomy' ? 'active' : '') : '')));
  _el14.setAttribute("type", "button");
  listen(_el14, "click", (e) => { selectChapter('anatomy'); }, []);
  const _el15 = element("span", "data-l-1ayf5gy", ["ch-icon"]);
  const _t16 = text("🧩");
  _el15.appendChild(_t16);
  _el14.appendChild(_el15);
  const _el17 = element("span", "data-l-1ayf5gy", null);
  const _t18 = text('');
  bindText(_t18, () => (t('chAnatomy')));
  _el17.appendChild(_t18);
  _el14.appendChild(_el17);
  _el1.appendChild(_el14);
  const _el19 = element("button", "data-l-1ayf5gy", ["ch-btn"]);
  bindAttr(_el19, "class", () => ("ch-btn" + ((activeChapter.value === 'signals' ? 'active' : '') ? ' ' + (activeChapter.value === 'signals' ? 'active' : '') : '')));
  _el19.setAttribute("type", "button");
  listen(_el19, "click", (e) => { selectChapter('signals'); }, []);
  const _el20 = element("span", "data-l-1ayf5gy", ["ch-icon"]);
  const _t21 = text("⚡");
  _el20.appendChild(_t21);
  _el19.appendChild(_el20);
  const _el22 = element("span", "data-l-1ayf5gy", null);
  const _t23 = text('');
  bindText(_t23, () => (t('chSignals')));
  _el22.appendChild(_t23);
  _el19.appendChild(_el22);
  _el1.appendChild(_el19);
  const _el24 = element("button", "data-l-1ayf5gy", ["ch-btn"]);
  bindAttr(_el24, "class", () => ("ch-btn" + ((activeChapter.value === 'directives' ? 'active' : '') ? ' ' + (activeChapter.value === 'directives' ? 'active' : '') : '')));
  _el24.setAttribute("type", "button");
  listen(_el24, "click", (e) => { selectChapter('directives'); }, []);
  const _el25 = element("span", "data-l-1ayf5gy", ["ch-icon"]);
  const _t26 = text("🎯");
  _el25.appendChild(_t26);
  _el24.appendChild(_el25);
  const _el27 = element("span", "data-l-1ayf5gy", null);
  const _t28 = text('');
  bindText(_t28, () => (t('chDirectives')));
  _el27.appendChild(_t28);
  _el24.appendChild(_el27);
  _el1.appendChild(_el24);
  const _el29 = element("button", "data-l-1ayf5gy", ["ch-btn"]);
  bindAttr(_el29, "class", () => ("ch-btn" + ((activeChapter.value === 'routing' ? 'active' : '') ? ' ' + (activeChapter.value === 'routing' ? 'active' : '') : '')));
  _el29.setAttribute("type", "button");
  listen(_el29, "click", (e) => { selectChapter('routing'); }, []);
  const _el30 = element("span", "data-l-1ayf5gy", ["ch-icon"]);
  const _t31 = text("🗺️");
  _el30.appendChild(_t31);
  _el29.appendChild(_el30);
  const _el32 = element("span", "data-l-1ayf5gy", null);
  const _t33 = text('');
  bindText(_t33, () => (t('chRouting')));
  _el32.appendChild(_t33);
  _el29.appendChild(_el32);
  _el1.appendChild(_el29);
  const _el34 = element("button", "data-l-1ayf5gy", ["ch-btn"]);
  bindAttr(_el34, "class", () => ("ch-btn" + ((activeChapter.value === 'styling' ? 'active' : '') ? ' ' + (activeChapter.value === 'styling' ? 'active' : '') : '')));
  _el34.setAttribute("type", "button");
  listen(_el34, "click", (e) => { selectChapter('styling'); }, []);
  const _el35 = element("span", "data-l-1ayf5gy", ["ch-icon"]);
  const _t36 = text("🎨");
  _el35.appendChild(_t36);
  _el34.appendChild(_el35);
  const _el37 = element("span", "data-l-1ayf5gy", null);
  const _t38 = text('');
  bindText(_t38, () => (t('chStyling')));
  _el37.appendChild(_t38);
  _el34.appendChild(_el37);
  _el1.appendChild(_el34);
  const _el39 = element("button", "data-l-1ayf5gy", ["ch-btn"]);
  bindAttr(_el39, "class", () => ("ch-btn" + ((activeChapter.value === 'deploy' ? 'active' : '') ? ' ' + (activeChapter.value === 'deploy' ? 'active' : '') : '')));
  _el39.setAttribute("type", "button");
  listen(_el39, "click", (e) => { selectChapter('deploy'); }, []);
  const _el40 = element("span", "data-l-1ayf5gy", ["ch-icon"]);
  const _t41 = text("🚀");
  _el40.appendChild(_t41);
  _el39.appendChild(_el40);
  const _el42 = element("span", "data-l-1ayf5gy", null);
  const _t43 = text('');
  bindText(_t43, () => (t('chDeployment')));
  _el42.appendChild(_t43);
  _el39.appendChild(_el42);
  _el1.appendChild(_el39);
  _el0.appendChild(_el1);
  const _el44 = element("main", "data-l-1ayf5gy", ["guide-content"]);
  const _anchor45 = document.createComment('if');
  _el44.appendChild(_anchor45);
  createIfBlock(_anchor45, () => (activeChapter.value === 'overview'), () => {
    const _thenNodes46 = [];
    const _el47 = element("div", "data-l-1ayf5gy", ["chapter-pane"]);
    const _el48 = element("div", "data-l-1ayf5gy", ["ch-header"]);
    const _el49 = element("span", "data-l-1ayf5gy", ["ch-tag"]);
    const _t50 = text("الفصل الأول");
    _el49.appendChild(_t50);
    _el48.appendChild(_el49);
    const _el51 = element("h1", "data-l-1ayf5gy", ["ch-h1"]);
    const _t52 = text("ما هو Liquid ولماذا هو الخيار الأفضل؟");
    _el51.appendChild(_t52);
    _el48.appendChild(_el51);
    const _el53 = element("p", "data-l-1ayf5gy", ["ch-lead"]);
    const _t54 = text("نظرة شاملة على فلسفة إطار العمل، كيف يعمل بدون Virtual DOM، وكيف تثبته في جهازك.");
    _el53.appendChild(_t54);
    _el48.appendChild(_el53);
    _el47.appendChild(_el48);
    const _el55 = element("div", "data-l-1ayf5gy", ["guide-body"]);
    const _el56 = element("div", "data-l-1ayf5gy", ["section-block"]);
    const _el57 = element("h3", "data-l-1ayf5gy", null);
    const _t58 = text("فلسفة Liquid — بساطة فائقة وأداء استثنائي");
    _el57.appendChild(_t58);
    _el56.appendChild(_el57);
    const _el59 = element("p", "data-l-1ayf5gy", null);
    const _t60 = text("إطار عمل Liquid تم تصميمه لحل مشكلة التعقيد الزائد في أطر العمل الحديثة مثل React و Next.js. بدلاً من محاكاة شجرة عناصر افتراضية (Virtual DOM) وإعادة استدعاء دوال المكونات مراراً وتكراراً مع كل ضغطة زر، يستخدم Liquid مكتبة إشارات تفاعلية (Fine-Grained Signals) ترتبط مباشرة بالعقد الحقيقية في المتصفح.");
    _el59.appendChild(_t60);
    _el56.appendChild(_el59);
    const _el61 = element("p", "data-l-1ayf5gy", null);
    const _t62 = text("النتيجة هي: أداء فائق السرعة، استهلاك ذاكرة منخفض للغاية، وكود أقل بنسبة تصل إلى 60% مقارنة بالأطر التقليدية.");
    _el61.appendChild(_t62);
    _el56.appendChild(_el61);
    _el55.appendChild(_el56);
    const _el63 = element("div", "data-l-1ayf5gy", ["section-block"]);
    const _el64 = element("h3", "data-l-1ayf5gy", null);
    const _t65 = text("التثبيت وإنشاء أول موقع في ثوانٍ");
    _el64.appendChild(_t65);
    _el63.appendChild(_el64);
    const _el66 = element("p", "data-l-1ayf5gy", null);
    const _t67 = text("تأكد أولاً من تثبيت Node.js (الإصدار 20 فما فوق)، ثم قم بتشغيل الأمر التالي في الطرفية:");
    _el66.appendChild(_t67);
    _el63.appendChild(_el66);
    const _el68 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
    const _el69 = element("div", "data-l-1ayf5gy", ["code-header"]);
    const _el70 = element("span", "data-l-1ayf5gy", ["code-filename"]);
    const _t71 = text("Terminal");
    _el70.appendChild(_t71);
    _el69.appendChild(_el70);
    const _el72 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
    _el72.setAttribute("type", "button");
    listen(_el72, "click", (e) => { copyToClipboard(codeInstall); }, []);
    const _t73 = text('');
    bindText(_t73, () => (t('copyCode')));
    _el72.appendChild(_t73);
    _el69.appendChild(_el72);
    _el68.appendChild(_el69);
    const _el74 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
    const _el75 = element("code", "data-l-1ayf5gy", null);
    const _t76 = text('');
    bindText(_t76, () => (codeInstall));
    _el75.appendChild(_t76);
    _el74.appendChild(_el75);
    _el68.appendChild(_el74);
    _el63.appendChild(_el68);
    _el55.appendChild(_el63);
    const _el77 = element("div", "data-l-1ayf5gy", ["info-callout"]);
    const _el78 = element("div", "data-l-1ayf5gy", ["callout-title"]);
    const _t79 = text("💡 نصيحة للمطورين على الهواتف و Termux");
    _el78.appendChild(_t79);
    _el77.appendChild(_el78);
    const _el80 = element("p", "data-l-1ayf5gy", ["callout-desc"]);
    const _t81 = text("إطار عمل Liquid مبني بنسبة 100% بكود JavaScript نقي خالي من أي مكتبات ثنائية أو C++ Addons. هذا يعني أنه يعمل فوراً وبسلاسة تامة على هواتف Android عبر تطبيق Termux بدون الحاجة لحاسوب محمول!");
    _el80.appendChild(_t81);
    _el77.appendChild(_el80);
    _el55.appendChild(_el77);
    _el47.appendChild(_el55);
    const _el82 = element("div", "data-l-1ayf5gy", ["ch-nav-buttons"]);
    const _el83 = element("span", "data-l-1ayf5gy", null);
    _el82.appendChild(_el83);
    const _el84 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
    _el84.setAttribute("type", "button");
    listen(_el84, "click", (e) => { selectChapter('structure'); }, []);
    const _t85 = text("التالي: هيكل المشروع ◀");
    _el84.appendChild(_t85);
    _el82.appendChild(_el84);
    _el47.appendChild(_el82);
    _thenNodes46.push(_el47);
    return _thenNodes46;
  }, () => {
    const _elseNodes86 = [];
    const _anchor87 = document.createComment('if');
    _elseNodes86.push(_anchor87);
    createIfBlock(_anchor87, () => (activeChapter.value === 'structure'), () => {
      const _thenNodes88 = [];
      const _el89 = element("div", "data-l-1ayf5gy", ["chapter-pane"]);
      const _el90 = element("div", "data-l-1ayf5gy", ["ch-header"]);
      const _el91 = element("span", "data-l-1ayf5gy", ["ch-tag"]);
      const _t92 = text("الفصل الثاني");
      _el91.appendChild(_t92);
      _el90.appendChild(_el91);
      const _el93 = element("h1", "data-l-1ayf5gy", ["ch-h1"]);
      const _t94 = text("هيكل مشروع Liquid والملفات الأساسية");
      _el93.appendChild(_t94);
      _el90.appendChild(_el93);
      const _el95 = element("p", "data-l-1ayf5gy", ["ch-lead"]);
      const _t96 = text("فهم البنية التنظيمية للمشروع، دور كل ملف، وكيف يتصل كودك بالمتصفح.");
      _el95.appendChild(_t96);
      _el90.appendChild(_el95);
      _el89.appendChild(_el90);
      const _el97 = element("div", "data-l-1ayf5gy", ["guide-body"]);
      const _el98 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el99 = element("h3", "data-l-1ayf5gy", null);
      const _t100 = text("شجرة ملفات المشروع النموذجي");
      _el99.appendChild(_t100);
      _el98.appendChild(_el99);
      const _el101 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el102 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el103 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t104 = text("Project Tree");
      _el103.appendChild(_t104);
      _el102.appendChild(_el103);
      _el101.appendChild(_el102);
      const _el105 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el106 = element("code", "data-l-1ayf5gy", null);
      const _t107 = text('');
      bindText(_t107, () => (codeTree));
      _el106.appendChild(_t107);
      _el105.appendChild(_el106);
      _el101.appendChild(_el105);
      _el98.appendChild(_el101);
      _el97.appendChild(_el98);
      const _el108 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el109 = element("h3", "data-l-1ayf5gy", null);
      const _t110 = text("1. ملف index.html");
      _el109.appendChild(_t110);
      _el108.appendChild(_el109);
      const _el111 = element("p", "data-l-1ayf5gy", null);
      const _t112 = text("ملف HTML قياسي وخفيف جداً، يحتوي على عنصر div يحمل المعرّف id=\"app\" يستهدفه إطار العمل لتثبيت واجهتك فيه:");
      _el111.appendChild(_t112);
      _el108.appendChild(_el111);
      const _el113 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el114 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el115 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t116 = text("index.html");
      _el115.appendChild(_t116);
      _el114.appendChild(_el115);
      const _el117 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el117.setAttribute("type", "button");
      listen(_el117, "click", (e) => { copyToClipboard(codeIndexHtml); }, []);
      const _t118 = text('');
      bindText(_t118, () => (t('copyCode')));
      _el117.appendChild(_t118);
      _el114.appendChild(_el117);
      _el113.appendChild(_el114);
      const _el119 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el120 = element("code", "data-l-1ayf5gy", null);
      const _t121 = text('');
      bindText(_t121, () => (codeIndexHtml));
      _el120.appendChild(_t121);
      _el119.appendChild(_el120);
      _el113.appendChild(_el119);
      _el108.appendChild(_el113);
      _el97.appendChild(_el108);
      const _el122 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el123 = element("h3", "data-l-1ayf5gy", null);
      const _t124 = text("2. ملف src/main.js");
      _el123.appendChild(_t124);
      _el122.appendChild(_el123);
      const _el125 = element("p", "data-l-1ayf5gy", null);
      const _t126 = text("نقطة البداية لتشغيل تطبيقك. يستورد دالة mount من liquid ويقوم بربط المكون الجذري App.liq بعنصر الصفحة:");
      _el125.appendChild(_t126);
      _el122.appendChild(_el125);
      const _el127 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el128 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el129 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t130 = text("src/main.js");
      _el129.appendChild(_t130);
      _el128.appendChild(_el129);
      const _el131 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el131.setAttribute("type", "button");
      listen(_el131, "click", (e) => { copyToClipboard(codeMainJs); }, []);
      const _t132 = text('');
      bindText(_t132, () => (t('copyCode')));
      _el131.appendChild(_t132);
      _el128.appendChild(_el131);
      _el127.appendChild(_el128);
      const _el133 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el134 = element("code", "data-l-1ayf5gy", null);
      const _t135 = text('');
      bindText(_t135, () => (codeMainJs));
      _el134.appendChild(_t135);
      _el133.appendChild(_el134);
      _el127.appendChild(_el133);
      _el122.appendChild(_el127);
      _el97.appendChild(_el122);
      _el89.appendChild(_el97);
      const _el136 = element("div", "data-l-1ayf5gy", ["ch-nav-buttons"]);
      const _el137 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el137.setAttribute("type", "button");
      listen(_el137, "click", (e) => { selectChapter('overview'); }, []);
      const _t138 = text("▶ السابق: نظرة عامة");
      _el137.appendChild(_t138);
      _el136.appendChild(_el137);
      const _el139 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el139.setAttribute("type", "button");
      listen(_el139, "click", (e) => { selectChapter('anatomy'); }, []);
      const _t140 = text("التالي: تشريح مكون .liq ◀");
      _el139.appendChild(_t140);
      _el136.appendChild(_el139);
      _el89.appendChild(_el136);
      _thenNodes88.push(_el89);
      return _thenNodes88;
    }, () => {
      const _elseNodes141 = [];
      const _anchor142 = document.createComment('if');
      _elseNodes141.push(_anchor142);
      createIfBlock(_anchor142, () => (activeChapter.value === 'anatomy'), () => {
      const _thenNodes143 = [];
      const _el144 = element("div", "data-l-1ayf5gy", ["chapter-pane"]);
      const _el145 = element("div", "data-l-1ayf5gy", ["ch-header"]);
      const _el146 = element("span", "data-l-1ayf5gy", ["ch-tag"]);
      const _t147 = text("الفصل الثالث");
      _el146.appendChild(_t147);
      _el145.appendChild(_el146);
      const _el148 = element("h1", "data-l-1ayf5gy", ["ch-h1"]);
      const _t149 = text("تشريح ملف المكون (.liq)");
      _el148.appendChild(_t149);
      _el145.appendChild(_el148);
      const _el150 = element("p", "data-l-1ayf5gy", ["ch-lead"]);
      const _t151 = text("كيف يجمع ملف .liq المنطق والأنماط والواجهة في مكان واحد وبشكل منظم للغاية.");
      _el150.appendChild(_t151);
      _el145.appendChild(_el150);
      _el144.appendChild(_el145);
      const _el152 = element("div", "data-l-1ayf5gy", ["guide-body"]);
      const _el153 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el154 = element("h3", "data-l-1ayf5gy", null);
      const _t155 = text("الأقسام الثلاثة الرئيسية");
      _el154.appendChild(_t155);
      _el153.appendChild(_el154);
      const _el156 = element("p", "data-l-1ayf5gy", null);
      const _t157 = text("يتكون كل ملف مكون من امتداد .liq من ثلاثة أقسام تفصل بينها إشارات الفواصل الثلاثية (---):");
      _el156.appendChild(_t157);
      _el153.appendChild(_el156);
      const _el158 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el159 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el160 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t161 = text("src/components/Card.liq");
      _el160.appendChild(_t161);
      _el159.appendChild(_el160);
      const _el162 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el162.setAttribute("type", "button");
      listen(_el162, "click", (e) => { copyToClipboard(codeCardLiq); }, []);
      const _t163 = text('');
      bindText(_t163, () => (t('copyCode')));
      _el162.appendChild(_t163);
      _el159.appendChild(_el162);
      _el158.appendChild(_el159);
      const _el164 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el165 = element("code", "data-l-1ayf5gy", null);
      const _t166 = text('');
      bindText(_t166, () => (codeCardLiq));
      _el165.appendChild(_t166);
      _el164.appendChild(_el165);
      _el158.appendChild(_el164);
      _el153.appendChild(_el158);
      _el152.appendChild(_el153);
      const _el167 = element("div", "data-l-1ayf5gy", ["info-callout"]);
      const _el168 = element("div", "data-l-1ayf5gy", ["callout-title"]);
      const _t169 = text("🛡️ عزل الأنماط التلقائي (Scoped CSS)");
      _el168.appendChild(_t169);
      _el167.appendChild(_el168);
      const _el170 = element("p", "data-l-1ayf5gy", ["callout-desc"]);
      const _t171 = text("في قسم الأنماط --- style، يقوم مصرف Liquid تلقائياً بتوليد فئات تجزئة مشفرة فريدة لكل مكون، مما يضمن أن قواعد الـ CSS التي تكتبها لن تتعارض أو تؤثر على أي صفحة أو مكون آخر في الموقع.");
      _el170.appendChild(_t171);
      _el167.appendChild(_el170);
      _el152.appendChild(_el167);
      _el144.appendChild(_el152);
      const _el172 = element("div", "data-l-1ayf5gy", ["ch-nav-buttons"]);
      const _el173 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el173.setAttribute("type", "button");
      listen(_el173, "click", (e) => { selectChapter('structure'); }, []);
      const _t174 = text("▶ السابق: هيكل المشروع");
      _el173.appendChild(_t174);
      _el172.appendChild(_el173);
      const _el175 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el175.setAttribute("type", "button");
      listen(_el175, "click", (e) => { selectChapter('signals'); }, []);
      const _t176 = text("التالي: التفاعلية والإشارات ◀");
      _el175.appendChild(_t176);
      _el172.appendChild(_el175);
      _el144.appendChild(_el172);
      _thenNodes143.push(_el144);
      return _thenNodes143;
    }, () => {
      const _elseNodes177 = [];
      const _anchor178 = document.createComment('if');
      _elseNodes177.push(_anchor178);
      createIfBlock(_anchor178, () => (activeChapter.value === 'signals'), () => {
      const _thenNodes179 = [];
      const _el180 = element("div", "data-l-1ayf5gy", ["chapter-pane"]);
      const _el181 = element("div", "data-l-1ayf5gy", ["ch-header"]);
      const _el182 = element("span", "data-l-1ayf5gy", ["ch-tag"]);
      const _t183 = text("الفصل الرابع");
      _el182.appendChild(_t183);
      _el181.appendChild(_el182);
      const _el184 = element("h1", "data-l-1ayf5gy", ["ch-h1"]);
      const _t185 = text("إدارة الحالة والتفاعلية مع Signals");
      _el184.appendChild(_t185);
      _el181.appendChild(_el184);
      const _el186 = element("p", "data-l-1ayf5gy", ["ch-lead"]);
      const _t187 = text("قلب نظام Liquid التفاعلي: الإشارات والدوال المحسوبة والتأثيرات الجانبية.");
      _el186.appendChild(_t187);
      _el181.appendChild(_el186);
      _el180.appendChild(_el181);
      const _el188 = element("div", "data-l-1ayf5gy", ["guide-body"]);
      const _el189 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el190 = element("h3", "data-l-1ayf5gy", null);
      const _t191 = text("1. الإشارات الأساسية: signal(initialValue)");
      _el190.appendChild(_t191);
      _el189.appendChild(_el190);
      const _el192 = element("p", "data-l-1ayf5gy", null);
      const _t193 = text("الإشارة هي صندوق تفاعلي يحمل قيمة. عند تغيير القيمة، يُخطر Liquid فقط عناصر الـ DOM التي تقرأ تلك القيمة دون إعادة تشغيل أو تصيير المكون بأكمله:");
      _el192.appendChild(_t193);
      _el189.appendChild(_el192);
      const _el194 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el195 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el196 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t197 = text("JavaScript");
      _el196.appendChild(_t197);
      _el195.appendChild(_el196);
      const _el198 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el198.setAttribute("type", "button");
      listen(_el198, "click", (e) => { copyToClipboard(codeSignal); }, []);
      const _t199 = text('');
      bindText(_t199, () => (t('copyCode')));
      _el198.appendChild(_t199);
      _el195.appendChild(_el198);
      _el194.appendChild(_el195);
      const _el200 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el201 = element("code", "data-l-1ayf5gy", null);
      const _t202 = text('');
      bindText(_t202, () => (codeSignal));
      _el201.appendChild(_t202);
      _el200.appendChild(_el201);
      _el194.appendChild(_el200);
      _el189.appendChild(_el194);
      _el188.appendChild(_el189);
      const _el203 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el204 = element("h3", "data-l-1ayf5gy", null);
      const _t205 = text("2. الدوال المحسوبة: computed(() => ...)");
      _el204.appendChild(_t205);
      _el203.appendChild(_el204);
      const _el206 = element("p", "data-l-1ayf5gy", null);
      const _t207 = text("تتيح لك اشتقاق قيمة محسوبة من إشارة أو أكثر. تقوم بحفظ النتيجة في الذاكرة المؤقتة (Memoized) ولا تعيد الحساب إلا إذا تغيرت الإشارة الأصلية:");
      _el206.appendChild(_t207);
      _el203.appendChild(_el206);
      const _el208 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el209 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el210 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t211 = text("JavaScript");
      _el210.appendChild(_t211);
      _el209.appendChild(_el210);
      const _el212 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el212.setAttribute("type", "button");
      listen(_el212, "click", (e) => { copyToClipboard(codeComputed); }, []);
      const _t213 = text('');
      bindText(_t213, () => (t('copyCode')));
      _el212.appendChild(_t213);
      _el209.appendChild(_el212);
      _el208.appendChild(_el209);
      const _el214 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el215 = element("code", "data-l-1ayf5gy", null);
      const _t216 = text('');
      bindText(_t216, () => (codeComputed));
      _el215.appendChild(_t216);
      _el214.appendChild(_el215);
      _el208.appendChild(_el214);
      _el203.appendChild(_el208);
      _el188.appendChild(_el203);
      const _el217 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el218 = element("h3", "data-l-1ayf5gy", null);
      const _t219 = text("3. التأثيرات الجانبية: effect(() => ...)");
      _el218.appendChild(_t219);
      _el217.appendChild(_el218);
      const _el220 = element("p", "data-l-1ayf5gy", null);
      const _t221 = text("تراقب التأثيرات الجانبية أي إشارة يتم الوصول إليها داخلها، وتنفذ تلقائياً كلما تغيرت. ممتازة للحفظ في localStorage أو استدعاءات الخوادم:");
      _el220.appendChild(_t221);
      _el217.appendChild(_el220);
      const _el222 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el223 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el224 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t225 = text("JavaScript");
      _el224.appendChild(_t225);
      _el223.appendChild(_el224);
      const _el226 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el226.setAttribute("type", "button");
      listen(_el226, "click", (e) => { copyToClipboard(codeEffect); }, []);
      const _t227 = text('');
      bindText(_t227, () => (t('copyCode')));
      _el226.appendChild(_t227);
      _el223.appendChild(_el226);
      _el222.appendChild(_el223);
      const _el228 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el229 = element("code", "data-l-1ayf5gy", null);
      const _t230 = text('');
      bindText(_t230, () => (codeEffect));
      _el229.appendChild(_t230);
      _el228.appendChild(_el229);
      _el222.appendChild(_el228);
      _el217.appendChild(_el222);
      _el188.appendChild(_el217);
      _el180.appendChild(_el188);
      const _el231 = element("div", "data-l-1ayf5gy", ["ch-nav-buttons"]);
      const _el232 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el232.setAttribute("type", "button");
      listen(_el232, "click", (e) => { selectChapter('anatomy'); }, []);
      const _t233 = text("▶ السابق: تشريح المكون");
      _el232.appendChild(_t233);
      _el231.appendChild(_el232);
      const _el234 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el234.setAttribute("type", "button");
      listen(_el234, "click", (e) => { selectChapter('directives'); }, []);
      const _t235 = text("التالي: التوجيهات والأحداث ◀");
      _el234.appendChild(_t235);
      _el231.appendChild(_el234);
      _el180.appendChild(_el231);
      _thenNodes179.push(_el180);
      return _thenNodes179;
    }, () => {
      const _elseNodes236 = [];
      const _anchor237 = document.createComment('if');
      _elseNodes236.push(_anchor237);
      createIfBlock(_anchor237, () => (activeChapter.value === 'directives'), () => {
      const _thenNodes238 = [];
      const _el239 = element("div", "data-l-1ayf5gy", ["chapter-pane"]);
      const _el240 = element("div", "data-l-1ayf5gy", ["ch-header"]);
      const _el241 = element("span", "data-l-1ayf5gy", ["ch-tag"]);
      const _t242 = text("الفصل الخامس");
      _el241.appendChild(_t242);
      _el240.appendChild(_el241);
      const _el243 = element("h1", "data-l-1ayf5gy", ["ch-h1"]);
      const _t244 = text("التوجيهات، الأحداث، الكتل الشرطية، والتكرار");
      _el243.appendChild(_t244);
      _el240.appendChild(_el243);
      const _el245 = element("p", "data-l-1ayf5gy", ["ch-lead"]);
      const _t246 = text("الأدوات الأساسية لربط واجهة المستخدم بالأحداث والبيانات المتغيرة.");
      _el245.appendChild(_t246);
      _el240.appendChild(_el245);
      _el239.appendChild(_el240);
      const _el247 = element("div", "data-l-1ayf5gy", ["guide-body"]);
      const _el248 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el249 = element("h3", "data-l-1ayf5gy", null);
      const _t250 = text("1. ربط الأحداث: @event");
      _el249.appendChild(_t250);
      _el248.appendChild(_el249);
      const _el251 = element("p", "data-l-1ayf5gy", null);
      const _t252 = text("لربط أي حدث من أحداث المتصفح (مثل النقر أو الإدخال أو الضغط على مفتاح):");
      _el251.appendChild(_t252);
      _el248.appendChild(_el251);
      const _el253 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el254 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el255 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t256 = text("UI Template");
      _el255.appendChild(_t256);
      _el254.appendChild(_el255);
      const _el257 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el257.setAttribute("type", "button");
      listen(_el257, "click", (e) => { copyToClipboard(codeDirectives); }, []);
      const _t258 = text('');
      bindText(_t258, () => (t('copyCode')));
      _el257.appendChild(_t258);
      _el254.appendChild(_el257);
      _el253.appendChild(_el254);
      const _el259 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el260 = element("code", "data-l-1ayf5gy", null);
      const _t261 = text('');
      bindText(_t261, () => (codeDirectives));
      _el260.appendChild(_t261);
      _el259.appendChild(_el260);
      _el253.appendChild(_el259);
      _el248.appendChild(_el253);
      _el247.appendChild(_el248);
      const _el262 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el263 = element("h3", "data-l-1ayf5gy", null);
      const _t264 = text("2. الربط ثنائي الاتجاه للحقول: $bind");
      _el263.appendChild(_t264);
      _el262.appendChild(_el263);
      const _el265 = element("p", "data-l-1ayf5gy", null);
      const _t266 = text("يتيح ربط قيمة حقل الإدخال مباشرة بإشارة تفاعلية في كلا الاتجاهين:");
      _el265.appendChild(_t266);
      _el262.appendChild(_el265);
      const _el267 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el268 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el269 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t270 = text("UI Template");
      _el269.appendChild(_t270);
      _el268.appendChild(_el269);
      const _el271 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el271.setAttribute("type", "button");
      listen(_el271, "click", (e) => { copyToClipboard(codeBind); }, []);
      const _t272 = text('');
      bindText(_t272, () => (t('copyCode')));
      _el271.appendChild(_t272);
      _el268.appendChild(_el271);
      _el267.appendChild(_el268);
      const _el273 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el274 = element("code", "data-l-1ayf5gy", null);
      const _t275 = text('');
      bindText(_t275, () => (codeBind));
      _el274.appendChild(_t275);
      _el273.appendChild(_el274);
      _el267.appendChild(_el273);
      _el262.appendChild(_el267);
      _el247.appendChild(_el262);
      const _el276 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el277 = element("h3", "data-l-1ayf5gy", null);
      const _t278 = text("3. الكتل الشرطية: &lt;if&gt;");
      _el277.appendChild(_t278);
      _el276.appendChild(_el277);
      const _el279 = element("p", "data-l-1ayf5gy", null);
      const _t280 = text("إظهار أو إخفاء أجزاء من الواجهة بناءً على شرط منطقي:");
      _el279.appendChild(_t280);
      _el276.appendChild(_el279);
      const _el281 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el282 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el283 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t284 = text("UI Template");
      _el283.appendChild(_t284);
      _el282.appendChild(_el283);
      const _el285 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el285.setAttribute("type", "button");
      listen(_el285, "click", (e) => { copyToClipboard(codeIf); }, []);
      const _t286 = text('');
      bindText(_t286, () => (t('copyCode')));
      _el285.appendChild(_t286);
      _el282.appendChild(_el285);
      _el281.appendChild(_el282);
      const _el287 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el288 = element("code", "data-l-1ayf5gy", null);
      const _t289 = text('');
      bindText(_t289, () => (codeIf));
      _el288.appendChild(_t289);
      _el287.appendChild(_el288);
      _el281.appendChild(_el287);
      _el276.appendChild(_el281);
      _el247.appendChild(_el276);
      const _el290 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el291 = element("h3", "data-l-1ayf5gy", null);
      const _t292 = text("4. التكرار والقوائم: &lt;each&gt;");
      _el291.appendChild(_t292);
      _el290.appendChild(_el291);
      const _el293 = element("p", "data-l-1ayf5gy", null);
      const _t294 = text("تكرار المصفوفات بكفاءة مع تحديد مفتاح فريد لكل عنصر (Key):");
      _el293.appendChild(_t294);
      _el290.appendChild(_el293);
      const _el295 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el296 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el297 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t298 = text("UI Template");
      _el297.appendChild(_t298);
      _el296.appendChild(_el297);
      const _el299 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el299.setAttribute("type", "button");
      listen(_el299, "click", (e) => { copyToClipboard(codeEach); }, []);
      const _t300 = text('');
      bindText(_t300, () => (t('copyCode')));
      _el299.appendChild(_t300);
      _el296.appendChild(_el299);
      _el295.appendChild(_el296);
      const _el301 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el302 = element("code", "data-l-1ayf5gy", null);
      const _t303 = text('');
      bindText(_t303, () => (codeEach));
      _el302.appendChild(_t303);
      _el301.appendChild(_el302);
      _el295.appendChild(_el301);
      _el290.appendChild(_el295);
      _el247.appendChild(_el290);
      _el239.appendChild(_el247);
      const _el304 = element("div", "data-l-1ayf5gy", ["ch-nav-buttons"]);
      const _el305 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el305.setAttribute("type", "button");
      listen(_el305, "click", (e) => { selectChapter('signals'); }, []);
      const _t306 = text("▶ السابق: إدارة الحالة");
      _el305.appendChild(_t306);
      _el304.appendChild(_el305);
      const _el307 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el307.setAttribute("type", "button");
      listen(_el307, "click", (e) => { selectChapter('routing'); }, []);
      const _t308 = text("التالي: التوجيه والصفحات ◀");
      _el307.appendChild(_t308);
      _el304.appendChild(_el307);
      _el239.appendChild(_el304);
      _thenNodes238.push(_el239);
      return _thenNodes238;
    }, () => {
      const _elseNodes309 = [];
      const _anchor310 = document.createComment('if');
      _elseNodes309.push(_anchor310);
      createIfBlock(_anchor310, () => (activeChapter.value === 'routing'), () => {
      const _thenNodes311 = [];
      const _el312 = element("div", "data-l-1ayf5gy", ["chapter-pane"]);
      const _el313 = element("div", "data-l-1ayf5gy", ["ch-header"]);
      const _el314 = element("span", "data-l-1ayf5gy", ["ch-tag"]);
      const _t315 = text("الفصل السادس");
      _el314.appendChild(_t315);
      _el313.appendChild(_el314);
      const _el316 = element("h1", "data-l-1ayf5gy", ["ch-h1"]);
      const _t317 = text("بناء موقع متعدد الصفحات (Routing)");
      _el316.appendChild(_t317);
      _el313.appendChild(_el316);
      const _el318 = element("p", "data-l-1ayf5gy", ["ch-lead"]);
      const _t319 = text("كيفية استخدام موجه Liquid لبناء تطبيقات صفحات أحادية متعددة المسارات (SPA).");
      _el318.appendChild(_t319);
      _el313.appendChild(_el318);
      _el312.appendChild(_el313);
      const _el320 = element("div", "data-l-1ayf5gy", ["guide-body"]);
      const _el321 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el322 = element("h3", "data-l-1ayf5gy", null);
      const _t323 = text("إعداد الموجه: createRouter");
      _el322.appendChild(_t323);
      _el321.appendChild(_el322);
      const _el324 = element("p", "data-l-1ayf5gy", null);
      const _t325 = text("يأتي Liquid مع موجه صفحات قوي وخفيف مدمج في حزمة liquid الرئيسية:");
      _el324.appendChild(_t325);
      _el321.appendChild(_el324);
      const _el326 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el327 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el328 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t329 = text("src/router.js");
      _el328.appendChild(_t329);
      _el327.appendChild(_el328);
      const _el330 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el330.setAttribute("type", "button");
      listen(_el330, "click", (e) => { copyToClipboard(codeRouter); }, []);
      const _t331 = text('');
      bindText(_t331, () => (t('copyCode')));
      _el330.appendChild(_t331);
      _el327.appendChild(_el330);
      _el326.appendChild(_el327);
      const _el332 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el333 = element("code", "data-l-1ayf5gy", null);
      const _t334 = text('');
      bindText(_t334, () => (codeRouter));
      _el333.appendChild(_t334);
      _el332.appendChild(_el333);
      _el326.appendChild(_el332);
      _el321.appendChild(_el326);
      _el320.appendChild(_el321);
      const _el335 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el336 = element("h3", "data-l-1ayf5gy", null);
      const _t337 = text("عرض الصفحة النشطة في App.liq");
      _el336.appendChild(_t337);
      _el335.appendChild(_el336);
      const _el338 = element("p", "data-l-1ayf5gy", null);
      const _t339 = text("في مكونك الرئيسي، استورد RouterView وضعه في المكان المخصص لعرض الصفحات:");
      _el338.appendChild(_t339);
      _el335.appendChild(_el338);
      const _el340 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el341 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el342 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t343 = text("src/App.liq");
      _el342.appendChild(_t343);
      _el341.appendChild(_el342);
      const _el344 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el344.setAttribute("type", "button");
      listen(_el344, "click", (e) => { copyToClipboard(codeAppRouter); }, []);
      const _t345 = text('');
      bindText(_t345, () => (t('copyCode')));
      _el344.appendChild(_t345);
      _el341.appendChild(_el344);
      _el340.appendChild(_el341);
      const _el346 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el347 = element("code", "data-l-1ayf5gy", null);
      const _t348 = text('');
      bindText(_t348, () => (codeAppRouter));
      _el347.appendChild(_t348);
      _el346.appendChild(_el347);
      _el340.appendChild(_el346);
      _el335.appendChild(_el340);
      _el320.appendChild(_el335);
      _el312.appendChild(_el320);
      const _el349 = element("div", "data-l-1ayf5gy", ["ch-nav-buttons"]);
      const _el350 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el350.setAttribute("type", "button");
      listen(_el350, "click", (e) => { selectChapter('directives'); }, []);
      const _t351 = text("▶ السابق: التوجيهات والأحداث");
      _el350.appendChild(_t351);
      _el349.appendChild(_el350);
      const _el352 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el352.setAttribute("type", "button");
      listen(_el352, "click", (e) => { selectChapter('styling'); }, []);
      const _t353 = text("التالي: التصميم والأنماط ◀");
      _el352.appendChild(_t353);
      _el349.appendChild(_el352);
      _el312.appendChild(_el349);
      _thenNodes311.push(_el312);
      return _thenNodes311;
    }, () => {
      const _elseNodes354 = [];
      const _anchor355 = document.createComment('if');
      _elseNodes354.push(_anchor355);
      createIfBlock(_anchor355, () => (activeChapter.value === 'styling'), () => {
      const _thenNodes356 = [];
      const _el357 = element("div", "data-l-1ayf5gy", ["chapter-pane"]);
      const _el358 = element("div", "data-l-1ayf5gy", ["ch-header"]);
      const _el359 = element("span", "data-l-1ayf5gy", ["ch-tag"]);
      const _t360 = text("الفصل السابع");
      _el359.appendChild(_t360);
      _el358.appendChild(_el359);
      const _el361 = element("h1", "data-l-1ayf5gy", ["ch-h1"]);
      const _t362 = text("التصميم وعزل الأنماط (Scoped CSS)");
      _el361.appendChild(_t362);
      _el358.appendChild(_el361);
      const _el363 = element("p", "data-l-1ayf5gy", ["ch-lead"]);
      const _t364 = text("كتابة أنماط CSS حديثة ومعزولة بدون تداخلات، مع دعم الوضع الداكن والفاتح.");
      _el363.appendChild(_t364);
      _el358.appendChild(_el363);
      _el357.appendChild(_el358);
      const _el365 = element("div", "data-l-1ayf5gy", ["guide-body"]);
      const _el366 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el367 = element("h3", "data-l-1ayf5gy", null);
      const _t368 = text("كيف يعمل Scoped CSS في Liquid؟");
      _el367.appendChild(_t368);
      _el366.appendChild(_el367);
      const _el369 = element("p", "data-l-1ayf5gy", null);
      const _t370 = text("كل قاعدة CSS تكتبها في قسم --- style يتم ربطها تلقائياً بالسمة المشفرة الخاصة بالمكون (مثل [data-l-1a2b3c]). هذا يعني أنه يمكنك استخدام أسماء فئات بسيطة مثل .card و .btn و .title دون القلق من أن تؤثر على مكونات أخرى.");
      _el369.appendChild(_t370);
      _el366.appendChild(_el369);
      _el365.appendChild(_el366);
      const _el371 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el372 = element("h3", "data-l-1ayf5gy", null);
      const _t373 = text("الأنماط العامة ومتغيرات CSS");
      _el372.appendChild(_t373);
      _el371.appendChild(_el372);
      const _el374 = element("p", "data-l-1ayf5gy", null);
      const _t375 = text("لتعريف متغيرات الألوان العامة وخطوط الموقع التي تنطبق على كامل الصفحة، استخدم :global(:root):");
      _el374.appendChild(_t375);
      _el371.appendChild(_el374);
      const _el376 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el377 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el378 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t379 = text("src/App.liq");
      _el378.appendChild(_t379);
      _el377.appendChild(_el378);
      const _el380 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el380.setAttribute("type", "button");
      listen(_el380, "click", (e) => { copyToClipboard(codeStyling); }, []);
      const _t381 = text('');
      bindText(_t381, () => (t('copyCode')));
      _el380.appendChild(_t381);
      _el377.appendChild(_el380);
      _el376.appendChild(_el377);
      const _el382 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el383 = element("code", "data-l-1ayf5gy", null);
      const _t384 = text('');
      bindText(_t384, () => (codeStyling));
      _el383.appendChild(_t384);
      _el382.appendChild(_el383);
      _el376.appendChild(_el382);
      _el371.appendChild(_el376);
      _el365.appendChild(_el371);
      _el357.appendChild(_el365);
      const _el385 = element("div", "data-l-1ayf5gy", ["ch-nav-buttons"]);
      const _el386 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el386.setAttribute("type", "button");
      listen(_el386, "click", (e) => { selectChapter('routing'); }, []);
      const _t387 = text("▶ السابق: التوجيه والصفحات");
      _el386.appendChild(_t387);
      _el385.appendChild(_el386);
      const _el388 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el388.setAttribute("type", "button");
      listen(_el388, "click", (e) => { selectChapter('deploy'); }, []);
      const _t389 = text("التالي: الإنتاج والنشر ◀");
      _el388.appendChild(_t389);
      _el385.appendChild(_el388);
      _el357.appendChild(_el385);
      _thenNodes356.push(_el357);
      return _thenNodes356;
    }, () => {
      const _elseNodes390 = [];
      const _el391 = element("div", "data-l-1ayf5gy", ["chapter-pane"]);
      const _el392 = element("div", "data-l-1ayf5gy", ["ch-header"]);
      const _el393 = element("span", "data-l-1ayf5gy", ["ch-tag"]);
      const _t394 = text("الفصل الثامن");
      _el393.appendChild(_t394);
      _el392.appendChild(_el393);
      const _el395 = element("h1", "data-l-1ayf5gy", ["ch-h1"]);
      const _t396 = text("تجهيز الموقع للإنتاج والاستضافة");
      _el395.appendChild(_t396);
      _el392.appendChild(_el395);
      const _el397 = element("p", "data-l-1ayf5gy", ["ch-lead"]);
      const _t398 = text("تجميع الأصول بأعلى أداء، وتقليل الحجم، ونشر موقعك على الإنترنت.");
      _el397.appendChild(_t398);
      _el392.appendChild(_el397);
      _el391.appendChild(_el392);
      const _el399 = element("div", "data-l-1ayf5gy", ["guide-body"]);
      const _el400 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el401 = element("h3", "data-l-1ayf5gy", null);
      const _t402 = text("1. أمر البناء للإنتاج: liquid build");
      _el401.appendChild(_t402);
      _el400.appendChild(_el401);
      const _el403 = element("p", "data-l-1ayf5gy", null);
      const _t404 = text("يقوم أمر البناء بتجميع واستخراج كافة أكواد JavaScript و CSS، وتوليد حزم مصغرة فائقة السرعة مع هاش للأصول لتسريع التحميل والتخزين المؤقت:");
      _el403.appendChild(_t404);
      _el400.appendChild(_el403);
      const _el405 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el406 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el407 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t408 = text("Terminal");
      _el407.appendChild(_t408);
      _el406.appendChild(_el407);
      const _el409 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el409.setAttribute("type", "button");
      listen(_el409, "click", (e) => { copyToClipboard(codeBuild); }, []);
      const _t410 = text('');
      bindText(_t410, () => (t('copyCode')));
      _el409.appendChild(_t410);
      _el406.appendChild(_el409);
      _el405.appendChild(_el406);
      const _el411 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el412 = element("code", "data-l-1ayf5gy", null);
      const _t413 = text('');
      bindText(_t413, () => (codeBuild));
      _el412.appendChild(_t413);
      _el411.appendChild(_el412);
      _el405.appendChild(_el411);
      _el400.appendChild(_el405);
      _el399.appendChild(_el400);
      const _el414 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el415 = element("h3", "data-l-1ayf5gy", null);
      const _t416 = text("2. النشر على منصات الاستضافة المجانية");
      _el415.appendChild(_t416);
      _el414.appendChild(_el415);
      const _el417 = element("p", "data-l-1ayf5gy", null);
      const _t418 = text("مجلد dist/ الناتج هو موقع ويب ثابت (Static Site) نقي، يمكنك رفعه على:");
      _el417.appendChild(_t418);
      _el414.appendChild(_el417);
      const _el419 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el420 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el421 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t422 = text("Hosting Platforms");
      _el421.appendChild(_t422);
      _el420.appendChild(_el421);
      const _el423 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el423.setAttribute("type", "button");
      listen(_el423, "click", (e) => { copyToClipboard(codePlatforms); }, []);
      const _t424 = text('');
      bindText(_t424, () => (t('copyCode')));
      _el423.appendChild(_t424);
      _el420.appendChild(_el423);
      _el419.appendChild(_el420);
      const _el425 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el426 = element("code", "data-l-1ayf5gy", null);
      const _t427 = text('');
      bindText(_t427, () => (codePlatforms));
      _el426.appendChild(_t427);
      _el425.appendChild(_el426);
      _el419.appendChild(_el425);
      _el414.appendChild(_el419);
      _el399.appendChild(_el414);
      const _el428 = element("div", "data-l-1ayf5gy", ["section-block"]);
      const _el429 = element("h3", "data-l-1ayf5gy", null);
      const _t430 = text("3. التطوير المباشر من الهاتف مع محرر lqe");
      _el429.appendChild(_t430);
      _el428.appendChild(_el429);
      const _el431 = element("p", "data-l-1ayf5gy", null);
      const _t432 = text("يتيح لك Liquid فتح محرر أكواد طرفي حديث مصمم خصيصاً للهواتف وشاشات اللمس عبر كتابة:");
      _el431.appendChild(_t432);
      _el428.appendChild(_el431);
      const _el433 = element("div", "data-l-1ayf5gy", ["code-wrapper"]);
      const _el434 = element("div", "data-l-1ayf5gy", ["code-header"]);
      const _el435 = element("span", "data-l-1ayf5gy", ["code-filename"]);
      const _t436 = text("Terminal");
      _el435.appendChild(_t436);
      _el434.appendChild(_el435);
      const _el437 = element("button", "data-l-1ayf5gy", ["copy-btn"]);
      _el437.setAttribute("type", "button");
      listen(_el437, "click", (e) => { copyToClipboard(codeLqe); }, []);
      const _t438 = text('');
      bindText(_t438, () => (t('copyCode')));
      _el437.appendChild(_t438);
      _el434.appendChild(_el437);
      _el433.appendChild(_el434);
      const _el439 = element("pre", "data-l-1ayf5gy", ["code-pre"]);
      const _el440 = element("code", "data-l-1ayf5gy", null);
      const _t441 = text('');
      bindText(_t441, () => (codeLqe));
      _el440.appendChild(_t441);
      _el439.appendChild(_el440);
      _el433.appendChild(_el439);
      _el428.appendChild(_el433);
      _el399.appendChild(_el428);
      _el391.appendChild(_el399);
      const _el442 = element("div", "data-l-1ayf5gy", ["ch-nav-buttons"]);
      const _el443 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el443.setAttribute("type", "button");
      listen(_el443, "click", (e) => { selectChapter('styling'); }, []);
      const _t444 = text("▶ السابق: التصميم والأنماط");
      _el443.appendChild(_t444);
      _el442.appendChild(_el443);
      const _el445 = element("button", "data-l-1ayf5gy", ["nav-btn"]);
      _el445.setAttribute("type", "button");
      listen(_el445, "click", (e) => { selectChapter('overview'); }, []);
      const _t446 = text("العودة للبداية ↺");
      _el445.appendChild(_t446);
      _el442.appendChild(_el445);
      _el391.appendChild(_el442);
      _elseNodes390.push(_el391);
      return _elseNodes390;
    });
      return _elseNodes354;
    });
      return _elseNodes309;
    });
      return _elseNodes236;
    });
      return _elseNodes177;
    });
      return _elseNodes141;
    });
    return _elseNodes86;
  });
  _el0.appendChild(_el44);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function Home(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const activeDemoTab = signal('counter');
  function setTab(tab) {
    activeDemoTab.value = tab;
  }
  const _root = [];
  const _el0 = element("div", "data-l-1xmbid8", ["home-page"]);
  const _el1 = element("section", "data-l-1xmbid8", ["hero"]);
  const _el2 = element("div", "data-l-1xmbid8", ["hero-badge"]);
  const _el3 = element("span", "data-l-1xmbid8", null);
  const _t4 = text("🫟");
  _el3.appendChild(_t4);
  _el2.appendChild(_el3);
  const _el5 = element("span", "data-l-1xmbid8", null);
  const _t6 = text('');
  bindText(_t6, () => (t('heroBadge')));
  _el5.appendChild(_t6);
  _el2.appendChild(_el5);
  _el1.appendChild(_el2);
  const _el7 = element("h1", "data-l-1xmbid8", ["hero-title"]);
  const _t8 = text('');
  bindText(_t8, () => (t('heroTitle')));
  _el7.appendChild(_t8);
  _el1.appendChild(_el7);
  const _el9 = element("p", "data-l-1xmbid8", ["hero-desc"]);
  const _t10 = text('');
  bindText(_t10, () => (t('heroDesc')));
  _el9.appendChild(_t10);
  _el1.appendChild(_el9);
  const _el11 = element("div", "data-l-1xmbid8", ["hero-cta"]);
  const _el12 = element("button", "data-l-1xmbid8", ["cta-btn","primary"]);
  _el12.setAttribute("type", "button");
  listen(_el12, "click", (e) => { navigate('/guide'); }, []);
  const _el13 = element("span", "data-l-1xmbid8", null);
  const _t14 = text('');
  bindText(_t14, () => (t('btnStartLearning')));
  _el13.appendChild(_t14);
  _el12.appendChild(_el13);
  _el11.appendChild(_el12);
  const _el15 = element("button", "data-l-1xmbid8", ["cta-btn","play"]);
  _el15.setAttribute("type", "button");
  listen(_el15, "click", (e) => { navigate('/play'); }, []);
  const _el16 = element("span", "data-l-1xmbid8", null);
  const _t17 = text("🎮 ");
  _el16.appendChild(_t17);
  const _t18 = text('');
  bindText(_t18, () => (t('navPlay')));
  _el16.appendChild(_t18);
  _el15.appendChild(_el16);
  _el11.appendChild(_el15);
  const _el19 = element("button", "data-l-1xmbid8", ["cta-btn","secondary"]);
  _el19.setAttribute("type", "button");
  listen(_el19, "click", (e) => { navigate('/playground'); }, []);
  const _el20 = element("span", "data-l-1xmbid8", null);
  const _t21 = text('');
  bindText(_t21, () => (t('btnTryPlayground')));
  _el20.appendChild(_t21);
  _el19.appendChild(_el20);
  _el11.appendChild(_el19);
  _el1.appendChild(_el11);
  const _el22 = element("div", "data-l-1xmbid8", ["terminal-card"]);
  const _el23 = element("div", "data-l-1xmbid8", ["terminal-header"]);
  const _el24 = element("div", "data-l-1xmbid8", ["terminal-dots"]);
  const _el25 = element("span", "data-l-1xmbid8", ["dot","red"]);
  _el24.appendChild(_el25);
  const _el26 = element("span", "data-l-1xmbid8", ["dot","yellow"]);
  _el24.appendChild(_el26);
  const _el27 = element("span", "data-l-1xmbid8", ["dot","green"]);
  _el24.appendChild(_el27);
  _el23.appendChild(_el24);
  const _el28 = element("span", "data-l-1xmbid8", ["terminal-label"]);
  const _t29 = text("bash — liquid-cli");
  _el28.appendChild(_t29);
  _el23.appendChild(_el28);
  _el22.appendChild(_el23);
  const _el30 = element("div", "data-l-1xmbid8", ["terminal-body"]);
  const _el31 = element("code", "data-l-1xmbid8", ["terminal-code"]);
  const _t32 = text('');
  bindText(_t32, () => ('> ' + t('quickStartCommand')));
  _el31.appendChild(_t32);
  _el30.appendChild(_el31);
  const _el33 = element("button", "data-l-1xmbid8", ["terminal-copy"]);
  _el33.setAttribute("type", "button");
  listen(_el33, "click", (e) => { copyToClipboard(t('quickStartCommand')); }, []);
  const _t34 = text('');
  bindText(_t34, () => (t('copyCode')));
  _el33.appendChild(_t34);
  _el30.appendChild(_el33);
  _el22.appendChild(_el30);
  _el1.appendChild(_el22);
  _el0.appendChild(_el1);
  const _el35 = element("section", "data-l-1xmbid8", ["features-section"]);
  const _el36 = element("div", "data-l-1xmbid8", ["features-grid"]);
  const _el37 = element("div", "data-l-1xmbid8", ["feature-card"]);
  const _el38 = element("span", "data-l-1xmbid8", ["feature-icon"]);
  const _t39 = text("📁");
  _el38.appendChild(_t39);
  _el37.appendChild(_el38);
  const _el40 = element("h3", "data-l-1xmbid8", ["feature-title"]);
  const _t41 = text('');
  bindText(_t41, () => (t('feat1Title')));
  _el40.appendChild(_t41);
  _el37.appendChild(_el40);
  const _el42 = element("p", "data-l-1xmbid8", ["feature-desc"]);
  const _t43 = text('');
  bindText(_t43, () => (t('feat1Desc')));
  _el42.appendChild(_t43);
  _el37.appendChild(_el42);
  _el36.appendChild(_el37);
  const _el44 = element("div", "data-l-1xmbid8", ["feature-card"]);
  const _el45 = element("span", "data-l-1xmbid8", ["feature-icon"]);
  const _t46 = text("⚡");
  _el45.appendChild(_t46);
  _el44.appendChild(_el45);
  const _el47 = element("h3", "data-l-1xmbid8", ["feature-title"]);
  const _t48 = text('');
  bindText(_t48, () => (t('feat2Title')));
  _el47.appendChild(_t48);
  _el44.appendChild(_el47);
  const _el49 = element("p", "data-l-1xmbid8", ["feature-desc"]);
  const _t50 = text('');
  bindText(_t50, () => (t('feat2Desc')));
  _el49.appendChild(_t50);
  _el44.appendChild(_el49);
  _el36.appendChild(_el44);
  const _el51 = element("div", "data-l-1xmbid8", ["feature-card"]);
  const _el52 = element("span", "data-l-1xmbid8", ["feature-icon"]);
  const _t53 = text("🚀");
  _el52.appendChild(_t53);
  _el51.appendChild(_el52);
  const _el54 = element("h3", "data-l-1xmbid8", ["feature-title"]);
  const _t55 = text('');
  bindText(_t55, () => (t('feat3Title')));
  _el54.appendChild(_t55);
  _el51.appendChild(_el54);
  const _el56 = element("p", "data-l-1xmbid8", ["feature-desc"]);
  const _t57 = text('');
  bindText(_t57, () => (t('feat3Desc')));
  _el56.appendChild(_t57);
  _el51.appendChild(_el56);
  _el36.appendChild(_el51);
  _el35.appendChild(_el36);
  _el0.appendChild(_el35);
  const _el58 = element("section", "data-l-1xmbid8", ["steps-section"]);
  const _el59 = element("div", "data-l-1xmbid8", ["section-head"]);
  const _el60 = element("h2", "data-l-1xmbid8", ["section-title"]);
  const _t61 = text('');
  bindText(_t61, () => (t('threeStepTitle')));
  _el60.appendChild(_t61);
  _el59.appendChild(_el60);
  const _el62 = element("p", "data-l-1xmbid8", ["section-sub"]);
  const _t63 = text("في أقل من 3 دقائق ستكون جاهزاً لتطوير ونشر موقعك!");
  _el62.appendChild(_t63);
  _el59.appendChild(_el62);
  _el58.appendChild(_el59);
  const _el64 = element("div", "data-l-1xmbid8", ["steps-list"]);
  const _el65 = element("div", "data-l-1xmbid8", ["step-card"]);
  const _el66 = element("div", "data-l-1xmbid8", ["step-badge"]);
  const _t67 = text('');
  bindText(_t67, () => (t('step1Num')));
  _el66.appendChild(_t67);
  _el65.appendChild(_el66);
  const _el68 = element("div", "data-l-1xmbid8", ["step-content"]);
  const _el69 = element("h3", "data-l-1xmbid8", ["step-title"]);
  const _t70 = text('');
  bindText(_t70, () => (t('step1Title')));
  _el69.appendChild(_t70);
  _el68.appendChild(_el69);
  const _el71 = element("p", "data-l-1xmbid8", ["step-desc"]);
  const _t72 = text('');
  bindText(_t72, () => (t('step1Desc')));
  _el71.appendChild(_t72);
  _el68.appendChild(_el71);
  const _el73 = element("div", "data-l-1xmbid8", ["step-code"]);
  const _el74 = element("span", "data-l-1xmbid8", null);
  const _t75 = text("npx liquid create my-site");
  _el74.appendChild(_t75);
  _el73.appendChild(_el74);
  const _el76 = element("button", "data-l-1xmbid8", ["terminal-copy"]);
  _el76.setAttribute("type", "button");
  listen(_el76, "click", (e) => { copyToClipboard('npx liquid create my-site'); }, []);
  const _t77 = text('');
  bindText(_t77, () => (t('copyCode')));
  _el76.appendChild(_t77);
  _el73.appendChild(_el76);
  _el68.appendChild(_el73);
  _el65.appendChild(_el68);
  _el64.appendChild(_el65);
  const _el78 = element("div", "data-l-1xmbid8", ["step-card"]);
  const _el79 = element("div", "data-l-1xmbid8", ["step-badge"]);
  const _t80 = text('');
  bindText(_t80, () => (t('step2Num')));
  _el79.appendChild(_t80);
  _el78.appendChild(_el79);
  const _el81 = element("div", "data-l-1xmbid8", ["step-content"]);
  const _el82 = element("h3", "data-l-1xmbid8", ["step-title"]);
  const _t83 = text('');
  bindText(_t83, () => (t('step2Title')));
  _el82.appendChild(_t83);
  _el81.appendChild(_el82);
  const _el84 = element("p", "data-l-1xmbid8", ["step-desc"]);
  const _t85 = text('');
  bindText(_t85, () => (t('step2Desc')));
  _el84.appendChild(_t85);
  _el81.appendChild(_el84);
  const _el86 = element("div", "data-l-1xmbid8", ["step-code"]);
  const _el87 = element("span", "data-l-1xmbid8", null);
  const _t88 = text("cd my-site && npm run dev");
  _el87.appendChild(_t88);
  _el86.appendChild(_el87);
  const _el89 = element("button", "data-l-1xmbid8", ["terminal-copy"]);
  _el89.setAttribute("type", "button");
  listen(_el89, "click", (e) => { copyToClipboard('cd my-site && npm run dev'); }, []);
  const _t90 = text('');
  bindText(_t90, () => (t('copyCode')));
  _el89.appendChild(_t90);
  _el86.appendChild(_el89);
  _el81.appendChild(_el86);
  _el78.appendChild(_el81);
  _el64.appendChild(_el78);
  const _el91 = element("div", "data-l-1xmbid8", ["step-card"]);
  const _el92 = element("div", "data-l-1xmbid8", ["step-badge"]);
  const _t93 = text('');
  bindText(_t93, () => (t('step3Num')));
  _el92.appendChild(_t93);
  _el91.appendChild(_el92);
  const _el94 = element("div", "data-l-1xmbid8", ["step-content"]);
  const _el95 = element("h3", "data-l-1xmbid8", ["step-title"]);
  const _t96 = text('');
  bindText(_t96, () => (t('step3Title')));
  _el95.appendChild(_t96);
  _el94.appendChild(_el95);
  const _el97 = element("p", "data-l-1xmbid8", ["step-desc"]);
  const _t98 = text('');
  bindText(_t98, () => (t('step3Desc')));
  _el97.appendChild(_t98);
  _el94.appendChild(_el97);
  const _el99 = element("div", "data-l-1xmbid8", ["step-code"]);
  const _el100 = element("span", "data-l-1xmbid8", null);
  const _t101 = text("liquid edit src/App.liq");
  _el100.appendChild(_t101);
  _el99.appendChild(_el100);
  const _el102 = element("button", "data-l-1xmbid8", ["terminal-copy"]);
  _el102.setAttribute("type", "button");
  listen(_el102, "click", (e) => { copyToClipboard('liquid edit src/App.liq'); }, []);
  const _t103 = text('');
  bindText(_t103, () => (t('copyCode')));
  _el102.appendChild(_t103);
  _el99.appendChild(_el102);
  _el94.appendChild(_el99);
  _el91.appendChild(_el94);
  _el64.appendChild(_el91);
  _el58.appendChild(_el64);
  _el0.appendChild(_el58);
  const _el104 = element("section", "data-l-1xmbid8", ["demo-section"]);
  const _el105 = element("div", "data-l-1xmbid8", ["section-head"]);
  const _el106 = element("h2", "data-l-1xmbid8", ["section-title"]);
  const _t107 = text("تجربة حية فورية");
  _el106.appendChild(_t107);
  _el105.appendChild(_el106);
  const _el108 = element("p", "data-l-1xmbid8", ["section-sub"]);
  const _t109 = text("هذه المكونات تعمل مباشرة بكود Liquid الحقيقي في متصفحك الآن:");
  _el108.appendChild(_t109);
  _el105.appendChild(_el108);
  _el104.appendChild(_el105);
  const _el110 = element("div", "data-l-1xmbid8", ["demo-tabs"]);
  const _el111 = element("button", "data-l-1xmbid8", ["demo-tab-btn"]);
  bindAttr(_el111, "class", () => ("demo-tab-btn" + ((activeDemoTab.value === 'counter' ? 'active' : '') ? ' ' + (activeDemoTab.value === 'counter' ? 'active' : '') : '')));
  _el111.setAttribute("type", "button");
  listen(_el111, "click", (e) => { setTab('counter'); }, []);
  const _t112 = text("العداد التفاعلي (Counter)");
  _el111.appendChild(_t112);
  _el110.appendChild(_el111);
  const _el113 = element("button", "data-l-1xmbid8", ["demo-tab-btn"]);
  bindAttr(_el113, "class", () => ("demo-tab-btn" + ((activeDemoTab.value === 'todo' ? 'active' : '') ? ' ' + (activeDemoTab.value === 'todo' ? 'active' : '') : '')));
  _el113.setAttribute("type", "button");
  listen(_el113, "click", (e) => { setTab('todo'); }, []);
  const _t114 = text("قائمة المهام (Todo)");
  _el113.appendChild(_t114);
  _el110.appendChild(_el113);
  _el104.appendChild(_el110);
  const _el115 = element("div", "data-l-1xmbid8", ["demo-container"]);
  const _anchor116 = document.createComment('if');
  _el115.appendChild(_anchor116);
  createIfBlock(_anchor116, () => (activeDemoTab.value === 'counter'), () => {
    const _thenNodes117 = [];
    const _c118 = LiveCounter({  });
    if (Array.isArray(_c118)) _thenNodes117.push(..._c118); else if (_c118) _thenNodes117.push(_c118);
    return _thenNodes117;
  }, () => {
    const _elseNodes119 = [];
    const _c120 = LiveTodo({  });
    if (Array.isArray(_c120)) _elseNodes119.push(..._c120); else if (_c120) _elseNodes119.push(_c120);
    return _elseNodes119;
  });
  _el104.appendChild(_el115);
  _el0.appendChild(_el104);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function NotFound(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const _root = [];
  const _el0 = element("div", "data-l-1ankwxc", ["notfound-container"]);
  const _el1 = element("div", "data-l-1ankwxc", ["notfound-icon"]);
  const _t2 = text("🫟");
  _el1.appendChild(_t2);
  _el0.appendChild(_el1);
  const _el3 = element("h1", "data-l-1ankwxc", ["notfound-title"]);
  const _t4 = text("404 — الصفحة غير موجودة");
  _el3.appendChild(_t4);
  _el0.appendChild(_el3);
  const _el5 = element("p", "data-l-1ankwxc", ["notfound-desc"]);
  const _t6 = text("عذراً، المسار الذي تحاول الوصول إليه غير موجود أو تم نقله.");
  _el5.appendChild(_t6);
  _el0.appendChild(_el5);
  const _el7 = element("button", "data-l-1ankwxc", ["home-btn"]);
  _el7.setAttribute("type", "button");
  listen(_el7, "click", (e) => { navigate('/'); }, []);
  const _t8 = text("العودة إلى الصفحة الرئيسية");
  _el7.appendChild(_t8);
  _el0.appendChild(_el7);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function Play(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const profile = signal(loadProfile());
  effect(() => {
    saveProfile(profile());
  });
  const activeSeasonId = signal(profile().activeSeasonId || 1);
  const activeModal = signal(null); // { type: 'episode' | 'exam' | 'cert', data: ... }
  const feedbackMessage = signal('');
  const feedbackType = signal(''); // 'success' | 'error' | ''
  const userCode = signal('');
  const quizSelectedOption = signal(null);
  const quizSubmitted = signal(false);
  const examQuestionIndex = signal(0);
  const examAnswers = signal([]); // array of selected options
  const examFinished = signal(false);
  const examScorePercent = signal(0);
  const rank = computed(() => getRankInfo(profile().xp));
  const progressPercent = computed(() => {
    const current = profile().xp - rank().currentBase;
    const target = rank().nextXp - rank().currentBase;
    if (target <= 0) return 100;
    return Math.min(100, Math.max(0, Math.round((current / target) * 100)));
  });
  const activeSeason = computed(() => getSeason(activeSeasonId()));
  function toggleSound() {
    const current = profile();
    profile.set({
      ...current,
      soundEnabled: !current.soundEnabled
    });
  }
  function selectSeason(id) {
    if (!profile().unlockedSeasons[id]) {
      feedbackType.value = 'error';
      feedbackMessage.value = lang() === 'ar'
        ? '🔒 هذا الموسم مغلق! يجب اجتياز امتحان الموسم السابق أولاً لفتحه.'
        : '🔒 This season is locked! Pass the previous season exam to unlock it.';
      playSound('error', profile().soundEnabled);
      setTimeout(() => { feedbackMessage.value = ''; }, 3500);
      return;
    }
    activeSeasonId.value = id;
    const p = profile();
    profile.set({ ...p, activeSeasonId: id });
  }
  function openEpisode(ep) {
    feedbackMessage.value = '';
    feedbackType.value = '';
    quizSelectedOption.value = null;
    quizSubmitted.value = false;
    userCode.value = ep.starterCode || '';
    activeModal.value = { type: 'episode', ep };
  }
  function closeModal() {
    activeModal.value = null;
    examFinished.value = false;
    examQuestionIndex.value = 0;
    examAnswers.value = [];
  }
  function verifyCodeChallenge() {
    const modal = activeModal();
    if (!modal || modal.type !== 'episode') return;
    const ep = modal.ep;
    const result = ep.validate(userCode());
    if (result.success) {
      feedbackType.value = 'success';
      feedbackMessage.value = lang() === 'ar'
        ? `🎉 أحسنت صنعاً! الكود صحيح 100% وحصلت على +${ep.xp} XP!`
        : `🎉 Excellent! Code validated successfully. +${ep.xp} XP earned!`;
      const p = profile();
      const isFirstTime = !p.completedEpisodes[ep.id];
      const prevLevel = getRankInfo(p.xp).level;
      const newXp = isFirstTime ? p.xp + ep.xp : p.xp;
      const newLevel = getRankInfo(newXp).level;
      profile.set({
        ...p,
        xp: newXp,
        completedEpisodes: {
          ...p.completedEpisodes,
          [ep.id]: true
        }
      });
      if (newLevel > prevLevel) {
        playSound('levelup', p.soundEnabled);
      } else {
        playSound('success', p.soundEnabled);
      }
    } else {
      feedbackType.value = 'error';
      feedbackMessage.value = lang() === 'ar' ? result.msgAr : result.msgEn;
      playSound('error', profile().soundEnabled);
    }
  }
  function selectQuizOption(index) {
    if (quizSubmitted.value) return;
    quizSelectedOption.value = index;
  }
  function submitQuizAnswer() {
    const modal = activeModal();
    if (!modal || modal.type !== 'episode') return;
    const ep = modal.ep;
    if (quizSelectedOption.value === null) return;
    quizSubmitted.value = true;
    const isCorrect = quizSelectedOption.value === ep.correctIndex;
    if (isCorrect) {
      feedbackType.value = 'success';
      feedbackMessage.value = lang() === 'ar'
        ? `🌟 إجابة صحيحة تماماً! +${ep.xp} XP`
        : `🌟 Correct answer! +${ep.xp} XP`;
      const p = profile();
      const isFirstTime = !p.completedEpisodes[ep.id];
      const prevLevel = getRankInfo(p.xp).level;
      const newXp = isFirstTime ? p.xp + ep.xp : p.xp;
      const newLevel = getRankInfo(newXp).level;
      profile.set({
        ...p,
        xp: newXp,
        completedEpisodes: {
          ...p.completedEpisodes,
          [ep.id]: true
        }
      });
      if (newLevel > prevLevel) {
        playSound('levelup', p.soundEnabled);
      } else {
        playSound('success', p.soundEnabled);
      }
    } else {
      feedbackType.value = 'error';
      feedbackMessage.value = lang() === 'ar'
        ? `❌ إجابة غير صحيحة. التوضيح: ${ep.explanationAr}`
        : `❌ Incorrect. Explanation: ${ep.explanationEn}`;
      playSound('error', profile().soundEnabled);
    }
  }
  function startExam(season) {
    feedbackMessage.value = '';
    feedbackType.value = '';
    examQuestionIndex.value = 0;
    examAnswers.value = [];
    examFinished.value = false;
    examScorePercent.value = 0;
    activeModal.value = { type: 'exam', season };
  }
  function selectExamOption(qIndex, optIndex) {
    const answers = [...examAnswers()];
    answers[qIndex] = optIndex;
    examAnswers.value = answers;
  }
  function nextExamQuestion() {
    const modal = activeModal();
    if (!modal || modal.type !== 'exam') return;
    const total = modal.season.exam.questions.length;
    if (examQuestionIndex() < total - 1) {
      examQuestionIndex.value = examQuestionIndex() + 1;
    }
  }
  function prevExamQuestion() {
    if (examQuestionIndex() > 0) {
      examQuestionIndex.value = examQuestionIndex() - 1;
    }
  }
  function finishExam() {
    const modal = activeModal();
    if (!modal || modal.type !== 'exam') return;
    const season = modal.season;
    const questions = season.exam.questions;
    const answers = examAnswers();
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (answers[idx] === q.correct) {
        correctCount++;
      }
    });
    const percent = Math.round((correctCount / questions.length) * 100);
    examScorePercent.value = percent;
    examFinished.value = true;
    const passed = percent >= season.examThreshold;
    const p = profile();
    const isFirstPass = !p.passedExams[season.id];
    if (passed) {
      const prevLevel = getRankInfo(p.xp).level;
      const addedXp = isFirstPass ? season.exam.rewardXp : 0;
      const newXp = p.xp + addedXp;
      const newLevel = getRankInfo(newXp).level;
      const nextSeasonId = season.id + 1;
      const nextUnlocked = { ...p.unlockedSeasons };
      if (SEASONS.some(s => s.id === nextSeasonId)) {
        nextUnlocked[nextSeasonId] = true;
      }
      profile.set({
        ...p,
        xp: newXp,
        passedExams: {
          ...p.passedExams,
          [season.id]: true
        },
        examScores: {
          ...p.examScores,
          [season.id]: percent
        },
        unlockedSeasons: nextUnlocked
      });
      playSound('exam', p.soundEnabled);
    } else {
      playSound('error', p.soundEnabled);
    }
  }
  function resetAllProgress() {
    if (typeof window !== 'undefined') {
      const confirmMsg = lang() === 'ar'
        ? 'هل أنت متأكد من رغبتك في إعادة تعيين كافة نقاط XP والتقدم والمواسم؟'
        : 'Are you sure you want to reset all XP points, seasons, and progress?';
      if (window.confirm(confirmMsg)) {
        localStorage.removeItem('liquid_play_profile_v1');
        profile.value = loadProfile();
        activeSeasonId.value = 1;
        feedbackType.value = 'success';
        feedbackMessage.value = lang() === 'ar' ? 'تمت إعادة ضبط التقدم بنجاح.' : 'Progress reset successfully.';
        setTimeout(() => { feedbackMessage.value = ''; }, 3000);
      }
    }
  }
  const _root = [];
  const _el0 = element("div", "data-l-1fa7v8j", ["play-page"]);
  const _anchor1 = document.createComment('if');
  _el0.appendChild(_anchor1);
  createIfBlock(_anchor1, () => (feedbackMessage.value), () => {
    const _thenNodes2 = [];
    const _el3 = element("div", "data-l-1fa7v8j", ["feedback-alert"]);
    bindAttr(_el3, "class", () => ("feedback-alert" + ((feedbackType.value) ? ' ' + (feedbackType.value) : '')));
    const _t4 = text('');
    bindText(_t4, () => (feedbackMessage.value));
    _el3.appendChild(_t4);
    _thenNodes2.push(_el3);
    return _thenNodes2;
  }, null);
  const _el5 = element("div", "data-l-1fa7v8j", ["hud-card"]);
  const _el6 = element("div", "data-l-1fa7v8j", ["hud-top"]);
  const _el7 = element("div", "data-l-1fa7v8j", ["player-info"]);
  const _el8 = element("div", "data-l-1fa7v8j", ["avatar-badge"]);
  const _t9 = text('');
  bindText(_t9, () => (activeSeason().badge));
  _el8.appendChild(_t9);
  _el7.appendChild(_el8);
  const _el10 = element("div", "data-l-1fa7v8j", ["player-details"]);
  const _el11 = element("h2", "data-l-1fa7v8j", null);
  const _t12 = text('');
  bindText(_t12, () => (lang() === 'ar' ? rank().titleAr : rank().titleEn));
  _el11.appendChild(_t12);
  _el10.appendChild(_el11);
  const _el13 = element("p", "data-l-1fa7v8j", null);
  _el13.setAttribute("style", "margin: 0; color: #94a3b8; font-size: 0.85rem;");
  const _t14 = text('');
  bindText(_t14, () => (lang() === 'ar' ? 'أكاديمية ليكويد التفاعلية — المستوى ' + rank().level : 'Liquid Academy — Level ' + rank().level));
  _el13.appendChild(_t14);
  _el10.appendChild(_el13);
  _el7.appendChild(_el10);
  _el6.appendChild(_el7);
  const _el15 = element("div", "data-l-1fa7v8j", ["hud-badges"]);
  const _el16 = element("span", "data-l-1fa7v8j", ["hud-pill"]);
  const _t17 = text("🔥 ");
  _el16.appendChild(_t17);
  const _t18 = text('');
  bindText(_t18, () => (profile().streak));
  _el16.appendChild(_t18);
  const _t19 = text(" ");
  _el16.appendChild(_t19);
  const _t20 = text('');
  bindText(_t20, () => (lang() === 'ar' ? 'أيام متتالية' : 'Day Streak'));
  _el16.appendChild(_t20);
  _el15.appendChild(_el16);
  const _el21 = element("span", "data-l-1fa7v8j", ["hud-pill"]);
  const _t22 = text("🏆 ");
  _el21.appendChild(_t22);
  const _t23 = text('');
  bindText(_t23, () => (Object.keys(profile().passedExams).length));
  _el21.appendChild(_t23);
  const _t24 = text(" / 4 ");
  _el21.appendChild(_t24);
  const _t25 = text('');
  bindText(_t25, () => (lang() === 'ar' ? 'مواسم مكتملة' : 'Seasons'));
  _el21.appendChild(_t25);
  _el15.appendChild(_el21);
  const _el26 = element("button", "data-l-1fa7v8j", ["hud-btn"]);
  _el26.setAttribute("type", "button");
  _el26.setAttribute("title", "الصوت / Sound");
  listen(_el26, "click", toggleSound, []);
  const _el27 = element("span", "data-l-1fa7v8j", null);
  const _t28 = text('');
  bindText(_t28, () => (profile().soundEnabled ? '🔊 صوت مفعّل' : '🔇 صامت'));
  _el27.appendChild(_t28);
  _el26.appendChild(_el27);
  _el15.appendChild(_el26);
  const _el29 = element("button", "data-l-1fa7v8j", ["hud-btn"]);
  _el29.setAttribute("type", "button");
  _el29.setAttribute("title", "إعادة التعيين");
  listen(_el29, "click", resetAllProgress, []);
  const _t30 = text("🔄");
  _el29.appendChild(_t30);
  _el15.appendChild(_el29);
  _el6.appendChild(_el15);
  _el5.appendChild(_el6);
  const _el31 = element("div", "data-l-1fa7v8j", ["xp-progress-bar-bg"]);
  const _el32 = element("div", "data-l-1fa7v8j", ["xp-progress-fill"]);
  bindAttr(_el32, "style", () => ("width: " + progressPercent() + "%;"));
  _el31.appendChild(_el32);
  _el5.appendChild(_el31);
  const _el33 = element("div", "data-l-1fa7v8j", ["xp-stats"]);
  const _el34 = element("span", "data-l-1fa7v8j", null);
  const _t35 = text('');
  bindText(_t35, () => (profile().xp));
  _el34.appendChild(_t35);
  const _t36 = text(" XP");
  _el34.appendChild(_t36);
  _el33.appendChild(_el34);
  const _el37 = element("span", "data-l-1fa7v8j", null);
  const _t38 = text('');
  bindText(_t38, () => (lang() === 'ar' ? 'المستوى القادم: ' + rank().nextXp + ' XP' : 'Next Level: ' + rank().nextXp + ' XP'));
  _el37.appendChild(_t38);
  _el33.appendChild(_el37);
  _el5.appendChild(_el33);
  _el0.appendChild(_el5);
  const _el39 = element("div", "data-l-1fa7v8j", ["seasons-nav"]);
  const _anchor40 = document.createComment('each');
  _el39.appendChild(_anchor40);
  createEachBlock(_anchor40, () => (SEASONS), (s, _idx) => (s.id), (sSig, _idxSig) => {
    const s = new Proxy(sSig, {
      get(target, prop) {
        if (prop === 'isSignal') return true;
        if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') {
          return () => target();
        }
        const val = target();
        if (val != null && prop in Object(val)) {
          const res = val[prop];
          return typeof res === 'function' ? res.bind(val) : res;
        }
        return val;
      },
      apply(target) { return target(); }
    });
    const _idx = new Proxy(_idxSig, {
      apply(target) { return target(); },
      get(target, prop) {
        if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') return () => target();
        const val = target();
        if (val != null && prop in Object(val)) {
          const res = val[prop];
          return typeof res === 'function' ? res.bind(val) : res;
        }
        return val;
      }
    });
    const _eachNodes41 = [];
    const _el42 = element("div", "data-l-1fa7v8j", ["season-tab"]);
    bindAttr(_el42, "class", () => ("season-tab" + (((activeSeasonId() === s.id ? 'active' : '') + (!profile().unlockedSeasons[s.id] ? ' locked' : '')) ? ' ' + ((activeSeasonId() === s.id ? 'active' : '') + (!profile().unlockedSeasons[s.id] ? ' locked' : '')) : '')));
    listen(_el42, "click", (e) => { selectSeason(s.id); }, []);
    const _el43 = element("div", "data-l-1fa7v8j", ["season-header-row"]);
    const _el44 = element("span", "data-l-1fa7v8j", ["season-badge-icon"]);
    const _t45 = text('');
    bindText(_t45, () => (s.badge));
    _el44.appendChild(_t45);
    _el43.appendChild(_el44);
    const _anchor46 = document.createComment('if');
    _el43.appendChild(_anchor46);
    createIfBlock(_anchor46, () => (profile().passedExams[s.id]), () => {
      const _thenNodes47 = [];
      const _el48 = element("span", "data-l-1fa7v8j", ["season-trophy"]);
      const _t49 = text("🏆");
      _el48.appendChild(_t49);
      _thenNodes47.push(_el48);
      return _thenNodes47;
    }, () => {
      const _elseNodes50 = [];
      const _anchor51 = document.createComment('if');
      _elseNodes50.push(_anchor51);
      createIfBlock(_anchor51, () => (!profile().unlockedSeasons[s.id]), () => {
      const _thenNodes52 = [];
      const _el53 = element("span", "data-l-1fa7v8j", ["season-trophy"]);
      const _t54 = text("🔒");
      _el53.appendChild(_t54);
      _thenNodes52.push(_el53);
      return _thenNodes52;
    }, null);
      return _elseNodes50;
    });
    _el42.appendChild(_el43);
    const _el55 = element("h4", "data-l-1fa7v8j", ["season-title"]);
    const _t56 = text('');
    bindText(_t56, () => (lang() === 'ar' ? s.titleAr : s.titleEn));
    _el55.appendChild(_t56);
    _el42.appendChild(_el55);
    const _el57 = element("p", "data-l-1fa7v8j", ["season-meta"]);
    const _t58 = text('');
    bindText(_t58, () => (s.episodes.length));
    _el57.appendChild(_t58);
    const _t59 = text(" ");
    _el57.appendChild(_t59);
    const _t60 = text('');
    bindText(_t60, () => (lang() === 'ar' ? 'كبسولات تفاعلية' : 'Micro-lessons'));
    _el57.appendChild(_t60);
    const _t61 = text(" • ");
    _el57.appendChild(_t61);
    const _t62 = text('');
    bindText(_t62, () => (s.totalXp));
    _el57.appendChild(_t62);
    const _t63 = text(" XP");
    _el57.appendChild(_t63);
    _el42.appendChild(_el57);
    _eachNodes41.push(_el42);
    return _eachNodes41;
  });
  _el0.appendChild(_el39);
  const _el64 = element("div", "data-l-1fa7v8j", ["episodes-section"]);
  const _el65 = element("h3", "data-l-1fa7v8j", null);
  const _t66 = text('');
  bindText(_t66, () => (lang() === 'ar' ? activeSeason().titleAr : activeSeason().titleEn));
  _el65.appendChild(_t66);
  _el64.appendChild(_el65);
  const _el67 = element("p", "data-l-1fa7v8j", ["episodes-desc"]);
  const _t68 = text('');
  bindText(_t68, () => (lang() === 'ar' ? activeSeason().descriptionAr : activeSeason().descriptionEn));
  _el67.appendChild(_t68);
  _el64.appendChild(_el67);
  const _el69 = element("div", "data-l-1fa7v8j", ["episodes-grid"]);
  const _anchor70 = document.createComment('each');
  _el69.appendChild(_anchor70);
  createEachBlock(_anchor70, () => (activeSeason().episodes), (ep, _idx) => (ep.id), (epSig, _idxSig) => {
    const ep = new Proxy(epSig, {
      get(target, prop) {
        if (prop === 'isSignal') return true;
        if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') {
          return () => target();
        }
        const val = target();
        if (val != null && prop in Object(val)) {
          const res = val[prop];
          return typeof res === 'function' ? res.bind(val) : res;
        }
        return val;
      },
      apply(target) { return target(); }
    });
    const _idx = new Proxy(_idxSig, {
      apply(target) { return target(); },
      get(target, prop) {
        if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') return () => target();
        const val = target();
        if (val != null && prop in Object(val)) {
          const res = val[prop];
          return typeof res === 'function' ? res.bind(val) : res;
        }
        return val;
      }
    });
    const _eachNodes71 = [];
    const _el72 = element("div", "data-l-1fa7v8j", ["episode-card"]);
    bindAttr(_el72, "class", () => ("episode-card" + ((profile().completedEpisodes[ep.id] ? 'completed' : '') ? ' ' + (profile().completedEpisodes[ep.id] ? 'completed' : '') : '')));
    listen(_el72, "click", (e) => { openEpisode(ep); }, []);
    const _el73 = element("div", "data-l-1fa7v8j", null);
    const _el74 = element("div", "data-l-1fa7v8j", ["ep-header"]);
    const _el75 = element("span", "data-l-1fa7v8j", ["ep-type-pill"]);
    const _t76 = text('');
    bindText(_t76, () => (ep.type === 'code' ? (lang() === 'ar' ? '💻 تحدي برمجي' : '💻 Code') : (lang() === 'ar' ? '🧠 اختبار سريع' : '🧠 Quiz')));
    _el75.appendChild(_t76);
    _el74.appendChild(_el75);
    const _el77 = element("span", "data-l-1fa7v8j", ["ep-xp-pill"]);
    const _t78 = text("+");
    _el77.appendChild(_t78);
    const _t79 = text('');
    bindText(_t79, () => (ep.xp));
    _el77.appendChild(_t79);
    const _t80 = text(" XP");
    _el77.appendChild(_t80);
    _el74.appendChild(_el77);
    _el73.appendChild(_el74);
    const _el81 = element("h4", "data-l-1fa7v8j", ["ep-title"]);
    const _t82 = text('');
    bindText(_t82, () => (lang() === 'ar' ? ep.titleAr : ep.titleEn));
    _el81.appendChild(_t82);
    _el73.appendChild(_el81);
    const _el83 = element("p", "data-l-1fa7v8j", ["ep-summary"]);
    const _t84 = text('');
    bindText(_t84, () => (lang() === 'ar' ? ep.summaryAr : ep.summaryEn));
    _el83.appendChild(_t84);
    _el73.appendChild(_el83);
    _el72.appendChild(_el73);
    const _el85 = element("div", "data-l-1fa7v8j", ["ep-footer"]);
    const _anchor86 = document.createComment('if');
    _el85.appendChild(_anchor86);
    createIfBlock(_anchor86, () => (profile().completedEpisodes[ep.id]), () => {
      const _thenNodes87 = [];
      const _el88 = element("span", "data-l-1fa7v8j", null);
      _el88.setAttribute("style", "color: #10b981; font-weight: 700;");
      const _t89 = text("✓ ");
      _el88.appendChild(_t89);
      const _t90 = text('');
      bindText(_t90, () => (lang() === 'ar' ? 'تم الإنجاز' : 'Completed'));
      _el88.appendChild(_t90);
      _thenNodes87.push(_el88);
      return _thenNodes87;
    }, () => {
      const _elseNodes91 = [];
      const _el92 = element("span", "data-l-1fa7v8j", null);
      _el92.setAttribute("style", "color: var(--text-muted);");
      const _t93 = text("⏳ ");
      _el92.appendChild(_t93);
      const _t94 = text('');
      bindText(_t94, () => (lang() === 'ar' ? 'جاهز للتحدي' : 'Ready'));
      _el92.appendChild(_t94);
      _elseNodes91.push(_el92);
      return _elseNodes91;
    });
    const _el95 = element("button", "data-l-1fa7v8j", ["btn-open-ep"]);
    const _t96 = text('');
    bindText(_t96, () => (profile().completedEpisodes[ep.id] ? (lang() === 'ar' ? 'مراجعة' : 'Review') : (lang() === 'ar' ? 'ابدأ الكبسولة' : 'Start')));
    _el95.appendChild(_t96);
    _el85.appendChild(_el95);
    _el72.appendChild(_el85);
    _eachNodes71.push(_el72);
    return _eachNodes71;
  });
  _el64.appendChild(_el69);
  const _el97 = element("div", "data-l-1fa7v8j", ["boss-banner"]);
  const _el98 = element("div", "data-l-1fa7v8j", null);
  const _el99 = element("h4", "data-l-1fa7v8j", ["boss-title"]);
  const _t100 = text('');
  bindText(_t100, () => (lang() === 'ar' ? activeSeason().exam.titleAr : activeSeason().exam.titleEn));
  _el99.appendChild(_t100);
  _el98.appendChild(_el99);
  const _el101 = element("p", "data-l-1fa7v8j", ["boss-desc"]);
  const _t102 = text('');
  bindText(_t102, () => (lang() === 'ar' ? 'اختبر كل ما تعلمته في هذا الموسم! النجاح بنسبة 80% يفتح الموسم التالي ويمنحك شارة التميز و +' + activeSeason().exam.rewardXp + ' XP.' : 'Test everything in this season! Passing at 80% unlocks the next season and grants +' + activeSeason().exam.rewardXp + ' XP.'));
  _el101.appendChild(_t102);
  _el98.appendChild(_el101);
  _el97.appendChild(_el98);
  const _el103 = element("div", "data-l-1fa7v8j", null);
  const _anchor104 = document.createComment('if');
  _el103.appendChild(_anchor104);
  createIfBlock(_anchor104, () => (profile().passedExams[activeSeason().id]), () => {
    const _thenNodes105 = [];
    const _el106 = element("button", "data-l-1fa7v8j", ["btn-boss"]);
    listen(_el106, "click", (e) => { startExam(activeSeason()); }, []);
    const _t107 = text("🏆 ");
    _el106.appendChild(_t107);
    const _t108 = text('');
    bindText(_t108, () => (lang() === 'ar' ? 'إعادة الاختبار (النتيجة: ' + profile().examScores[activeSeason().id] + '%)' : 'Retake Exam (' + profile().examScores[activeSeason().id] + '%)'));
    _el106.appendChild(_t108);
    _thenNodes105.push(_el106);
    return _thenNodes105;
  }, () => {
    const _elseNodes109 = [];
    const _el110 = element("button", "data-l-1fa7v8j", ["btn-boss"]);
    listen(_el110, "click", (e) => { startExam(activeSeason()); }, []);
    const _t111 = text("⚔️ ");
    _el110.appendChild(_t111);
    const _t112 = text('');
    bindText(_t112, () => (lang() === 'ar' ? 'بدء امتحان نهاية الموسم' : 'Start Boss Exam'));
    _el110.appendChild(_t112);
    _elseNodes109.push(_el110);
    return _elseNodes109;
  });
  _el97.appendChild(_el103);
  _el64.appendChild(_el97);
  _el0.appendChild(_el64);
  const _anchor113 = document.createComment('if');
  _el0.appendChild(_anchor113);
  createIfBlock(_anchor113, () => (activeModal() && activeModal().type === 'episode'), () => {
    const _thenNodes114 = [];
    const _el115 = element("div", "data-l-1fa7v8j", ["modal-overlay"]);
    const _el116 = element("div", "data-l-1fa7v8j", ["modal-content"]);
    const _el117 = element("div", "data-l-1fa7v8j", ["modal-header"]);
    const _el118 = element("h3", "data-l-1fa7v8j", null);
    const _t119 = text('');
    bindText(_t119, () => (lang() === 'ar' ? activeModal().ep.titleAr : activeModal().ep.titleEn));
    _el118.appendChild(_t119);
    _el117.appendChild(_el118);
    const _el120 = element("button", "data-l-1fa7v8j", ["modal-close"]);
    listen(_el120, "click", closeModal, []);
    const _t121 = text("✕");
    _el120.appendChild(_t121);
    _el117.appendChild(_el120);
    _el116.appendChild(_el117);
    const _el122 = element("div", "data-l-1fa7v8j", ["modal-body"]);
    const _el123 = element("div", "data-l-1fa7v8j", ["lesson-box"]);
    const _el124 = element("p", "data-l-1fa7v8j", null);
    _el124.setAttribute("style", "margin: 0; white-space: pre-line;");
    const _t125 = text('');
    bindText(_t125, () => (lang() === 'ar' ? activeModal().ep.theoryAr : activeModal().ep.theoryEn));
    _el124.appendChild(_t125);
    _el123.appendChild(_el124);
    _el122.appendChild(_el123);
    const _anchor126 = document.createComment('if');
    _el122.appendChild(_anchor126);
    createIfBlock(_anchor126, () => (feedbackMessage.value), () => {
      const _thenNodes127 = [];
      const _el128 = element("div", "data-l-1fa7v8j", ["feedback-alert"]);
      bindAttr(_el128, "class", () => ("feedback-alert" + ((feedbackType.value) ? ' ' + (feedbackType.value) : '')));
      const _t129 = text('');
      bindText(_t129, () => (feedbackMessage.value));
      _el128.appendChild(_t129);
      _thenNodes127.push(_el128);
      return _thenNodes127;
    }, null);
    const _el130 = element("div", "data-l-1fa7v8j", ["challenge-box"]);
    const _anchor131 = document.createComment('if');
    _el130.appendChild(_anchor131);
    createIfBlock(_anchor131, () => (activeModal().ep.type === 'code'), () => {
      const _thenNodes132 = [];
      const _el133 = element("p", "data-l-1fa7v8j", null);
      _el133.setAttribute("style", "font-weight: 700; margin-bottom: 0.5rem;");
      const _t134 = text('');
      bindText(_t134, () => (lang() === 'ar' ? activeModal().ep.challengePromptAr : activeModal().ep.challengePromptEn));
      _el133.appendChild(_t134);
      _thenNodes132.push(_el133);
      const _el135 = element("textarea", "data-l-1fa7v8j", ["code-editor-area"]);
      bindInput(_el135, userCode, "bind");
      _thenNodes132.push(_el135);
      const _el136 = element("button", "data-l-1fa7v8j", ["btn-primary-action"]);
      listen(_el136, "click", verifyCodeChallenge, []);
      const _t137 = text("🚀 ");
      _el136.appendChild(_t137);
      const _t138 = text('');
      bindText(_t138, () => (lang() === 'ar' ? 'فحص الكود والترجمة المباشرة' : 'Verify & Live Compile'));
      _el136.appendChild(_t138);
      _thenNodes132.push(_el136);
      return _thenNodes132;
    }, () => {
      const _elseNodes139 = [];
      const _el140 = element("p", "data-l-1fa7v8j", null);
      _el140.setAttribute("style", "font-weight: 700; margin-bottom: 1rem;");
      const _t141 = text('');
      bindText(_t141, () => (lang() === 'ar' ? activeModal().ep.questionAr : activeModal().ep.questionEn));
      _el140.appendChild(_t141);
      _elseNodes139.push(_el140);
      const _anchor142 = document.createComment('each');
      _elseNodes139.push(_anchor142);
      createEachBlock(_anchor142, () => (activeModal().ep.options), (opt, _idx) => (opt), (optSig, _idxSig) => {
      const opt = new Proxy(optSig, {
        get(target, prop) {
          if (prop === 'isSignal') return true;
          if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') {
            return () => target();
          }
          const val = target();
          if (val != null && prop in Object(val)) {
            const res = val[prop];
            return typeof res === 'function' ? res.bind(val) : res;
          }
          return val;
        },
        apply(target) { return target(); }
      });
      const _idx = new Proxy(_idxSig, {
        apply(target) { return target(); },
        get(target, prop) {
          if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') return () => target();
          const val = target();
          if (val != null && prop in Object(val)) {
            const res = val[prop];
            return typeof res === 'function' ? res.bind(val) : res;
          }
          return val;
        }
      });
      const _eachNodes143 = [];
      const _el144 = element("button", "data-l-1fa7v8j", ["quiz-option-btn"]);
      bindAttr(_el144, "class", () => ("quiz-option-btn" + ((quizSelectedOption() === activeModal().ep.options.indexOf(opt) ? 'selected' : '') ? ' ' + (quizSelectedOption() === activeModal().ep.options.indexOf(opt) ? 'selected' : '') : '')));
      listen(_el144, "click", (e) => { selectQuizOption(activeModal().ep.options.indexOf(opt)); }, []);
      const _t145 = text('');
      bindText(_t145, () => (opt));
      _el144.appendChild(_t145);
      _eachNodes143.push(_el144);
      return _eachNodes143;
    });
      const _el146 = element("div", "data-l-1fa7v8j", null);
      _el146.setAttribute("style", "margin-top: 1rem;");
      const _el147 = element("button", "data-l-1fa7v8j", ["btn-primary-action"]);
      listen(_el147, "click", submitQuizAnswer, []);
      const _t148 = text("🎯 ");
      _el147.appendChild(_t148);
      const _t149 = text('');
      bindText(_t149, () => (lang() === 'ar' ? 'تأكيد الإجابة' : 'Submit Answer'));
      _el147.appendChild(_t149);
      _el146.appendChild(_el147);
      _elseNodes139.push(_el146);
      return _elseNodes139;
    });
    _el122.appendChild(_el130);
    _el116.appendChild(_el122);
    _el115.appendChild(_el116);
    _thenNodes114.push(_el115);
    return _thenNodes114;
  }, null);
  const _anchor150 = document.createComment('if');
  _el0.appendChild(_anchor150);
  createIfBlock(_anchor150, () => (activeModal() && activeModal().type === 'exam'), () => {
    const _thenNodes151 = [];
    const _el152 = element("div", "data-l-1fa7v8j", ["modal-overlay"]);
    const _el153 = element("div", "data-l-1fa7v8j", ["modal-content"]);
    const _el154 = element("div", "data-l-1fa7v8j", ["modal-header"]);
    const _el155 = element("h3", "data-l-1fa7v8j", null);
    const _t156 = text('');
    bindText(_t156, () => (lang() === 'ar' ? activeModal().season.exam.titleAr : activeModal().season.exam.titleEn));
    _el155.appendChild(_t156);
    _el154.appendChild(_el155);
    const _el157 = element("button", "data-l-1fa7v8j", ["modal-close"]);
    listen(_el157, "click", closeModal, []);
    const _t158 = text("✕");
    _el157.appendChild(_t158);
    _el154.appendChild(_el157);
    _el153.appendChild(_el154);
    const _el159 = element("div", "data-l-1fa7v8j", ["modal-body"]);
    const _anchor160 = document.createComment('if');
    _el159.appendChild(_anchor160);
    createIfBlock(_anchor160, () => (!examFinished()), () => {
      const _thenNodes161 = [];
      const _el162 = element("div", "data-l-1fa7v8j", ["exam-header-bar"]);
      const _el163 = element("span", "data-l-1fa7v8j", null);
      const _t164 = text('');
      bindText(_t164, () => (lang() === 'ar' ? 'السؤال ' + (examQuestionIndex() + 1) + ' من ' + activeModal().season.exam.questions.length : 'Question ' + (examQuestionIndex() + 1) + ' of ' + activeModal().season.exam.questions.length));
      _el163.appendChild(_t164);
      _el162.appendChild(_el163);
      const _el165 = element("span", "data-l-1fa7v8j", null);
      const _t166 = text("⚔️ ");
      _el165.appendChild(_t166);
      const _t167 = text('');
      bindText(_t167, () => (lang() === 'ar' ? 'نسبة النجاح المطلوبة: ' + activeModal().season.examThreshold + '%' : 'Pass: ' + activeModal().season.examThreshold + '%'));
      _el165.appendChild(_t167);
      _el162.appendChild(_el165);
      _thenNodes161.push(_el162);
      const _el168 = element("h4", "data-l-1fa7v8j", null);
      _el168.setAttribute("style", "font-size: 1.15rem; margin-bottom: 1.25rem;");
      const _t169 = text('');
      bindText(_t169, () => (lang() === 'ar' ? activeModal().season.exam.questions[examQuestionIndex()].qAr : activeModal().season.exam.questions[examQuestionIndex()].qEn));
      _el168.appendChild(_t169);
      _thenNodes161.push(_el168);
      const _anchor170 = document.createComment('each');
      _thenNodes161.push(_anchor170);
      createEachBlock(_anchor170, () => (activeModal().season.exam.questions[examQuestionIndex()].options), (opt, _idx) => (opt), (optSig, _idxSig) => {
      const opt = new Proxy(optSig, {
        get(target, prop) {
          if (prop === 'isSignal') return true;
          if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') {
            return () => target();
          }
          const val = target();
          if (val != null && prop in Object(val)) {
            const res = val[prop];
            return typeof res === 'function' ? res.bind(val) : res;
          }
          return val;
        },
        apply(target) { return target(); }
      });
      const _idx = new Proxy(_idxSig, {
        apply(target) { return target(); },
        get(target, prop) {
          if (prop === Symbol.toPrimitive || prop === 'valueOf' || prop === 'toString') return () => target();
          const val = target();
          if (val != null && prop in Object(val)) {
            const res = val[prop];
            return typeof res === 'function' ? res.bind(val) : res;
          }
          return val;
        }
      });
      const _eachNodes171 = [];
      const _el172 = element("button", "data-l-1fa7v8j", ["quiz-option-btn"]);
      bindAttr(_el172, "class", () => ("quiz-option-btn" + ((examAnswers()[examQuestionIndex()] === activeModal().season.exam.questions[examQuestionIndex()].options.indexOf(opt) ? 'selected' : '') ? ' ' + (examAnswers()[examQuestionIndex()] === activeModal().season.exam.questions[examQuestionIndex()].options.indexOf(opt) ? 'selected' : '') : '')));
      listen(_el172, "click", (e) => { selectExamOption(examQuestionIndex(), activeModal().season.exam.questions[examQuestionIndex()].options.indexOf(opt)); }, []);
      const _t173 = text('');
      bindText(_t173, () => (opt));
      _el172.appendChild(_t173);
      _eachNodes171.push(_el172);
      return _eachNodes171;
    });
      const _el174 = element("div", "data-l-1fa7v8j", ["exam-nav-btns"]);
      const _anchor175 = document.createComment('if');
      _el174.appendChild(_anchor175);
      createIfBlock(_anchor175, () => (examQuestionIndex() > 0), () => {
      const _thenNodes176 = [];
      const _el177 = element("button", "data-l-1fa7v8j", ["hud-btn"]);
      listen(_el177, "click", prevExamQuestion, []);
      const _t178 = text("← ");
      _el177.appendChild(_t178);
      const _t179 = text('');
      bindText(_t179, () => (lang() === 'ar' ? 'السابق' : 'Previous'));
      _el177.appendChild(_t179);
      _thenNodes176.push(_el177);
      return _thenNodes176;
    }, () => {
      const _elseNodes180 = [];
      const _el181 = element("span", "data-l-1fa7v8j", null);
      _elseNodes180.push(_el181);
      return _elseNodes180;
    });
      const _anchor182 = document.createComment('if');
      _el174.appendChild(_anchor182);
      createIfBlock(_anchor182, () => (examQuestionIndex() < activeModal().season.exam.questions.length - 1), () => {
      const _thenNodes183 = [];
      const _el184 = element("button", "data-l-1fa7v8j", ["btn-primary-action"]);
      listen(_el184, "click", nextExamQuestion, []);
      const _t185 = text('');
      bindText(_t185, () => (lang() === 'ar' ? 'التالي' : 'Next'));
      _el184.appendChild(_t185);
      const _t186 = text(" →");
      _el184.appendChild(_t186);
      _thenNodes183.push(_el184);
      return _thenNodes183;
    }, () => {
      const _elseNodes187 = [];
      const _el188 = element("button", "data-l-1fa7v8j", ["btn-primary-action"]);
      listen(_el188, "click", finishExam, []);
      const _t189 = text("🏁 ");
      _el188.appendChild(_t189);
      const _t190 = text('');
      bindText(_t190, () => (lang() === 'ar' ? 'إنهاء وحساب النتيجة' : 'Finish & Grade'));
      _el188.appendChild(_t190);
      _elseNodes187.push(_el188);
      return _elseNodes187;
    });
      _thenNodes161.push(_el174);
      return _thenNodes161;
    }, () => {
      const _elseNodes191 = [];
      const _el192 = element("div", "data-l-1fa7v8j", ["exam-summary-card"]);
      const _el193 = element("div", "data-l-1fa7v8j", ["exam-result-score"]);
      const _t194 = text('');
      bindText(_t194, () => (examScorePercent()));
      _el193.appendChild(_t194);
      const _t195 = text("%");
      _el193.appendChild(_t195);
      _el192.appendChild(_el193);
      const _anchor196 = document.createComment('if');
      _el192.appendChild(_anchor196);
      createIfBlock(_anchor196, () => (examScorePercent() >= activeModal().season.examThreshold), () => {
      const _thenNodes197 = [];
      const _el198 = element("h3", "data-l-1fa7v8j", null);
      _el198.setAttribute("style", "color: #10b981; margin: 0 0 0.5rem;");
      const _t199 = text("🎉 ");
      _el198.appendChild(_t199);
      const _t200 = text('');
      bindText(_t200, () => (lang() === 'ar' ? 'مبارك! لقد اجتزت امتحان الموسم بنجاح!' : 'Congratulations! You passed the season exam!'));
      _el198.appendChild(_t200);
      _thenNodes197.push(_el198);
      const _el201 = element("p", "data-l-1fa7v8j", null);
      _el201.setAttribute("style", "color: var(--text-muted); margin-bottom: 1.5rem;");
      const _t202 = text('');
      bindText(_t202, () => (lang() === 'ar' ? 'تم فتح الموسم التالي وحصلت على +' + activeModal().season.exam.rewardXp + ' XP و ' + activeModal().season.badgeNameAr : 'Next season unlocked! +' + activeModal().season.exam.rewardXp + ' XP earned.'));
      _el201.appendChild(_t202);
      _thenNodes197.push(_el201);
      return _thenNodes197;
    }, () => {
      const _elseNodes203 = [];
      const _el204 = element("h3", "data-l-1fa7v8j", null);
      _el204.setAttribute("style", "color: #ef4444; margin: 0 0 0.5rem;");
      const _t205 = text("🔄 ");
      _el204.appendChild(_t205);
      const _t206 = text('');
      bindText(_t206, () => (lang() === 'ar' ? 'لم تجتز النسبة المطلوبة (80%)' : 'Did not pass (80% required)'));
      _el204.appendChild(_t206);
      _elseNodes203.push(_el204);
      const _el207 = element("p", "data-l-1fa7v8j", null);
      _el207.setAttribute("style", "color: var(--text-muted); margin-bottom: 1.5rem;");
      const _t208 = text('');
      bindText(_t208, () => (lang() === 'ar' ? 'راجع كبسولات الموسم وحاول مجدداً لتفوز بالشارة!' : 'Review the season lessons and retry to win the badge!'));
      _el207.appendChild(_t208);
      _elseNodes203.push(_el207);
      return _elseNodes203;
    });
      const _el209 = element("button", "data-l-1fa7v8j", ["btn-primary-action"]);
      listen(_el209, "click", closeModal, []);
      const _t210 = text('');
      bindText(_t210, () => (lang() === 'ar' ? 'إغلاق ومتابعة التعلم' : 'Close and Continue'));
      _el209.appendChild(_t210);
      _el192.appendChild(_el209);
      _elseNodes191.push(_el192);
      return _elseNodes191;
    });
    _el153.appendChild(_el159);
    _el152.appendChild(_el153);
    _thenNodes151.push(_el152);
    return _thenNodes151;
  }, null);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
function Playground(props = {}, context = {}) {
  function defineProps(defaults = {}) { return Object.assign({}, defaults, props); }
  const activeTab = signal('counter');
  const SEC_LOGIC = '---' + ' logic';
  const SEC_STYLE = '---' + ' style';
  const SEC_UI = '---' + ' ui';
  const counterCode = `${SEC_LOGIC}
  const count = signal(0);
  const double = computed(() => count.value * 2);
  function inc() { count.value++; }
  function dec() { count.value--; }
  function reset() { count.value = 0; }
  ${SEC_STYLE}
  .counter-box { text-align: center; padding: 1.5rem; }
  .counter-num { font-size: 3rem; font-weight: 800; color: #0284c7; }
  .btn { padding: 0.5rem 1rem; margin: 0 4px; border-radius: 8px; }
  ${SEC_UI}
  div.counter-box
    h2 العداد: {count.value}
    p الضعف: {double()}
    button.btn @click=dec -
    button.btn @click=reset إعادة تعيين
    button.btn @click=inc +`;
  const todoCode = `${SEC_LOGIC}
  let nextId = 1;
  const inputVal = signal('');
  const todos = signal([]);
  function addTodo() {
    if (!inputVal.value.trim()) return;
    todos.value = [...todos.value, { id: nextId++, text: inputVal.value, done: false }];
    inputVal.value = '';
  }
  function toggle(id) {
    todos.value = todos.value.map(t => t.id === id ? { ...t, done: !t.done } : t);
  }
  ${SEC_STYLE}
  .todo-item { display: flex; align-items: center; gap: 8px; }
  .done { text-decoration: line-through; color: #888; }
  ${SEC_UI}
  div.todo-app
    input type="text" $bind=inputVal @keydown.enter=addTodo placeholder="أضف مهمة..."
    button @click=addTodo إضافة
    each todos.value as item (item.id)
      div.todo-item
        input type="checkbox" checked={item.done} @click=toggle(item.id)
        span class={item.done ? 'done' : ''} {item.text}`;
  const formCode = `${SEC_LOGIC}
  const username = signal('');
  const email = signal('');
  const isValid = computed(() => username.value.length >= 3 && email.value.includes('@'));
  function submit() {
    alert('تم إرسال: ' + username.value);
  }
  ${SEC_STYLE}
  .field { margin-bottom: 12px; }
  .btn:disabled { opacity: 0.5; }
  ${SEC_UI}
  form @submit.prevent=submit
    div.field
      label الاسم:
      input type="text" $bind=username
    div.field
      label البريد:
      input type="email" $bind=email
    button.btn type="submit" disabled={!isValid()} إرسال`;
  const calcCode = `${SEC_LOGIC}
  const income = signal(5000);
  const rent = signal(1500);
  const food = signal(800);
  const total = computed(() => Number(rent.value) + Number(food.value));
  const savings = computed(() => Number(income.value) - total());
  ${SEC_UI}
  div.calc
    h3 المتبقي: {'$' + savings()}
    p إجمالي النفقات: {'$' + total()}`;
  function setTab(tab) {
    activeTab.value = tab;
  }
  function getActiveCode() {
    if (activeTab.value === 'counter') return counterCode;
    if (activeTab.value === 'todo') return todoCode;
    if (activeTab.value === 'form') return formCode;
    return calcCode;
  }
  const _root = [];
  const _el0 = element("div", "data-l-um7i3k", ["playground-page"]);
  const _el1 = element("div", "data-l-um7i3k", ["pg-head"]);
  const _el2 = element("h1", "data-l-um7i3k", ["pg-title"]);
  const _t3 = text('');
  bindText(_t3, () => (t('playgroundTitle')));
  _el2.appendChild(_t3);
  _el1.appendChild(_el2);
  const _el4 = element("p", "data-l-um7i3k", ["pg-desc"]);
  const _t5 = text('');
  bindText(_t5, () => (t('playgroundDesc')));
  _el4.appendChild(_t5);
  _el1.appendChild(_el4);
  _el0.appendChild(_el1);
  const _el6 = element("div", "data-l-um7i3k", ["pg-tabs"]);
  const _el7 = element("button", "data-l-um7i3k", ["tab-btn"]);
  bindAttr(_el7, "class", () => ("tab-btn" + ((activeTab.value === 'counter' ? 'active' : '') ? ' ' + (activeTab.value === 'counter' ? 'active' : '') : '')));
  _el7.setAttribute("type", "button");
  listen(_el7, "click", (e) => { setTab('counter'); }, []);
  const _t8 = text('');
  bindText(_t8, () => (t('tabCounter')));
  _el7.appendChild(_t8);
  _el6.appendChild(_el7);
  const _el9 = element("button", "data-l-um7i3k", ["tab-btn"]);
  bindAttr(_el9, "class", () => ("tab-btn" + ((activeTab.value === 'todo' ? 'active' : '') ? ' ' + (activeTab.value === 'todo' ? 'active' : '') : '')));
  _el9.setAttribute("type", "button");
  listen(_el9, "click", (e) => { setTab('todo'); }, []);
  const _t10 = text('');
  bindText(_t10, () => (t('tabTodo')));
  _el9.appendChild(_t10);
  _el6.appendChild(_el9);
  const _el11 = element("button", "data-l-um7i3k", ["tab-btn"]);
  bindAttr(_el11, "class", () => ("tab-btn" + ((activeTab.value === 'form' ? 'active' : '') ? ' ' + (activeTab.value === 'form' ? 'active' : '') : '')));
  _el11.setAttribute("type", "button");
  listen(_el11, "click", (e) => { setTab('form'); }, []);
  const _t12 = text('');
  bindText(_t12, () => (t('tabForm')));
  _el11.appendChild(_t12);
  _el6.appendChild(_el11);
  const _el13 = element("button", "data-l-um7i3k", ["tab-btn"]);
  bindAttr(_el13, "class", () => ("tab-btn" + ((activeTab.value === 'calc' ? 'active' : '') ? ' ' + (activeTab.value === 'calc' ? 'active' : '') : '')));
  _el13.setAttribute("type", "button");
  listen(_el13, "click", (e) => { setTab('calc'); }, []);
  const _t14 = text('');
  bindText(_t14, () => (t('tabCalculator')));
  _el13.appendChild(_t14);
  _el6.appendChild(_el13);
  _el0.appendChild(_el6);
  const _el15 = element("div", "data-l-um7i3k", ["pg-workspace"]);
  const _el16 = element("div", "data-l-um7i3k", ["pane"]);
  const _el17 = element("div", "data-l-um7i3k", ["pane-header"]);
  const _el18 = element("span", "data-l-um7i3k", ["pane-label"]);
  const _el19 = element("span", "data-l-um7i3k", null);
  const _t20 = text("📱");
  _el19.appendChild(_t20);
  _el18.appendChild(_el19);
  const _el21 = element("span", "data-l-um7i3k", null);
  const _t22 = text('');
  bindText(_t22, () => (t('livePreview')));
  _el21.appendChild(_t22);
  _el18.appendChild(_el21);
  _el17.appendChild(_el18);
  _el16.appendChild(_el17);
  const _el23 = element("div", "data-l-um7i3k", ["preview-body"]);
  const _anchor24 = document.createComment('if');
  _el23.appendChild(_anchor24);
  createIfBlock(_anchor24, () => (activeTab.value === 'counter'), () => {
    const _thenNodes25 = [];
    const _c26 = LiveCounter({  });
    if (Array.isArray(_c26)) _thenNodes25.push(..._c26); else if (_c26) _thenNodes25.push(_c26);
    return _thenNodes25;
  }, () => {
    const _elseNodes27 = [];
    const _anchor28 = document.createComment('if');
    _elseNodes27.push(_anchor28);
    createIfBlock(_anchor28, () => (activeTab.value === 'todo'), () => {
      const _thenNodes29 = [];
      const _c30 = LiveTodo({  });
      if (Array.isArray(_c30)) _thenNodes29.push(..._c30); else if (_c30) _thenNodes29.push(_c30);
      return _thenNodes29;
    }, () => {
      const _elseNodes31 = [];
      const _anchor32 = document.createComment('if');
      _elseNodes31.push(_anchor32);
      createIfBlock(_anchor32, () => (activeTab.value === 'form'), () => {
      const _thenNodes33 = [];
      const _c34 = LiveForm({  });
      if (Array.isArray(_c34)) _thenNodes33.push(..._c34); else if (_c34) _thenNodes33.push(_c34);
      return _thenNodes33;
    }, () => {
      const _elseNodes35 = [];
      const _c36 = LiveCalculator({  });
      if (Array.isArray(_c36)) _elseNodes35.push(..._c36); else if (_c36) _elseNodes35.push(_c36);
      return _elseNodes35;
    });
      return _elseNodes31;
    });
    return _elseNodes27;
  });
  _el16.appendChild(_el23);
  _el15.appendChild(_el16);
  const _el37 = element("div", "data-l-um7i3k", ["pane"]);
  const _el38 = element("div", "data-l-um7i3k", ["pane-header"]);
  const _el39 = element("span", "data-l-um7i3k", ["pane-label"]);
  const _el40 = element("span", "data-l-um7i3k", null);
  const _t41 = text("💻");
  _el40.appendChild(_t41);
  _el39.appendChild(_el40);
  const _el42 = element("span", "data-l-um7i3k", null);
  const _t43 = text('');
  bindText(_t43, () => (t('viewCode')));
  _el42.appendChild(_t43);
  const _t44 = text(" (Component.liq)");
  _el42.appendChild(_t44);
  _el39.appendChild(_el42);
  _el38.appendChild(_el39);
  const _el45 = element("button", "data-l-um7i3k", ["copy-action-btn"]);
  _el45.setAttribute("type", "button");
  listen(_el45, "click", (e) => { copyToClipboard(getActiveCode()); }, []);
  const _t46 = text('');
  bindText(_t46, () => (t('copyCode')));
  _el45.appendChild(_t46);
  _el38.appendChild(_el45);
  _el37.appendChild(_el38);
  const _el47 = element("div", "data-l-um7i3k", ["code-body"]);
  const _el48 = element("pre", "data-l-um7i3k", ["code-pre"]);
  const _el49 = element("code", "data-l-um7i3k", null);
  const _t50 = text('');
  bindText(_t50, () => (getActiveCode()));
  _el49.appendChild(_t50);
  _el48.appendChild(_el49);
  _el47.appendChild(_el48);
  _el37.appendChild(_el47);
  _el15.appendChild(_el37);
  _el0.appendChild(_el15);
  _root.push(_el0);
  return _root.length === 1 ? _root[0] : _root;
}
mount(App, document.getElementById('app'));