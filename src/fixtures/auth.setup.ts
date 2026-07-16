import { test as setup } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { env } from '../config/env';
import { ADMIN_STATE } from './storage-state';

/**
 * Auth setup — runs once, before the authenticated test projects, as a
 * Playwright "setup" project dependency (see playwright.config.ts).
 *
 * It logs in as admin *through the browser* and saves the resulting session to
 * a storageState file, which every authenticated spec then loads (via
 * auth.fixture.ts) so it starts already signed in — no per-test UI login.
 *
 * Why browser login and not a raw HTTP/API login? OrangeHRM's login CSRF token
 * is injected by its Vue front-end after the app boots, and the public demo's
 * CDN intermittently serves the un-hydrated SPA shell to direct HTTP requests —
 * so scraping the token over the API is unreliable against *this* host. A real
 * browser executes the app and logs in dependably. The performance win is
 * unchanged: we authenticate once here, not once per test. (See README >
 * Design decisions for the full rationale.)
 */

// This step gates the whole run against a flaky public host, so give it a
// generous budget and let Playwright retry the whole setup as a backstop on top
// of the in-body login retry below.
setup.describe.configure({ timeout: 120_000, retries: 2 });

setup('authenticate as admin and save storage state', async ({ page }) => {
  fs.mkdirSync(path.dirname(ADMIN_STATE), { recursive: true });

  const login = new LoginPage(page);
  const dashboard = new DashboardPage(page);

  // The public demo occasionally drops the first login after an idle period,
  // leaving us on /auth/login. Because this setup gates the entire run, we retry
  // the login a few times before giving up — resilience here, not in every test.
  let landed = false;
  for (let attempt = 1; attempt <= 3 && !landed; attempt++) {
    await login.goto();
    await login.login(env.admin.username, env.admin.password);
    landed = await page
      .waitForURL(/\/dashboard\//, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
  }

  // Prove the session is real before persisting it — never save a broken login.
  await dashboard.expectLoaded();
  await page.context().storageState({ path: ADMIN_STATE });
});
