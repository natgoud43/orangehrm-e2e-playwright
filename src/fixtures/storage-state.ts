import path from 'path';

/**
 * Filesystem location of the persisted admin session.
 *
 * This lives in its own module (not in auth.setup.ts) on purpose: Playwright
 * forbids a spec from importing another *test* file, and auth.setup.ts is a
 * test file. Both the setup (which writes the state) and auth.fixture.ts (which
 * reads it) import this plain constant instead, sidestepping that rule.
 *
 * Git-ignored via `playwright/.auth/` in .gitignore — sessions are never
 * committed.
 */
export const ADMIN_STATE = path.resolve(__dirname, '../../playwright/.auth/admin.json');
