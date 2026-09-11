import { parseJSON } from './lib.js';
import { isAuthed, showNudge, setCounterHint } from './ui-helpers.js';

export function setupCountTracker() {
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
