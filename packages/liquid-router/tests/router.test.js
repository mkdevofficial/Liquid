import test from 'node:test';
import assert from 'node:assert';
import { matchRoute, parseQuery, createRouter } from '../src/index.js';
import { Window } from 'happy-dom';

const window = new Window();
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Node = window.Node;
globalThis.Comment = window.Comment;
globalThis.Text = window.Text;

test('Router - matchRoute with static and dynamic param patterns', () => {
  assert.deepStrictEqual(matchRoute('/', '/'), { matches: true, params: {} });
  assert.deepStrictEqual(matchRoute('/about', '/about'), { matches: true, params: {} });
  assert.strictEqual(matchRoute('/about', '/contact').matches, false);

  const userMatch = matchRoute('/user/:id', '/user/42');
  assert.strictEqual(userMatch.matches, true);
  assert.strictEqual(userMatch.params.id, '42');

  const multiParam = matchRoute('/posts/:category/:slug', '/posts/tech/liquid-framework');
  assert.strictEqual(multiParam.matches, true);
  assert.strictEqual(multiParam.params.category, 'tech');
  assert.strictEqual(multiParam.params.slug, 'liquid-framework');

  assert.strictEqual(matchRoute('*', '/anything/goes').matches, true);
});

test('Router - parseQuery', () => {
  assert.deepStrictEqual(parseQuery('?name=liquid&v=1'), { name: 'liquid', v: '1' });
  assert.deepStrictEqual(parseQuery(''), {});
});

test('Router - navigation and reactive route updates in memory', () => {
  const routes = [
    { path: '/', component: () => document.createElement('div') },
    { path: '/todo', component: () => document.createElement('div') }
  ];

  const router = createRouter({ routes, mode: 'hash' });
  assert.strictEqual(router.currentPath(), '/');

  router.navigate('/todo');
  assert.strictEqual(router.currentPath(), '/todo');
});

test('Router - RouterView re-renders when route params change for the same component (Bug 2 in router)', () => {
  window.location.hash = '';
  let lastParams = null;
  const TransactionComp = (props) => {
    lastParams = props.params;
    const div = document.createElement('div');
    div.textContent = `Tx: ${props.params?.id || 'new'}`;
    return div;
  };

  const routes = [
    { path: '/', component: TransactionComp },
    { path: '/transaction/new', component: TransactionComp },
    { path: '/transaction/:id', component: TransactionComp }
  ];

  const router = createRouter({ routes, mode: 'hash' });
  const container = document.createElement('div');
  const viewNodes = router.RouterView();
  for (const n of viewNodes) {
    container.appendChild(n);
  }

  assert.ok(container.innerHTML.includes('Tx: new'), 'Initial render on / should match fallback or new');
  
  router.navigate('/transaction/42');
  assert.strictEqual(lastParams?.id, '42', 'RouterView must re-render and pass updated params.id="42"');
  assert.ok(container.innerHTML.includes('Tx: 42'), 'DOM must reflect updated transaction id');

  router.navigate('/transaction/99');
  assert.strictEqual(lastParams?.id, '99', 'RouterView must re-render and pass updated params.id="99"');
  assert.ok(container.innerHTML.includes('Tx: 99'), 'DOM must reflect updated transaction id 99');
});
