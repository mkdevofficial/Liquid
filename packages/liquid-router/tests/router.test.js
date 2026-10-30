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
