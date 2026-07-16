/**
 * Tag constants for filtering test runs with `--grep`.
 *
 * Tests are tagged inline in their titles, e.g.
 *     test(`valid login ${TAGS.SMOKE}`, ...)
 * and selected at run time:
 *     npx playwright test --grep @smoke   # quick pack
 *     npx playwright test --grep @full    # full suite
 *
 * Using shared constants (rather than raw "@smoke" strings scattered across
 * specs) means a rename is a single edit and a typo is a compile error.
 */
export const TAGS = {
  /** Fast, high-value checks — the "is the app fundamentally up?" pack. */
  SMOKE: '@smoke',
  /** Deeper end-to-end coverage — the full regression pack. */
  FULL: '@full',
} as const;
