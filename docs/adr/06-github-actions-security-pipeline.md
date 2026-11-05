# 06. Run the Security Pipeline on GitHub Actions

- **Status:** Accepted
- **Date:** 2026-11-05
- **Deciders:** @Githab-capibara
- **Related:** [CI/CD Pipeline](../pipeline/01-ci-cd-pipeline.md), [Security Policy](../../SECURITY.md)

## Context

FreeQwenApi is a proxy that mediates access to Qwen Chat through a headless
browser. It ships a Node.js/Express server, a Python/FastAPI entrypoint, a
container image and a browser-automation layer that handles account rotation
and anti-bot challenges.

Until now the repository had no hosted CI runner at all. Verification was a
manual, local procedure: a maintainer ran the unit tests, started the server,
performed a smoke test against the live upstream service and pushed. That
procedure has two structural weaknesses.

First, it is not reproducible. A contributor cannot know which checks a change
must pass before opening a pull request, and a reviewer cannot tell whether the
checks were actually run. Nothing links a specific commit to a specific
verification result.

Second, and more seriously, it is not fail-closed with respect to security.
A security check that a maintainer forgets to run is indistinguishable from a
security check that passes. The project handles bearer credentials, upstream
account tokens and client-supplied file uploads; it pulls in a large
dependency tree; it builds a container image that contains a browser runtime.
None of these properties were verified automatically.

We want a pipeline that covers ten security areas, uses at least three
independent tools per area, and fails the build whenever a tool detects a
problem. Two additional constraints shape the decision.

The first constraint is **actionability**. A pipeline that is permanently red
gets ignored, which is functionally identical to no pipeline at all. The
repository already carries real, pre-existing findings: 29 high and critical
vulnerabilities in the container image, 22 advisories in the npm tree, four
Bandit findings, and so on. A gate that fails on all of them from day one
would never be read again.

The second constraint is **scope discipline**. The request was explicitly for
CI/CD only: the logic of the application must not change. Every gate therefore
has to be satisfiable against the current code base without touching
`src/`, `index.js` or `main.py`.

## Decision

We run the security pipeline on GitHub Actions and make it fail-closed.

Every workflow is reusable (`workflow_call:`). `scheduled.yml` invokes exactly
the same definitions on a weekly schedule, so a new advisory, a new leaked
credential or a new base-image CVE breaks the build even when no pull request
is opened. The area-to-tool mapping is recorded in
`.github/security-areas.json` and is validated by the test suite: an area that
drops below three tools, or a tool that the pipeline no longer invokes, fails
the build.

Pre-existing findings are recorded in `.security-baseline/` and in
`.gitleaks-baseline.json`. `scripts/ci/baseline-check.sh` compares a scanner
report against its baseline and exits non-zero when the report contains a
finding that the baseline does not list. The policy is asymmetric on purpose:
**new** findings always fail, while known findings are reported and tracked.
Regenerating a baseline is a reviewed change that carries the diff of the
accepted debt, never a way to make CI green.

Checks that must never tolerate a finding have no baseline at all: the
working-tree secret scan, the TruffleHog scans, `pip-audit`, Hadolint, the
container secret scan, the runtime authentication-enforcement check, the
OpenAPI lint, and the workflow linters.

A scanner that fails is treated like a scanner that found a problem, never
like a scanner that found nothing. `scripts/ci/baseline-check.sh` rejects a
report that is missing, empty, malformed, or that lacks the section in which
the scanner stores its findings, and `scripts/ci/run-semgrep.sh` fails the
job when Semgrep itself fails. The rule set lives in exactly one place, so
the recorded baseline always describes the scan that the pipeline performs.

Every scanner image is pinned to an immutable digest in
`.github/scanner-images.env`, and the CI jobs and the baseline generator read
that file. A moving tag would let the finding set change underneath the
baseline, and the baseline mechanism cannot distinguish such a drift from a
real regression. The drift is not hypothetical: between two runs of the same
commit, the `:latest` tag of the Bearer image changed the finding set, which
would have been read as a silent removal of a finding.

Two decisions deserve their own justification.

**The OpenAPI contract becomes a first-class artifact.** The contract in
`openapi/openapi.yaml` is the single source of truth for the API surface. It
is linted by Redocly and Spectral, compared against the base reference by
oasdiff, fuzzed against a running instance by Schemathesis and reconciled with
the actual router by `scripts/ci/verify-api-contract-parity.sh`.

**The DAST scan runs through a bearer-injecting proxy.** OWASP ZAP derives
its requests from the OpenAPI document. The document contains no
`Authorization` header, so ZAP never sends one, and every protected endpoint
answers `401` — the dynamic scan would collect nothing but rejections.
`scripts/ci/auth-proxy.js` sits between ZAP and the server and injects the
header, so the scan exercises the authenticated surface as a real client does.
The scan itself is limited to the endpoints that answer deterministically
without the upstream Qwen service, because the completion endpoints retry a
failed upstream call several times and would make an active scan of the whole
contract run for hours. The scope is derived from the canonical contract by
`scripts/ci/build-dast-spec.js` rather than maintained as a second document.

**A newly published advisory is remediated, not baselined.** The gate did its
job the first time it ran against a fresh advisory database: Trivy reported a
new `apt` advisory and three new `js-yaml` advisories that the baseline did
not list, and the build failed. The remediation is part of the build
definition rather than the application logic: the `Dockerfile` upgrades the
Debian packages of the base image, and `package.json` carries an `overrides`
entry that moves `js-yaml` — which reaches the production tree through
`puppeteer → cosmiconfig` — to a version without the advisory. A baseline is
extended only for a finding that a maintainer has reviewed and accepted, not
for a finding that has a fix.

## Consequences

- **Easier:** every change is verified by the same procedure on every
  machine; a reviewer sees the gate results attached to the commit; a new
  vulnerability in a dependency or a base image is detected without anybody
  remembering to look; the accepted security debt is explicit, reviewable and
  measurable.
- **Harder:** the pipeline takes time on every push and consumes runner
  minutes; the baselines must be maintained when a scanner changes its
  output format or when a dependency is upgraded; every scanner image has to
  be re-pinned by hand when a new version is wanted, and the affected
  baseline has to be regenerated and reviewed; the ten-area matrix and the
  workflow policy tests add maintenance surface of their own; the DAST scope
  has to be revisited if the upstream-dependent endpoints become testable.
- **Given up:** the freedom to introduce findings without an immediate red
  build, and the "everything is fine" default that the absence of a runner
  provided. We also give up the simplicity of a single flat workflow: the
  pipeline is split into reusable workflows so that the schedule can re-run
  exactly what a pull request runs.
- **Migration:** none is required for existing deployments. Contributors
  should run `node --test tests/security/*.test.js` and the Python pipeline
  policy test locally before pushing; the maintainer updates a baseline
  whenever an accepted finding is resolved, which shrinks the baseline and
  makes the pipeline stricter over time.

## Alternatives considered

- **Option A: keep verification local only** — rejected because a check that
  depends on the memory of a maintainer is not a control. It cannot be
  enforced, audited or attributed to a commit.
- **Option B: fail on every finding, with no baseline** — rejected because the
  repository has substantial pre-existing debt. A permanently red pipeline
  trains reviewers to ignore it, which is worse than no pipeline because it
  creates a false sense of coverage.
- **Option C: `continue-on-error` for the noisy scanners** — rejected outright.
  It is indistinguishable from removing the gate, and it makes the difference
  between "the scanner found nothing" and "the scanner was not consulted"
  invisible in the job log.
- **Option D: one monolithic workflow** — rejected because the scheduled
  re-run would then duplicate the entire definition, and the two copies would
  drift. Reusable workflows keep the pull-request run and the weekly run
  identical by construction.
- **Option E: a commercial security platform** — rejected because it would
  move the verification out of the repository, where it is not visible in the
  review diff, and it would not cover the project-specific checks that matter
  here (contract parity, runtime authentication enforcement, the DAST proxy).
- **Option F: scan the whole contract with ZAP** — rejected because the
  completion endpoints depend on the upstream Qwen service. Without it the
  application retries the failed call several times, and an active scan of the
  full contract does not finish within a sensible job budget. The deterministic
  subset is derived from the canonical contract instead, so the scope cannot
  drift away from the documented API surface.
