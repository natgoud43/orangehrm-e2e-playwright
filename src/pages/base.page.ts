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
   * button was clicked. The wait is generous because on the slow demo the save
   * response — and therefore the toast — can lag well past the default timeout.
   */
  async expectToast(text: string | RegExp): Promise<void> {
    await expect(this.toast()).toContainText(text, { timeout: 20_000 });
  }

  // --- oxd form helpers -----------------------------------------------------
  // OrangeHRM forms are a grid of `.oxd-input-group`, each pairing a <label>
  // with its control. Addressing fields by their visible label (rather than
  // brittle positional selectors) keeps page objects readable and resilient.
  // Labels are matched exactly so "Password" never also matches "Confirm
  // Password".

  /** The input-group whose label is exactly `label`. */
  protected fieldGroup(label: string): Locator {
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.getByText(label, { exact: true }) });
  }

  /** Fill a labelled text/password input. */
  async fillField(label: string, value: string): Promise<void> {
    await this.fieldGroup(label).locator('input').fill(value);
  }

  /** Choose an option from a labelled oxd-select dropdown. */
  async selectOption(label: string, option: string): Promise<void> {
    await this.fieldGroup(label).locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  /**
   * Pick an entry from a labelled autocomplete field: type `query`, then click
   * the matching suggestion (defaults to the query text). Waits for the
   * suggestion so we never submit before the async lookup resolves.
   */
  async selectAutocomplete(label: string, query: string, option?: string): Promise<void> {
    await this.fieldGroup(label).locator('input').fill(query);
    const suggestion = this.page.getByRole('option', { name: option ?? query }).first();
    await suggestion.waitFor({ timeout: 10_000 });
    await suggestion.click();
  }

  /**
   * Set a labelled oxd date field. NOTE: OrangeHRM's date inputs use a
   * `yyyy-dd-mm` mask (year-day-month, not the usual month/day order) — pass the
   * value in that format. We clear first (the field may carry a default) and
   * dismiss the calendar popup so it can't swallow the next interaction.
   */
  async setDate(label: string, value: string): Promise<void> {
    const input = this.fieldGroup(label).locator('input');
    await input.click();
    await input.fill('');
    await input.fill(value);
    await this.page.keyboard.press('Escape');
  }
}
