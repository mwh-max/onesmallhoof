function calculateStreak(previous, today) {
  if (!previous || !previous.date) {
    return 1;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate()-1);

  const savedDate = new Date(previous.date);
  return savedDate.toDateString() === yesterday.toDateString() ? (previous.streak || 1) + 1 : 1;
}


function setupDateDisplay() {
  console.log('setupDateDisplay is running');
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
  const saved = JSON.parse(localStorage.getItem('ecoAction'));

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

    const saved = JSON.parse(localStorage.getItem(this.storageKey)) || [];
    saved.push(task);
    localStorage.setItem(this.storageKey, JSON.stringify(saved));
    this.render(task);
  },

  render(entry) {
    const list = document.getElementById('userTaskList');
    if (!list) {
      return;
    }

    const li = document.createElement('li');
    li.textContent = entry;
    list.appendChild(li);
  },

  load() {
    const saved = JSON.parse(localStorage.getItem(this.storageKey)) || [];
    saved.forEach(entry => this.render(entry));
  },

  clear() {
    localStorage.removeItem(this.storageKey);

    const list = document.getElementById('userTaskList');
    if (list) {
      list.innerHTML = '';
    }
  }
};

function setupCustomTaskUI() {
  const input = document.getElementById('customTask');
  if (!input) {
    return;
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const value = input.value.trim();
      if (value) {
        CustomTaskManager.add(value);
        input.value = '';
      }
    }
  });

  CustomTaskManager.load();
}

function initUI() {
  setupDateDisplay();
  setupEcoActionTracker();
  setupCountTracker();
  setupCustomTaskUI();
}

document.addEventListener('DOMContentLoaded', initUI);