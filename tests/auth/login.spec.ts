import { test, expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/login.page';
import { DashboardPage } from '../../src/pages/dashboard.page';
import { env } from '../../src/config/env';
import { TAGS } from '../../src/utils/test-tags';

/**
 * Authentication suite.
 *
 * These are the "is the app fundamentally up and does access control work?"
 * checks, so the happy path is tagged @smoke (quick pack) while the negative
 * and edge cases are @full. Credentials come from env config, never hard-coded.
 */
test.describe('Authentication', () => {
  test(`valid credentials land on the dashboard ${TAGS.SMOKE} ${TAGS.FULL}`, async ({ page }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await login.goto();
    await login.login(env.admin.username, env.admin.password);

    // Proof of a real, authenticated session: URL changed and the app shell
    // rendered the Dashboard breadcrumb.
    await dashboard.expectLoaded('Dashboard');
  });

  test(`invalid credentials are rejected ${TAGS.SMOKE} ${TAGS.FULL}`, async ({ page }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.login('Admin', 'wrong-password');

    await login.expectLoginError('Invalid credentials');
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test(`empty fields show required-field validation ${TAGS.FULL}`, async ({ page }) => {
    const login = new LoginPage(page);

    await login.goto();
    await login.login('', '');

    // Both username and password should be flagged as required.
    await expect(login.fieldErrors()).toHaveCount(2);
    await expect(login.fieldErrors().first()).toHaveText('Required');
  });

  test(`logout returns to the login screen ${TAGS.FULL}`, async ({ page }) => {
    const login = new LoginPage(page);
    const dashboard = new DashboardPage(page);

    await login.goto();
    await login.login(env.admin.username, env.admin.password);
    await dashboard.expectLoaded();

    await dashboard.logout();
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test(`protected route redirects to login when unauthenticated ${TAGS.SMOKE} ${TAGS.FULL}`, async ({ page }) => {
    // Hitting an authenticated URL with no session must bounce to login rather
    // than exposing the page — the front-end access-control guarantee.
    await page.goto('/web/index.php/pim/viewEmployeeList');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
