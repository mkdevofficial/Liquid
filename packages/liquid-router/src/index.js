import { signal, computed, effect, element, text, onDestroy } from 'liquid-runtime';

/**
 * Match a route path pattern against a URL path.
 * Supports /user/:id, /posts/:slug/edit, and * catchall.
 */
export function matchRoute(pattern, pathname) {
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

/**
 * Parse query string into an object: "?foo=bar&baz=1" -> { foo: 'bar', baz: '1' }
 */
export function parseQuery(searchStr) {
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

/**
 * Create a reactive router supporting hash and history modes with route params and navigation helpers.
 *
 * @param {object} config
 * @param {Array<{ path: string, component: Function, children?: Array }>} config.routes
 * @param {'hash' | 'history'} [config.mode='hash']
 * @returns {object} Router instance
 */
export function createRouter({ routes = [], mode = 'hash' }) {
  const currentUrl = signal(getCurrentLocation(mode));

  function updateLocation() {
    currentUrl.set(getCurrentLocation(mode));
  }

  // Setup event listeners if in a browser environment
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

    // Find matching route
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

    // Default fallback or 404
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

  /**
   * RouterView component: dynamically renders the component for the active route.
   */
  function RouterView(props = {}) {
    const anchor = document.createComment('router-view');
    let currentRenderedNodes = [];

    // Initial synchronous render of active component
    const initialComp = currentComponent();
    if (initialComp) {
      const rendered = initialComp({ ...props, params: currentParams() });
      currentRenderedNodes = Array.isArray(rendered) ? rendered : [rendered];
    }

    let isInitial = true;
    effect(() => {
      const Comp = currentComponent();
      if (isInitial) {
        isInitial = false;
        return; // Already rendered synchronously on creation
      }

      for (const n of currentRenderedNodes) {
        if (n.parentNode) n.parentNode.removeChild(n);
      }
      currentRenderedNodes = [];

      if (Comp) {
        const rendered = Comp({ ...props, params: currentParams() });
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

  /**
   * Link helper component / element generator.
   */
  function Link({ to, text: linkText = '', classes = [], children = null }) {
    const a = element('a', null, classes);
    const href = mode === 'hash' ? (to.startsWith('#') ? to : `#${to}`) : to;
    a.setAttribute('href', href);

    if (linkText) {
      a.appendChild(text(linkText));
    }

    a.addEventListener('click', (e) => {
      // Don't intercept if external, modifier keys pressed, or right click
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
