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

function updateStreakDisplay(streak, done) {
  const el = document.getElementById('streak');
  if (!el) {
    return;
  }
  el.textContent = done
    ? `${streak}-day streak!`
    : `${streak}-day streak — keep it going!`;
  el.hidden = false;
}

const STREAK_MILESTONES = [3, 7, 14, 30];

function isMilestone(streak) {
  return STREAK_MILESTONES.includes(streak);
}

function showShareCard(streak) {
  const overlay = document.getElementById('share-overlay');
  const streakEl = overlay.querySelector('.share-streak');
  const messageEl = overlay.querySelector('.share-message');
  const shareBtn = document.getElementById('share-btn');
  const dismissBtn = document.getElementById('share-dismiss');
  if (!overlay || !streakEl || !messageEl) {
    return;
  }

  const messages = {
    3:  'Three days strong! Every small step counts.',
    7:  'One full week of eco-actions. You\'re making a difference!',
    14: 'Two weeks in. You\'re building a real habit.',
    30: 'A whole month! You\'re an eco-action champion.'
  };

  streakEl.textContent = `${streak}-day streak!`;
  messageEl.textContent = messages[streak] || `${streak} days of eco-actions!`;
  overlay.hidden = false;
  shareBtn.focus();

  const shareText = `I've logged ${streak} days of eco-actions on One Small Hoof! 🌿 Small habits, big impact.`;

  shareBtn.onclick = () => {
    if (navigator.share) {
      navigator.share({ title: 'One Small Hoof', text: shareText })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        shareBtn.textContent = 'Copied!';
        setTimeout(() => { shareBtn.textContent = 'Share'; }, 2000);
      }).catch(() => {});
    }
  };

  dismissBtn.onclick = () => {
    overlay.hidden = true;
  };
}

function renderStreakDots() {
  const container = document.getElementById('streak-history');
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const history = parseJSON(localStorage.getItem('ecoHistory')) || [];
  const historyDates = new Set(history.map(e => e.date));
  const dayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const filled = historyDates.has(dateStr);

    const wrapper = document.createElement('div');
    wrapper.className = 'streak-day';

    const dot = document.createElement('div');
    dot.className = 'streak-dot' + (filled ? ' filled' : '');
    dot.setAttribute('aria-label', `${dateStr}: ${filled ? 'completed' : 'not logged'}`);

    const label = document.createElement('span');
    label.textContent = dayLabels[d.getDay()];

    wrapper.appendChild(dot);
    wrapper.appendChild(label);
    container.appendChild(wrapper);
  }
}

function setupStreakHistory() {
  renderStreakDots();

  const longest = parseInt(localStorage.getItem('longestStreak'), 10) || 0;
  const el = document.getElementById('longest-streak');
  if (el && longest > 1) {
    el.textContent = `Best: ${longest}-day streak`;
    el.hidden = false;
  }
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
    updateStreakDisplay(saved.streak, true);
    return;
  }

  if (saved && saved.streak) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (saved.date === yesterday.toDateString()) {
      updateStreakDisplay(saved.streak, false);
    }
  }

  ecoActions.forEach(action => {
    const li = document.createElement('li');
    li.textContent = action;
    li.style.cursor = 'pointer';
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');

    const handleSelect = () => {
      const streak = calculateStreak(saved, new Date());

      localStorage.setItem('ecoAction', JSON.stringify({
        action,
        date: todayKey,
        streak
      }));

      const history = parseJSON(localStorage.getItem('ecoHistory')) || [];
      if (!history.find(e => e.date === todayKey)) {
        history.push({ action, date: todayKey });
        if (history.length > 30) {
          history.splice(0, history.length - 30);
        }
        localStorage.setItem('ecoHistory', JSON.stringify(history));
      }

      const longest = parseInt(localStorage.getItem('longestStreak'), 10) || 0;
      if (streak > longest) {
        localStorage.setItem('longestStreak', streak);
      }

      message.textContent = `Thanks for choosing: "${action}" today!`;
      updateStreakDisplay(streak, true);
      actionList.innerHTML = '';
      renderStreakDots();

      if (isMilestone(streak)) {
        showShareCard(streak);
      }

      const addButton = document.getElementById('add-count');
      if (addButton) {
        addButton.disabled = false;
      }
    };

    li.addEventListener('click', handleSelect);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
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

function updateReminderButton(btn, opted) {
  btn.textContent = opted ? 'Reminders on' : 'Remind me daily';
  btn.setAttribute('aria-pressed', String(opted));
}

function setupNotificationReminder() {
  const btn = document.getElementById('reminder-btn');
  if (!btn) {
    return;
  }

  if (!('Notification' in window)) {
    btn.hidden = true;
    return;
  }

  const opted = localStorage.getItem('reminderOptIn') === 'true';
  updateReminderButton(btn, opted);

  if (Notification.permission === 'denied') {
    btn.disabled = true;
    btn.title = 'Notifications blocked — check your browser settings';
  }

  btn.addEventListener('click', async () => {
    if (Notification.permission === 'denied') {
      return;
    }

    const current = localStorage.getItem('reminderOptIn') === 'true';
    if (current) {
      localStorage.setItem('reminderOptIn', 'false');
      updateReminderButton(btn, false);
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem('reminderOptIn', 'true');
      updateReminderButton(btn, true);
    }
  });

  if (opted && Notification.permission === 'granted') {
    const today = new Date().toDateString();
    const saved = parseJSON(localStorage.getItem('ecoAction'));
    if (!saved || saved.date !== today) {
      new Notification('One Small Hoof', {
        body: "Don't forget your daily eco-action! 🌿",
        icon: 'images/horseshoe-2.svg'
      });
    }
  }
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
  setupStreakHistory();
  setupCountTracker();
  setupCustomTaskUI();
  setupHomeLink();
  setupNotificationReminder();
}

document.addEventListener('DOMContentLoaded', initUI);