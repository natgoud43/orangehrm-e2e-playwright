import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export type UserRole = 'Admin' | 'ESS';

export interface NewSystemUser {
  role: UserRole;
  /** Name (or prefix) of an existing employee to link the login to. */
  employeeName: string;
  username: string;
  password: string;
  status?: 'Enabled' | 'Disabled';
}

/**
 * Page object for Admin → User Management → "Add User".
 *
 * This models the app's IAM surface: a login is created, linked to an employee,
 * and granted a role (Admin/ESS). The test then logs in as that user to prove
 * the role actually gates access — the cloud-console analogue of "create an IAM
 * user, assign a policy, confirm least privilege".
 */
export class UserManagementPage extends BasePage {
  private readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.saveButton = page.getByRole('button', { name: 'Save' });
  }

  async gotoAdd(): Promise<void> {
    await this.page.goto('/web/index.php/admin/saveSystemUser');
    await expect(this.saveButton).toBeVisible({ timeout: 20_000 });
  }

  /** Fill and submit the Add User form, confirming the save succeeded. */
  async addUser(user: NewSystemUser): Promise<void> {
    await this.selectOption('User Role', user.role);
    await this.selectAutocomplete('Employee Name', user.employeeName);
    await this.selectOption('Status', user.status ?? 'Enabled');
    await this.fillField('Username', user.username);
    // Two password inputs — exact-label matching keeps them apart.
    await this.fillField('Password', user.password);
    await this.fillField('Confirm Password', user.password);

    await this.saveButton.click();
    // A successful save redirects to the System Users list. Wait for that as the
    // deterministic success signal — more reliable than the transient toast,
    // which can expire before we see it on the slow demo.
    await expect(this.page).toHaveURL(/viewSystemUsers/, { timeout: 30_000 });
  }
}
