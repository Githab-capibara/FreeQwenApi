# 01. Monitoring Guide

- **Status:** Active
- **Date:** 2026-08-25
- **Owner:** @ForgetMeAI

## Purpose

Monitoring and observability for FreeQwenApi: health endpoints, status endpoints, and the logging system.

## Overview

Observability is built from three parts: Winston-based application logging to `logs/`, Morgan HTTP request logging, and JSON health/status endpoints suitable for probes.

## Details

### Health and status endpoints

| Endpoint | Use | Checks |
|----------|-----|--------|
| `GET /api/health` | liveness probe (`ok: true/false`) | available accounts > 0 |
| `GET /api/status` | detailed account states | per-account `OK` / `WAIT` / `INVALID` |
| `GET /api/images/status`, `/api/videos/status` | media subsystems | API availability |

**`/api/health` response shape (from `src/api/routes.js`):**

```json
{
  "ok": true,
  "service": "FreeQwenApi",
  "baseUrl": "/api",
  "models": 28,
  "accounts": { "total": 3, "available": 2, "invalid": 0, "waiting": 1 },
  "timestamp": "2026-08-25T12:00:00.000Z"
}
```

`ok` is `true` only when at least one account is neither invalid nor rate-limit-waiting — wire your probe to this field, not to HTTP 200 alone.

### Logging system (`src/logger/index.js`)

Winston with custom levels: `error` → `warn` → `info` → `http` → `debug` → `raw`. Level controlled by `LOG_LEVEL` env var; console output is colorized, file output is plain.

**Log files in `logs/` (rotation via `LOG_MAX_SIZE` / `LOG_MAX_FILES`):**

| File | Level | Content |
|------|-------|---------|
| `combined.log` | all up to `LOG_LEVEL` | full application log |
| `error.log` | `error` only | errors for alerting |
| `http.log` | `http` | Morgan request/response lines |
| `raw-responses.log` | `raw` | unmodified upstream Qwen payloads for debugging |

### What to watch

- **Account health:** rising `invalid` or `waiting` counts in `/api/health` → run `npm run auth -- --relogin`.
- **Anti-bot pressure:** repeated captcha / x5sec mentions in logs → see [Troubleshooting](../troubleshooting/01-common-issues.md).
- **Upstream anomalies:** inspect `raw-responses.log` when responses look malformed.
- **Request pacing:** adaptive timing messages indicate throttling is active (see [Adaptive Timing](../reference/03-internal-modules.md)).

## References

- [API Endpoints Reference](../api/01-api-endpoints-reference.md)
- [Operations Runbook](../operations/01-operations-runbook.md)
- [Troubleshooting](../troubleshooting/01-common-issues.md)

## Status

- **Last updated:** 2026-08-25
- **Owner:** @ForgetMeAI
