--- logic
import { RouterView } from './router.js';

--- style
:global(:root) {
  --bg-page: #f8fafc;
  --bg-card: #ffffff;
  --bg-input: #f1f5f9;
  --bg-hover: #e2e8f0;
  --bg-nav: rgba(255, 255, 255, 0.92);
  --bg-track: #e2e8f0;
  --bg-badge: #e0f2fe;
  --text-primary: #0f172a;
  --text-muted: #64748b;
  --text-badge: #0369a1;
  --border-color: #e2e8f0;
  --primary: #0284c7;
  --primary-hover: #0369a1;
  --primary-light: #e0f2fe;
  --primary-glow: rgba(2, 132, 199, 0.15);
  --success: #10b981;
  --danger: #ef4444;
  --warning: #f59e0b;
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  --shadow-lg: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-shell: 0 0 50px rgba(0, 0, 0, 0.05);
}

:global([data-theme="dark"]) {
  --bg-page: #0b0f19;
  --bg-card: #151d2f;
  --bg-input: #1e293b;
  --bg-hover: #2d3b55;
  --bg-nav: rgba(21, 29, 47, 0.92);
  --bg-track: #1e293b;
  --bg-badge: #1e3a5f;
  --text-primary: #f8fafc;
  --text-muted: #94a3b8;
  --text-badge: #38bdf8;
  --border-color: #243048;
  --primary: #38bdf8;
  --primary-hover: #0284c7;
  --primary-light: #0c2a47;
  --primary-glow: rgba(56, 189, 248, 0.2);
  --success: #34d399;
  --danger: #f87171;
  --warning: #fbbf24;
  --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 25px -3px rgba(0, 0, 0, 0.5);
  --shadow-shell: 0 0 50px rgba(0, 0, 0, 0.4);
}

:global(body) {
  margin: 0;
  padding: 0;
  background: var(--bg-page);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  min-height: 100vh;
}

:global([dir="rtl"]) {
  font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
}

--- ui
div.masrouf-root
  RouterView
