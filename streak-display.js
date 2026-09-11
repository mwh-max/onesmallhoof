import { parseJSON } from './lib.js';

export function updateStreakDisplay(streak, done) {
  const el = document.getElementById('streak');
  if (!el) {
    return;
  }
  el.textContent = done
    ? `${streak}-day streak!`
    : `${streak}-day streak — keep it going!`;
  el.hidden = false;
}

export function renderStreakDots() {
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

export function setupStreakHistory() {
  renderStreakDots();

  const history = parseJSON(localStorage.getItem('ecoHistory')) || [];
  const dotsHint = document.getElementById('streak-dots-hint');
  if (dotsHint) { dotsHint.hidden = history.length > 0; }

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
