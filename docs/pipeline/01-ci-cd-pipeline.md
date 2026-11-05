# 01. CI/CD Pipeline

- **Status:** Accepted
- **Date:** 2026-08-25
- **Deciders:** @Githab-capibara
- **Related:** [ADR-06 — Run the security pipeline on GitHub Actions](../adr/06-github-actions-security-pipeline.md)

## Purpose

How changes are verified and released in FreeQwenApi. Documents the hosted
security pipeline, the local verification pipeline and the Docker release path.

## Overview

Every push and pull request runs the **fail-closed** GitHub Actions pipeline in
`.github/workflows/`. A security gate fails the build when it detects a problem:
no gate is allowed to swallow its exit status, and the workflow policy is
enforced by tests in `tests/security/` so that a weakening of the pipeline is
visible in the review diff.

The pipeline covers ten security areas, each with at least three independent
tools. The mapping is machine-readable in
[`.github/security-areas.json`](../../.github/security-areas.json) and is
validated by `tests/security/coverageMatrix.test.js` and
`tests/security/test_ci_pipeline_policy.py`.

### Coverage matrix

| # | Security area | Tools | Gate |
|---|---------------|-------|------|
| 1 | First-party source code (SAST) | Semgrep, NodeJSScan, Bandit, CodeQL | new findings fail the build |
| 2 | Third-party dependencies (SCA) | `npm audit`, `pip-audit`, OSV-Scanner, Trivy, Dependabot | new advisories fail the build |
| 3 | Secrets and credentials | Gitleaks (tree and history), TruffleHog, Semgrep `p/secrets`, Trivy secret scanner | any secret fails the build |
| 4 | IaC and deployment configuration | Hadolint, Checkov, Trivy config, Docker Compose config validation | new findings fail the build |
| 5 | Container image and artifacts | Trivy, Grype, Dockle, Syft SBOM | new findings fail the build; the image must contain no secrets |
| 6 | Taint and data-flow analysis | Bearer, Semgrep, CodeQL | new findings fail the build |
| 7 | Authentication and authorization | runtime auth-enforcement check, Bearer, Semgrep, CodeQL | a bypass fails the build |
| 8 | API contract correctness | Spectral, Redocly, oasdiff, Schemathesis, contract parity check | contract drift fails the build |
| 9 | HTTP hardening and headers | OWASP ZAP, Semgrep, Checkov, Trivy config | new findings fail the build |
| 10 | CI/CD pipeline integrity | actionlint, zizmor, pinact, OpenSSF Scorecard | any finding fails the build |

### Workflow layout

| Workflow | Purpose |
|----------|---------|
| `ci.yml` | Unit tests, security regression tests, lock-file and contract parity |
| `security.yml` | Secrets, SAST, taint analysis, SCA, IaC scanning |
| `codeql.yml` | GitHub-native deep analysis with SARIF upload |
| `container.yml` | Image build, image scanning, SBOM generation |
| `api-security.yml` | OpenAPI lint, contract tests, DAST, runtime auth enforcement |
| `supply-chain.yml` | Workflow lint and hardening, OpenSSF Scorecard |
| `scheduled.yml` | Weekly re-run of every reusable workflow |

Every workflow is reusable (`workflow_call:`), and `scheduled.yml` calls the
same definitions. The weekly run therefore applies exactly the gates that
guard a pull request: a new advisory, a new secret or a new base-image CVE
breaks the build even when no pull request was opened.

## Enforcement policy

### Baselines

The repository carries known, pre-existing findings. Recording them keeps the
pipeline actionable instead of permanently red, while still failing on every
**new** finding.

- `.security-baseline/*.json` — Semgrep, Bandit, NodeJSScan, Bearer, Checkov,
  `npm audit`, OSV-Scanner, Trivy image, Grype image, Dockle.
- `.gitleaks-baseline.json` — the seven secret-shaped strings that already
  exist in the Git history.

`scripts/ci/baseline-check.sh` compares a scanner report with its baseline and
exits non-zero when the report contains a finding that the baseline does not
list. `scripts/ci/update-baselines.sh` regenerates the baselines; it is a
reviewed change, never a way to make CI green.

### Strict gates

The following checks have no baseline and therefore fail on any finding:

- Gitleaks over the working tree (`dir` mode).
- TruffleHog over the Git history and the working tree.
- `pip-audit` (the Python dependency tree currently has no advisory).
- Hadolint on the `Dockerfile`.
- The secret scan of the built container image.
- The runtime authentication-enforcement check.
- Spectral and Redocly on the OpenAPI contract.
- actionlint, zizmor and pinact on the workflows.

### Scanner failures are never findings

A baseline gate distinguishes three outcomes: a **new finding** fails the
build, a **known finding** is reported and passes, and a **scanner failure**
fails the build as well. A scanner that crashes must not be mistaken for a
scanner that found nothing.

`scripts/ci/baseline-check.sh` therefore rejects a report that is missing,
empty, not a JSON document, or that lacks the section in which the scanner
stores its findings. `npm audit` is the clearest example: when the registry is
unreachable it writes a valid JSON document that carries an error message but
no `vulnerabilities` object. Without that check the dependency gate would
answer "green" while the registry was down.

The same principle applies to Semgrep. `scripts/ci/run-semgrep.sh` is the
single definition of the rule set: the CI job and the baseline generator both
call it, so the recorded baseline always describes the scan that the pipeline
performs. The runner omits `--error`, because that flag would turn a finding
into a scanner failure and bypass the baseline comparison, and it fails the
job when the scanner itself fails.

### Scanner images are pinned by digest

`.github/scanner-images.env` holds the container image of every scanner. Each
entry is pinned to an immutable digest, and both the CI jobs and the baseline
generator read the file, so a scan always runs against exactly the image that
the recorded baseline describes.

A moving tag would let the finding set change underneath the baseline, and
the baseline mechanism cannot tell such a drift apart from a real regression.
The drift is not hypothetical: a `:latest` tag of the Bearer image changed the
finding set between two runs of the same commit, which would have looked like
a silent removal of a finding.

To update a pin, resolve the tag and replace the digest:

```bash
docker buildx imagetools inspect <image>:<tag> --format '{{.Manifest.Digest}}'
```

Then regenerate the affected baseline and review the diff:

```bash
scripts/ci/update-baselines.sh
```

The regeneration is idempotent: running it twice in a row must not change a
single baseline file.

### Workflow hardening

- Every action is pinned to a full commit SHA; `pinact` enforces this.
- Every scanner image is pinned to a digest; `tests/security/workflowPolicy.test.js`
  enforces this.
- `permissions.contents: read` at the workflow level; a job raises permissions
  only where it needs them, with an explanatory comment.
- `pull_request_target` is not used anywhere.
- No `continue-on-error`, no `|| true` on a scanner command.
- Every job declares a `timeout-minutes` budget.
- `persist-credentials: false` on every checkout.
- Repository secrets are never interpolated into a `run` script.

## Details

### Local verification pipeline

Run in this order before committing:

| Step | Command | Gate |
|------|---------|------|
| 1. Unit tests | `npm test` | all Node tests in `tests/*.test.js` pass (`node --test`) |
| 2. Python tests | `python -m unittest discover -s tests -p 'test_*.py' -v` | all Python tests pass |
| 3. Security regression tests | `node --test tests/security/*.test.js` and `python -m unittest discover -s tests/security -p 'test_*.py' -v` | the pipeline policy is intact |
| 4. Server start | `NON_INTERACTIVE=1 SKIP_ACCOUNT_MENU=1 npm start` | boots without errors |
| 5. Smoke check | `npm run smoke` | live round-trip against Qwen Chat returns a valid completion |
| 6. Model sync | `npm run models:sync` | model list refreshes from upstream metadata |

### Test suite coverage

| Suite | Area |
|-------|------|
| `accountAffinity.test.js`, `accountRetry.test.js` | account-to-resource binding and failover |
| `apiErrors.test.js` | error mapping |
| `chatHelpers.test.js`, `toolParser.test.js` | prompt/tool-call parsing |
| `chatHistorySecurity.test.js` | history scoping per client credentials |
| `keyedQueue.test.js` | scoped conversation aliases |
| `originPolicy.test.js` | CORS origin allowlist |
| `defaultModel.test.js` | default model resolution |
| `tests/security/workflowPolicy.test.js` | workflow hardening policy |
| `tests/security/securityBaseline.test.js` | baseline integrity |
| `tests/security/openapiContract.test.js` | OpenAPI contract shape |
| `tests/security/coverageMatrix.test.js` | the ten-area coverage matrix |
| `tests/security/dastSpec.test.js` | the DAST scope derived from the contract |
| `tests/security/authProxy.test.js` | the bearer-injecting proxy used by the DAST scan |
| `tests/security/test_ci_pipeline_policy.py` | pipeline assets and shell helpers |

### API security run

`api-security.yml` starts the proxy against a local mock of the upstream Qwen
service, so the run never touches a production account.

| Step | Tool | What it proves |
|------|------|----------------|
| Contract lint | Redocly, Spectral | the OpenAPI document is valid and complete |
| Breaking changes | oasdiff | the contract did not break against the base ref |
| Runtime auth | `scripts/ci/verify-api-auth-enforcement.sh` | protected routes answer 401 without a credential and 200 with one |
| Property-based tests | Schemathesis | the responses conform to the contract |
| DAST | OWASP ZAP | the authenticated surface has no new dynamic finding |

Two implementation details are worth knowing:

- **The auth proxy.** ZAP derives its requests from the OpenAPI document and
  cannot attach an `Authorization` header that the document does not contain.
  `scripts/ci/auth-proxy.js` sits between ZAP and the server and injects the
  bearer header, so the dynamic scan exercises the protected endpoints instead
  of collecting 401 responses.
- **The DAST scope.** The completion endpoints forward to the upstream Qwen
  service, which is absent in CI; the application retries such a call several
  times, which would make an active scan of the whole contract run for hours.
  `scripts/ci/build-dast-spec.js` derives a smaller document from the
  canonical `openapi/openapi.yaml` that contains only the deterministic
  endpoints. The contract stays single-sourced.

### Image pipeline

`container.yml` builds the image, verifies that no credential material is
baked into a layer, scans the result with Trivy, Grype and Dockle, compares the
findings with the image baselines and publishes an SPDX SBOM as a build
artifact.

The `Dockerfile` upgrades the Debian packages of the base image before it
installs Chromium. Without that step the image keeps the `apt` version of the
base image, and a newly published advisory against `apt` would block every
build until the base image tag happened to move. The upgrade keeps the OS
packages current at build time instead of at release time.

The Node.js dependency tree is pinned with an `overrides` entry for `js-yaml`.
The package reaches the production tree through `puppeteer → cosmiconfig`, so
a direct development dependency alone would not have moved the version that
the image actually ships.

### Release flow

1. Land a verified pull request on `main`; every gate must be green.
2. Build the image: `docker compose up --build -d` (see
   [Deployment Guide](../deployment/01-deployment-guide.md)).
3. Verify inside the container: mount `session/`, then
   `curl http://localhost:3264/api/health`.

## References

- [ADR-06 — Run the security pipeline on GitHub Actions](../adr/06-github-actions-security-pipeline.md)
- [Scripts and Tests Reference](../reference/04-scripts-and-tests.md)
- [Security Policy](../../SECURITY.md)
- [Contributors Guide](../contributors/01-contributors-guide.md)
- [Deployment Guide](../deployment/01-deployment-guide.md)

## Status

- **Last updated:** 2026-11-05
- **Deciders:** @Githab-capibara
