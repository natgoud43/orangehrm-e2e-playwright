import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export interface AssignLeaveInput {
  employeeName: string;
  leaveType: string;
  /** Single day, in OrangeHRM's yyyy-dd-mm format. */
  date: string;
}

/**
 * Page object for Leave → Assign Leave.
 *
 * As admin, assign a day of leave to an employee who now has an entitlement.
 * This creates a real leave record in a workflow state, which we then read back
 * from the Leave List — the leave-module analogue of driving a resource into a
 * new workflow state and confirming it.
 */
export class AssignLeavePage extends BasePage {
  private readonly assignButton: Locator;

  constructor(page: Page) {
    super(page);
    this.assignButton = page.getByRole('button', { name: 'Assign' });
  }

  async goto(): Promise<void> {
    await this.gotoWithRetry('/web/index.php/leave/assignLeave');
    await expect(this.assignButton).toBeVisible({ timeout: 20_000 });
  }

  /** Assign a single day of leave and confirm it was saved. */
  async assign({ employeeName, leaveType, date }: AssignLeaveInput): Promise<void> {
    await this.selectAutocomplete('Employee Name', employeeName);
    await this.selectOption('Leave Type', leaveType);
    await this.setDate('From Date', date);
    await this.setDate('To Date', date);

    await this.assignButton.click();
    // Assign submits directly (no confirmation modal) and resets the form —
    // assert the success toast straight away so we don't miss it while it's up.
    await this.expectToast('Successfully Saved');
  }
}
