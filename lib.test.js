import { describe, it, expect } from 'vitest';
import {
  parseJSON,
  calculateStreak,
  isMilestone,
  STREAK_MILESTONES,
  mergeEcoAction,
  mergeEcoHistory,
  mergeLongestStreak,
  mergeActionCount,
  mergeCustomTasks,
} from './lib.js';

// ─── parseJSON ───────────────────────────────────────────────────────────────

describe('parseJSON', () => {
  it('parses valid JSON', () => {
    expect(parseJSON('{"a":1}')).toEqual({ a: 1 });
  });

  it('returns null by default on bad input', () => {
    expect(parseJSON('bad json')).toBeNull();
  });

  it('returns custom fallback on bad input', () => {
    expect(parseJSON('bad', [])).toEqual([]);
  });

  it('returns null for null input', () => {
    expect(parseJSON(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseJSON(undefined)).toBeNull();
  });
});

// ─── calculateStreak ─────────────────────────────────────────────────────────

describe('calculateStreak', () => {
  const today = new Date();
  const todayStr = today.toDateString();

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toDateString();

  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toDateString();

  it('returns 1 when previous is null', () => {
    expect(calculateStreak(null, today)).toBe(1);
  });

  it('returns 1 when previous has no date', () => {
    expect(calculateStreak({}, today)).toBe(1);
  });

  it('increments streak when previous date was yesterday', () => {
    expect(calculateStreak({ date: yesterdayStr, streak: 5 }, today)).toBe(6);
  });

  it('resets to 1 when streak is broken (2+ days ago)', () => {
    expect(calculateStreak({ date: twoDaysAgoStr, streak: 5 }, today)).toBe(1);
  });

  it('resets to 1 when previous date is today (same-day re-pick)', () => {
    // Selecting a different action on the same day resets streak to 1.
    // This is the current behaviour — a known edge case.
    expect(calculateStreak({ date: todayStr, streak: 3 }, today)).toBe(1);
  });

  it('falls back to streak of 2 when previous.streak is missing', () => {
    // previous.streak is undefined → ?? 1 gives 1, +1 = 2
    expect(calculateStreak({ date: yesterdayStr }, today)).toBe(2);
  });

  it('starts streak at 1 for a brand-new user with a date entry but streak 0', () => {
    // streak: 0 is falsy but ?? only catches null/undefined, so 0 + 1 = 1
    expect(calculateStreak({ date: yesterdayStr, streak: 0 }, today)).toBe(1);
  });
});

// ─── mergeEcoAction ──────────────────────────────────────────────────────────

describe('mergeEcoAction', () => {
  const local = { action: 'Walk', date: 'Mon Apr 06 2026', streak: 3 };
  const cloud = { action: 'Bike', date: 'Mon Apr 06 2026', streak: 5 };

  it('returns local when cloud is null', () => {
    expect(mergeEcoAction(local, null)).toBe(local);
  });

  it('returns cloud when cloud streak is higher', () => {
    expect(mergeEcoAction(local, cloud)).toBe(cloud);
  });

  it('returns local when streaks are equal', () => {
    expect(mergeEcoAction(local, { ...cloud, streak: 3 })).toBe(local);
  });

  it('returns local when local streak is higher', () => {
    expect(mergeEcoAction(local, { ...cloud, streak: 1 })).toBe(local);
  });

  it('returns cloud when local is null and cloud exists', () => {
    expect(mergeEcoAction(null, cloud)).toBe(cloud);
  });

  it('returns cloud when local streak is missing (treated as 0)', () => {
    const cloudLowStreak = { ...cloud, streak: 1 };
    expect(mergeEcoAction({ action: 'Walk' }, cloudLowStreak)).toBe(cloudLowStreak);
  });

  it('returns local when cloud streak is 0 and local streak is 0 (equal → local wins)', () => {
    expect(mergeEcoAction({ ...local, streak: 0 }, { ...cloud, streak: 0 })).toEqual({ ...local, streak: 0 });
  });
});

// ─── mergeEcoHistory ─────────────────────────────────────────────────────────

describe('mergeEcoHistory', () => {
  const makeEntry = (date, action = 'Walk') => ({ date, action });

  it('returns combined entries when there is no overlap', () => {
    const local = [makeEntry('Mon Apr 06 2026')];
    const cloud = [makeEntry('Tue Apr 07 2026')];
    const result = mergeEcoHistory(local, cloud);
    expect(result).toHaveLength(2);
  });

  it('deduplicates by date, cloud wins on same date', () => {
    const local = [makeEntry('Mon Apr 06 2026', 'Walk')];
    const cloud = [makeEntry('Mon Apr 06 2026', 'Bike')];
    const result = mergeEcoHistory(local, cloud);
    expect(result).toHaveLength(1);
    expect(result[0].action).toBe('Bike');
  });

  it('sorts results chronologically', () => {
    const local = [makeEntry('Wed Apr 08 2026'), makeEntry('Mon Apr 06 2026')];
    const cloud = [makeEntry('Tue Apr 07 2026')];
    const result = mergeEcoHistory(local, cloud);
    expect(result.map(e => e.date)).toEqual([
      'Mon Apr 06 2026',
      'Tue Apr 07 2026',
      'Wed Apr 08 2026',
    ]);
  });

  it('trims to the most recent 30 entries', () => {
    const local = Array.from({ length: 20 }, (_, i) => {
      const d = new Date('2026-01-01');
      d.setDate(d.getDate() + i);
      return makeEntry(d.toDateString());
    });
    const cloud = Array.from({ length: 20 }, (_, i) => {
      const d = new Date('2026-01-15');
      d.setDate(d.getDate() + i);
      return makeEntry(d.toDateString());
    });
    const result = mergeEcoHistory(local, cloud);
    expect(result).toHaveLength(30);
  });

  it('silently drops entries missing a date', () => {
    const local = [{ action: 'Walk' }]; // no date
    const cloud = [makeEntry('Mon Apr 06 2026')];
    const result = mergeEcoHistory(local, cloud);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe('Mon Apr 06 2026');
  });

  it('returns empty array when both inputs are empty', () => {
    expect(mergeEcoHistory([], [])).toEqual([]);
  });
});

// ─── mergeLongestStreak ──────────────────────────────────────────────────────

describe('mergeLongestStreak', () => {
  it('returns cloud value when it is higher', () => {
    expect(mergeLongestStreak(3, 7)).toBe(7);
  });

  it('returns local value when it is higher', () => {
    expect(mergeLongestStreak(10, 4)).toBe(10);
  });

  it('returns the value when both are equal', () => {
    expect(mergeLongestStreak(5, 5)).toBe(5);
  });

  it('treats missing values as 0', () => {
    expect(mergeLongestStreak(0, 0)).toBe(0);
    expect(mergeLongestStreak(NaN, 3)).toBe(3);
  });
});

// ─── mergeActionCount ────────────────────────────────────────────────────────

describe('mergeActionCount', () => {
  const today = 'Mon Apr 06 2026';
  const yesterday = 'Sun Apr 05 2026';

  it('returns cloud count when cloud is for today and higher', () => {
    expect(mergeActionCount(2, today, 5, today, today)).toEqual({ count: 5, date: today });
  });

  it('returns local count when cloud is lower', () => {
    expect(mergeActionCount(5, today, 2, today, today)).toEqual({ count: 5, date: today });
  });

  it('returns local count when cloud is for a different day (even if higher)', () => {
    expect(mergeActionCount(1, today, 99, yesterday, today)).toEqual({ count: 1, date: today });
  });

  it('returns local count when cloud countDate is undefined', () => {
    expect(mergeActionCount(3, today, 10, undefined, today)).toEqual({ count: 3, date: today });
  });

  it('returns local count when both counts are equal', () => {
    expect(mergeActionCount(4, today, 4, today, today)).toEqual({ count: 4, date: today });
  });
});

// ─── mergeCustomTasks ────────────────────────────────────────────────────────

describe('mergeCustomTasks', () => {
  const t = (task, date) => ({ task, date });

  it('merges tasks from both sources', () => {
    const result = mergeCustomTasks([t('Pick up litter', 'Mon Apr 06 2026')], [t('Plant something', 'Mon Apr 06 2026')]);
    expect(result).toHaveLength(2);
  });

  it('deduplicates by task+date, cloud wins', () => {
    const local = [{ task: 'Walk', date: 'Mon Apr 06 2026', extra: 'local' }];
    const cloud = [{ task: 'Walk', date: 'Mon Apr 06 2026', extra: 'cloud' }];
    const result = mergeCustomTasks(local, cloud);
    expect(result).toHaveLength(1);
    expect(result[0].extra).toBe('cloud');
  });

  it('keeps same task on different dates as separate entries', () => {
    const local = [t('Walk', 'Mon Apr 06 2026')];
    const cloud = [t('Walk', 'Tue Apr 07 2026')];
    expect(mergeCustomTasks(local, cloud)).toHaveLength(2);
  });

  it('silently drops legacy plain-string entries', () => {
    const local = ['old string task']; // legacy format
    const cloud = [t('Plant something', 'Mon Apr 06 2026')];
    const result = mergeCustomTasks(local, cloud);
    expect(result).toHaveLength(1);
    expect(result[0].task).toBe('Plant something');
  });

  it('drops entries missing task or date', () => {
    const mixed = [{ task: 'No date' }, { date: 'Mon Apr 06 2026' }, t('Valid', 'Mon Apr 06 2026')];
    const result = mergeCustomTasks(mixed, []);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when both inputs are empty', () => {
    expect(mergeCustomTasks([], [])).toEqual([]);
  });
});

// ─── isMilestone ─────────────────────────────────────────────────────────────

describe('isMilestone', () => {
  it.each(STREAK_MILESTONES)('returns true for milestone %i', (n) => {
    expect(isMilestone(n)).toBe(true);
  });

  it('returns false for non-milestone values', () => {
    [0, 1, 2, 4, 5, 6, 8, 13, 15, 29, 31, 100].forEach(n => {
      expect(isMilestone(n)).toBe(false);
    });
  });
});
