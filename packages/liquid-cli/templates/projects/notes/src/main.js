import { mount } from 'liquid';
import App from './App.liq';

const container = document.getElementById('app');
if (container) {
  mount(App, container);
}
