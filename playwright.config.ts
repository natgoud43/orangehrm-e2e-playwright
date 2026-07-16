import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/**
 * Playwright configuration.
 *
 * Design notes (the "why" a reviewer cares about):
 *  - baseURL, credentials and all environment-specific values come from
 *    `src/config/env.ts` (backed by `.env`), never hard-coded here. Point the
 *    suite at another environment by editing `.env`, not this file.
 *  - Quick pack vs. full suite is done with tags (`@smoke` / `@full`) filtered
 *    at run time via `--grep`, not separate config files — one source of truth.
 *  - Failure artefacts (trace, screenshot, video) are captured so a reviewer
 *    can open the HTML report and fully diagnose a failure without re-running.
 */
export default defineConfig({
  testDir: './tests',

  // Run test files in parallel — each test creates its own uniquely-named data
  // (see data-factory) so parallel workers never collide on shared state.
  fullyParallel: true,

  // A stray `test.only` left in the source should fail CI, not silently skip
  // the rest of the suite.
  forbidOnly: !!process.env.CI,

  // The public demo is a shared, occasionally-dropping host, so a retry absorbs
  // transient blips (a slow save, a cold-start timeout) and separates them from
  // real regressions: 2 on CI, 1 locally. A dedicated environment could set this
  // back to 0 locally.
  retries: process.env.CI ? 2 : 1,

  // Cap concurrency: the public demo throttles under many simultaneous sessions
  // (heavy tests each create several records), so we trade a little speed for
  // reliability — 1 worker on CI, a modest 3 locally. Against a dedicated
  // environment this can be raised or removed.
  workers: process.env.CI ? 1 : 3,

  // The public demo is a shared, often cold-starting host — its login redirect
  // chain (login → validate → dashboard) can be genuinely slow. Generous
  // timeouts here absorb that latency so the suite tests the app, not the
  // demo's mood. Against a dedicated environment these can drop substantially.
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // HTML report for humans + a concise line reporter for the terminal/CI log.
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    baseURL: env.baseURL,

    // Capture a full trace the first time a test is retried — enough to replay
    // the run step-by-step in the trace viewer without turning it on globally
    // (traces are heavy; we only pay the cost when something actually fails).
    trace: 'on-first-retry',

    // Screenshot + video only on failure: zero noise on green runs, full
    // visual context on red ones.
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Fail fast on a hung action rather than waiting out the global timeout.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // Setup project: authenticates once (over the API) and writes the admin
    // storageState that authenticated specs reuse. Runs before chromium via the
    // `dependencies` link below.
    {
      name: 'setup',
      testDir: './src/fixtures',
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },

    // Firefox and WebKit are defined but commented out by default: the config
    // supports a full cross-browser matrix, but running every browser on every
    // push is a deliberate cost/confidence tradeoff (see README > Out of scope).
    // Enable locally or in a nightly job with `--project=firefox` etc.
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
