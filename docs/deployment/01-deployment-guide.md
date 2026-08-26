# 01. Deployment Guide

- **Status:** Active
- **Date:** 2026-08-25
- **Owner:** @ForgetMeAI

## Purpose

Instructions for deploying FreeQwenApi locally via Docker Compose (recommended) or npm.

## Overview

Two deployment paths share one prerequisite: accounts must be added **on the host first**, because there is no GUI for Qwen Chat login inside the container.

## Details

### Prerequisites (both paths)

```bash
cp .env.example .env   # review and adjust
npm install
npm run auth           # interactive Chromium login; saves tokens to session/
npm run models:sync    # refresh model list
```

### Docker Compose (recommended)

```bash
docker compose up --build -d
curl http://localhost:3264/api/health
```

What `docker-compose.yml` actually sets:

| Setting | Value | Why |
|---------|-------|-----|
| image | `qwen-api-proxy:latest` built from local `Dockerfile` | no registry pull |
| `HOST` | `0.0.0.0` | reachable from outside the container |
| `SKIP_ACCOUNT_MENU` | `true` | headless-friendly start |
| ports | `${PORT:-3264}:3264` | host port configurable via `.env` |
| volumes | `./session`, `./logs`, `./uploads` | state survives rebuilds |

**Do not remove the `session/` mount** — without it tokens are lost on every restart.

### Dockerfile internals (`node:20-slim`)

- Installs system **chromium** + required shared libs; `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true` and `CHROME_PATH=/usr/bin/chromium` force Puppeteer to use it.
- `npm ci --omit=dev` for production deps only.
- Creates non-root user `appuser`; app dirs `/app/session`, `/app/logs`, `/app/uploads` are pre-created and owned by it.
- Entrypoint: `node index.js`.

### Bare-metal / npm

```bash
NON_INTERACTIVE=1 SKIP_ACCOUNT_MENU=1 HOST=127.0.0.1 PORT=3264 npm start
```

Default bind is loopback. For intentional LAN exposure set `HOST=0.0.0.0`, configure client keys in `src/Authorization.txt`, and restrict browser origins with `CORS_ORIGINS`.

### Python entrypoint (alternative)

```bash
pip install -r requirements.txt && python main.py
```

Feature subset — see [Python Entrypoint Reference](../reference/05-python-entrypoint.md).

### Post-deploy verification

```bash
curl http://localhost:3264/api/health   # ok:true, accounts.available >= 1
npm run smoke                           # end-to-end completion check
```

## References

- [Operations Runbook](../operations/01-operations-runbook.md)
- [Monitoring Guide](../monitoring/01-monitoring-guide.md)
- [Environment Variables](../reference/01-environment-variables.md)

## Status

- **Last updated:** 2026-08-25
- **Owner:** @ForgetMeAI
