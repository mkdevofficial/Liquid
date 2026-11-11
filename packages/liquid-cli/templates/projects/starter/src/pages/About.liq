--- logic
import { starterStore } from '../store.js';
import Card from '../components/Card.liq';

function goHome() {
  starterStore.navigate('/');
}

--- style
.about-desc {
  font-size: 14px;
  color: #475569;
  line-height: 20px;
  margin-bottom: 8px;
}
.stat-box {
  background-color: #e0f2fe;
  padding: 12px;
  border-radius: 8px;
  margin-top: 12px;
}
.stat-label {
  font-size: 13px;
  color: #0369a1;
  font-weight: 600;
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
div.about-page
  Card title="About This Project"
    span.about-desc This is the official Liquid Starter template. It demonstrates two routes, shared store reactivity, and pure flex layouts that render with zero WebView overhead on Android.
    div.stat-box
      span.stat-label Persisted Counter Value: {starterStore.count}

  button.link-btn @click=goHome ← Back to Home
