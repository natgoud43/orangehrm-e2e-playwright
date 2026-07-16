import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for Leave → Leave List (the admin view of everyone's leave).
 *
 * Where we prove the assigned leave persisted: filter by the employee and date
 * we used, then assert a matching row exists. Reading it back from the list —
 * not just trusting the toast — is the real state-change assertion.
 */
export class LeaveListPage extends BasePage {
  private readonly searchButton: Locator;
  private readonly rows: Locator;

  constructor(page: Page) {
    super(page);
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.rows = page.locator('.oxd-table-body .oxd-table-card');
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/leave/viewLeaveList');
    await expect(this.searchButton).toBeVisible({ timeout: 20_000 });
  }

  /** Filter by employee name and a date range (bounds in yyyy-dd-mm). */
  async search(employeeName: string, from: string, to: string): Promise<void> {
    // "Show Leave with Status" is a required multi-select that defaults to
    // "Pending Approval"; admin-assigned leave is "Scheduled", so add that
    // status (leaving the default in place) or our row would be filtered out.
    await this.addStatus('Scheduled');
    await this.setDate('From Date', from);
    await this.setDate('To Date', to);
    await this.selectAutocomplete('Employee Name', employeeName);
    await this.searchButton.click();
  }

  /** Add a status to the "Show Leave with Status" multi-select. */
  private async addStatus(status: string): Promise<void> {
    const group = this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.getByText('Show Leave with Status', { exact: true }) });
    await group.locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: status, exact: true }).click();
    await this.page.keyboard.press('Escape');
  }

  /** Assert a leave row exists for `date` with the given type. */
  async expectRequest(date: string, leaveType: string): Promise<void> {
    const row = this.rows.filter({ hasText: date }).filter({ hasText: leaveType });
    await expect(row.first()).toBeVisible({ timeout: 15_000 });
  }
}
