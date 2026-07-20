import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
} from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

/**
 * A lightweight, self-contained HTML summary reporter.
 *
 * Writes a single clean page (the result stat bar up front, coverage, and —
 * crucially — the exception text for any failed or flaky test) as a
 * skim-friendly alternative to the full Playwright report. The heavy interactive
 * report (traces/videos) still comes from the built-in `html` reporter.
 *
 * Output path is configurable: ['./reporters/summary-report.ts', { outputFile }].
 */
export default class SummaryReport implements Reporter {
  private suite!: Suite;
  private readonly outputFile: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile ?? process.env.SUMMARY_REPORT_OUTPUT ?? 'docs/report.html';
  }

  onBegin(_config: FullConfig, suite: Suite): void {
    this.suite = suite;
  }

  onEnd(result: FullResult): void {
    try {
      const tests = this.suite.allTests();
      const html = renderReport(tests, result);
      fs.mkdirSync(path.dirname(this.outputFile), { recursive: true });
      fs.writeFileSync(this.outputFile, html, 'utf8');
      // eslint-disable-next-line no-console
      console.log(`\nSummary written to ${this.outputFile}`);
    } catch (error) {
      // A reporting hiccup must never fail the run.
      console.error('summary-report: failed to write summary —', error);
    }
  }
}

// --- helpers ---------------------------------------------------------------

const AREA_ORDER = ['Auth', 'PIM', 'Admin', 'Leave'];

function areaOf(file: string): string {
  const f = file.replace(/\\/g, '/');
  if (f.includes('auth.setup')) return 'Setup';
  if (f.includes('/auth/')) return 'Auth';
  if (f.includes('/pim/')) return 'PIM';
  if (f.includes('/admin/')) return 'Admin';
  if (f.includes('/leave/')) return 'Leave';
  return 'Other';
}

function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\[[0-9;]*m/g, '');
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Short, meaningful error text for a failed/flaky test. */
function errorText(test: TestCase): string {
  const failed = test.results.find(
    (r) => r.status !== 'passed' && (r.error || r.errors?.length),
  );
  const message = failed?.error?.message ?? failed?.errors?.[0]?.message ?? '(no error message captured)';
  const clean = stripAnsi(message).trim();
  return clean.length > 700 ? `${clean.slice(0, 700)}\n…` : clean;
}

function renderReport(tests: TestCase[], result: FullResult): string {
  const counts = { total: tests.length, passed: 0, failed: 0, flaky: 0, skipped: 0 };
  for (const t of tests) {
    const o = t.outcome();
    if (o === 'expected') counts.passed++;
    else if (o === 'unexpected') counts.failed++;
    else if (o === 'flaky') counts.flaky++;
    else if (o === 'skipped') counts.skipped++;
  }

  // Coverage: one row per functional area, status = worst outcome in it.
  const byArea = new Map<string, TestCase[]>();
  for (const t of tests) {
    const area = areaOf(t.location.file);
    if (area === 'Setup' || area === 'Other') continue;
    const list = byArea.get(area) ?? [];
    if (!byArea.has(area)) byArea.set(area, list);
    list.push(t);
  }
  const coverageRows = AREA_ORDER.filter((a) => byArea.has(a))
    .map((area) => {
      const group = byArea.get(area)!;
      const hasFail = group.some((t) => t.outcome() === 'unexpected');
      const hasFlaky = group.some((t) => t.outcome() === 'flaky');
      const mark = hasFail ? '✗' : hasFlaky ? '~' : '✓';
      const cls = hasFail ? 'fail' : hasFlaky ? 'flaky' : 'pass';
      return `<div class="row"><span class="tick ${cls}">${mark}</span><span class="area">${area}</span><span class="desc">${AREA_DESC[area]}</span></div>`;
    })
    .join('\n        ');

  // Errors: only failed / flaky tests.
  const problems = tests.filter((t) => t.outcome() === 'unexpected' || t.outcome() === 'flaky');
  const errorBlocks = problems
    .map((t) => {
      const flaky = t.outcome() === 'flaky';
      const title = esc(`${areaOf(t.location.file)} › ${t.title}`);
      const badge = flaky ? '<span class="badge flaky">flaky · passed on retry</span>' : '<span class="badge fail">failed</span>';
      return `<div class="err"><div class="err-head">${badge}<span class="err-title">${title}</span></div><pre class="err-body"><code>${esc(errorText(t))}</code></pre></div>`;
    })
    .join('\n        ');

  const errorsSection = problems.length
    ? `<section>
      <h2>Failures &amp; flakes — error detail</h2>
        ${errorBlocks}
    </section>`
    : `<section>
      <h2>Failures &amp; flakes</h2>
      <p class="note ok">No failures or flakes in this run — every test passed on the first attempt.</p>
    </section>`;

  const when = new Date(result.startTime).toLocaleString('sv-SE').slice(0, 16);
  const mins = (result.duration / 60000).toFixed(1);

  return TEMPLATE
    .replace('{{TOTAL}}', String(counts.total))
    .replace('{{PASSED}}', String(counts.passed))
    .replace('{{FAILED}}', String(counts.failed))
    .replace('{{FLAKY}}', String(counts.flaky))
    .replace('{{SKIPPED}}', String(counts.skipped))
    .replace('{{PASSED_CLS}}', counts.passed ? 'pass' : 'zero')
    .replace('{{FAILED_CLS}}', counts.failed ? 'fail' : 'zero')
    .replace('{{FLAKY_CLS}}', counts.flaky ? 'flaky' : 'zero')
    .replace('{{SKIPPED_CLS}}', counts.skipped ? '' : 'zero')
    .replace('{{WHEN}}', when)
    .replace('{{MINS}}', mins)
    .replace('{{COVERAGE}}', coverageRows)
    .replace('{{ERRORS}}', errorsSection);
}

const AREA_DESC: Record<string, string> = {
  Auth: 'login, invalid creds, empty-field validation, logout, protected-route redirect',
  PIM: 'employee CRUD — create → search → edit → delete → confirm gone',
  Admin: 'create ESS user → log in as them → admin modules hidden (least privilege)',
  Leave: 'grant entitlement → assign leave → read it back in the Leave List',
};

const TEMPLATE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OrangeHRM E2E — Test Summary</title>
  <style>
    :root {
      --bg:#fff; --panel:#fafafa; --text:#1a1d21; --muted:#6b7280; --border:#eceef1;
      --green:#16a34a; --red:#dc2626; --amber:#d08700; --accent:#2563eb;
      --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
      --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    }
    @media (prefers-color-scheme:dark){:root{
      --bg:#16181c;--panel:#1c1f24;--text:#e6e8eb;--muted:#9aa1ab;--border:#2a2e35;
      --green:#4ade80;--red:#f87171;--amber:#fbbf24;--accent:#60a5fa;}}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);line-height:1.55;-webkit-font-smoothing:antialiased}
    .wrap{max-width:680px;margin:0 auto;padding:64px 24px 80px}
    header{margin-bottom:40px}
    h1{font-size:20px;font-weight:600;letter-spacing:-.01em;margin:0 0 4px}
    .sub{color:var(--muted);font-size:14px}
    .stats{display:grid;grid-template-columns:repeat(5,1fr);border:1px solid var(--border);border-radius:12px;overflow:hidden;background:var(--panel);margin:0 0 12px}
    .stat{padding:20px 12px;text-align:center;border-right:1px solid var(--border)}
    .stat:last-child{border-right:0}
    .stat .num{font-size:30px;font-weight:650;letter-spacing:-.02em;line-height:1}
    .stat .lbl{font-size:12px;color:var(--muted);margin-top:7px;text-transform:uppercase;letter-spacing:.04em}
    .num.pass{color:var(--green)}.num.fail{color:var(--red)}.num.flaky{color:var(--amber)}
    .num.zero{color:var(--muted);opacity:.6}
    .runmeta{color:var(--muted);font-size:13px;text-align:right;margin:0 0 44px}
    h2{font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:0 0 14px}
    section{margin-bottom:40px}
    .cov{display:flex;flex-direction:column;gap:2px}
    .row{display:flex;gap:14px;align-items:baseline;padding:11px 0;border-top:1px solid var(--border)}
    .row:first-child{border-top:0}
    .tick{font-size:14px;width:12px}.tick.pass{color:var(--green)}.tick.flaky{color:var(--amber)}.tick.fail{color:var(--red)}
    .area{font-weight:600;min-width:62px;font-size:15px}
    .desc{color:var(--muted);font-size:14px}
    p.note{color:var(--muted);font-size:14px;margin:0}
    p.note.ok{color:var(--green)}
    .err{border:1px solid var(--border);border-radius:10px;overflow:hidden;margin-bottom:14px}
    .err-head{display:flex;gap:10px;align-items:center;padding:12px 14px;background:var(--panel)}
    .err-title{font-size:14px;font-weight:600}
    .badge{font-size:11px;font-weight:600;padding:3px 8px;border-radius:999px;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}
    .badge.fail{background:rgba(220,38,38,.12);color:var(--red)}
    .badge.flaky{background:rgba(208,135,0,.14);color:var(--amber)}
    .err-body{margin:0;padding:14px;overflow-x:auto;border-top:1px solid var(--border)}
    pre{background:var(--panel);border:1px solid var(--border);border-radius:10px;padding:16px 18px;overflow-x:auto;margin:0}
    .err-body{background:transparent;border-radius:0}
    code{font-family:var(--mono);font-size:13px;color:var(--text);white-space:pre-wrap;word-break:break-word}
    footer{border-top:1px solid var(--border);padding-top:20px;color:var(--muted);font-size:13px}
    a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
    @media (max-width:480px){.wrap{padding:40px 18px 56px}.stat .num{font-size:24px}.stat{padding:16px 6px}}
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1>OrangeHRM E2E — Test Summary</h1>
      <div class="sub">Playwright + TypeScript · Chromium</div>
    </header>

    <div class="stats" role="group" aria-label="Test results">
      <div class="stat"><div class="num">{{TOTAL}}</div><div class="lbl">Total</div></div>
      <div class="stat"><div class="num {{PASSED_CLS}}">{{PASSED}}</div><div class="lbl">Passed</div></div>
      <div class="stat"><div class="num {{FAILED_CLS}}">{{FAILED}}</div><div class="lbl">Failed</div></div>
      <div class="stat"><div class="num {{FLAKY_CLS}}">{{FLAKY}}</div><div class="lbl">Flaky</div></div>
      <div class="stat"><div class="num {{SKIPPED_CLS}}">{{SKIPPED}}</div><div class="lbl">Skipped</div></div>
    </div>
    <div class="runmeta">Run · {{WHEN}} · {{MINS}} min</div>

    <section>
      <h2>Coverage</h2>
      <div class="cov">
        {{COVERAGE}}
      </div>
    </section>

    {{ERRORS}}

    <section>
      <h2>Run it</h2>
      <pre><code>npm ci
npx playwright install chromium
npm test            # full suite   (npm run test:smoke = quick pack)
npm run report      # full interactive report (trace / screenshot / video)</code></pre>
    </section>

    <footer>
      Generated from the latest run. The full interactive report — per-test traces,
      screenshots, and videos — comes from <code>npm run report</code>.<br />
      Repo: <a href="https://github.com/natgoud43/orangehrm-e2e-playwright">github.com/natgoud43/orangehrm-e2e-playwright</a>
    </footer>
  </div>
</body>
</html>
`;
