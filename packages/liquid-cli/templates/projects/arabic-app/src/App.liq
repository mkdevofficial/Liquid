--- logic
import { arabicStore } from './store.js';
import Navbar from './components/Navbar.liq';
import WisdomCard from './components/WisdomCard.liq';
import TaskItem from './components/TaskItem.liq';

function handleInput(e) {
  arabicStore.newTitle = e.target ? e.target.value : e;
}

function handleAdd() {
  arabicStore.addTask();
}

--- style
.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: #f8fafc;
  min-height: 100%;
}
.section-header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 18px;
  margin-bottom: 10px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}
.count-badge {
  background-color: #ecfdf5;
  color: #059669;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
}
.input-row {
  display: flex;
  flex-direction: row;
  gap: 8px;
  margin-bottom: 14px;
}
.add-input {
  flex: 1;
  padding: 10px 14px;
  border-radius: 6px;
  border-width: 1px;
  border-color: #cbd5e1;
  font-size: 14px;
  background-color: #ffffff;
  color: #0f172a;
}
.add-btn {
  background-color: #059669;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 14px;
}

--- ui
div.container dir="{arabicStore.getDir()}"
  Navbar

  WisdomCard

  div.section-header
    span.section-title {arabicStore.getT().dailyGoals}
    span.count-badge {arabicStore.getCompletedCount()} / {arabicStore.tasks.length} {arabicStore.getT().completedCount}

  div.input-row
    input.add-input placeholder="{arabicStore.getT().newGoalPlaceholder}" @input=handleInput @keydown.enter=handleAdd
    button.add-btn @click=handleAdd {arabicStore.getT().addBtn}

  each arabicStore.tasks as task (task.id)
    TaskItem task={task}
