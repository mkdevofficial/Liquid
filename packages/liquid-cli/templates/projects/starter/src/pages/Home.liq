--- logic
import { starterStore } from '../store.js';
import Card from '../components/Card.liq';

function goAbout() {
  starterStore.navigate('/about');
}

--- style
.counter-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.btn {
  background-color: #0284c7;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
}
.counter-text {
  font-size: 15px;
  color: #0f172a;
}
.link-btn {
  background-color: #f1f5f9;
  color: #0369a1;
  padding: 10px 16px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  margin-top: 16px;
  text-align: center;
}

--- ui
div.home-page
  Card title="Welcome to Liquid"
    span.counter-text Liquid gives you ultra-concise templates with native performance on Web and Android.
    div.counter-row
      button.btn @click=starterStore.decrement -
      span.counter-text Counter: {starterStore.count}
      button.btn @click=starterStore.increment +

  button.link-btn @click=goAbout Go to About Page →
