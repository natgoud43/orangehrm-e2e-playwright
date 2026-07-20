# Working in this repo

Guidance for anyone — human or AI agent — extending this Playwright + TypeScript suite.
Follow these conventions and a new flow drops in without reverse-engineering the codebase.

## Commands

```bash
npm ci && npx playwright install chromium   # first-time setup
npm test                # full suite
npm run test:smoke      # quick pack (@smoke)
npm run test:full       # full pack (@full)
npm run test:headed     # watch it run
npm run test:ui         # Playwright UI mode
npm run typecheck       # tsc --noEmit — run before committing
npm run report          # open the full interactive Playwright report
```

Run a single spec: `npx playwright test tests/pim/employee-crud.spec.ts --project=chromium`.
Every run also writes `docs/report.html` — a light one-page summary (result stat bar plus
the error text of any failed/flaky test). It's generated, so it's git-ignored.

## Layout

- `src/config/env.ts` — the **only** place that reads `process.env`. Add new settings here.
- `src/pages/` — Page Objects. `base.page.ts` holds shared `oxd-*` interactions
  (`fillField`, `selectOption`, `selectAutocomplete`, `setDate`, `expectToast`).
- `src/fixtures/` — `auth.setup.ts` logs in once → `storage-state.ts` path →
  `auth.fixture.ts` exposes an already-authenticated `test`.
- `src/utils/` — `data-factory.ts` (unique per-run data), `test-tags.ts` (`@smoke`/`@full`).
- `tests/<area>/*.spec.ts` — one area per folder.

## Conventions (don't break these)

1. **Config only through `env.ts`.** Never read `process.env` or hard-code a URL/credential
   in a spec or page object.
2. **Selectors, in order of preference:** role + visible text → `oxd-*` class hooks →
   placeholders. The app has almost no ids. Reuse the `base.page.ts` helpers instead of
   re-implementing dropdown/date/autocomplete handling.
3. **Assertions prove state changed** — read the record back (search a list, log in as the
   new user), don't stop at a success toast.
4. **Unique data per test** via `data-factory.ts`. Never share mutable data between tests.
5. **Authenticated specs** import `{ test, expect }` from `src/fixtures/auth.fixture.ts`.
   Specs that must control auth (the login suite) import from `@playwright/test`.
6. **Tag every test** `@smoke` (fast guardrail) and/or `@full` (complete suite) using the
   `TAGS` constants.
7. **Never wait on `networkidle`** — this SPA holds long-lived connections, so it never
   settles. Wait on an app signal (a result count, a success redirect, a toast).
8. **Dates are `yyyy-dd-mm`** (year-day-month) — use `data-factory` / `base.setDate`.

## Add a new flow

1. Page object in `src/pages/<area>/<thing>.page.ts` extending `BasePage`; expose intent-
   level methods (`addUser`, `assign`), not raw clicks. Use the base helpers.
2. Spec in `tests/<area>/<thing>.spec.ts`; import `test`/`expect` from the auth fixture,
   generate data with `data-factory`, tag it, and assert by reading state back.
3. `npm run typecheck`, then run the spec headed to confirm selectors against the live demo.

## Gotchas

- The public demo is slow and cold — timeouts are generous and retries are on for a reason
  (see `playwright.config.ts`). A `flaky → passed on retry` line is expected, not a failure.
  **But don't reflexively blame the host:** a failure that *looks* like flakiness can be a
  real bug. "Still on `/addEmployee` after Save" was, more than once, a name overflowing its
  length limit — not a dropped request. Read the error text / trace before concluding "demo".
- **Field length limits** the app enforces: First / Middle / Last name = 30, Username = 40,
  Password = 64. Generated data must fit — `data-factory` caps names.
- **Retry only idempotent steps.** Self-healing a flaky action is safe only when re-running
  it can't change the result: employee create, leave entitlement (the confirm *sets* the
  value, not increments), navigation (`gotoWithRetry`), and list reads all retry internally.
  **Assign-leave submit does not** — re-submitting a persisted assignment errors as
  "overlapping leave", so it's left to the test-level retry.
- **Measure reliability, don't guess it:** run repeatedly with `--retries=0` for true
  first-attempt pass rates; `docs/report.html` surfaces failures/flakes with their error text.
- Confirmation modals vary: some save actions prompt (e.g. entitlement → **Confirm**),
  some don't (assign leave) — check the flow rather than assuming.
