# One Small Hoof

A simple daily eco-action tracker built with HTML, CSS, and vanilla JavaScript. Pick a positive habit each day, build a streak, and log your own custom steps. Kid-friendly and motivating for everyone.

Made in Lexington, KY by Sleeping Bear Labs.

## Features

- **Daily eco-action tracker** — choose from a curated list of actions each day; one pick per day
- **Streak badge** — displays your current streak persistently; shows a motivational nudge if you haven't picked today's action yet
- **Custom task logger** — add your own eco-actions via keyboard (Enter to submit)
- **Task history** — past custom tasks are stored with their date and accessible via a collapsible "View history" section
- **Daily action counter** — tallies actions taken each day; resets at midnight; gated behind eco-action selection
- **Fully responsive** — mobile-friendly layout with breakpoint adjustments at 600px
- **Accessible markup** — semantic headings, ARIA labels, visually-hidden utility class, and `aria-live` regions

## Setup

Clone and open `index.html` in a browser — no build step required:

```bash
git clone https://github.com/mwh-max/onesmallhoof.git
cd onesmallhoof
```

## Technical notes

- All state is persisted in `localStorage` (no backend)
- Custom tasks are stored as `{ task, date }` objects; legacy plain-string entries are handled gracefully
- `JSON.parse` calls are wrapped in a `parseJSON` helper to guard against corrupt storage data
- All behaviour is in `script.js`; no inline event handlers in HTML
