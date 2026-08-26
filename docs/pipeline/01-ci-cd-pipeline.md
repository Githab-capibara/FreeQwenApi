# 01. CI/CD Pipeline

- **Status:** Active
- **Date:** 2026-08-25
- **Owner:** @ForgetMeAI

## Purpose

How changes are verified and released in FreeQwenApi. Documents the actual, local verification pipeline and the Docker release path.

## Overview

The repository currently has **no hosted CI runner** (no `.github/workflows/`). Verification is executed locally before every push; the release artifact is the Docker image built from `Dockerfile`.

## Details

### Local verification pipeline

Run in this order before committing:

| Step | Command | Gate |
|------|---------|------|
| 1. Unit tests | `npm test` | all Node tests in `tests/*.test.js` pass (`node --test`) |
| 2. Server start | `NON_INTERACTIVE=1 SKIP_ACCOUNT_MENU=1 npm start` | boots without errors |
| 3. Smoke check | `npm run smoke` | live round-trip against Qwen Chat returns a valid completion |
| 4. Model sync | `npm run models:sync` | model list refreshes from upstream metadata |

Python-side tests (affinity helpers) run via `tests/test_python_affinity.py` and `tests/test_python_main_affinity.py`.

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

### Release flow

1. Land verified PR on `main`.
2. Build the image: `docker compose up --build -d` (see [Deployment Guide](../deployment/01-deployment-guide.md)).
3. Verify inside the container: mount `session/`, then `curl http://localhost:3264/api/health`.

### Adding hosted CI later

When a hosted runner is introduced, it should mirror the local pipeline exactly: `npm ci && npm test` plus an optional smoke job gated behind a repository secret holding `session/tokens.json`. Update this document together with the workflow file.

## References

- [Scripts and Tests Reference](../reference/04-scripts-and-tests.md)
- [Contributors Guide](../contributors/01-contributors-guide.md)
- [Deployment Guide](../deployment/01-deployment-guide.md)

## Status

- **Last updated:** 2026-08-25
- **Owner:** @ForgetMeAI
