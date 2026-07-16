# Senior QA Automation Engineer — Take-Home Assignment

## Overview

Build a small but production-quality test automation project using Playwright. We want
to see how you approach automation as an engineering problem: architecture,
reusability, reliability, and communication — not just whether you can make a script
click through a page.

There is no single correct answer. We are evaluating your decisions and how you
explain them.

## The Task

1. Choose a target application yourself. Pick any publicly available website that
   behaves like a real application (it should at least have user authentication and
   flows that change state — not a static content site). Briefly explain in your
   README why you chose it.
2. Automate a meaningful set of end-to-end scenarios covering the application's core
   user flows. We care about depth and quality, not test count.
3. Make the suite reusable and parameterized. Anyone on our team must be able to clone
   your repository and re-run the tests:
   - with different users/credentials and test data,
   - against a configurable environment/base URL,
   - selecting subsets of tests (e.g., a quick pack vs. the full suite),
   - without modifying any test code.
4. Make it re-runnable by a stranger. Assume the person running it has Node.js
   installed and nothing else. Setup and execution must be fully documented and work
   in a few commands.

## Requirements

- **Framework**: Playwright (TypeScript preferred; JavaScript acceptable — justify your
  choice).
- **Deliverable**: a Git repository (GitHub/GitLab link or zip with the .git history
  included).
- **Documentation**: a README covering:
  - what the project tests and why you chose the target application,
  - how to install, configure (users/parameters), and run it,
  - your project structure and the reasoning behind your key design decisions,
  - anything you deliberately left out of scope, and why.
- **Reporting**: a reviewer must be able to see clear results of a run, including
  enough detail to debug a failure.

## Constraints

- Do not automate against a site that forbids it, requires payment, or uses
  CAPTCHA/bot protection you'd need to bypass.
- Do not commit secrets. If credentials are needed, provide a documented way to supply
  them.
- Use of AI assistants is fine — but you own every line. Be prepared to walk through
  and defend any part of the code in the follow-up interview.

## Scope & Time Expectation

Design this as roughly 6–10 hours of focused work. We would rather see a smaller,
polished project with clear reasoning than broad, shallow coverage. If you run out of
time, document what you would do next — a good "next steps" section is worth more than
rushed code.

## Submission

- Send the repository link (or archive) to your hiring contact by the agreed deadline.
- Include the exact commands you expect us to run.
- Expect a ~45-minute follow-up session where you present the project, run it live, and
  discuss your decisions.
