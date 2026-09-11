import { parseJSON } from './lib.js';
import { isAuthed, showNudge } from './ui-helpers.js';

export const CustomTaskManager = {
  storageKey: 'customTasks',

  add(task) {
    if (!task.trim()) {
      return;
    }

    const saved = parseJSON(localStorage.getItem(this.storageKey)) || [];
    const entry = { task, date: new Date().toDateString() };
    saved.push(entry);
    localStorage.setItem(this.storageKey, JSON.stringify(saved));
    this.render(entry);
    if (window.sync) { window.sync.syncUp(); }
  },

  render(entry) {
    const list = document.getElementById('userTaskList');
    if (!list) {
      return;
    }

    const li = document.createElement('li');
    li.setAttribute('role', 'listitem');
    li.textContent = typeof entry === 'string' ? entry : entry.task;
    list.appendChild(li);
  },

  renderHistory(entries) {
    const details = document.getElementById('task-history');
    const list = document.getElementById('taskHistoryList');
    if (!details || !list) {
      return;
    }

    const dateOrder = [];
    const groups = {};
    entries.forEach(entry => {
      const date = typeof entry === 'string' ? 'Earlier' : entry.date;
      if (!dateOrder.includes(date)) {
        dateOrder.push(date);
      }
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(typeof entry === 'string' ? entry : entry.task);
    });

    const summary = details.querySelector('summary');
    if (summary) { summary.textContent = `View history (${entries.length} task${entries.length === 1 ? '' : 's'})`; }

    dateOrder.reverse().forEach(date => {
      let label = date;
      try {
        const parsed = new Date(date);
        if (!isNaN(parsed)) {
          label = parsed.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        }
      } catch {}

      const heading = document.createElement('p');
      heading.className = 'history-date';
      heading.textContent = `${label} · ${groups[date].length} task${groups[date].length === 1 ? '' : 's'}`;
      list.appendChild(heading);

      groups[date].forEach(task => {
        const li = document.createElement('li');
        li.textContent = task;
        list.appendChild(li);
      });
    });

    details.hidden = false;
  },

  load() {
    const raw = parseJSON(localStorage.getItem(this.storageKey)) || [];
    const today = new Date().toDateString();

    // Migrate legacy plain-string entries to { task, date } objects so they
    // survive cross-device sync (the merge path drops bare strings).
    const saved = raw.map(e => typeof e === 'string' ? { task: e, date: today } : e);
    if (saved.some((e, i) => e !== raw[i])) {
      localStorage.setItem(this.storageKey, JSON.stringify(saved));
    }

    const todayEntries = saved.filter(e => typeof e === 'string' || e.date === today);
    const pastEntries = saved.filter(e => typeof e !== 'string' && e.date !== today);

    todayEntries.forEach(entry => this.render(entry));

    if (pastEntries.length > 0) {
      this.renderHistory(pastEntries);
    }
  },

  clear() {
    localStorage.removeItem(this.storageKey);

    const list = document.getElementById('userTaskList');
    if (list) {
      list.innerHTML = '';
    }

    const historyList = document.getElementById('taskHistoryList');
    if (historyList) {
      historyList.innerHTML = '';
    }

    const details = document.getElementById('task-history');
    if (details) {
      details.hidden = true;
    }
  }
};

export function setupCustomTaskUI() {
  const input = document.getElementById('customTask');
  if (!input) {
    return;
  }

  const savedValue = localStorage.getItem('customTaskDraft');
  if (savedValue) {
    input.value = savedValue;
  }

  input.addEventListener('input', () => {
    localStorage.setItem('customTaskDraft', input.value);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (!isAuthed()) { showNudge(); return; }
      const value = input.value.trim();
      if (value) {
        CustomTaskManager.add(value);
        input.value = '';
        localStorage.removeItem('customTaskDraft');
      }
    }
  });

  CustomTaskManager.load();
}
