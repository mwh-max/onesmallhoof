import { describe, it, expect } from 'vitest';
import { parseJSON, calculateStreak, isMilestone, STREAK_MILESTONES } from './lib.js';

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
