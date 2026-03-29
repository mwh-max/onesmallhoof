function parseJSON(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function calculateStreak(previous, today) {
  if (!previous || !previous.date) {
    return 1;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate()-1);

  return previous.date === yesterday.toDateString() ? (previous.streak ?? 1) + 1 : 1;
}


function setupDateDisplay() {
  const dateElement = document.getElementById('date');
  if (!dateElement) { return; 
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  dateElement.textContent = `Today is ${today}`;
}

function setupEcoActionTracker() {
  const ecoActions = [
    'Bring your own bag',
    'Turn off unused lights',
    'Use a reusable water bottle',
    'Compost food scraps',
    'Walk instead of drive'
  ];

  const actionList = document.getElementById('action-list');
  const message = document.getElementById('message');
  if (!actionList || !message) {
    return;
  }

  const todayKey = new Date().toDateString();
  const saved = parseJSON(localStorage.getItem('ecoAction'));

  if (saved && saved.date === todayKey) {
    message.textContent = `You've already chosen: "${saved.action}" today. Thanks!`;
    return;
  }

  ecoActions.forEach(action => {
    const li = document.createElement('li');
    li.textContent = action;
    li.style.cursor = 'pointer';

    li.addEventListener('click', () => {
      const streak = calculateStreak(saved, new Date());

      localStorage.setItem('ecoAction', JSON.stringify({
        action,
        date: todayKey,
        streak
      }));

      message.textContent = `Thanks for choosing: "${action}" today! You're on a ${streak}-day streak!`;
      actionList.innerHTML = '';

      const addButton = document.getElementById('add-count');
      if (addButton) {
        addButton.disabled = false;
      }
    });

    actionList.appendChild(li);
  });
}

function setupCountTracker() {
  const countElement = document.getElementById('count');
  const addButton = document.getElementById('add-count');
  if (!countElement || !addButton) {
    return;
  }

  let count = parseInt(localStorage.getItem('actionCount'), 10) || 0;
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem('countDate');

  if (storedDate !== today) {
    count = 0;
    localStorage.setItem('actionCount', count);
    localStorage.setItem('countDate', today);
  }

  countElement.textContent = `Total actions: ${count}`;

  const ecoAction = parseJSON(localStorage.getItem('ecoAction'));
  addButton.disabled = !(ecoAction && ecoAction.date === today);

  addButton.addEventListener('click', () => {
    count++;
    localStorage.setItem('actionCount', count);
    countElement.textContent = `Total actions: ${count}`;
  });
}

const CustomTaskManager = {
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
  },

  render(entry) {
    const list = document.getElementById('userTaskList');
    if (!list) {
      return;
    }

    const li = document.createElement('li');
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

    dateOrder.reverse().forEach(date => {
      const heading = document.createElement('p');
      heading.className = 'history-date';
      heading.textContent = date;
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
    const saved = parseJSON(localStorage.getItem(this.storageKey)) || [];
    const today = new Date().toDateString();

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

function setupCustomTaskUI() {
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

function setupHomeLink() {
  const link = document.getElementById('home-link');
  if (!link) {
    return;
  }
  link.addEventListener('click', () => {
    localStorage.removeItem('ecoAction');
  });
}

function initUI() {
  setupDateDisplay();
  setupEcoActionTracker();
  setupCountTracker();
  setupCustomTaskUI();
  setupHomeLink();
}

document.addEventListener('DOMContentLoaded', initUI);