import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // lib.test.js uses the default node environment (no DOM needed).
    // script.test.js opts in to jsdom via the @vitest-environment comment at
    // the top of that file, so we don't force jsdom globally.
  },
});
