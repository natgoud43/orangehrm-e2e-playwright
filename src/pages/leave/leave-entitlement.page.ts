import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for Leave → Entitlements → Add Entitlement.
 *
 * Granting an entitlement to a *freshly created* employee is what makes the
 * leave flow deterministic on the shared demo: the public admin account's own
 * balance comes and goes with demo resets, but an entitlement we create
 * ourselves is guaranteed to exist for the employee we then assign leave to.
 */
export class LeaveEntitlementPage extends BasePage {
  private readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.saveButton = page.getByRole('button', { name: 'Save' });
  }

  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/leave/addLeaveEntitlement');
    await expect(this.saveButton).toBeVisible({ timeout: 20_000 });
  }

  /** Grant `days` of `leaveType` to `employeeName` for the current period. */
  async addEntitlement(employeeName: string, leaveType: string, days: number): Promise<void> {
    await this.selectAutocomplete('Employee Name', employeeName);
    await this.selectOption('Leave Type', leaveType);
    // Leave Period auto-populates to the current period; leave it as-is.
    await this.fillField('Entitlement', String(days));

    await this.saveButton.click();
    // Saving prompts an "Updating Entitlement… will be updated to N" modal;
    // click its Confirm, then verify the app reported success.
    await this.page.getByRole('button', { name: 'Confirm' }).click();
    await this.expectToast('Successfully Saved');
  }
}
