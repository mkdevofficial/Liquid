--- logic
import { navigate } from '../router.js';

--- style
.notfound-container {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem;
}

.notfound-icon {
  font-size: 4.5rem;
  margin-bottom: 1rem;
}

.notfound-title {
  font-size: 2.2rem;
  font-weight: 900;
  color: var(--text-primary);
  margin: 0 0 0.5rem;
}

.notfound-desc {
  font-size: 1rem;
  color: var(--text-muted);
  max-width: 450px;
  margin: 0 0 1.5rem;
  line-height: 1.6;
}

.home-btn {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.95rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.home-btn:hover {
  background: var(--primary-hover);
}

--- ui
div.notfound-container
  div.notfound-icon 🫟
  h1.notfound-title 404 — الصفحة غير موجودة
  p.notfound-desc عذراً، المسار الذي تحاول الوصول إليه غير موجود أو تم نقله.
  button.home-btn type="button" @click=navigate('/') العودة إلى الصفحة الرئيسية
