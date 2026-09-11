export function setupDateDisplay() {
  const dateElement = document.getElementById('date');
  if (!dateElement) {
    return;
  }

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  dateElement.textContent = `Today is ${today}`;
}
