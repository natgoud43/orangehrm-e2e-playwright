import { test } from '../../src/fixtures/auth.fixture';
import { EmployeeFormPage } from '../../src/pages/pim/employee-form.page';
import { LeaveEntitlementPage } from '../../src/pages/leave/leave-entitlement.page';
import { AssignLeavePage } from '../../src/pages/leave/assign-leave.page';
import { LeaveListPage } from '../../src/pages/leave/leave-list.page';
import { makeEmployee, makeFutureLeaveDate } from '../../src/utils/data-factory';
import { env } from '../../src/config/env';
import { TAGS } from '../../src/utils/test-tags';

/**
 * Leave — grant an entitlement, assign leave, and verify it in the Leave List.
 *
 * Why this shape rather than "apply as the admin user"? The public demo's admin
 * account has a volatile leave balance (it resets to zero on the demo's periodic
 * data wipes), which makes an apply-as-admin test non-deterministic. Instead we
 * self-provision: create a fresh employee, grant *them* an entitlement, assign a
 * day of leave, and read it back — a flow that owns all of its own state and so
 * passes reliably regardless of the shared account's mood.
 */
test.describe('Leave management', () => {
  test.setTimeout(240_000); // create employee + entitlement + assign + list, on a slow host

  test(`grant entitlement, assign leave, and see it in the Leave List ${TAGS.FULL}`, async ({ page }) => {
    const employee = makeEmployee();
    const date = makeFutureLeaveDate();
    const leaveType = env.leave.type;

    await test.step('create the employee who will receive leave', async () => {
      const form = new EmployeeFormPage(page);
      await form.createEmployee({ firstName: employee.firstName, lastName: employee.lastName });
    });

    await test.step('grant them a leave entitlement', async () => {
      // addEntitlement opens the form itself (and retries), so no goto() here.
      const entitlements = new LeaveEntitlementPage(page);
      await entitlements.addEntitlement(employee.fullName, leaveType, 5);
    });

    await test.step('assign a day of leave', async () => {
      const assign = new AssignLeavePage(page);
      await assign.goto();
      await assign.assign({ employeeName: employee.fullName, leaveType, date });
    });

    await test.step('confirm the leave shows in the Leave List', async () => {
      const list = new LeaveListPage(page);
      await list.goto();
      await list.verifyRequest(employee.fullName, date, leaveType);
    });
  });
});
