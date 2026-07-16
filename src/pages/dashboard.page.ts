import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the post-login dashboard / authenticated shell.
 *
 * Beyond confirming a successful login, this owns the two things every
 * authenticated flow needs: reading the current page's breadcrumb title and
 * logging out via the user dropdown.
 */
export class DashboardPage extends BasePage {
  private readonly userDropdown: Locator;
  /** The breadcrumb heading that names the current module (e.g. "Dashboard"). */
  readonly header: Locator;

  constructor(page: Page) {
    super(page);
    this.userDropdown = page.locator('.oxd-userdropdown-tab');
    this.header = page.locator('.oxd-topbar-header-breadcrumb h6');
  }

  /** Assert we've landed on an authenticated page with the expected title. */
  async expectLoaded(title: string | RegExp = 'Dashboard'): Promise<void> {
    await expect(this.page).toHaveURL(/\/dashboard\//);
    await expect(this.header).toHaveText(title);
  }

  /** Log out through the top-right user menu. */
  async logout(): Promise<void> {
    await this.userDropdown.click();
    await this.page.getByRole('menuitem', { name: 'Logout' }).click();
    await expect(this.page).toHaveURL(/\/auth\/login/);
  }
}
