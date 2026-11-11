--- logic
import { arabicStore } from '../store.js';

function toggle() {
  arabicStore.toggleLanguage();
}

--- style
.navbar {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #064e3b;
  border-radius: 12px;
}
.brand-box {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.brand-title {
  font-size: 18px;
  font-weight: 700;
  color: #f8fafc;
}
.lang-btn {
  background-color: #059669;
  color: #ffffff;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
}

--- ui
header.navbar
  div.brand-box
    span.brand-title {arabicStore.getT().appName}
  button.lang-btn @click=toggle {arabicStore.getT().switchLang}
