# 01. Operations Runbook

- **Status:** Active
- **Date:** 2026-08-25
- **Owner:** @Githab-capibara

## Purpose

Day-to-day operational procedures for running FreeQwenApi: start/stop, account lifecycle, backups, and recovery.

## Overview

State lives in three on-disk locations — `session/` (tokens and browser profiles), `logs/`, and `uploads/`. Everything else is stateless and reproducible from a fresh checkout.

## Details

### Start / stop (Node entrypoint)

```bash
# Daemon-friendly start
NON_INTERACTIVE=1 SKIP_ACCOUNT_MENU=1 npm start

# Stop
Ctrl+C  # or: docker compose down
```

For agents, prefer the explicit env form from the [Quick Start](../guides/01-quick-start-guide.md).

### Account lifecycle

| Task | Command |
|------|---------|
| Add account | `npm run auth -- --add` |
| List accounts | `npm run auth -- --list` |
| Re-login expired account | `npm run auth -- --relogin` |
| Remove account | `npm run auth -- --remove` |
| Refresh model list | `npm run models:sync` |
| Verify API health | `npm run smoke` |

Account states are visible via `GET /api/status`; see [Monitoring Guide](../monitoring/01-monitoring-guide.md).

### Backup / restore

```bash
# Backup state (tokens + browser profiles)
tar czf session-backup.tar.gz session/

# Restore
tar xzf session-backup.tar.gz
```

Never commit or publish `session/` — it contains bearer tokens. See the security notes in the main README.

### Recovery procedures

| Symptom | Action |
|---------|--------|
| All accounts `INVALID` in `/api/status` | `npm run auth -- --relogin` for each account; tokens expire over time |
| `chatId does not exist` errors | benign after restart — chat bindings live only in process memory; unknown chat ids are safely replaced with new chats |
| Uploaded files lost after restart | by design — re-upload private files; old task ids cannot be polled |
| Chromium zombie processes | `scripts/cleanup-orphan-chrome.sh` |

### Data locations

| Path | Content | Persist? |
|------|---------|----------|
| `session/tokens.json` | account tokens | yes, back up |
| `session/accounts/<id>/` | per-account browser profiles | yes, back up |
| `session/history/` | chat history JSONs | optional |
| `logs/` | Winston logs (see [Monitoring](../monitoring/01-monitoring-guide.md)) | rotate/discard |
| `uploads/` | temporary upload staging | discardable |

## References

- [Deployment Guide](../deployment/01-deployment-guide.md)
- [Monitoring Guide](../monitoring/01-monitoring-guide.md)
- [Troubleshooting](../troubleshooting/01-common-issues.md)
- [Scripts and Tests Reference](../reference/04-scripts-and-tests.md)

## Status

- **Last updated:** 2026-08-25
- **Owner:** @Githab-capibara
