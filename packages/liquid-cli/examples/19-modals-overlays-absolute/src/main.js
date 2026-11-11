import { mount } from 'liquid';
import App from './App.liq';

const el = document.getElementById('app');
if (el) mount(App, el);
