import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

/**
 * Page object for the employee name form.
 *
 * The same three name inputs ("First/Middle/Last Name") + Save button appear on
 * both the "Add Employee" screen and the "Personal Details" screen, so a single
 * object serves create *and* edit — less duplication, one place to fix if the
 * form changes.
 */
export class EmployeeFormPage extends BasePage {
  private readonly firstName: Locator;
  private readonly middleName: Locator;
  private readonly lastName: Locator;
  private readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.firstName = page.getByPlaceholder('First Name');
    this.middleName = page.getByPlaceholder('Middle Name');
    this.lastName = page.getByPlaceholder('Last Name');
    // Both screens show exactly one visible "Save" for the name form.
    this.saveButton = page.getByRole('button', { name: 'Save' });
  }

  /** Open the "Add Employee" screen and wait for the form to be interactive. */
  async gotoAdd(): Promise<void> {
    await this.page.goto('/web/index.php/pim/addEmployee');
    await expect(this.firstName).toBeVisible();
  }

  /** Fill whichever name fields are provided (undefined fields are left as-is). */
  async fillName(name: { firstName?: string; middleName?: string; lastName?: string }): Promise<void> {
    if (name.firstName !== undefined) await this.firstName.fill(name.firstName);
    if (name.middleName !== undefined) await this.middleName.fill(name.middleName);
    if (name.lastName !== undefined) await this.lastName.fill(name.lastName);
  }

  /** Submit the form and confirm the app reported success (used for edits). */
  async save(expected: string | RegExp = /Successfully (Saved|Updated)/): Promise<void> {
    await this.saveButton.click();
    await this.expectToast(expected);
  }

  /**
   * Create a new employee end to end (open form → fill → submit → land on
   * Personal Details) and return their number.
   *
   * Retries the whole sequence, because employee creation is the suite's most
   * common flake point: under parallel load the shared demo intermittently
   * drops the create request or fails to boot the form, leaving us on the Add
   * Employee page. That dropped-request case never persists anything, so
   * re-submitting is safe. In the rare case a write *did* land but the client
   * hung, the caller's search-count assertion plus the test-level retry catch
   * the duplicate — so this self-heal is safe by construction, with a backstop.
   */
  async createEmployee(
    name: { firstName: string; lastName: string; middleName?: string },
    attempts = 3,
  ): Promise<string> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await this.gotoAdd();
        await this.fillName(name);
        await this.saveButton.click();
        return await this.currentEmpNumber();
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  /**
   * The employee's internal number, read from the Personal Details URL the app
   * lands on after a successful create (…/viewPersonalDetails/empNumber/378).
   * Returned so a test can assert on / reuse the freshly-created record.
   */
  async currentEmpNumber(): Promise<string> {
    // The post-save redirect to Personal Details can lag on the slow demo, so
    // allow more time than the default expect timeout for this one navigation.
    await expect(this.page).toHaveURL(/viewPersonalDetails\/empNumber\/\d+/, { timeout: 25_000 });
    const match = this.page.url().match(/empNumber\/(\d+)/);
    return match![1];
  }
}
