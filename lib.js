// Pure logic extracted from script.js for testability.
// Exported as ES module for tests; also exposed on window for script.js (non-module).

export function parseJSON(value, fallback = null) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function calculateStreak(previous, today) {
  if (!previous || !previous.date) {
    return 1;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return previous.date === yesterday.toDateString() ? (previous.streak ?? 1) + 1 : 1;
}

export const STREAK_MILESTONES = [3, 7, 14, 30];

export function isMilestone(streak) {
  return STREAK_MILESTONES.includes(streak);
}

// Expose as globals so the non-module script.js can call them directly.
if (typeof window !== 'undefined') {
  window.parseJSON = parseJSON;
  window.calculateStreak = calculateStreak;
  window.isMilestone = isMilestone;
  window.STREAK_MILESTONES = STREAK_MILESTONES;
}
