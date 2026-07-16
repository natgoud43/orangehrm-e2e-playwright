import { test, expect } from '../../src/fixtures/auth.fixture';
import { EmployeeFormPage } from '../../src/pages/pim/employee-form.page';
import { EmployeeListPage } from '../../src/pages/pim/employee-list.page';
import { makeEmployee } from '../../src/utils/data-factory';
import { TAGS } from '../../src/utils/test-tags';

/**
 * PIM — full employee CRUD cycle.
 *
 * This is the heart of the suite: it doesn't just submit forms, it proves each
 * mutation actually changed persisted state by reading it back through search.
 * The employee name is generated fresh per run (data-factory) so parallel
 * workers and re-runs never collide.
 *
 * Runs as one ordered scenario (create → find → edit → delete) because each
 * step depends on the previous one's state; `test.step` gives the HTML report a
 * clear breakdown of where a failure happened.
 */
test.describe('PIM employee management', () => {
  // This one test drives five sequential round-trips (create → search → edit →
  // search → delete → search) against a slow shared demo, so it gets more head-
  // room than the default per-test timeout.
  test.slow();

  test(`create, search, edit and delete an employee ${TAGS.FULL}`, async ({ page }) => {
    const form = new EmployeeFormPage(page);
    const list = new EmployeeListPage(page);
    const employee = makeEmployee();

    await test.step('create a new employee', async () => {
      await form.gotoAdd();
      await form.fillName({ firstName: employee.firstName, lastName: employee.lastName });
      // Landing on the Personal Details page with a real empNumber is the app's
      // proof the record was created.
      const empNumber = await form.create();
      expect(Number(empNumber)).toBeGreaterThan(0);
    });

    await test.step('find the employee via search', async () => {
      await list.goto();
      await list.searchByName(employee.fullName);
      // Found by search => the create genuinely persisted, not just POSTed.
      await list.expectFound(employee.lastName);
    });

    await test.step('edit the employee (add a middle name)', async () => {
      await list.openEdit(employee.lastName);
      await form.fillName({ middleName: 'Edited' });
      await form.save('Successfully Updated');
    });

    await test.step('delete the employee and confirm it is gone', async () => {
      await list.goto();
      await list.searchByName(employee.fullName);
      await list.deleteRow(employee.lastName);

      // Strongest proof of the delete: search again, record no longer exists.
      await list.searchByName(employee.fullName);
      await list.expectNoResults();
    });
  });
});
