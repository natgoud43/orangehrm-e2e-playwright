import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Page object for the OrangeHRM login screen.
 *
 * Selector strategy: username/password are real `<input name>` fields, so we
 * bind to those. The submit control and the error/validation banners come from
 * the oxd component library, so we use their stable class hooks plus visible
 * text. Assertions live on the page object only where they describe *this*
 * page's contract (errors); flow assertions stay in the spec.
 */
export class LoginPage extends BasePage {
  private readonly username: Locator;
  private readonly password: Locator;
  private readonly submit: Locator;

  constructor(page: Page) {
    super(page);
    this.username = page.getByPlaceholder('Username');
    this.password = page.getByPlaceholder('Password');
    this.submit = page.getByRole('button', { name: 'Login' });
  }

  /** Navigate to the login screen. */
  async goto(): Promise<void> {
    await this.page.goto('/web/index.php/auth/login');
    // The login form is rendered by the Vue app after it boots; on a cold demo
    // that can take a while, so wait generously for the button to appear.
    await expect(this.submit).toBeVisible({ timeout: 30_000 });
  }

  /** Fill both fields and submit. */
  async login(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }

  /**
   * Log in and wait for the dashboard, retrying the whole flow (navigate → fill
   * → submit) to absorb the public demo's cold-start drops and slow SPA boots.
   *
   * Use this for *support* logins where we just need a working session (the auth
   * setup, logging in as a freshly-created user). The functional login tests in
   * login.spec.ts deliberately do NOT use this — they assert a single attempt's
   * real behaviour.
   */
  async loginUntilDashboard(username: string, password: string, attempts = 3): Promise<void> {
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await this.goto();
        await this.login(username, password);
        await expect(this.page).toHaveURL(/\/dashboard\//, { timeout: 20_000 });
        return;
      } catch (error) {
        if (attempt === attempts) throw error;
      }
    }
  }

  /**
   * The app's top-level error banner (e.g. "Invalid credentials"), shown for a
   * rejected but well-formed login attempt.
   */
  async expectLoginError(text: string | RegExp = 'Invalid credentials'): Promise<void> {
    await expect(this.page.locator('.oxd-alert-content-text')).toHaveText(text);
  }

  /**
   * Per-field "Required" validation messages shown when submitting empty
   * fields. Returns the count so the spec can assert both fields flagged.
   */
  fieldErrors(): Locator {
    return this.page.locator('.oxd-input-field-error-message');
  }
}
