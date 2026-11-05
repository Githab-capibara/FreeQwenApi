# Security Policy

FreeQwenApi is a community proxy that mediates access to Qwen Chat through a
headless browser. This file describes how vulnerabilities in the proxy itself
are handled and how the automated security pipeline protects the repository.

## Reporting a Vulnerability

Please **do not** open a public issue for a security vulnerability.

Report privately through one of the following channels:

- [GitHub Security Advisories](https://github.com/Githab-capibara/FreeQwenApi/security/advisories/new)
  (preferred), or
- Telegram: [t.me/forgetmeai](https://t.me/forgetmeai)

Include the affected file or endpoint, a minimal reproduction, and the impact
you observed. You can expect an acknowledgement within a few days.

The detailed triage process, supported versions and scope notes live in
[docs/governance/03-security-policy.md](docs/governance/03-security-policy.md).

## Scope

In scope:

- The proxy implementation under `src/`, `index.js`, `main.py` and
  `python_affinity.py`.
- The CI/CD pipeline under `.github/` and the security tooling under
  `scripts/ci/`.
- The container image definition (`Dockerfile`, `docker-compose.yml`).

Out of scope:

- Vulnerabilities in the upstream Qwen Chat service or in its anti-bot
  controls.
- Issues that require an attacker to already control the host, the container
  or the operator's credential store.

## Automated Security Pipeline

Every push and pull request runs the following gates. A gate fails the build
when it detects a problem; no gate is allowed to swallow its exit status.

| Area | Tools | Gate |
|------|-------|------|
| Static analysis (SAST) | CodeQL, Semgrep, NodeJSScan, Bandit | new findings fail the build |
| Dependency analysis (SCA) | OSV-Scanner, `npm audit`, `pip-audit`, Trivy, Dependabot | new advisories fail the build |
| Secret scanning | Gitleaks (tree and history), TruffleHog, Semgrep `p/secrets`, Trivy secret scanner | any secret fails the build |
| IaC and configuration | Checkov, Trivy config, Hadolint, Docker Compose config validation | new findings fail the build |
| Container image | Trivy, Grype, Dockle, Syft SBOM | new findings fail the build; the image must contain no secrets |
| Taint and data-flow | Bearer, Semgrep, CodeQL | new findings fail the build |
| Authentication and authorization | runtime auth-enforcement check, Bearer, Semgrep, CodeQL | a bypass fails the build |
| API contract | Spectral, Redocly, oasdiff, Schemathesis, OWASP ZAP | contract drift or a failing API test fails the build |
| HTTP hardening and headers | OWASP ZAP, Semgrep, Checkov, Trivy config | new findings fail the build |
| Pipeline security | actionlint, zizmor, pinact, OpenSSF Scorecard | any finding fails the build |

The mapping of areas to tools is machine-readable in
[`.github/security-areas.json`](.github/security-areas.json) and is enforced by
the test suite in `tests/security/`.

Pre-existing findings are tracked in `.security-baseline/` and
`.gitleaks-baseline.json`. The baselines record the current debt; any finding
that is **not** in the baseline fails the build. Shrinking a baseline is a
reviewed change, never a way to make CI green.

## Credential Handling

- Client API keys live in `src/Authorization.txt`, which is excluded from
  version control and from the container image.
- Upstream account tokens live in `session/` and are likewise excluded.
- Never commit credentials, signed URLs or bearer tokens — not even in
  documentation examples. The pipeline scans the working tree and the full
  Git history for exactly this reason.

## Security Advisories

Security fixes are applied to the latest `main` branch. Dependabot, the
scheduled audit workflow and the GitHub secret-scanning and push-protection
features are enabled for the repository and cover dependency, credential and
workflow drift respectively.

The `main` branch is protected: a pull request can only be merged when every
security gate has reported a successful result, and the branch requires a
linear history without force pushes.
