// Small DOM helpers shared across the app's auth-gated UI.

export function setCounterHint(disabled) {
  const hint = document.getElementById('counter-gate-hint');
  if (hint) { hint.hidden = !disabled; }
}

export function isAuthed() {
  const mc = document.getElementById('main-content');
  return mc && mc.dataset.authed === 'true';
}

export function showNudge() {
  const nudge = document.getElementById('sign-in-nudge');
  if (!nudge) { return; }
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
