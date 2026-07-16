import dotenv from 'dotenv';
import path from 'path';

// Load .env once, at import time, before anything reads process.env.
// Everything env-dependent (baseURL, credentials) flows through this module so
// that pointing the suite at a different environment never requires editing a
// spec or page object — you change .env, not code.
// `quiet` silences dotenv's startup tips so test output stays clean; `.env` is
// optional here because every value below has a safe public-demo default.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

/**
 * Read a variable that must be present. We fail loudly at load time with a
 * clear message rather than letting an `undefined` leak into a selector or URL
 * and surface later as a confusing test failure.
 */
function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Copy .env.example to .env and fill it in (see README > Setup).`,
    );
  }
  return value;
}

/**
 * Read an optional variable, falling back to a sensible default so the suite
 * runs out-of-the-box against the public demo with zero configuration.
 */
function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value.trim() === '' ? fallback : value;
}

/**
 * Typed, validated view of the environment. Import `env` anywhere instead of
 * touching `process.env` directly — one place owns the names, defaults and
 * validation, so a typo becomes a compile error rather than a silent bug.
 */
export const env = {
  /** Base URL of the OrangeHRM instance under test. */
  baseURL: optional('BASE_URL', 'https://opensource-demo.orangehrmlive.com'),

  /** Default admin account shipped with the public demo. */
  admin: {
    username: optional('ADMIN_USERNAME', 'Admin'),
    password: optional('ADMIN_PASSWORD', 'admin123'),
  },
} as const;

// Re-export the guards so a later, stricter setup (e.g. a real environment with
// no safe defaults) can require specific variables without duplicating logic.
export { required, optional };
