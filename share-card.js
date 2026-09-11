export function showShareCard(streak) {
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
