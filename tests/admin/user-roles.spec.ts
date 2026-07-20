import { test, expect } from '../../src/fixtures/auth.fixture';
import { EmployeeFormPage } from '../../src/pages/pim/employee-form.page';
import { UserManagementPage } from '../../src/pages/admin/user-management.page';
import { LoginPage } from '../../src/pages/login.page';
import { DashboardPage } from '../../src/pages/dashboard.page';
import { makeEmployee, makeSystemUser } from '../../src/utils/data-factory';
import { TAGS } from '../../src/utils/test-tags';

/**
 * Admin → User Management + role-based access.
 *
 * The IAM story: create an employee, create a login for them with the ESS
 * (self-service) role, then actually log in as that user and prove the role
 * gates access — the admin-only sections must be invisible to them. This is the
 * cloud-console analogue of "create an IAM user, attach a limited policy,
 * confirm least privilege".
 */
test.describe('Admin user management & role-based access', () => {
  test.slow();

  test(`create an ESS user and verify role-limited access ${TAGS.FULL}`, async ({ page }) => {
    // Heavy scenario (employee create + user create + a second login) against a
    // slow shared host — give it plenty of head-room.
    test.setTimeout(240_000);

    const employee = makeEmployee();
    const creds = makeSystemUser();

    await test.step('create an employee to attach the login to', async () => {
      const form = new EmployeeFormPage(page);
      await form.createEmployee({ firstName: employee.firstName, lastName: employee.lastName });
    });

    await test.step('create an ESS system user for that employee', async () => {
      const users = new UserManagementPage(page);
      await users.gotoAdd();
      await users.addUser({
        role: 'ESS',
        employeeName: employee.fullName,
        username: creds.username,
        password: creds.password,
      });
    });

    await test.step('log in as the ESS user and confirm least-privilege access', async () => {
      // Drop the admin session and reuse this already-warm page to sign in as
      // the new user. Reusing the context (vs a cold fresh one) keeps the SPA
      // bundles cached, so the second login boots fast and reliably.
      await page.context().clearCookies();

      const login = new LoginPage(page);
      const dashboard = new DashboardPage(page);
      await login.loginUntilDashboard(creds.username, creds.password);
      await dashboard.expectLoaded();

      // Assert a normal self-service item FIRST — this both proves the session is
      // real and, crucially, waits until the sidebar menu has actually rendered.
      // Only then are the count-0 checks meaningful: otherwise they could pass
      // simply because the menu hadn't loaded yet, masking a broken restriction.
      await expect(page.getByRole('link', { name: 'My Info', exact: true })).toBeVisible();
      // The ESS role must NOT expose the admin-only modules.
      await expect(page.getByRole('link', { name: 'Admin', exact: true })).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'PIM', exact: true })).toHaveCount(0);
    });
  });
});
