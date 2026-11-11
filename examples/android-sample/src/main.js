import { mount } from 'liquid';
import App from './App.liq';

const target = document.getElementById('app');
mount(App, target);
