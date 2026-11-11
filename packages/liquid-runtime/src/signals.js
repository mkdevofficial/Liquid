/**
 * Liquid Fine-Grained Signals
 * Glitch-free, batched, lazily cached derived signals with automatic cleanup scopes.
 */

let activeSubscriber = null;
let currentScope = null;
let batchDepth = 0;
const pendingEffects = new Set();

export function getActiveSubscriber() {
  return activeSubscriber;
}

export function getCurrentScope() {
  return currentScope;
}

/**
 * Create an explicit reactive signal.
 *
 * @template T
 * @param {T} initialValue
 * @param {Function} [equals]
 * @returns {((val?: T) => T) & { set: (v: T) => void, update: (fn: (v: T) => T) => void, peek: () => T }}
 */
export function signal(initialValue, equals = Object.is) {
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
    // Clone subscribers to avoid mutations during iteration
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

/**
 * Create a lazily cached derived computed signal.
 *
 * @template T
 * @param {() => T} computeFn
 * @param {Function} [equals]
 * @returns {(() => T) & { peek: () => T }}
 */
export function computed(computeFn, equals = Object.is) {
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
    // Clear old dependencies
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

/**
 * Create an effect that reruns whenever its tracked signals change.
 * Automatically registered with the active scope for disposal.
 *
 * @param {() => void | (() => void)} effectFn
 * @returns {() => void} Dispose function
 */
export function effect(effectFn) {
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

    // Run previous cleanup if any
    if (typeof cleanup === 'function') {
      try {
        cleanup();
      } catch (err) {
        console.error('Error during effect cleanup:', err);
      }
      cleanup = null;
    }

    // Clear old dependencies
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

  // Bind to current reactive scope if one exists
  if (currentScope) {
    currentScope.effects.add(dispose);
  }

  // Initial execution
  run();

  return dispose;
}

/**
 * Group multiple updates so dependent effects run only once without glitches.
 *
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function batch(fn) {
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
  // Make a snapshot and clear to allow effects to enqueue further updates safely
  const queue = Array.from(pendingEffects);
  pendingEffects.clear();
  for (const eff of queue) {
    eff();
  }
}

/**
 * Read signals without subscribing to their updates.
 *
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function untrack(fn) {
  const prevSubscriber = activeSubscriber;
  activeSubscriber = null;
  try {
    return fn();
  } finally {
    activeSubscriber = prevSubscriber;
  }
}

/**
 * Create an effect lifecycle scope.
 * Any effects or onDestroy callbacks registered inside fn are tracked and cleaned up on scope.dispose().
 *
 * @param {(scope: { dispose: () => void }) => any} fn
 * @returns {{ dispose: () => void }}
 */
export function createScope(fn) {
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

/**
 * Register a cleanup callback for the current scope.
 *
 * @param {() => void} fn
 */
export function onDestroy(fn) {
  if (currentScope) {
    currentScope.cleanups.push(fn);
  }
}

export const onCleanup = onDestroy;

/**
 * Register a mount hook.
 *
 * @param {() => void | (() => void)} fn
 */
export function onMount(fn) {
  // If in browser DOM environment, schedule via queueMicrotask or immediately
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
