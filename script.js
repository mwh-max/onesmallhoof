// script.js is loaded as a non-module (defer) so its top-level declarations land on
// window. This is intentional: auth.js and sync.js are ES modules that cannot import
// from non-module scripts, so shared functions are accessed via window globals.
//   window.setupAuth  — called by initUI(); defined in auth.js
//   window.sync       — { syncUp, syncDown }; defined in sync.js
//   window.resetApp   — called by auth.js on sign-out; defined below
function parseJSON(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function setCounterHint(disabled) {
  const hint = document.getElementById('counter-gate-hint');
  if (hint) hint.hidden = !disabled;
}

function isAuthed() {
  const mc = document.getElementById('main-content');
  return mc && mc.dataset.authed === 'true';
}

function showNudge() {
  const nudge = document.getElementById('sign-in-nudge');
  if (!nudge) return;
  nudge.innerHTML = '<a href="#sign-in-section" id="nudge-link">↑ sign in at the top</a> to save your streak';
  nudge.hidden = false;
  clearTimeout(nudge._timer);
  nudge._timer = setTimeout(() => { nudge.hidden = true; }, 4000);
  const link = document.getElementById('nudge-link');
  if (link) {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('sign-in-section').scrollIntoView({ behavior: 'smooth' });
    });
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
  const shareBtn = document.getElementById('share-btn');
  const dismissBtn = document.getElementById('share-dismiss');
  if (!overlay || !shareBtn || !dismissBtn) {
    return;
  }
  const streakEl = overlay.querySelector('.share-streak');
  const messageEl = overlay.querySelector('.share-message');
  if (!streakEl || !messageEl) {
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
  const shareUrl = 'https://onesmallhoof.com';

  shareBtn.textContent = 'share';
  dismissBtn.textContent = 'dismiss';

  shareBtn.onclick = () => {
    if (navigator.share) {
      navigator.share({ title: 'One Small Hoof', text: shareText, url: shareUrl })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`).then(() => {
        shareBtn.textContent = 'copied!';
        setTimeout(() => { shareBtn.textContent = 'share'; }, 2000);
      }).catch(() => {});
    }
  };

  const focusableEls = Array.from(overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
  const firstFocusable = focusableEls[0];
  const lastFocusable = focusableEls[focusableEls.length - 1];

  const trapFocus = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault();
        lastFocusable.focus();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault();
        firstFocusable.focus();
      }
    }
  };
  overlay.addEventListener('keydown', trapFocus);

  const onKeydown = (e) => {
    if (e.key === 'Escape') dismiss();
  };

  const dismiss = () => {
    overlay.hidden = true;
    overlay.removeEventListener('keydown', trapFocus);
    document.removeEventListener('keydown', onKeydown);
  };

  dismissBtn.onclick = dismiss;
  document.addEventListener('keydown', onKeydown);
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

  const history = parseJSON(localStorage.getItem('ecoHistory')) || [];
  const dotsHint = document.getElementById('streak-dots-hint');
  if (dotsHint) dotsHint.hidden = history.length > 0;

  const longest = parseInt(localStorage.getItem('longestStreak'), 10) || 0;
  const el = document.getElementById('longest-streak');
  if (el && longest > 1) {
    el.textContent = `Best: ${longest}-day streak`;
    el.hidden = false;
  }

  const saved = parseJSON(localStorage.getItem('ecoAction'));
  const streakEl = document.getElementById('streak');
  if (streakEl && !saved) {
    streakEl.textContent = 'start your streak today';
    streakEl.hidden = false;
  }
}

const ECO_CATEGORIES = {
  home: [
    'Turn off unused lights',
    'Unplug idle electronics',
    'Use a reusable water bottle',
    'Compost food scraps',
    'Start a recycling bin'
  ],
  travel: [
    'Walk instead of drive',
    'Bike to your destination',
    'Take public transit',
    'Carpool with a friend',
    'Combine errands into one trip'
  ],
  food: [
    'Buy local produce',
    'Skip meat for a meal',
    'Bring your own bag',
    'Reduce food waste',
    'Choose a plant-based option'
  ],
  community: [
    'Pick up litter',
    'Share a sustainability tip',
    'Support a local business',
    'Donate unused items',
    'Plant something'
  ]
};

function renderActionList(actions, actionList, message, saved, todayKey) {
  actionList.innerHTML = '';

  actions.forEach(action => {
    const li = document.createElement('li');
    li.textContent = action;
    li.style.cursor = 'pointer';
    li.setAttribute('role', 'button');
    li.setAttribute('tabindex', '0');

    const handleSelect = () => {
      if (!isAuthed()) { showNudge(); return; }
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
        const longestEl = document.getElementById('longest-streak');
        if (longestEl) {
          longestEl.textContent = `Best: ${streak}-day streak`;
          longestEl.hidden = false;
        }
      }

      message.textContent = `Thanks for choosing: "${action}" today!`;
      updateStreakDisplay(streak, true);
      actionList.innerHTML = '';
      renderStreakDots();
      if (window.sync) window.sync.syncUp();

      const categoryNav = document.getElementById('category-nav');
      if (categoryNav) {
        categoryNav.hidden = true;
      }

      if (isMilestone(streak)) {
        showShareCard(streak);
      }

      const addButton = document.getElementById('add-count');
      if (addButton) {
        addButton.disabled = false;
        setCounterHint(false);
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

// Sets up the eco action UI on initial page load.
// For updates after Supabase sync completes, see refreshAfterSync() below.
function setupEcoActionTracker() {
  const actionList = document.getElementById('action-list');
  const message = document.getElementById('message');
  const categoryNav = document.getElementById('category-nav');
  if (!actionList || !message) {
    return;
  }

  const todayKey = new Date().toDateString();
  const saved = parseJSON(localStorage.getItem('ecoAction'));

  if (saved && saved.date === todayKey) {
    message.textContent = `You've already chosen: "${saved.action}" today. Thanks!`;
    updateStreakDisplay(saved.streak, true);
    if (categoryNav) {
      categoryNav.hidden = true;
    }
    return;
  }

  if (saved && saved.streak) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (saved.date === yesterday.toDateString()) {
      updateStreakDisplay(saved.streak, false);
    }
  }

  const rawCategory = localStorage.getItem('selectedCategory');
  const savedCategory = (rawCategory && ECO_CATEGORIES[rawCategory]) ? rawCategory : 'home';

  if (categoryNav) {
    Object.keys(ECO_CATEGORIES).forEach(cat => {
      const btn = categoryNav.querySelector(`[data-category="${cat}"]`);
      if (!btn) {
        return;
      }
      btn.setAttribute('aria-pressed', String(cat === savedCategory));
      btn.addEventListener('click', () => {
        if (!isAuthed()) { showNudge(); return; }
        localStorage.setItem('selectedCategory', cat);
        categoryNav.querySelectorAll('[data-category]').forEach(b => {
          b.setAttribute('aria-pressed', 'false');
        });
        btn.setAttribute('aria-pressed', 'true');
        renderActionList(ECO_CATEGORIES[cat], actionList, message, saved, todayKey);
      });
    });
  }

  renderActionList(ECO_CATEGORIES[savedCategory], actionList, message, saved, todayKey);
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
  addButton.disabled = isAuthed() && !(ecoAction && ecoAction.date === today);
  setCounterHint(addButton.disabled);

  const counterMessage = document.createElement('p');
  counterMessage.id = 'counter-message';
  counterMessage.setAttribute('role', 'status');
  counterMessage.setAttribute('aria-live', 'polite');
  counterMessage.style.cssText = 'font-size: 0.9rem; color: #555; margin-top: 0.5rem;';
  addButton.insertAdjacentElement('afterend', counterMessage);

  addButton.addEventListener('click', () => {
    if (!isAuthed()) { showNudge(); return; }
    const today = new Date().toDateString();
    const ecoAction = parseJSON(localStorage.getItem('ecoAction'));

    if (!ecoAction || ecoAction.date !== today) {
      counterMessage.textContent = "Pick today's eco-action first — then count anything extra you do!";
      setTimeout(() => { counterMessage.textContent = ''; }, 4000);
      return;
    }

    count++;
    localStorage.setItem('actionCount', count);
    countElement.textContent = `Total actions: ${count}`;
    counterMessage.textContent = '';
    if (window.sync) window.sync.syncUp();
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
    if (window.sync) window.sync.syncUp();
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

    const summary = details.querySelector('summary');
    if (summary) summary.textContent = `View history (${entries.length} task${entries.length === 1 ? '' : 's'})`;

    dateOrder.reverse().forEach(date => {
      let label = date;
      try {
        const parsed = new Date(date);
        if (!isNaN(parsed)) {
          label = parsed.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
        }
      } catch (_) {}

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

function updateReminderButton(btn, opted) {
  btn.textContent = opted ? 'reminders on' : 'remind me daily';
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
    const lastShown = localStorage.getItem('notificationShownDate');
    if ((!saved || saved.date !== today) && lastShown !== today) {
      setTimeout(() => {
        new Notification('One Small Hoof', {
          body: "Don't forget your daily eco-action!",
          icon: 'images/horseshoe-2.svg'
        });
        localStorage.setItem('notificationShownDate', today);
      }, 5000);
    }
  }
}

// Runs after syncDown completes (via the 'syncdown-complete' event).
// Re-reads localStorage (now merged with cloud data) and updates any UI elements
// that setupEcoActionTracker() may have rendered before sync finished.
function refreshAfterSync() {
  renderStreakDots();

  const syncedHistory = parseJSON(localStorage.getItem('ecoHistory')) || [];
  const dotsHint = document.getElementById('streak-dots-hint');
  if (dotsHint && syncedHistory.length > 0) dotsHint.hidden = true;

  const ecoAction = parseJSON(localStorage.getItem('ecoAction'));
  const todayKey = new Date().toDateString();
  if (ecoAction) {
    updateStreakDisplay(ecoAction.streak, ecoAction.date === todayKey);
  }

  const longest = parseInt(localStorage.getItem('longestStreak'), 10) || 0;
  const longestEl = document.getElementById('longest-streak');
  if (longestEl && longest > 1) {
    longestEl.textContent = `Best: ${longest}-day streak`;
    longestEl.hidden = false;
  }

  const message = document.getElementById('message');
  const actionList = document.getElementById('action-list');
  const categoryNav = document.getElementById('category-nav');
  const addButton = document.getElementById('add-count');
  if (ecoAction && ecoAction.date === todayKey) {
    if (message && !message.textContent) {
      message.textContent = `You've already chosen: "${ecoAction.action}" today. Thanks!`;
    }
    if (actionList) actionList.innerHTML = '';
    if (categoryNav) categoryNav.hidden = true;
    if (addButton) { addButton.disabled = false; setCounterHint(false); }
  } else {
    if (addButton) { addButton.disabled = true; setCounterHint(true); }
  }

  const userTaskList = document.getElementById('userTaskList');
  if (userTaskList && userTaskList.children.length === 0) {
    CustomTaskManager.load();
  }

  const countElement = document.getElementById('count');
  if (countElement) {
    const today = new Date().toDateString();
    const storedDate = localStorage.getItem('countDate');
    const count = storedDate === today ? (parseInt(localStorage.getItem('actionCount'), 10) || 0) : 0;
    countElement.textContent = `Total actions: ${count}`;
  }
}

function resetApp() {
  const keys = ['ecoAction', 'ecoHistory', 'customTasks', 'longestStreak', 'actionCount', 'countDate', 'customTaskDraft', 'selectedCategory', 'notificationShownDate'];
  keys.forEach(k => localStorage.removeItem(k));

  const streakEl = document.getElementById('streak');
  if (streakEl) { streakEl.textContent = 'start your streak today'; streakEl.hidden = false; }

  renderStreakDots();

  const longestEl = document.getElementById('longest-streak');
  if (longestEl) longestEl.hidden = true;

  const message = document.getElementById('message');
  if (message) message.textContent = '';

  const actionList = document.getElementById('action-list');
  if (actionList && message) {
    renderActionList(ECO_CATEGORIES['home'], actionList, message, null, new Date().toDateString());
  }

  const categoryNav = document.getElementById('category-nav');
  if (categoryNav) {
    categoryNav.hidden = false;
    categoryNav.querySelectorAll('[data-category]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.category === 'home'));
    });
  }

  const countEl = document.getElementById('count');
  if (countEl) countEl.textContent = 'Total actions: 0';

  const addButton = document.getElementById('add-count');
  if (addButton) {
    const ecoAction = parseJSON(localStorage.getItem('ecoAction'));
    const todayStr = new Date().toDateString();
    addButton.disabled = isAuthed() && !(ecoAction && ecoAction.date === todayStr);
    setCounterHint(addButton.disabled);
  }

  const counterMessage = document.getElementById('counter-message');
  if (counterMessage) counterMessage.textContent = '';

  const userTaskList = document.getElementById('userTaskList');
  if (userTaskList) userTaskList.innerHTML = '';

  const taskHistoryList = document.getElementById('taskHistoryList');
  if (taskHistoryList) taskHistoryList.innerHTML = '';

  const taskHistory = document.getElementById('task-history');
  if (taskHistory) taskHistory.hidden = true;

  const customTask = document.getElementById('customTask');
  if (customTask) customTask.value = '';

  const nudge = document.getElementById('sign-in-nudge');
  if (nudge) nudge.hidden = true;
}
window.resetApp = resetApp;

function setupProactiveCta() {
  const cta = document.getElementById('proactive-cta');
  if (!cta) return;
  const link = cta.querySelector('a');
  if (!link) return;
  link.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('sign-in-section').scrollIntoView({ behavior: 'smooth' });
  });
}

function initUI() {
  setupAuth();
  setupDateDisplay();
  setupEcoActionTracker();
  setupStreakHistory();
  setupCountTracker();
  setupCustomTaskUI();
  setupNotificationReminder();
  setupProactiveCta();
  document.addEventListener('syncdown-complete', refreshAfterSync);
}

document.addEventListener('DOMContentLoaded', initUI);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}