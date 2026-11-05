import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import yaml from 'js-yaml';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const WORKFLOW_DIR = path.join(REPO_ROOT, '.github', 'workflows');

function listWorkflowFiles() {
  if (!fs.existsSync(WORKFLOW_DIR)) return [];
  return fs
    .readdirSync(WORKFLOW_DIR)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map((name) => path.join(WORKFLOW_DIR, name));
}

function collectUses(node, sink = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectUses(item, sink));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'uses' && typeof value === 'string') sink.push(value);
      else collectUses(value, sink);
    }
  }
  return sink;
}

function collectRunScripts(node, sink = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectRunScripts(item, sink));
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === 'run' && typeof value === 'string') sink.push(value);
      else collectRunScripts(value, sink);
    }
  }
  return sink;
}

function collectBooleanKeys(node, key, sink = []) {
  if (Array.isArray(node)) {
    node.forEach((item) => collectBooleanKeys(item, key, sink));
  } else if (node && typeof node === 'object') {
    for (const [currentKey, value] of Object.entries(node)) {
      if (currentKey === key) sink.push(value);
      collectBooleanKeys(value, key, sink);
    }
  }
  return sink;
}

// Scanners that the runner installs on the host rather than in a container.
// A job that invokes one of them has to install it, otherwise the step dies
// with "command not found" — a failure that has nothing to do with the code
// under test and that hides the real result of the gate.
//
// Semgrep is deliberately absent: it is installed by
// scripts/ci/run-semgrep.sh, which the pipeline invokes as a single entry
// point so that the rule set cannot drift between the job and the baseline
// generator.
const HOST_SCANNERS = {
  checkov: /checkov==/,
  bandit: /bandit==/,
  njsscan: /njsscan==/,
  schemathesis: /schemathesis==/,
  'pip-audit': /pip-audit==/,
  gitleaks: /gitleaks/i,
};

// A step that only prepares the environment. It mentions the scanner, but it
// does not run it, so it must not be read as an invocation.
const PREPARATION_STEP = /\b(install|setup|prepare|bootstrap|version)\b/i;

function collectSteps(job) {
  return (job.steps ?? [])
    .filter((step) => typeof step.run === 'string')
    .map((step) => ({ name: step.name ?? '', run: step.run }));
}

const workflows = listWorkflowFiles();

test('the repository defines at least one GitHub Actions workflow', () => {
  assert.ok(workflows.length > 0, 'no workflow files found under .github/workflows');
});

test('every workflow is valid YAML and declares least-privilege permissions', () => {
  for (const file of workflows) {
    const raw = fs.readFileSync(file, 'utf8');
    const doc = yaml.load(raw);
    assert.ok(doc, `${file} is empty`);

    const name = path.basename(file);
    assert.ok(doc.permissions, `${name}: top-level "permissions" is missing`);
    assert.equal(
      doc.permissions.contents,
      'read',
      `${name}: top-level permissions.contents must be "read"`,
    );

    // A workflow that does not opt into pull_request_target must not use it:
    // it would execute with repository secrets on untrusted pull requests.
    const triggers = doc.on ?? doc[true] ?? {};
    assert.ok(
      !('pull_request_target' in triggers),
      `${name}: pull_request_target must not be used`,
    );
  }
});

test('every workflow action is pinned to a full commit SHA', () => {
  const shaPattern = /^[0-9a-f]{40}$/;
  for (const file of workflows) {
    const doc = yaml.load(fs.readFileSync(file, 'utf8'));
    const uses = collectUses(doc);
    assert.ok(uses.length > 0, `${path.basename(file)}: no actions are used`);
    for (const reference of uses) {
      if (reference.startsWith('./')) continue;
      const [action] = reference.split('@');
      assert.ok(action, `${path.basename(file)}: malformed action reference "${reference}"`);
      const [, sha] = reference.split('@');
      assert.match(
        sha ?? '',
        shaPattern,
        `${path.basename(file)}: action "${action}" is not pinned to a full commit SHA`,
      );
    }
  }
});

test('no workflow step silently tolerates failures', () => {
  for (const file of workflows) {
    const name = path.basename(file);
    const doc = yaml.load(fs.readFileSync(file, 'utf8'));

    for (const value of collectBooleanKeys(doc, 'continue-on-error')) {
      assert.notEqual(
        value,
        true,
        `${name}: continue-on-error must not be enabled (the pipeline is fail-closed)`,
      );
    }
  }
});

test('no workflow job runs without a timeout', () => {
  for (const file of workflows) {
    const name = path.basename(file);
    const doc = yaml.load(fs.readFileSync(file, 'utf8'));
    const jobs = doc.jobs ?? {};
    assert.ok(Object.keys(jobs).length > 0, `${name}: no jobs declared`);
    for (const [jobId, job] of Object.entries(jobs)) {
      // A job that calls a reusable workflow inherits its timeout from the
      // called workflow; GitHub does not allow `timeout-minutes` there.
      if (typeof job.uses === 'string') continue;
      assert.ok(
        typeof job['timeout-minutes'] === 'number' && job['timeout-minutes'] > 0,
        `${name}: job "${jobId}" must declare a positive timeout-minutes`,
      );
    }
  }
});

test('workflow scripts do not read repository secrets in plain run steps', () => {
  const secretPattern = /\$\{\{\s*secrets\./;
  for (const file of workflows) {
    const name = path.basename(file);
    const doc = yaml.load(fs.readFileSync(file, 'utf8'));
    for (const script of collectRunScripts(doc)) {
      assert.doesNotMatch(
        script,
        secretPattern,
        `${name}: repository secrets must not be interpolated into run scripts`,
      );
    }
  }
});

test('workflow scripts never mask the failure of a security scanner', () => {
  // A scanner may report findings without failing (for example `npm audit`
  // exits non-zero when it finds an advisory). Swallowing that exit code with
  // `|| true` would disable the gate, so it is banned for scanner commands.
  const scannerPattern =
    /\b(semgrep|bandit|bearer|njsscan|gitleaks|trufflehog|osv-scanner|npm audit|pip-audit|checkov|trivy|grype|spectral|schemathesis|zizmor|actionlint|hadolint|dockle|kics|syft)\b/;

  for (const file of workflows) {
    const name = path.basename(file);
    const doc = yaml.load(fs.readFileSync(file, 'utf8'));
    for (const script of collectRunScripts(doc)) {
      for (const line of script.split('\n')) {
        if (!scannerPattern.test(line)) continue;
        assert.doesNotMatch(
          line,
          /\|\|\s*true/,
          `${name}: the failure of a security scanner must not be swallowed ("${line.trim()}")`,
        );
      }
    }
  }
});

test('every security scanner invocation is followed by an explicit gate', () => {
  const scannerPattern =
    /\b(semgrep|bandit|bearer|njsscan|gitleaks|trufflehog|osv-scanner|npm audit|pip-audit|checkov|trivy|grype|spectral|schemathesis|zizmor|actionlint|hadolint|dockle|kics|syft)\b/;
  const gatePattern =
    /baseline-check\.sh|--exit-code|--fail\b|fail-severity|--error\b|--audit-level|--min-severity|--failure-threshold|--strict\b|exit 1/;
  // Installing a scanner is not running it.
  const installPattern = /\b(pip|npm|uv)\s+(install|ci|add)\b/;

  for (const file of workflows) {
    const name = path.basename(file);
    const doc = yaml.load(fs.readFileSync(file, 'utf8'));
    for (const job of Object.values(doc.jobs ?? {})) {
      if (typeof job.uses === 'string') continue;
      for (const step of collectSteps(job)) {
        // A step that only prepares the environment mentions the scanner
        // without running it.
        if (PREPARATION_STEP.test(step.name)) continue;

        const gated = step.run
          .split('\n')
          .filter((line) => !installPattern.test(line))
          .join('\n');
        if (!scannerPattern.test(gated)) continue;
        assert.match(
          gated,
          gatePattern,
          `${name}: the step "${step.name}" runs a security scanner but defines no explicit gate`,
        );
      }
    }
  }
});

test('every scanner image is pinned by digest', () => {
  // A moving tag lets the finding set change underneath the recorded
  // baseline. The baseline mechanism cannot tell such a drift apart from a
  // real regression, so every scanner image has to be pinned by digest.
  const pinFile = path.join(REPO_ROOT, '.github', 'scanner-images.env');
  assert.ok(fs.existsSync(pinFile), `missing scanner image pins: ${pinFile}`);

  const assignments = fs
    .readFileSync(pinFile, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  assert.ok(assignments.length > 0, 'the scanner image pin file declares no image');

  for (const assignment of assignments) {
    const match = /^([A-Z0-9_]+)=(.+?)(?:\s+#.*)?$/.exec(assignment);
    assert.ok(match, `malformed assignment in the scanner image pin file: ${assignment}`);
    const [, variable, reference] = match;
    assert.match(
      reference,
      /^[^@\s]+@sha256:[0-9a-f]{64}$/,
      `${variable} must be pinned to a digest (image@sha256:...), got: ${reference}`,
    );
  }
});

test('the workflows and the baseline generator use the pinned scanner images', () => {
  // The image reference has to come from the pin file. A literal tag in a
  // workflow would bypass the pin and reintroduce the drift.
  const literalImagePattern =
    /\b(?:ghcr\.io|docker\.io|quay\.io)\/[^\s"'\\]+\/[^\s"'\\]+:[A-Za-z0-9._-]+/;
  const tagOnlyPattern = /\b[a-z0-9.-]+\/[a-z0-9._/-]+:(?:latest|v[0-9][A-Za-z0-9._-]*)\b/;

  const sources = [
    ...workflows,
    path.join(REPO_ROOT, 'scripts', 'ci', 'update-baselines.sh'),
  ];

  for (const file of sources) {
    const name = path.basename(file);
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(
      content,
      literalImagePattern,
      `${name}: a scanner image must be referenced through the pin file, not by a literal tag`,
    );
    assert.doesNotMatch(
      content,
      tagOnlyPattern,
      `${name}: a scanner image must be pinned by digest, not by a tag`,
    );
  }
});

test('a job that invokes a host scanner installs that scanner', () => {
  // A scanner that is invoked but never installed dies with "command not
  // found". The job then fails for a reason that has nothing to do with the
  // code under test, and the real result of the gate stays hidden.
  for (const file of workflows) {
    const name = path.basename(file);
    const doc = yaml.load(fs.readFileSync(file, 'utf8'));
    const jobs = doc.jobs ?? {};

    for (const [jobId, job] of Object.entries(jobs)) {
      if (typeof job.uses === 'string') continue;
      const steps = collectSteps(job);
      const allScripts = steps.map((step) => step.run).join('\n');
      const invocationScripts = steps
        .filter((step) => !PREPARATION_STEP.test(step.name))
        .map((step) => step.run)
        .join('\n');

      for (const [scanner, installation] of Object.entries(HOST_SCANNERS)) {
        // The scanner has to appear as a command, not as the name of an
        // install step.
        const invocation = new RegExp(`(^|[\\s|;&(])${scanner}(\\s|$)`, 'm');
        if (!invocation.test(invocationScripts)) continue;

        assert.match(
          allScripts,
          installation,
          `${name}: the job "${jobId}" invokes ${scanner} but never installs it`,
        );
      }
    }
  }
});

test('the CI job and the baseline generator use the same Bearer options', () => {
  // The scanner result has to be reproducible. The dependency tree changes
  // the analysis of Bearer, so the pipeline and the baseline generator have
  // to exclude it in exactly the same way.
  const workflow = fs.readFileSync(
    path.join(WORKFLOW_DIR, 'security.yml'),
    'utf8',
  );
  const generator = fs.readFileSync(
    path.join(REPO_ROOT, 'scripts', 'ci', 'update-baselines.sh'),
    'utf8',
  );

  const optionsPattern = /--skip-path\s+([^\s\\]+)/g;
  const workflowOptions = [...workflow.matchAll(optionsPattern)].map((m) => m[1]);
  const generatorOptions = [...generator.matchAll(optionsPattern)].map((m) => m[1]);

  assert.ok(workflowOptions.length > 0, 'the Bearer scan does not exclude any path');
  assert.deepEqual(
    [...generatorOptions].sort(),
    [...workflowOptions].sort(),
    'the Bearer scan of the pipeline and of the baseline generator must use the same exclusions',
  );
});

test('the TruffleHog history scan covers the complete history', () => {
  // A placeholder hash does not resolve, and the scanner then reports an
  // error instead of a result. The scan has to start at the root commit.
  const workflow = fs.readFileSync(
    path.join(WORKFLOW_DIR, 'security.yml'),
    'utf8',
  );

  assert.doesNotMatch(
    workflow,
    /0000000000000000000000000000000000000000/,
    'the TruffleHog scan must not use a placeholder commit hash',
  );
  assert.match(
    workflow,
    /rev-list --max-parents=0/,
    'the TruffleHog scan must start at the root commit of the repository',
  );
});

test('the TruffleHog exclusion list is a tracked file', () => {
  // The flag takes the path of a file with the exclusion patterns, so the
  // file has to exist in the repository.
  const excludeFile = path.join(
    REPO_ROOT,
    'scripts',
    'ci',
    'trufflehog-exclude-paths.txt',
  );
  assert.ok(fs.existsSync(excludeFile), `missing exclusion list: ${excludeFile}`);
  assert.ok(
    fs.readFileSync(excludeFile, 'utf8').trim().length > 0,
    'the exclusion list is empty',
  );

  const workflow = fs.readFileSync(
    path.join(WORKFLOW_DIR, 'security.yml'),
    'utf8',
  );
  assert.match(
    workflow,
    /--exclude-paths\s+\S*trufflehog-exclude-paths\.txt/,
    'the TruffleHog scan must use the tracked exclusion list',
  );
});
