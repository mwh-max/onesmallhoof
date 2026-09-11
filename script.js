// script.js is the app's entry point. It wires together the feature modules
// and owns page-lifecycle concerns: initial setup, post-sync refresh, and reset.
// Cross-script dependencies (see also each module's own file):
//   window.setupAuth — called by initUI(); defined in auth.js
//   window.sync       — { syncUp, syncDown }; defined in sync.js
//   window.resetApp   — called by auth.js on sign-out; defined below

import { parseJSON } from './lib.js';
import { isAuthed, setCounterHint } from './ui-helpers.js';
import { setupDateDisplay } from './date-display.js';
import { updateStreakDisplay, renderStreakDots, setupStreakHistory } from './streak-display.js';
import { ECO_CATEGORIES, renderActionList, setupEcoActionTracker } from './eco-actions.js';
import { setupCountTracker } from './count-tracker.js';
import { CustomTaskManager, setupCustomTaskUI } from './custom-tasks.js';
import { setupNotificationReminder } from './notifications.js';

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
  const keys = ['ecoAction', 'ecoHistory', 'customTasks', 'longestStreak', 'actionCount', 'countDate', 'customTaskDraft', 'selectedCategory', 'notificationShownDate', 'syncPending'];
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
