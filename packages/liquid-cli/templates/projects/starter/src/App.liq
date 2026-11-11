--- logic
import { starterStore } from './store.js';
import Header from './components/Header.liq';
import Home from './pages/Home.liq';
import About from './pages/About.liq';

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
  min-height: 100%;
}
.badge {
  background-color: #e0f2fe;
  color: #0369a1;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
}

--- ui
div.container
  Header title="Starter App"
    span.badge v1.0.0

  if starterStore.currentRoute === '/about'
    About
  else
    Home
