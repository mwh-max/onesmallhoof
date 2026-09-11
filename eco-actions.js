import { parseJSON, calculateStreak, isMilestone } from './lib.js';
import { isAuthed, showNudge, setCounterHint } from './ui-helpers.js';
import { updateStreakDisplay, renderStreakDots } from './streak-display.js';
import { showShareCard } from './share-card.js';

export const ECO_CATEGORIES = {
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

export function renderActionList(actions, actionList, message, saved, todayKey) {
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
// For updates after Supabase sync completes, see refreshAfterSync() in script.js.
export function setupEcoActionTracker() {
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
