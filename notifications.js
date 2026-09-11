import { parseJSON } from './lib.js';

export function updateReminderButton(btn, opted) {
  btn.textContent = opted ? 'reminders on' : 'remind me daily';
  btn.setAttribute('aria-pressed', String(opted));
}

export function setupNotificationReminder() {
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
