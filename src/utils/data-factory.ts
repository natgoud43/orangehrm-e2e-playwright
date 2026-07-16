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

/** Format a Date as OrangeHRM's `yyyy-dd-mm` (year-day-month) string. */
function toOrangeHrmDate(d: Date): string {
  const yyyy = d.getFullYear();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${dd}-${mm}`;
}

/**
 * A leave date in OrangeHRM's `yyyy-dd-mm` format (year-day-month), computed
 * relative to *now* so the flow stays correct as the calendar advances:
 *
 *  - **Future** (a few weeks out) so admin-assigned leave lands in "Scheduled"
 *    status — a past date would be "Taken" instead and the Leave List filter
 *    (which looks for "Scheduled") would miss it.
 *  - **Within the current calendar year**, i.e. the leave period the entitlement
 *    is granted for — a next-year date has no entitlement ("Leave Balance
 *    Exceeded").
 *  - **A weekday** — OrangeHRM treats weekends as non-working days and rejects a
 *    single-day request with "No Working Days Selected".
 *
 * The random offset also keeps each run's date effectively unique.
 */
export function makeFutureLeaveDate(): string {
  const now = new Date();
  const yearEnd = new Date(now.getFullYear(), 11, 31);

  for (let attempt = 0; attempt < 60; attempt++) {
    const candidate = new Date(now);
    candidate.setDate(candidate.getDate() + faker.number.int({ min: 14, max: 120 }));
    const weekday = candidate.getDay(); // 0=Sun, 6=Sat
    if (candidate <= yearEnd && weekday !== 0 && weekday !== 6) {
      return toOrangeHrmDate(candidate);
    }
  }

  // Fallback (only reachable late in December): the next weekday from today.
  const d = new Date(now);
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return toOrangeHrmDate(d);
}
