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

  const todayStr = new Date(today).toDateString();
  if (previous.date === todayStr) {
    return previous.streak ?? 1;
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return previous.date === yesterday.toDateString() ? (previous.streak ?? 1) + 1 : 1;
}

export const STREAK_MILESTONES = [3, 7, 14, 30];

export function isMilestone(streak) {
  return STREAK_MILESTONES.includes(streak);
}

// ─── Sync merge helpers ───────────────────────────────────────────────────────
// Each function takes parsed values and returns the merged result. No
// localStorage or network access — pure in, pure out.

// Returns the action object that should be kept. Cloud wins only when its
// streak is strictly higher than local's.
export function mergeEcoAction(localAction, cloudAction) {
  if (!cloudAction) return localAction;
  const localStreak = localAction?.streak ?? 0;
  const cloudStreak = cloudAction?.streak ?? 0;
  return cloudStreak > localStreak ? cloudAction : localAction;
}

// Merges two history arrays, deduplicates by date (cloud wins ties),
// sorts chronologically, and trims to the most recent 30 entries.
export function mergeEcoHistory(localHistory, cloudHistory) {
  const map = new Map();
  [...localHistory, ...cloudHistory].forEach(e => {
    if (e?.date) map.set(e.date, e);
  });
  return Array.from(map.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-30);
}

// Returns the highest streak value as a number.
export function mergeLongestStreak(local, cloud) {
  return Math.max(local || 0, cloud || 0);
}

// Cloud actionCount wins only when it's for today and strictly higher than
// local. Returns { count, date } with the winning values.
export function mergeActionCount(localCount, localDate, cloudCount, cloudDate, today) {
  if (cloudDate === today && cloudCount > localCount) {
    return { count: cloudCount, date: today };
  }
  return { count: localCount, date: localDate };
}

// Merges two custom-task arrays, deduplicating by "task|date" key (cloud wins
// ties). Legacy plain-string entries without a date are silently dropped.
export function mergeCustomTasks(localTasks, cloudTasks) {
  const map = new Map();
  [...localTasks, ...cloudTasks].forEach(t => {
    if (t?.task && t?.date) map.set(`${t.task}|${t.date}`, t);
  });
  return [...map.values()];
}

// Expose as globals so the non-module script.js can call them directly.
if (typeof window !== 'undefined') {
  window.parseJSON = parseJSON;
  window.calculateStreak = calculateStreak;
  window.isMilestone = isMilestone;
  window.STREAK_MILESTONES = STREAK_MILESTONES;
}
