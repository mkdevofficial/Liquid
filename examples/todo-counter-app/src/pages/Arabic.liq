--- logic
import { signal, computed } from 'liquid';
import Card from '../components/Card.liq';

const count = signal(5);
const arabicTasks = signal([
  { id: 1, text: 'بناء واجهات المستخدم بأقل قدر من التعقيد', completed: true },
  { id: 2, text: 'دعم كامل للكتابة من اليمين إلى اليسار (RTL)', completed: true },
  { id: 3, text: 'إطلاق تطبيق فائق السرعة بحجم أقل من 5 كيلوبايت', completed: false }
]);
const newTask = signal('');

function addTask() {
  const t = newTask().trim();
  if (!t) return;
  arabicTasks.set([...arabicTasks(), { id: Date.now(), text: t, completed: false }]);
  newTask.set('');
}

function toggleTask(id) {
  arabicTasks.set(arabicTasks().map(task =>
    task.id === id ? { ...task, completed: !task.completed } : task
  ));
}

--- style
.rtl-container {
  direction: rtl;
  text-align: right;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.counter-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0;
}
.btn-ar {
  background: #0284c7;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: bold;
}
.task-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f1f5f9;
}
.task-text {
  cursor: pointer;
}
.task-done {
  text-decoration: line-through;
  color: #94a3b8;
}

--- ui
div.rtl-container dir="rtl" lang="ar"
  Card title="دعم كامل للغة العربية والاتجاه من اليمين لليسار (RTL)"
    p يدعم إطار العمل ليكويد النصوص العربية والمحاذاة المباشرة بدون أي إعدادات إضافية.

    h3 عدّاد تفاعلي بالأرقام
    div.counter-bar
      button.btn-ar @click=count.set(count() - 1) -
      span القيمة الحالية: {count()}
      button.btn-ar @click=count.set(count() + 1) +

    h3 قائمة المهام باللغة العربية
    div
      input placeholder="أضف مهمة جديدة..." $value={newTask} @keydown.enter=addTask
      button.btn-ar @click=addTask إضافة

    ul
      each arabicTasks() as item (item.id)
        li.task-item
          span.task-text class="{item.completed ? 'task-done' : ''}" @click=toggleTask(item.id) {item.text}
          if item.completed
            span.badge منجز
