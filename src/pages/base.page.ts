import { Page, Locator, expect } from '@playwright/test';

/**
 * Base class every page object extends.
 *
 * It holds the `Page` and a couple of helpers that encode conventions we want
 * applied *consistently* across the suite:
 *  - `toast()` centralises OrangeHRM's success/error toast selector so a UI
 *    change is fixed in one place, not in a dozen specs.
 *  - `expectToast()` asserts the toast text, which is how the app confirms a
 *    state change (save/update/delete) actually happened.
 *
 * OrangeHRM is built on a custom "oxd" component library rather than native
 * HTML controls, so selectors lean on stable `oxd-*` class hooks and visible
 * text rather than ids that the app doesn't provide.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** The app's transient toast/notification banner. */
  protected toast(): Locator {
    return this.page.locator('.oxd-toast');
  }

  /**
   * Assert that a toast appeared containing `text` (e.g. "Successfully Saved").
   * This is our proof that an action changed server state, not just that a
   * button was clicked. The toast is transient, so we assert while it's visible.
   */
  async expectToast(text: string | RegExp): Promise<void> {
    await expect(this.toast()).toContainText(text);
  }

  /**
   * Open a section from the left-hand main menu by its visible label
   * (e.g. "PIM", "Admin", "Leave").
   */
  async openMenu(label: string): Promise<void> {
    await this.page.getByRole('link', { name: label, exact: true }).click();
  }
}
