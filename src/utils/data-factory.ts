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

/**
 * A unique future leave date in OrangeHRM's `yyyy-dd-mm` format (year-day-month).
 *
 * Randomising the date (day 1-28 to stay valid in any month) makes each run's
 * leave request effectively unique, so searching My Leave for this exact date
 * finds *our* request and not another run's or another user's.
 *
 * Window: Aug–Dec 2026 — future relative to the demo's clock (mid-2026) yet
 * inside the leave period that actually carries a balance for the demo's admin
 * (2027 has none, so requests there are rejected as "Leave Balance Exceeded").
 * Against another environment, adjust this window to a period with entitlement.
 */
export function makeFutureLeaveDate(): string {
  const year = 2026;
  // Keep picking until we land on a weekday — OrangeHRM counts weekends as
  // non-working days and rejects a single-day request with "No Working Days
  // Selected".
  for (let attempt = 0; attempt < 50; attempt++) {
    const dayNum = faker.number.int({ min: 1, max: 28 });
    const monthNum = faker.number.int({ min: 8, max: 12 });
    const weekday = new Date(year, monthNum - 1, dayNum).getDay(); // 0=Sun, 6=Sat
    if (weekday !== 0 && weekday !== 6) {
      const day = String(dayNum).padStart(2, '0');
      const month = String(monthNum).padStart(2, '0');
      return `${year}-${day}-${month}`;
    }
  }
  return `${year}-03-08`; // 2026-08-03 is a Monday — safe fallback
}
