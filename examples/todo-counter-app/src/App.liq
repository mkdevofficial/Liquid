--- logic
import { createRouter, head } from 'liquid';
import Navbar from './components/Navbar.liq';
import Home from './pages/Home.liq';
import Todos from './pages/Todos.liq';
import Arabic from './pages/Arabic.liq';

head({
  title: 'Liquid 🫟 — Ultra-Concise Framework Showcase',
  meta: {
    description: 'A showcase of state, routing, scoped styles, and RTL in Liquid'
  }
});

const router = createRouter({
  routes: [
    { path: '/', component: Home },
    { path: '/todos', component: Todos },
    { path: '/arabic', component: Arabic },
    { path: '*', component: Home }
  ],
  mode: 'hash'
});

const { RouterView } = router;

--- style
:global(body) {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: #f8fafc;
  color: #1e293b;
}
.app-wrapper {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}
.badge-version {
  background: #38bdf8;
  color: #0f172a;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
}
.footer {
  margin-top: 3rem;
  text-align: center;
  color: #94a3b8;
  font-size: 0.875rem;
}

--- ui
div.app-wrapper
  Navbar title="Liquid 🫟 Showcase"
    span.badge-version v1.0.0

  main
    RouterView

  footer.footer
    p Built with Liquid 🫟 — Less ceremony, fine-grained reactivity, tiny runtime.
