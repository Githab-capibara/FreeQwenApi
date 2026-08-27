# 01. Contributors Guide

- **Status:** Active
- **Date:** 2026-08-25
- **Owner:** @Githab-capibara

## Purpose

Practical onboarding path for new contributors: environment setup, what to work on, and the quality bar for a merged PR.

## Overview

Contributions are welcome via issues and pull requests. The full rules live in [governance/01-contributing.md](../governance/01-contributing.md); this guide is the hands-on companion.

## Details

### Environment setup

```bash
git clone <your-fork> && cd FreeQwenApi
npm install
cp .env.example .env
npm run auth          # add at least one Qwen Chat account
NON_INTERACTIVE=1 SKIP_ACCOUNT_MENU=1 npm start
npm run smoke         # verify the stack end-to-end
```

### Where to look first

| Area | Entry point |
|------|-------------|
| API routes | `src/api/routes.js` + [API Reference](../api/01-api-endpoints-reference.md) |
| Browser/anti-bot layer | `src/browser/` + [Security docs](../security/README.md) |
| Account rotation | `src/api/tokenManager.js`, `src/api/accountAffinity.js` + [ADR 02](../adr/02-multi-account-rotation.md) |
| Python entrypoint | `main.py` + [Python Entrypoint Reference](../reference/05-python-entrypoint.md) |

### PR quality bar

1. `npm test` passes — all suites under `tests/`.
2. Behavior changes update the matching doc under `docs/` **and** its folder `README.md` index.
3. New architectural decisions come with an ADR in `docs/adr/` (Nygard format, sequential two-digit numbering, use the folder `template.md`).
4. File names: lowercase kebab-case, numbered per folder, English only.
5. Never commit secrets: `session/`, `.env`, `Authorization.txt`.

### Commit etiquette

- Keep commits atomic and describe *why*, not just *what*.
- Reference the issue number when applicable.

## References

- [Contributing](../governance/01-contributing.md)
- [Code of Conduct](../governance/02-code-of-conduct.md)
- [Agent Working Principles](../governance/04-agent-principles.md)
- [CI/CD Pipeline](../pipeline/01-ci-cd-pipeline.md)

## Status

- **Last updated:** 2026-08-25
- **Owner:** @Githab-capibara
