# Environment Variables Reference

Complete reference for all `.env` configuration options in FreeQwenApi.

> **Note:** Copy `.env.example` to `.env` before editing:
> ```bash
> cp .env.example .env
> ```

## Server

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Listen address for the local proxy. Use `0.0.0.0` for network access. |
| `PORT` | `3264` | Listen port for the API endpoint. |
| `CORS_ORIGINS` | *(loopback only)* | Comma-separated list of allowed browser origins. Required for remote browser UIs. |
| `NON_INTERACTIVE` | `1` | Skip interactive account menu. Use for agents, Docker, systemd/launchd. |
| `SKIP_ACCOUNT_MENU` | `1` | Same as `NON_INTERACTIVE`. |
| `DEFAULT_MODEL` | `qwen3.7-max` | Default model when client does not specify one. |
| `LOG_LEVEL` | `info` | Logging verbosity: `error`, `warn`, `info`, `debug`. |

## Qwen Chat / Browser Identity

| Variable | Default | Description |
|----------|---------|-------------|
| `QWEN_BASE_URL` | `https://chat.qwen.ai` | Qwen Chat base URL. Usually does not need changing. |
| `QWEN_WEB_VERSION` | `0.2.63` | Qwen web app version header. Override if Qwen changes their frontend protocol. |
| `CHROME_PATH` | *(auto-detect)* | Path to Chrome/Chromium binary. |
| `VIEWPORT_WIDTH` | `1920` | Browser viewport width for fingerprint. |
| `VIEWPORT_HEIGHT` | `1080` | Browser viewport height for fingerprint. |
| `USER_AGENT` | Chrome/Windows UA | Browser user agent string. |

## Agent Compatibility / Tool-Use

| Variable | Default | Description |
|----------|---------|-------------|
| `QWEN_TOOL_PROMPT_MODE` | `minimal` | How to embed OpenAI `tools` schemas into the prompt. Options: `compact`, `minimal`, `names`. Use `minimal` for Hermes, OpenCode, Claude Code, Codex, OpenClaw. |
| `QWEN_MAX_SYSTEM_CHARS` | `180000` | Maximum length of the final system prompt after tool instructions. Use `180000` for heavy agent clients. |
| `QWEN_USE_NODE_FETCH` | `0` | Use Node.js `fetch` instead of browser `page.evaluate(fetch)`. Set `1` for debugging (faster errors, more CAPTCHAs). |
| `ALLOW_UNSCOPED_SESSION_CHAT_RESTORE` | `0` | Allow restoring the last unscoped chat/session. Set `0` for agent tests to avoid state mixing. |

## Timeouts / Retries

| Variable | Default | Description |
|----------|---------|-------------|
| `PAGE_TIMEOUT` | `120000` | Puppeteer/page timeout in milliseconds. |
| `PROTOCOL_TIMEOUT` | `300000` | Chrome DevTools Protocol operation timeout in milliseconds. |
| `AUTH_TIMEOUT` | `120000` | Login/navigation timeout in milliseconds. |
| `NAVIGATION_TIMEOUT` | `60000` | Page navigation timeout in milliseconds. |
| `MAX_RETRY_COUNT` | `3` | Number of retries for upstream/browser operations. |
| `RETRY_DELAY` | `2000` | Delay between retries in milliseconds. |
| `STREAMING_CHUNK_DELAY` | `20` | Pause between streaming SSE chunks in milliseconds. |
| `PAGE_POOL_SIZE` | `3` | Size of the Puppeteer page pool. Higher = more throughput but higher anti-bot risk. |

## Paths

| Variable | Default | Description |
|----------|---------|-------------|
| `SESSION_DIR` | `session` | Directory for saved account sessions and tokens. |
| `UPLOADS_DIR` | `uploads` | Directory for uploaded files. |
| `LOGS_DIR` | `logs` | Directory for server logs. |

## Media / Optional Official APIs

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHSCOPE_API_KEY` | *(not set)* | Optional DashScope API key for legacy image mode. Not needed for default Qwen Chat image/video endpoints. |
| `TASK_POLL_MAX_ATTEMPTS` | `90` | Maximum polling attempts for image/video generation tasks. |
| `TASK_POLL_INTERVAL` | `2000` | Interval between polling attempts in milliseconds. |
| `MAX_FILE_SIZE` | `10485760` | Maximum file upload size in bytes (default: 10 MB). |
| `MAX_HISTORY_LENGTH` | `100` | Maximum number of messages in conversation history. |

## Security Notes

- **Do not commit `.env`** — it may contain local paths, API keys, and account/session settings.
- **Do not commit `session/`** — contains tokens, cookies, and browser profiles.
- For intentional network access, set `HOST=0.0.0.0`, add client keys to `src/Authorization.txt`, and list exact browser origins via `CORS_ORIGINS`.

## Related

- [API Reference](../api/README.md)
- [Troubleshooting](../troubleshooting/README.md)
- [Setup Guides](../setup/README.md)
