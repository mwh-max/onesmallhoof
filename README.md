# One Small Hoof

A simple daily eco-action tracker built with HTML, CSS, and vanilla JavaScript. Pick a positive habit each day, build a streak, and log your own custom steps. Kid-friendly and motivating for everyone.

Live at **[onesmallhoof.com](https://onesmallhoof.com)**. Made in Lexington, KY by Sleeping Bear Labs.

## Features

- **Daily eco-action tracker** — choose from a curated list of actions across four categories (home, travel, food, community); one pick per day
- **Streak tracking** — current streak displayed with a 7-day dot history and a personal best counter; first-time users see a hint until their first action is logged
- **Milestone share card** — at 3, 7, 14, and 30-day streaks, a share card appears with a pre-written message and link; uses the Web Share API with a clipboard fallback; keyboard focus is trapped within the overlay while open (Tab/Shift+Tab cycles between buttons, Escape dismisses)
- **Custom task logger** — add your own eco-actions via keyboard (Enter to submit)
- **Task history** — past custom tasks are stored with their date and accessible via a collapsible "View history" section
- **Daily action counter** — tallies actions taken each day; resets at midnight; gated behind eco-action selection
- **Daily reminder** — opt-in browser notification prompts users who haven't logged an action for the day
- **Accounts and sync** — sign in with a magic link (no password); data syncs across devices via Supabase
- **Account deletion** — users can permanently delete their account and all data from within the app
- **Onboarding preview** — signed-out users see a static 5-of-7 streak preview with badge and copy; interacting with any element shows an inline nudge to sign in; a proactive CTA appears above the category nav
- **Sign-in toast** — a brief confirmation toast appears after a fresh sign-in (suppressed on page-load session restores)

## Setup

Clone and open `index.html` in a browser — no build step required:

```bash
git clone https://github.com/mwh-max/onesmallhoof.git
cd onesmallhoof
```

For auth and sync to work locally you'll need the Supabase client configured in `supabase-client.js`.

## Testing

```bash
npm install
npm test
```

Tests use [Vitest](https://vitest.dev/) and run in Node — no browser required. Pure logic lives in `lib.js` and is tested in `lib.test.js`.

## Technical notes

- State is persisted in `localStorage` and synced to Supabase on sign-in
- Auth uses Supabase magic links; emails are sent via Resend from `hello@onesmallhoof.com`
- Account deletion calls a `SECURITY DEFINER` Postgres function that removes rows from both `public.user_data` and `auth.users`
- `data-authed` attribute on `#main-content` drives both CSS preview styling and JS interaction gating
- Accessibility: all sections have `aria-label` or `aria-labelledby`; `#count` announces updates via `aria-live="polite"`; custom task list items carry explicit `role="listitem"` to preserve list semantics when `list-style` is stripped by CSS; the `← Home` link has `aria-label="Home"` for consistent screen reader announcement
- Related elements are grouped into named wrappers: `#streak-display` (streak pill, dots, hint, best), `#action-selector` (category nav, action list, message), `#counter-controls` (count, button, gate hint)
- Custom tasks are stored as `{ task, date }` objects; `CustomTaskManager.load()` migrates any legacy plain-string entries to the object format on first load, ensuring they survive cross-device sync
- Pure logic (`parseJSON`, `calculateStreak`, `isMilestone`, `STREAK_MILESTONES`, and the five sync merge functions) lives in `lib.js`, an ES module loaded before `script.js`; it exports named functions for tests and exposes them on `window` for the non-module `script.js`; `sync.js` imports directly from `lib.js`
- All behaviour is in `lib.js`, `script.js`, `auth.js`, and `sync.js`; no inline event handlers in HTML
- The service worker caches all four scripts (`script.js`, `auth.js`, `sync.js`, `supabase-client.js`) plus static assets for offline-first loading
