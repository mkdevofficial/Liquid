--- logic
import { signal, computed } from 'liquid';

const count = signal(0);
const double = computed(() => count.value * 2);
const isPositive = computed(() => count.value > 0);
const isNegative = computed(() => count.value < 0);

function inc() {
  count.value++;
}

function dec() {
  count.value--;
}

function reset() {
  count.value = 0;
}

--- style
.counter-box {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  padding: 1.5rem;
  text-align: center;
  box-shadow: var(--shadow-sm);
  max-width: 420px;
  margin: 0 auto;
}

.counter-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.25rem;
}

.counter-num {
  font-size: 3.5rem;
  font-weight: 900;
  line-height: 1;
  font-family: 'JetBrains Mono', monospace;
  color: var(--primary);
  transition: all 0.15s ease;
}

.counter-num.pos {
  color: var(--success);
}

.counter-num.neg {
  color: var(--danger);
}

.counter-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 0.4rem;
  font-weight: 600;
}

.btn-group {
  display: flex;
  gap: 0.6rem;
  justify-content: center;
}

.ctrl-btn {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 700;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  min-width: 50px;
}

.ctrl-btn:hover {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  transform: translateY(-2px);
}

.ctrl-btn.reset-btn {
  font-size: 0.85rem;
  padding: 0.6rem 1rem;
}

.badge-demo {
  display: inline-block;
  background: var(--primary-glow);
  color: var(--primary);
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

--- ui
div.counter-box
  span.badge-demo ⚡ مثال حي: الإشارات والتفاعل التلقائي
  div.counter-display
    span.counter-num class={isPositive() ? 'pos' : (isNegative() ? 'neg' : '')} {count.value}
    span.counter-sub {count.value} × 2 = {double()}
  div.btn-group
    button.ctrl-btn type="button" @click=dec title="انقاص" -
    button.ctrl-btn.reset-btn type="button" @click=reset إعادة تعيين
    button.ctrl-btn type="button" @click=inc title="زيادة" +
