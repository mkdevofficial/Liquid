--- logic
import { t } from '../i18n.js';
import { copyToClipboard } from '../store.js';
import LiveCounter from '../components/LiveCounter.liq';
import LiveTodo from '../components/LiveTodo.liq';
import LiveForm from '../components/LiveForm.liq';
import LiveCalculator from '../components/LiveCalculator.liq';
import { signal } from 'liquid';

const activeTab = signal('counter');

const SEC_LOGIC = '---' + ' logic';
const SEC_STYLE = '---' + ' style';
const SEC_UI = '---' + ' ui';

const counterCode = `${SEC_LOGIC}
import { signal, computed } from 'liquid';

const count = signal(0);
const double = computed(() => count.value * 2);

function inc() { count.value++; }
function dec() { count.value--; }
function reset() { count.value = 0; }

${SEC_STYLE}
.counter-box { text-align: center; padding: 1.5rem; }
.counter-num { font-size: 3rem; font-weight: 800; color: #0284c7; }
.btn { padding: 0.5rem 1rem; margin: 0 4px; border-radius: 8px; }

${SEC_UI}
div.counter-box
  h2 العداد: {count.value}
  p الضعف: {double()}
  button.btn @click=dec -
  button.btn @click=reset إعادة تعيين
  button.btn @click=inc +`;

const todoCode = `${SEC_LOGIC}
import { signal } from 'liquid';

let nextId = 1;
const inputVal = signal('');
const todos = signal([]);

function addTodo() {
  if (!inputVal.value.trim()) return;
  todos.value = [...todos.value, { id: nextId++, text: inputVal.value, done: false }];
  inputVal.value = '';
}

function toggle(id) {
  todos.value = todos.value.map(t => t.id === id ? { ...t, done: !t.done } : t);
}

${SEC_STYLE}
.todo-item { display: flex; align-items: center; gap: 8px; }
.done { text-decoration: line-through; color: #888; }

${SEC_UI}
div.todo-app
  input type="text" $bind=inputVal @keydown.enter=addTodo placeholder="أضف مهمة..."
  button @click=addTodo إضافة

  each todos.value as item (item.id)
    div.todo-item
      input type="checkbox" checked={item.done} @click=toggle(item.id)
      span class={item.done ? 'done' : ''} {item.text}`;

const formCode = `${SEC_LOGIC}
import { signal, computed } from 'liquid';

const username = signal('');
const email = signal('');
const isValid = computed(() => username.value.length >= 3 && email.value.includes('@'));

function submit() {
  alert('تم إرسال: ' + username.value);
}

${SEC_STYLE}
.field { margin-bottom: 12px; }
.btn:disabled { opacity: 0.5; }

${SEC_UI}
form @submit.prevent=submit
  div.field
    label الاسم:
    input type="text" $bind=username
  div.field
    label البريد:
    input type="email" $bind=email
  button.btn type="submit" disabled={!isValid()} إرسال`;

const calcCode = `${SEC_LOGIC}
import { signal, computed } from 'liquid';

const income = signal(5000);
const rent = signal(1500);
const food = signal(800);

const total = computed(() => Number(rent.value) + Number(food.value));
const savings = computed(() => Number(income.value) - total());

${SEC_UI}
div.calc
  h3 المتبقي: {'$' + savings()}
  p إجمالي النفقات: {'$' + total()}`;

function setTab(tab) {
  activeTab.value = tab;
}

function getActiveCode() {
  if (activeTab.value === 'counter') return counterCode;
  if (activeTab.value === 'todo') return todoCode;
  if (activeTab.value === 'form') return formCode;
  return calcCode;
}

--- style
.playground-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.25rem 4rem;
}

.pg-head {
  text-align: center;
  margin-bottom: 2.5rem;
}

.pg-title {
  font-size: 2.3rem;
  font-weight: 900;
  margin: 0 0 0.5rem;
  color: var(--text-primary);
}

.pg-desc {
  font-size: 1.05rem;
  color: var(--text-muted);
  margin: 0;
}

.pg-tabs {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.tab-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.tab-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.tab-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.pg-workspace {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: flex-start;
}

.pane {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.pane-header {
  padding: 0.75rem 1.25rem;
  background: var(--bg-input);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pane-label {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.preview-body {
  padding: 2.5rem 1.5rem;
  min-height: 380px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.code-body {
  background: #0f172a;
  padding: 0;
  direction: ltr;
  text-align: left;
}

.code-pre {
  margin: 0;
  padding: 1.5rem;
  overflow-x: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  color: #f8fafc;
  max-height: 480px;
}

.copy-action-btn {
  background: #334155;
  color: #e2e8f0;
  border: none;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s ease;
}

.copy-action-btn:hover {
  background: var(--primary);
  color: white;
}

@media (max-width: 900px) {
  .pg-workspace {
    grid-template-columns: 1fr;
  }
}

--- ui
div.playground-page
  div.pg-head
    h1.pg-title {t('playgroundTitle')}
    p.pg-desc {t('playgroundDesc')}

  div.pg-tabs
    button.tab-btn class={activeTab.value === 'counter' ? 'active' : ''} type="button" @click=setTab('counter') {t('tabCounter')}
    button.tab-btn class={activeTab.value === 'todo' ? 'active' : ''} type="button" @click=setTab('todo') {t('tabTodo')}
    button.tab-btn class={activeTab.value === 'form' ? 'active' : ''} type="button" @click=setTab('form') {t('tabForm')}
    button.tab-btn class={activeTab.value === 'calc' ? 'active' : ''} type="button" @click=setTab('calc') {t('tabCalculator')}

  div.pg-workspace
    div.pane
      div.pane-header
        span.pane-label
          span 📱
          span {t('livePreview')}
      div.preview-body
        if activeTab.value === 'counter'
          LiveCounter
        else if activeTab.value === 'todo'
          LiveTodo
        else if activeTab.value === 'form'
          LiveForm
        else
          LiveCalculator

    div.pane
      div.pane-header
        span.pane-label
          span 💻
          span {t('viewCode')} (Component.liq)
        button.copy-action-btn type="button" @click=copyToClipboard(getActiveCode()) {t('copyCode')}
      div.code-body
        pre.code-pre
          code {getActiveCode()}
