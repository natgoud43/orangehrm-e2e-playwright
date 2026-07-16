import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the PIM "Employee List" — search, then act on a result row.
 *
 * This is where we prove a *state change*: search finds a record created
 * earlier in the same run, which means the create actually persisted, not just
 * that a form submitted.
 */
export class EmployeeListPage extends BasePage {
  private readonly nameFilter: Locator;
  private readonly searchButton: Locator;
  private readonly rows: Locator;

  constructor(page: Page) {
    super(page);
    // The "Employee Name" filter is an autocomplete text input; scope to its
    // input-group so we don't accidentally grab another filter's field.
    this.nameFilter = page
      .locator('.oxd-input-group')
      .filter({ hasText: 'Employee Name' })
      .locator('input');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.rows = page.locator('.oxd-table-body .oxd-table-card');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/pim/viewEmployeeList');
    await expect(this.nameFilter).toBeVisible();
  }

  /**
   * Search by employee name and wait for results to settle.
   *
   * The name field debounces an autocomplete lookup; if we click Search before
   * the typed value registers in the app's model, it filters on an empty value
   * and returns everyone. So we give the autocomplete a beat to fire (the
   * dropdown appearing is our signal it registered) before submitting.
   */
  async searchByName(name: string): Promise<void> {
    await this.nameFilter.fill(name);
    await this.page.locator('[role="option"]').first().waitFor({ timeout: 8_000 }).catch(() => {
      // Dropdown may not render an option on the flaky demo; the fill still
      // registered — fall through and search anyway.
    });
    await this.searchButton.click();
    // Wait on the app's own results header ("(N) Records Found" / "No Records
    // Found") rather than networkidle — this SPA holds long-lived connections
    // open, so networkidle never settles and would hang the test. `.first()`
    // because an empty result also raises a toast with the same text.
    await expect(this.page.getByText(/Records? Found/).first()).toBeVisible();
  }

  /** The result row containing `text` (use a unique value like the last name). */
  row(text: string): Locator {
    return this.rows.filter({ hasText: text });
  }

  /** Assert exactly one row matches — the record exists and is unambiguous. */
  async expectFound(text: string): Promise<void> {
    await expect(this.row(text)).toHaveCount(1);
  }

  /** Open the edit (Personal Details) screen for the matching row. */
  async openEdit(text: string): Promise<void> {
    await this.row(text).locator('button:has(i.bi-pencil-fill)').click();
    await expect(this.page).toHaveURL(/viewPersonalDetails/);
  }

  /** Delete the matching row via its trash action + confirmation dialog. */
  async deleteRow(text: string): Promise<void> {
    await this.row(text).locator('button:has(i.bi-trash)').click();
    // The confirm button is unique once the "Are you Sure?" modal opens — target
    // it directly rather than depending on the modal's container class.
    const confirm = this.page.getByRole('button', { name: 'Yes, Delete' });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await this.expectToast('Successfully Deleted');
  }

  /** Assert a search returned nothing — the app's "No Records Found" state. */
  async expectNoResults(): Promise<void> {
    // The app shows this both in the table body and a toast, so scope to the
    // first match to avoid a strict-mode "resolved to 2 elements" error.
    await expect(this.page.getByText('No Records Found').first()).toBeVisible();
  }
}
