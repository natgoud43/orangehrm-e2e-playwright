import { faker } from '@faker-js/faker';

/**
 * Test-data factory.
 *
 * Every entity a test creates (employee, system user) gets a unique name/login
 * so parallel workers never collide on shared state and re-runs don't trip over
 * data left by a previous run. Uniqueness = faker for realistic values +
 * a short timestamp/random suffix that's effectively collision-free within a
 * run.
 *
 * This is a deliberate design choice: one shared, mutable data fixture reused
 * across tests is a classic source of flaky, order-dependent suites (a prior
 * real bug where a single fixture served two contradictory roles is exactly why
 * data here is generated per-test, never shared).
 */

/** Short, sortable, collision-resistant suffix, e.g. "l4k2p9-731". */
function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${faker.number.int({ min: 100, max: 999 })}`;
}

export interface EmployeeData {
  firstName: string;
  lastName: string;
  /** Full name as OrangeHRM displays it in lists — handy for search assertions. */
  fullName: string;
}

export interface SystemUserData {
  username: string;
  password: string;
}

/** A fresh employee with a unique, human-readable name. */
export function makeEmployee(): EmployeeData {
  const firstName = faker.person.firstName();
  // Suffix the last name so the full name is unique and searchable, while still
  // looking like a real record in the UI.
  const lastName = `${faker.person.lastName()}-${uniqueSuffix()}`;
  return { firstName, lastName, fullName: `${firstName} ${lastName}` };
}

/** A fresh system-user login that satisfies OrangeHRM's password policy. */
export function makeSystemUser(): SystemUserData {
  return {
    username: `user_${uniqueSuffix()}`,
    // Mixed-case + digits to meet the app's "not too weak" password rule.
    password: `Pw-${faker.internet.password({ length: 10 })}1A`,
  };
}
