import { createRouter } from 'liquid';
import Dashboard from './pages/Dashboard.liq';
import TransactionForm from './pages/TransactionForm.liq';
import History from './pages/History.liq';
import Settings from './pages/Settings.liq';
import NotFound from './pages/NotFound.liq';

export const routes = [
  { path: '/', component: Dashboard },
  { path: '/transaction/new', component: TransactionForm },
  { path: '/transaction/:id', component: TransactionForm },
  { path: '/history', component: History },
  { path: '/settings', component: Settings },
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
