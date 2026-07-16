import { test as base } from '@playwright/test';
import { ADMIN_STATE } from './storage-state';

/**
 * Authenticated test fixture.
 *
 * Import `test`/`expect` from here (instead of `@playwright/test`) in any spec
 * that should start already logged in as admin. It applies the admin
 * `storageState` produced by the setup project, so the browser opens with a
 * live session — no UI login, no per-test auth boilerplate.
 *
 * Tests that must control auth themselves (the login suite) deliberately import
 * from `@playwright/test` instead, so they start from a clean, signed-out state.
 */
export const test = base.extend({});

// Apply the saved admin session to every test that uses this `test`.
test.use({ storageState: ADMIN_STATE });

export { expect } from '@playwright/test';
