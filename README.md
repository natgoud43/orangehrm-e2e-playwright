# OrangeHRM E2E Automation

End-to-end UI test automation for the [OrangeHRM](https://www.orangehrm.com/) demo,
built with **Playwright + TypeScript**. The suite covers the application's core
state-changing flows — authentication, employee management (PIM), user/role
administration, and leave — with an emphasis on architecture, reliability, and
reusability rather than raw test count.

---

## Quick start

You need **Node.js only** (v18+). No database, no Docker, nothing else.

```bash
npm ci                        # install dependencies
npx playwright install chromium   # download the browser (one-time)

npm test                      # run the whole suite against the public demo
npm run report                # open the HTML report from the last run
```

That's it — the suite targets the public demo out of the box, so no configuration
is required for a first run.

### Selecting a subset

Tests are tagged inline and filtered with `--grep`, from the same codebase:

```bash
npm run test:smoke     # quick pack  — the fast "is the app up?" checks (@smoke)
npm run test:full      # full pack   — deeper end-to-end scenarios (@full)
npm test               # everything
```

### Useful variants

```bash
npm run test:headed    # watch it drive a real browser
npm run test:ui        # Playwright's interactive UI mode
npm run typecheck      # tsc --noEmit
```

---

## Configuration (no code changes needed)

Everything environment-specific is read from `.env` through a single typed module
([`src/config/env.ts`](src/config/env.ts)) — **no spec or page object ever touches
`process.env` directly**, and nobody needs to edit a `.ts` file to point the suite
at a different environment, user, or data set.

`.env` is optional: every value has a safe public-demo default. To override, copy
the template and edit it:

```bash
cp .env.example .env     # macOS/Linux
copy .env.example .env   # Windows
```

| Variable         | Default                                       | Purpose                                   |
| ---------------- | --------------------------------------------- | ----------------------------------------- |
| `BASE_URL`       | `https://opensource-demo.orangehrmlive.com`   | Instance under test                       |
| `ADMIN_USERNAME` | `Admin`                                        | Admin login                               |
| `ADMIN_PASSWORD` | `admin123`                                     | Admin password                            |
| `LEAVE_TYPE`     | `CAN - Vacation`                               | Leave type exercised by the leave flow    |

`.env` is git-ignored — **real credentials are never committed**.

---

## Why OrangeHRM?

The brief asked for a *real* application with authentication and state-changing
flows. OrangeHRM was chosen deliberately over the usual demo sites (saucedemo,
parabank) because it is structurally an **admin console for managing entities and
access** — which is far closer to a cloud/VPS management console than an
e-commerce cart is. The mapping is direct:

| OrangeHRM                                   | Cloud-console analogue                         |
| ------------------------------------------- | ---------------------------------------------- |
| Admin → User Management (user + role)       | IAM: create a user, assign a policy            |
| PIM → add/edit/delete employee              | Provision / update / de-provision a resource   |
| Leave → entitlement → assign → status       | Drive a resource through a workflow state      |
| Role-based dashboard (Admin vs ESS)         | Role-based access to a console                 |

It's also a public, open-source instance the QA community explicitly uses for
automation practice: no CAPTCHA, no bot protection, no payment wall.

---

## What's covered

Depth over breadth — four core flows, each proving a **real state change** by
reading data back, not just that a form submitted.

| Area      | Test                                        | What it proves                                                                 |
| --------- | ------------------------------------------- | ------------------------------------------------------------------------------ |
| **Auth**  | [`login.spec.ts`](tests/auth/login.spec.ts) | Valid login (@smoke), invalid creds, empty-field validation, logout, and a protected route redirecting when unauthenticated. |
| **PIM**   | [`employee-crud.spec.ts`](tests/pim/employee-crud.spec.ts) | Full CRUD cycle: create → **find via search** → edit → delete → **confirm it's gone**. Search finding the record is the proof the create persisted. |
| **Admin** | [`user-roles.spec.ts`](tests/admin/user-roles.spec.ts) | Create an employee, create an **ESS** login for them, then **log in as that user** and assert the admin-only modules are hidden while a self-service item is present — least privilege, proven by logging in. |
| **Leave** | [`leave-request.spec.ts`](tests/leave/leave-request.spec.ts) | Create an employee, grant a leave **entitlement**, **assign** a day of leave, and read it back from the **Leave List**. |

---

## Project structure

```
src/
├── config/env.ts                 # typed, validated .env reader — single source of config
├── pages/                        # Page Objects (one responsibility each)
│   ├── base.page.ts              # shared oxd-* helpers: labelled fields, dropdowns,
│   │                             #   autocompletes, date fields, toast assertions
│   ├── login.page.ts             # + a retrying support-login helper
│   ├── dashboard.page.ts
│   ├── pim/{employee-form,employee-list}.page.ts
│   ├── admin/user-management.page.ts
│   └── leave/{leave-entitlement,assign-leave,leave-list}.page.ts
├── fixtures/
│   ├── auth.setup.ts             # logs in ONCE, saves the session (setup project)
│   ├── auth.fixture.ts           # `test` that starts already authenticated
│   └── storage-state.ts          # shared path to the saved session
└── utils/
    ├── data-factory.ts           # unique per-run employees/users/dates (faker + suffix)
    └── test-tags.ts              # @smoke / @full constants

tests/
├── auth/login.spec.ts            # @smoke + @full
├── pim/employee-crud.spec.ts     # @full
├── admin/user-roles.spec.ts      # @full
└── leave/leave-request.spec.ts   # @full
```

---

## Key design decisions

1. **Config through one typed module, never in tests.** `src/config/env.ts` owns
   every environment value with defaults and validation. Pointing the suite at a
   different environment or user is an `.env` edit, never a code edit.

2. **Quick vs. full pack via tags, not duplicated configs.** Tests are tagged
   `@smoke`/`@full` inline and selected with `--grep` — one codebase, no config
   duplication.

3. **Authenticate once, reuse the session.** A Playwright *setup project*
   ([`auth.setup.ts`](src/fixtures/auth.setup.ts)) logs in a single time and saves
   the session via `storageState`; authenticated specs load it through
   [`auth.fixture.ts`](src/fixtures/auth.fixture.ts) and start already signed in.
   No UI login per test. Tests that must control auth (the login suite) import the
   plain Playwright `test` so they start signed out.

   *(An API-first login was prototyped and rejected: OrangeHRM's CSRF token is
   injected by its Vue front-end, and the public demo intermittently serves the
   un-hydrated SPA shell to direct HTTP calls, so a browser-driven one-time login
   is the reliable choice here. It still logs in exactly once.)*

4. **Test-data isolation.** Every test generates unique names/dates via
   [`data-factory.ts`](src/utils/data-factory.ts) (faker + timestamp/random suffix),
   so parallel workers and re-runs never collide on shared state. No fixture is
   reused across tests to play two contradictory roles.

5. **State-change assertions, not form-submitted assertions.** Each mutation is
   verified by reading it back — search finds the created employee, the ESS user
   actually logs in, the assigned leave appears in the Leave List.

6. **Page Objects on stable hooks.** OrangeHRM is built on a custom `oxd-*`
   component library (few ids), so selectors lean on roles, visible text, and
   `oxd-*` class hooks. Shared interaction patterns (labelled inputs, custom
   dropdowns, autocompletes, the `yyyy-dd-mm` date fields) live once in
   [`base.page.ts`](src/pages/base.page.ts).

### Reliability against a shared public demo

The public demo is a shared, frequently cold host, so reliability was engineered
in deliberately (a realistic environment is part of the exercise):

- On-failure **trace, screenshot, and video** so any failure is fully debuggable
  from the HTML report without re-running.
- Generous, targeted waits and **retries** (2 on CI, 1 locally) to absorb the
  host's transient blips; the auth setup additionally retries the login and has
  its own budget, since it gates the whole run.
- Waits on the **app's own signals** (result-count text, success redirects) rather
  than `networkidle` — this SPA holds long-lived connections open, so `networkidle`
  never settles.
- **Local worker cap (3)** — the demo throttles many simultaneous sessions.

> If a run hits a transient timeout, re-run it — the demo is occasionally slow to
> cold-start. For a fully deterministic run, use the optional local instance below.

---

## Running against a local instance (optional)

Purely a stability fallback for review — **not** part of the default path (which
needs only Node.js). It requires Docker:

```bash
docker compose up -d          # OrangeHRM on http://localhost:8080 (first boot: a few min)
# set BASE_URL=http://localhost:8080 in .env, then:
npm test
docker compose down           # stop (add -v to also wipe the database)
```

---

## Reporting

- **HTML report** (`npm run report`) with the full run, and on failure the trace,
  screenshot, and video attached to each test.
- A concise **`list`** reporter for the terminal / CI log.
- CI ([`.github/workflows/playwright.yml`](.github/workflows/playwright.yml)) uploads
  the HTML report as a build artifact.

---

## Deliberately out of scope

- **Visual regression** and **performance/load** testing — different tools, different goals.
- **Full HRM coverage** (Recruitment, Performance, Time) — focus is depth on Auth/PIM/Admin/Leave.
- **Full cross-browser matrix on every run** — the config supports Firefox/WebKit
  (commented in [`playwright.config.ts`](playwright.config.ts)); running all browsers
  on every push is a deliberate cost/confidence tradeoff, better suited to a nightly job.
- **API-level test coverage** — this is a UI E2E suite; API login was evaluated only
  as a setup optimisation (see decision #3).

## What I'd do next

- Add **approve/reject** on the leave request to cover the full workflow, and an
  ESS-user *self-service* leave application (needs the seeded ESS user).
- A small **cleanup fixture** to delete created employees/users after each run.
- Wire the **cross-browser matrix** into a scheduled CI job.
- Introduce an **API layer** for fast data setup/teardown once run against a
  controllable (non-public) environment.
