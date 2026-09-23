# 03. Internal Modules Reference

- **Status:** Active
- **Date:** 2026-08-25
- **Deciders:** @Githab-capibara

Reference documentation for key internal modules in FreeQwenApi.

## Core Configuration

### config.js — Central Configuration

Single source of truth for every tunable value. Reads environment variables once at import time, applies defaults, and exports frozen constants consumed by the rest of the codebase (`import { PORT } from './config.js'`).

**Key exports:**
- Endpoint overrides — `CHAT_API_URL`, `CREATE_CHAT_URL`, `CHAT_PAGE_URL`, `TASK_STATUS_URL`, `STS_TOKEN_API_URL`, `AUTH_SIGNIN_URL`, `OSS_SDK_URL`
- Timeouts — `PAGE_TIMEOUT`, `PROTOCOL_TIMEOUT`, `AUTH_TIMEOUT`, `NAVIGATION_TIMEOUT`, `RETRY_DELAY`, `ANTI_BOT_COOLDOWN_MS`
- Concurrency / pacing — `PAGE_POOL_SIZE`, `GLOBAL_REQUEST_CONCURRENCY`, `ACCOUNT_CONCURRENCY`, `REQUEST_JITTER_MIN_MS`, `REQUEST_JITTER_MAX_MS`
- Server — `HOST`, `PORT`, `DEFAULT_MODEL`, `LOG_LEVEL`
- Paths — `SESSION_DIR`, `UPLOADS_DIR`, `LOGS_DIR`

**Note:** `config.js` is the intended single source of truth, but a few modules still read `process.env` directly (`chat.js` → `QWEN_SLOT_WAIT_MS`, `proxyManager.js` → `PROXY_LIST_FILE`, `routes.js` → `DASHSCOPE_API_KEY`). Prefer routing new knobs through `config.js`, and document every variable in [`01-environment-variables.md`](01-environment-variables.md).

---

## API Modules

### chatHistory.js — Chat History Management

Manages persistent chat history storage and conversation lifecycle.

**Key functions:**
- `initHistoryDirectory()` — creates `session/history/` directory
- `generateChatId()` — generates UUID-based chat identifiers
- `createChat(chatName)` — creates a new chat with metadata
- `loadChat(chatId)` — loads chat history from disk
- `saveChat(chatId, messages)` — persists conversation to disk
- `deleteChat(chatId)` — removes chat history

**Storage location:** `session/history/<chatId>.json`

**Security:** Chat history is scoped to client credentials to prevent cross-account data leakage.

---

### toolParser.js — Tool Call Parsing

Parses tool calls from Qwen Chat responses and converts them to OpenAI-compatible format.

**Key functions:**
- `stripReasoning(text)` — removes `` and `<thinking>...</thinking>` blocks
- `stripTrailingCommas(text)` — fixes malformed JSON with trailing commas
- `parseToolCalls(text)` — extracts tool call blocks from model output
- `normalizeToolArgumentValue(value)` — normalizes argument values

**Supported formats:**
- JSON code fences: ` ```json {...} ``` `
- XML tags: `<tool_call> {...} </tool_call> `
- Raw JSON objects
- Multiple tool calls in single response

**Caveats:**
- Qwen may emit thinking blocks before tool calls — these are stripped
- Trailing commas in JSON are auto-corrected
- Tool call accuracy depends on `QWEN_TOOL_PROMPT_MODE` setting

---

### originPolicy.js — CORS Origin Policy

Validates browser origins for cross-origin requests.

**Key functions:**
- `normalizeOrigin(origin)` — normalizes origin strings (strips trailing slashes)
- `isLoopbackHostname(hostname)` — checks if hostname is loopback (localhost, 127.0.0.1, ::1)
- `parseAllowedOrigins(value)` — parses comma-separated origin allowlist
- `isBrowserOriginAllowed(origin, allowedOrigins)` — validates origin against allowlist

**Configuration:**
```bash
# In .env:
CORS_ORIGINS=https://ui.example.com,http://192.168.1.20:3000
```

**Behavior:**
- Loopback origins (localhost, 127.0.0.1) are always allowed
- Remote origins require explicit allowlisting
- Empty `CORS_ORIGINS` = only loopback allowed

---

### keyedQueue.js — Keyed Request Queue

Manages per-account request queuing with scoped conversation aliases.

**Key functions:**
- `createScopedConversationAlias(value, clientScope, namespace)` — creates deterministic chat IDs from client credentials
- `fingerprintClientCredential(value)` — SHA256 fingerprint of client credentials
- `matchesClientCredential(candidate, allowedCredentials)` — validates client credential match

**Purpose:**
- Prevents conversation state mixing between different clients
- Ensures account-resource affinity in multi-account setups
- Provides deterministic chat ID generation for session restoration

---

### accountAffinity.js — Resource-to-Account Binding

Binds resources (chat IDs, file IDs) to a specific account so that a follow-up request lands on the account that owns the state. Complements `tokenManager.js` round-robin rotation: rotation picks a fresh account for new conversations, affinity keeps existing conversations pinned.

**Key functions:**
- `snapshotAccountToken(tokenObj)` — returns a frozen `{ id, token }` snapshot or `null`
- `createAccountAffinityRegistry({ maxEntries = 10000 })` — LRU-bounded `Map` with `bind` / `get` / `forget`; refuses to re-bind a resource to a different account
- `resolveChatRequestContext({ chatId, parentId, affinityRegistry, getAccountToken, selectToken })` — resolves which account + token a chat request must use; returns `reusedChat: true` when affinity held, otherwise selects a new token and reports `resetReason`

**Why it matters:** without affinity, round-robin would route a follow-up message to an account that has no history for that `chatId`, and Qwen would answer with `chatId does not exist` or an empty response.

---

### modelMapping.js — Model Name Mapping

Translates between OpenAI model names and Qwen Chat model identifiers.

**Key functions:**
- `mapModelName(openaiModel)` — translates OpenAI-style model names to Qwen Chat models
- `getAvailableModels()` — returns list of available models from `src/AvailableModels.txt`
- `syncModelsFromQwen()` — fetches latest model list from Qwen Chat metadata

**Default mappings:**
| OpenAI Name | Qwen Model |
|-------------|------------|
| `gpt-4` | `qwen3.7-max` |
| `gpt-4-turbo` | `qwen3.7-plus` |
| `gpt-3.5-turbo` | `qwen3.6-plus` |

---

### adaptiveTiming.js — Adaptive Request Timing

Implements adaptive request delay based on recent request history.

**Key functions:**
- `AdaptiveRequestTimer.getNextDelay()` — calculates delay based on recent request count

**Behavior:**
- Base interval: 3000ms
- Multiplier increases with recent request count:
  - >5 requests/min: 2x
  - >10 requests/min: 4x
  - >15 requests/min: 8x
- Random jitter: ±30% of calculated delay

**Purpose:** Reduces anti-bot detection by mimicking human pacing patterns.

---

### apiErrors.js — Error Handling

Standardized error responses for API endpoints.

**Error types:**
- `RateLimitError` — 429 status
- `UnauthorizedError` — 401 status
- `BadRequestError` — 400 status
- `InternalServerError` — 500 status
- `ServiceUnavailableError` — 503 status

---

### fileUpload.js — File Upload Handling

Manages file uploads for Qwen Chat analysis.

**Key functions:**
- `handleUpload(file, account)` — uploads file to Qwen Chat
- `getFileUrl(fileId)` — retrieves CDN URL for uploaded file
- `validateFile(file)` — validates file size and type

**Limits:**
- Max file size: `MAX_FILE_SIZE` (default 10MB)
- Supported types: PDF, TXT, images, documents

**Note:** File uploads require Node.js entrypoint — Python entrypoint cannot safely verify account ownership.

---

### imageGeneration.js — Image Generation

Handles image generation via Qwen Chat or DashScope.

**Providers:**
- `qwen-chat` — default, uses Qwen Chat's built-in image generation
- `dashscope` — legacy DashScope API mode

**Supported sizes (Qwen Chat):**
- Aspect ratios: `16:9`, `9:16`, `1:1`, `4:3`
- OpenAI-style sizes (`1024x1024`, `1792x1024`) are converted to aspect ratios

---

### tokenManager.js — Token Management

Manages multi-account token rotation.

**Key functions:**
- `addToken(token, accountId)` — adds a new account token
- `getNextToken()` — returns next token in round-robin rotation
- `markTokenInvalid(token)` — marks a token as invalid
- `getAccountStatus(token)` — returns account status (OK/WAIT/INVALID)

**Rotation strategy:** Round-robin with automatic failover on rate limits.

---

### chat.js — Upstream Qwen Chat Client

The core request layer: builds Qwen Chat requests, drives the browser (or Node fetch), streams responses, and handles anti-bot recovery. Consumed by `routes.js`.

**Key exports:**
- `sendMessage(message, model, chatId, parentId, files, tools, toolChoice, systemMessage, chatType, size, waitForCompletion, retryCount, onChunk, resetMessage, clientScope, forceBrowserFetch)` — main entry point; handles account selection, request build, streaming, and retries
- `getAllModels()` / `isValidModel(model)` / `getAvailableModelsFromFile()` — model list from `src/AvailableModels.txt`
- `getApiKeys()` / `extractAuthToken()` — client-key and upstream auth handling
- `pagePool` — Puppeteer page pool shared across requests (`PAGE_POOL_SIZE`)
- `pollTaskStatus()` / `pollQwenTaskStatus()` — image/video task polling
- `selectRequestAccount()` / `retryAfterAccountSwitch()` — account selection and account-switch retry on rate limits
- `preflightFileRequest()` / `resolveFileAccountId()` — keeps file attachments on the owning account
- `isQwenAntiBotBody()` — detects Qwen anti-bot challenge responses

**Env read directly:** `QWEN_SLOT_WAIT_MS`.

---

### routes.js — Express API Router

Defines every HTTP endpoint exposed under `/api` (mounted in `index.js` as `app.use('/api', apiRoutes)`). Thin layer: parses the request, delegates to `chat.js` / `imageGeneration.js` / `tokenManager.js`, and shapes the OpenAI/Anthropic/Responses-compatible response.

**Notable route groups:**
- Chat: `/chat/completions`, `/v1/chat/completions`, `/chat`, `/chats`, `/chats/:chatId/history`
- Anthropic shim: `/messages`, `/v1/messages`
- Responses API: `/responses`
- Models: `/models`, `/v1/models`, `/models/:model`
- Media: `/images/generations`, `/images/models`, `/images/status`, `/videos/generations`, `/videos/models`, `/videos/status`, `/tasks/status/:taskId`
- Files: `/files/upload`, `/files/getstsToken`
- Ops: `/`, `/health`, `/status` (exposed externally as `/api`, `/api/health`, `/api/status`), plus `POST /show` and `POST /api/show` aliases (exposed as `/api/show` and `/api/api/show`)

**Export:** `export default router` (line 2790).

**Env read directly:** `DASHSCOPE_API_KEY`.

---

## Browser Modules

### proxyManager.js — Proxy Rotation

Manages proxy server rotation for browser sessions.

**Key functions:**
- `loadProxiesFromFile()` — loads proxy list from `proxies.txt`
- `getRandomProxy()` — returns random proxy from the list
- `validateProxy(proxy)` — validates proxy format

**Proxy format:** `user:pass@ip:port`

---

### session.js — Session Management

Manages browser session lifecycle and token persistence.

**Key functions:**
- `saveSession(accountId, tokens, cookies)` — persists session to disk
- `loadSession(accountId)` — restores session from disk
- `clearSession(accountId)` — removes session data
- `isSessionValid(accountId)` — checks if session is still valid

**Storage:** `session/accounts/<accountId>/`

---

### userAgentRotator.js — User-Agent Rotation

Provides randomized User-Agent, Accept-Language, and Timezone values.

**Key functions:**
- `getRandomUserAgent()` — returns random UA from 19 variants
- `getRandomAcceptLanguage()` — returns random Accept-Language header
- `getRandomTimezone()` — returns random timezone
- `parseUserAgent(ua)` — parses browser/OS from UA string

**UA variants:** Windows Chrome, Windows Firefox, macOS Chrome, macOS Safari, Linux Chrome/Firefox

---

### x5secSolver.js — CAPTCHA Solver

Solves Alibaba x5sec/baxia slider CAPTCHAs.

**Key functions:**
- `buildTrajectory(startX, endX, steps)` — generates human-like mouse trajectory
- `solveCaptcha(page)` — automated CAPTCHA solving flow

**Trajectory features:**
- Initial pause: 150-400ms
- Quadratic acceleration
- Micro-corrections (sin wave)
- Random pauses mid-movement
- Final pause: 200-500ms
- Jitter: 2-5px

---

### browser.js — Browser Management

Main browser lifecycle management.

**Key functions:**
- `launchBrowser()` — launches Puppeteer with stealth configuration
- `getPage()` — gets or creates a browser page
- `closeBrowser()` — cleans up browser instance

**Configuration:**
- Stealth plugin enabled
- WebDriver masking
- Fingerprint randomization
- User-Agent rotation

**Header overrides:** the page-level `setExtraHTTPHeaders()` sets only `Accept-Language` and `Accept`. Do **not** add `Sec-Fetch-*` headers there: as of Chromium ~148 overriding them makes every subresource fail with `net::ERR_INVALID_ARGUMENT` (see [Troubleshooting — UI never loads](../troubleshooting/01-common-issues.md)).

---

### auth.js — Interactive Authentication

Qwen Chat sign-in helpers. Used indirectly by `npm run auth`: `browser.js` calls `startManualAuthentication()` to open the sign-in page, while `chat.js` / `routes.js` call `checkAuthentication()` / `checkVerification()` at runtime to detect expired or challenged sessions.

**Key functions:**
- `checkAuthentication(context)` — determines whether the current browser context is authenticated
- `startManualAuthentication(context, skipRestart = false)` — opens the Qwen sign-in page and waits for the user to complete login in the visible browser
- `checkVerification(page)` — detects a pending verification/challenge screen during login

**Storage:** successful logins are persisted by [`session.js`](#sessionjs--session-management) under `SESSION_DIR`.

---

## Utility Modules

### verificationMarkers.js — Verification Markers

Handles verification challenge detection and marking.

**Key functions:**
- `detectVerificationChallenge(page)` — detects if page shows a verification challenge
- `waitForVerificationComplete(page)` — waits for verification to complete

---

### accountSetup.js — Account Setup

Initializes and validates Qwen Chat accounts.

**Key functions:**
- `setupAccount(token)` — validates and initializes an account
- `validateToken(token)` — checks if token is valid
- `refreshAccount(account)` — refreshes account session

---

### branding.js — Branding

Manages project branding and watermarks.

**Key functions:**
- `getWatermark()` — returns project watermark string
- `applyWatermark(response)` — adds watermark to API responses

**Watermark:** `t.me/forgetmeai`

---

### prompt.js — Prompt Utilities

Utility functions for prompt construction.

---

## Logger

### logger/index.js — Logging System

Structured logging for the application.

**Log levels:** `error`, `warn`, `info`, `debug`

**Functions:**
- `logError(message)` — error level
- `logWarn(message)` — warning level
- `logInfo(message)` — info level
- `logDebug(message)` — debug level

**Configuration:** `LOG_LEVEL` environment variable

---

## Related

- [API Reference](../api/README.md)
- [Architecture](../adr/README.md)
- [Environment Variables](01-environment-variables.md)
