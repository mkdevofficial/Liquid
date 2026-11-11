import { createStore } from 'liquid';

export const starterStore = createStore({
  appName: 'Liquid Starter',
  count: 0,
  currentRoute: '/',
  increment() {
    starterStore.count++;
  },
  decrement() {
    starterStore.count--;
  },
  navigate(route) {
    starterStore.currentRoute = route;
  }
});
