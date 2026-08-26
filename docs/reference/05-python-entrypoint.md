# 05. Python Entrypoint

- **Status:** Active
- **Date:** 2026-08-25
- **Owner:** @ForgetMeAI

## Purpose

Reference for the Python server entrypoint (`main.py`) and its account-affinity helpers (`python_affinity.py`) — an alternative to the Node.js entrypoint (`index.js`).

## Overview

`main.py` implements the same core idea as the Node version: an OpenAI-compatible proxy in front of Qwen Chat. It is built on **FastAPI + httpx**, with **Playwright** used only for interactive login. It is lighter than the Node entrypoint (no persistent browser per request) but has fewer endpoints.

## Details

### Running

```bash
pip install -r requirements.txt   # fastapi, uvicorn, playwright, httpx, openai, python-dotenv, python-multipart
python main.py                    # interactive menu: login / run server
```

### Endpoints (subset of the Node router)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/chat/completions`, `/api/v1/chat/completions` | `405` hint to use POST |
| POST | `/api/chat/completions`, `/api/v1/chat/completions` | streaming + non-streaming |
| POST | `/api/chat` | legacy alias |
| GET | `/api/models` | model list from Qwen metadata |

### Core functions (`main.py`)

| Function | Purpose |
|----------|---------|
| `load_tokens()` / `save_tokens()` | read/write `session/tokens.json` |
| `_is_token_available()` | availability check with rate-limit windows |
| `get_available_token(excluded_...)` | round-robin token selection with exclusions |
| `mark_invalid_token()` / `mark_rate_limited_token()` | failover bookkeeping |
| `login_interactive()` | Playwright-driven interactive login |
| `create_qwen_chat()` / `create_chat_v2` flow | upstream chat creation |
| `build_qwen_payload()` | OpenAI → Qwen payload translation |
| `execute_qwen_completion()` | streaming completion execution |
| `_execute_completion_with_failover()` | retry across accounts on failure |
| `_authorize_proxy_request()` | proxy API key check (`src/Authorization.txt`) |
| `_build_stateless_transcript()` | folds full OpenAI history into one prompt |

### Account affinity (`python_affinity.py`)

Dependency-free module mirroring the Node `accountAffinity.js` + `keyedQueue.js` behavior:

| Symbol | Purpose |
|--------|---------|
| `ChatBinding` | frozen dataclass: `account_id`, `upstream_chat_id`, `lock_key` |
| `ChatAffinityRegistry` | bounded LRU (10 000 entries) mapping chat aliases → account bindings; **never stores bearer tokens**; repoints tombstones within a lock domain so queued requests survive chat-id replacement after failover |
| `StripedAsyncLockPool` | striped async locks for per-account serialization |

Tests: `tests/test_python_affinity.py`, `tests/test_python_main_affinity.py`.

### Differences from the Node.js entrypoint

- No `/api/messages` Anthropic shim, no `/api/responses` Responses API, no image/video generation, no file upload.
- Python cannot safely verify account ownership of uploaded files, so file attachments are rejected by design — use the Node.js entrypoint for uploads.
- Chat/task/file bindings live only in process memory; after restart an unknown chat id is safely replaced with a new chat.

## References

- [Internal Modules Reference](03-internal-modules.md) — Node-side counterparts
- [Environment Variables](01-environment-variables.md)
- [ADR 02 — Multi-Account Rotation](../adr/02-multi-account-rotation.md)
- [Scripts and Tests](04-scripts-and-tests.md)

## Status

- **Last updated:** 2026-08-25
- **Owner:** @ForgetMeAI
