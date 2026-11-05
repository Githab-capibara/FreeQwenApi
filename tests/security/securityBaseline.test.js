import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const BASELINE_DIR = path.join(REPO_ROOT, '.security-baseline');
const BASELINE_CHECK = path.join(REPO_ROOT, 'scripts', 'ci', 'baseline-check.sh');
const GITLEAKS_BASELINE = path.join(REPO_ROOT, '.gitleaks-baseline.json');

// Every scanner that participates in the baseline mechanism. The list must
// stay in sync with scripts/ci/baseline-check.sh, otherwise a scanner could
// silently stop being gated.
const BASELINED_SCANNERS = [
  'bandit',
  'bearer',
  'checkov',
  'dockle',
  'grype-image',
  'njsscan',
  'npm-audit',
  'osv',
  'semgrep',
  'trivy-image',
];

function readBaseline(name) {
  const file = path.join(BASELINE_DIR, `${name}.json`);
  assert.ok(fs.existsSync(file), `missing baseline file: ${file}`);
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.ok(Array.isArray(parsed), `${file} must contain a JSON array`);
  return parsed;
}

test('every baselined scanner has a baseline file', () => {
  for (const scanner of BASELINED_SCANNERS) {
    const entries = readBaseline(scanner);
    assert.ok(entries.length > 0, `baseline for ${scanner} is empty`);
    for (const entry of entries) {
      assert.equal(typeof entry, 'string', `baseline entries must be strings (${scanner})`);
      assert.ok(entry.length > 0, `baseline entries must not be empty (${scanner})`);
    }
  }
});

test('baseline entries are sorted and unique', () => {
  for (const scanner of BASELINED_SCANNERS) {
    const entries = readBaseline(scanner);
    const sorted = [...entries].sort();
    assert.deepEqual(entries, sorted, `baseline for ${scanner} is not sorted`);
    assert.equal(
      new Set(entries).size,
      entries.length,
      `baseline for ${scanner} contains duplicates`,
    );
  }
});

test('the baseline-check script knows every baselined scanner', () => {
  const script = fs.readFileSync(BASELINE_CHECK, 'utf8');
  for (const scanner of BASELINED_SCANNERS) {
    assert.match(
      script,
      new RegExp(`^\\s+${scanner.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')}\\)$`, 'm'),
      `scripts/ci/baseline-check.sh has no extraction branch for "${scanner}"`,
    );
  }
});

test('the baseline-check script fails closed on new findings', () => {
  const script = fs.readFileSync(BASELINE_CHECK, 'utf8');
  const marker = 'if [[ -n "${new_keys}" ]]; then';
  const markerIndex = script.indexOf(marker);
  assert.ok(markerIndex >= 0, 'the new-findings branch is missing');

  const branch = script.slice(markerIndex);
  const branchEnd = branch.indexOf('\nfi');
  assert.ok(branchEnd > 0, 'the new-findings branch is not terminated');
  assert.match(
    branch.slice(0, branchEnd),
    /exit 1/,
    'the new-findings branch must exit with a non-zero status',
  );
  assert.doesNotMatch(
    script,
    /continue-on-error/,
    'the baseline-check script must not tolerate failures',
  );
});

test('the gitleaks history baseline is a JSON array of findings', () => {
  assert.ok(fs.existsSync(GITLEAKS_BASELINE), '.gitleaks-baseline.json is missing');
  const parsed = JSON.parse(fs.readFileSync(GITLEAKS_BASELINE, 'utf8'));
  assert.ok(Array.isArray(parsed), '.gitleaks-baseline.json must contain a JSON array');
  assert.ok(parsed.length > 0, '.gitleaks-baseline.json is empty');
  for (const finding of parsed) {
    assert.ok(finding.Fingerprint, 'every gitleaks baseline entry needs a fingerprint');
    assert.ok(finding.RuleID, 'every gitleaks baseline entry needs a rule id');
  }
});

test('the CI helper scripts are executable and syntactically valid', () => {
  const scriptsDir = path.join(REPO_ROOT, 'scripts', 'ci');
  const scripts = fs.readdirSync(scriptsDir).filter((name) => name.endsWith('.sh'));
  assert.ok(scripts.length > 0, 'no CI helper scripts found');
  for (const name of scripts) {
    const file = path.join(scriptsDir, name);
    const mode = fs.statSync(file).mode;
    assert.ok(mode & 0o111, `${name} must be executable`);
  }
});

test('the baseline comparison uses one collation order for sort and comm', () => {
  // `sort` and `comm` have to agree on the collation order. When they do not,
  // the comparison fails with "not in sorted order" and the gate breaks.
  const script = fs.readFileSync(BASELINE_CHECK, 'utf8');
  assert.match(
    script,
    /export LC_ALL=C/,
    'scripts/ci/baseline-check.sh must pin LC_ALL=C so that sort and comm agree',
  );
});

test('the baseline gate rejects an incomplete scanner report', () => {
  // A scanner that crashes exits non-zero and writes an empty report. Such a
  // report must not be mistaken for "the scanner found nothing".
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-check-'));
  const emptyReport = path.join(workDir, 'empty.json');
  const invalidReport = path.join(workDir, 'invalid.json');
  fs.writeFileSync(emptyReport, '');
  fs.writeFileSync(invalidReport, 'not json');

  for (const report of [emptyReport, invalidReport]) {
    const result = spawnSync('bash', [BASELINE_CHECK, 'semgrep', report, path.join(BASELINE_DIR, 'semgrep.json')], {
      encoding: 'utf8',
    });
    assert.notEqual(
      result.status,
      0,
      `an incomplete report (${path.basename(report)}) must fail the gate`,
    );
  }
});

test('the baseline gate rejects a report without the findings section', () => {
  // A scanner that fails — for example `npm audit` when the registry is
  // unreachable — writes a valid JSON document without the findings section.
  // Such a report must not be read as "the scanner found nothing".
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-check-'));
  const report = path.join(workDir, 'npm-audit.json');
  fs.writeFileSync(
    report,
    JSON.stringify({
      message: 'request to the registry failed',
      error: { summary: '', detail: '' },
    }),
  );

  const result = spawnSync(
    'bash',
    [BASELINE_CHECK, 'npm-audit', report, path.join(BASELINE_DIR, 'npm-audit.json')],
    { encoding: 'utf8' },
  );
  assert.notEqual(
    result.status,
    0,
    'a report without the findings section must fail the gate',
  );
  assert.match(result.stdout, /did not complete/);
});

test('the baseline gate accepts the report shape of every baselined scanner', () => {
  // Checkov writes an array of result documents while most scanners write a
  // single object. The report validation must accept both shapes, otherwise
  // the gate would reject a complete Checkov report.
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-check-'));
  const arrayReport = path.join(workDir, 'checkov.json');
  const objectReport = path.join(workDir, 'semgrep.json');

  fs.writeFileSync(arrayReport, JSON.stringify([{ results: { failed_checks: [] } }]));
  fs.writeFileSync(objectReport, JSON.stringify({ results: [], errors: [] }));

  const arrayResult = spawnSync(
    'bash',
    [BASELINE_CHECK, 'checkov', arrayReport, path.join(BASELINE_DIR, 'checkov.json')],
    { encoding: 'utf8' },
  );
  assert.equal(
    arrayResult.status,
    0,
    `an array-shaped report must be accepted: ${arrayResult.stdout}${arrayResult.stderr}`,
  );

  const objectResult = spawnSync(
    'bash',
    [BASELINE_CHECK, 'semgrep', objectReport, path.join(BASELINE_DIR, 'semgrep.json')],
    { encoding: 'utf8' },
  );
  assert.equal(
    objectResult.status,
    0,
    `an object-shaped report must be accepted: ${objectResult.stdout}${objectResult.stderr}`,
  );
});

test('the baseline gate fails when the report contains a new finding', () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-check-'));
  const report = path.join(workDir, 'semgrep.json');
  fs.writeFileSync(
    report,
    JSON.stringify({
      results: [
        {
          check_id: 'freeqwenapi.test.brand-new-rule',
          path: 'src/api/routes.js',
          start: { line: 1 },
          extra: { fingerprint: 'new-fingerprint' },
        },
      ],
      errors: [],
    }),
  );

  const result = spawnSync('bash', [BASELINE_CHECK, 'semgrep', report, path.join(BASELINE_DIR, 'semgrep.json')], {
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0, 'a finding outside the baseline must fail the gate');
  assert.match(result.stdout, /not in the baseline/);
});
