import { createRouter } from 'liquid';
import Home from './pages/Home.liq';
import Guide from './pages/Guide.liq';
import Playground from './pages/Playground.liq';
import Cheatsheet from './pages/Cheatsheet.liq';
import Deployment from './pages/Deployment.liq';
import Errors from './pages/Errors.liq';
import NotFound from './pages/NotFound.liq';

export const routes = [
  { path: '/', component: Home },
  { path: '/guide', component: Guide },
  { path: '/playground', component: Playground },
  { path: '/cheatsheet', component: Cheatsheet },
  { path: '/errors', component: Errors },
  { path: '/deploy', component: Deployment },
  { path: '*', component: NotFound }
];

export const router = createRouter({ routes, mode: 'hash' });

export const {
  navigate,
  Link,
  RouterView,
  currentPath,
  currentParams,
  currentRoute
} = router;
