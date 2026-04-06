// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
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
  STORAGE_KEYS,
} from './lib.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Minimal DOM fixture ──────────────────────────────────────────────────────
// Contains every element that the setup functions query. Tests reset this in
// beforeEach so each test starts with a clean slate.

function buildDOM() {
  document.body.innerHTML = `
    <section id="sign-in-section"></section>
    <div id="main-content" data-authed="true">
      <p id="streak" hidden></p>
      <div id="streak-history"></div>
      <p id="streak-dots-hint"></p>
      <p id="longest-streak" hidden></p>
      <p id="sign-in-nudge" hidden></p>
      <div id="proactive-cta"><a href="#sign-in-section">Sign in →</a></div>
      <nav id="category-nav">
        <button data-category="home"      aria-pressed="false">home</button>
        <button data-category="travel"    aria-pressed="false">travel</button>
        <button data-category="food"      aria-pressed="false">food</button>
        <button data-category="community" aria-pressed="false">community</button>
      </nav>
      <ul id="action-list" role="list"></ul>
      <p id="message" role="status"></p>
      <div id="counter-controls">
        <p id="count">Total actions: 0</p>
        <button id="add-count">Add Your Action</button>
        <p id="counter-gate-hint" hidden></p>
      </div>
      <input id="customTask" type="text" />
      <ul id="userTaskList" role="list"></ul>
      <details id="task-history" hidden>
        <summary>View history</summary>
        <ul id="taskHistoryList" role="list"></ul>
      </details>
      <button id="reminder-btn" aria-pressed="false">remind me daily</button>
    </div>
    <p id="date"></p>
    <div id="share-overlay" hidden aria-modal="true" role="dialog">
      <div id="share-card">
        <p class="share-streak"></p>
        <p class="share-message"></p>
        <button id="share-btn">share</button>
        <button id="share-dismiss">dismiss</button>
      </div>
    </div>
  `;
}

// ─── One-time setup ───────────────────────────────────────────────────────────

beforeAll(() => {
  // Expose lib.js exports on window exactly as lib.js does in the browser.
  window.STORAGE_KEYS      = STORAGE_KEYS;
  window.parseJSON         = parseJSON;
  window.calculateStreak   = calculateStreak;
  window.isMilestone       = isMilestone;
  window.STREAK_MILESTONES = STREAK_MILESTONES;

  // Mock auth and sync — not under test here.
  window.setupAuth = vi.fn();
  window.sync      = { syncUp: vi.fn(), syncDown: vi.fn() };

  // Execute script.js in the global scope so its functions land on window.
  const src = readFileSync(join(__dirname, 'script.js'), 'utf8');
  // eslint-disable-next-line no-eval
  eval(src);
});

beforeEach(() => {
  localStorage.clear();
  buildDOM();
  // Re-run UI setup so each test has fresh listeners and state.
  window.initUI();
});

// ─── resetApp ────────────────────────────────────────────────────────────────

describe('resetApp', () => {
  it('clears every key in STORAGE_KEYS from localStorage', () => {
    // Write a value for every key.
    Object.values(STORAGE_KEYS).forEach(k => localStorage.setItem(k, 'test'));

    window.resetApp();

    Object.values(STORAGE_KEYS).forEach(k => {
      expect(localStorage.getItem(k)).toBeNull(`expected ${k} to be cleared`);
    });
  });

  it('resets the streak display to "start your streak today"', () => {
    window.resetApp();
    const streakEl = document.getElementById('streak');
    expect(streakEl.textContent).toBe('start your streak today');
    expect(streakEl.hidden).toBe(false);
  });
});

// ─── Action selection ─────────────────────────────────────────────────────────

describe('action selection', () => {
  it('writes { action, date, streak } to ecoAction in localStorage', () => {
    const li = document.querySelector('#action-list li');
    expect(li).not.toBeNull();
    li.click();

    const saved = parseJSON(localStorage.getItem(STORAGE_KEYS.ecoAction));
    expect(saved).toMatchObject({
      action: expect.any(String),
      date:   new Date().toDateString(),
      streak: expect.any(Number),
    });
  });

  it('appends an entry to ecoHistory', () => {
    document.querySelector('#action-list li').click();
    const history = parseJSON(localStorage.getItem(STORAGE_KEYS.ecoHistory));
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
  });

  it('hides the category nav after selection', () => {
    document.querySelector('#action-list li').click();
    expect(document.getElementById('category-nav').hidden).toBe(true);
  });
});

// ─── Action counter ───────────────────────────────────────────────────────────

describe('action counter', () => {
  it('resets count to 0 when stored date differs from today', () => {
    // Simulate a stale count from yesterday.
    localStorage.setItem(STORAGE_KEYS.actionCount, '5');
    localStorage.setItem(STORAGE_KEYS.countDate,   'Mon Jan 01 2024');

    // Re-run initUI so setupCountTracker reads the stale values and resets.
    buildDOM();
    window.initUI();

    expect(document.getElementById('count').textContent).toBe('Total actions: 0');
    expect(localStorage.getItem(STORAGE_KEYS.actionCount)).toBe('0');
  });

  it('preserves count when stored date is today', () => {
    localStorage.setItem(STORAGE_KEYS.actionCount, '3');
    localStorage.setItem(STORAGE_KEYS.countDate,   new Date().toDateString());
    // Also need an ecoAction for today so the button isn't gated.
    localStorage.setItem(STORAGE_KEYS.ecoAction, JSON.stringify({
      action: 'Walk', date: new Date().toDateString(), streak: 1
    }));

    buildDOM();
    window.initUI();

    expect(document.getElementById('count').textContent).toBe('Total actions: 3');
  });
});
