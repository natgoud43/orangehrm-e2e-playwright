# OrangeHRM E2E Automation

End-to-end UI tests for the [OrangeHRM](https://opensource-demo.orangehrmlive.com) demo,
in **Playwright + TypeScript**. Covers the core state-changing flows — auth, employee
management (PIM), user/role admin, and leave — with a focus on architecture and
reliability over test count.

## Quick start

Needs **Node.js 18+** only (no DB, no Docker).

```bash
npm ci
npx playwright install chromium

npm test               # full suite against the public demo
npm run test:smoke     # quick pack (@smoke) — fast auth guardrails
npm run report         # open the HTML report

# also: test:full (@full), test:headed, test:ui, typecheck
```

It targets the public demo out of the box — no configuration needed for a first run.

## Configuration

All environment-specific values are read from `.env` through one typed module
([`src/config/env.ts`](src/config/env.ts)) — no spec or page object touches
`process.env`, so pointing the suite elsewhere is never a code edit. Every value has a
safe default; copy `.env.example` to `.env` to override. `.env` is git-ignored — no
secrets are committed.

| Variable | Default | Purpose |
|---|---|---|
| `BASE_URL` | `https://opensource-demo.orangehrmlive.com` | Instance under test |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | `Admin` / `admin123` | Admin login |
| `LEAVE_TYPE` | `CAN - Vacation` | Leave type used by the leave flow |

## Why OrangeHRM

It's structurally an **admin console for managing entities and access** — much closer to
a cloud/VPS management console than an e-commerce demo (saucedemo, parabank). The mapping
is direct: Admin→User Management ≈ IAM; PIM add/edit/delete ≈ provisioning a resource;
Leave entitlement→assign→status ≈ a resource workflow; Admin vs ESS ≈ role-based access.
It's also a public, open-source instance meant for automation practice — no CAPTCHA or
bot protection.

## What's covered

Four flows, each proving a **real state change** by reading data back, not just that a
form submitted.

| Area | Test | Proves |
|---|---|---|
| **Auth** | [`login.spec.ts`](tests/auth/login.spec.ts) | valid login (@smoke), invalid creds, empty-field validation, logout, protected-route redirect |
| **PIM** | [`employee-crud.spec.ts`](tests/pim/employee-crud.spec.ts) | full CRUD: create → find via search → edit → delete → confirm gone |
| **Admin** | [`user-roles.spec.ts`](tests/admin/user-roles.spec.ts) | create employee → create ESS login → log in as them → admin modules hidden (least privilege) |
| **Leave** | [`leave-request.spec.ts`](tests/leave/leave-request.spec.ts) | create employee → grant entitlement → assign leave → read back in Leave List |

## Structure

```
src/
├── config/env.ts       # typed, validated .env reader — single source of config
├── pages/              # Page Objects; base.page.ts holds shared oxd-* helpers
│   ├── login · dashboard · pim/* · admin/* · leave/*
├── fixtures/           # auth.setup (log in once) · auth.fixture · storage-state
└── utils/              # data-factory (unique per-run data) · test-tags
tests/                  # auth · pim · admin · leave  (tagged @smoke / @full)
```

## Key decisions

- **One typed config module** — `.env` → `env.ts`; no `process.env` in tests.
- **Tags, not duplicated configs** — `@smoke` / `@full` filtered via `--grep`.
- **Log in once, reuse the session** — a setup project saves `storageState`; specs load
  it via `auth.fixture.ts`. *(API login was prototyped and dropped: OrangeHRM's CSRF token
  is SPA-injected and the demo serves the un-hydrated shell to raw HTTP, so a one-time
  browser login is the reliable choice — still once, not per test.)*
- **Per-run unique data** ([`data-factory.ts`](src/utils/data-factory.ts)) so parallel
  workers and re-runs never collide.
- **State-change assertions** — verify by reading back (search, second login, list), not
  by trusting a toast.
- **Page Objects on stable hooks** — roles, visible text, and `oxd-*` classes (the app
  has few ids); shared interactions live once in [`base.page.ts`](src/pages/base.page.ts).

**Reliability vs. a shared public demo** (which is cold and throttles concurrency):
on-failure trace/screenshot/video; waits on the app's own signals (result counts, success
redirects) not `networkidle`; retries (2 CI / 1 local) plus a retrying auth setup; local
worker cap of 3. A run may occasionally show a `flaky → passed on retry` line — that's the
retry absorbing a transient blip, and the run is still green. For a fully deterministic
run, `docker-compose.yml` provides an optional local instance (`BASE_URL=http://localhost:8080`).

## Reporting

HTML report (`npm run report`) with trace/screenshot/video attached on failure, plus a
`list` reporter for the terminal. CI ([workflow](.github/workflows/playwright.yml)) uploads
the report as an artifact.

## Out of scope / next

- **Out:** visual regression, load/perf, full HRM modules, all-browser matrix per run
  (Firefox/WebKit are stubbed in config), API-level coverage.
- **Next:** leave approve/reject + ESS self-service apply; a cleanup fixture; cross-browser
  matrix in a nightly job; an API layer for fast setup/teardown against a controllable env.
