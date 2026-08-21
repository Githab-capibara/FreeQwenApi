# Scripts and Tests Reference

Reference documentation for CLI scripts and test suites in FreeQwenApi.

## CLI Scripts

All scripts are in `/scripts/` at the project root.

### auth.js — Account Management

**npm command:** `npm run auth`

Interactive account management for Qwen Chat authentication.

**Actions:**
- `--add` — add a new Qwen Chat account (opens browser for login)
- `--list` — list all configured accounts
- `--relogin` — re-authenticate an existing account
- `--remove` — remove an account

**Usage:**
```bash
npm run auth                    # Interactive menu
npm run auth -- --add           # Add account
npm run auth -- --list          # List accounts
npm run auth -- --relogin       # Re-login to expired account
npm run auth -- --remove        # Remove an account
```

**Output:** Tokens saved to `session/accounts/<accountId>/token.txt`

---

### smoke_test.js — API Smoke Test

**npm command:** `npm run smoke`

Quick health check for the API.

**What it tests:**
1. Server is running
2. `/api/health` returns valid response
3. `/api/models` returns model list
4. `/api/chat/completions` returns a response
5. Response contains expected fields

**Configuration:**
```bash
# Override test model
QWEN_PROXY_SMOKE_MODEL=qwen3.7-plus npm run smoke
```

---

### sync_models.js — Model Synchronization

**npm command:** `npm run models:sync`

Syncs the available model list from Qwen Chat metadata.

**What it does:**
1. Fetches prerendered model metadata from `https://chat.qwen.ai/`
2. Merges with `src/AvailableModels.txt`
3. Writes report to `docs/setup/03-model-sync-report.md`

**Report includes:**
- Total model count
- New models since last sync
- Removed models
- Model categories (text, vision, code, multimodal)

---

### interactive_chat.js — Interactive Chat

**npm command:** `node scripts/interactive_chat.js`

Interactive terminal chat with Qwen Chat.

**Features:**
- Multi-turn conversation
- System message support
- Model selection
- Stream/non-stream toggle

---

### warmup.js — Browser Warmup

**npm command:** `node scripts/warmup.js`

Pre-warms browser sessions for faster first-request response.

**What it does:**
- Launches browser instances
- Navigates to Qwen Chat
- Validates session tokens
- Reports ready status

**Use case:** Run before demo/recording to avoid cold-start delays.

---

### test_streaming.js — Streaming Test

**npm command:** `node scripts/test_streaming.js`

Tests SSE streaming functionality.

---

### test_direct_qwen.js — Direct Qwen Test

**npm command:** `node scripts/test_direct_qwen.js`

Tests direct Qwen Chat API access (bypassing OpenAI shim).

---

### run_tests.js — Test Runner

**npm command:** `node scripts/run_tests.js`

Runs the full test suite.

---

### cleanup-orphan-chrome.sh — Orphan Chrome Cleanup

**bash command:** `bash scripts/cleanup-orphan-chrome.sh`

Finds and kills orphaned Chrome/Chromium processes.

**Use when:**
- Server was killed but Chrome processes remain
- System has stale browser processes consuming resources

---

### test_api.ps1 — Windows API Test

**PowerShell command:** `.\scripts\test_api.ps1`

Windows PowerShell script for API testing.

---

### addAccount.js — Add Account (Non-Interactive)

**npm command:** `node scripts/addAccount.js`

Non-interactive account addition.

---

## Test Suite

All tests are in `/tests/` at the project root.

### JavaScript Tests

Run with: `npm test`

| Test File | What It Tests |
|-----------|---------------|
| `accountAffinity.test.js` | Account-to-resource affinity tracking |
| `accountRetry.test.js` | Account retry logic on rate limits |
| `apiErrors.test.js` | Error response formatting |
| `chatHelpers.test.js` | Chat helper functions |
| `chatHistorySecurity.test.js` | Chat history isolation and security |
| `defaultModel.test.js` | Default model fallback |
| `keyedQueue.test.js` | Keyed queue and scoped aliases |
| `originPolicy.test.js` | CORS origin validation |
| `toolParser.test.js` | Tool call parsing and normalization |

### Python Tests

| Test File | What It Tests |
|-----------|---------------|
| `test_python_affinity.py` | Python account affinity |
| `test_python_main_affinity.py` | Python main affinity integration |

---

## npm Scripts Summary

| Command | Script | Purpose |
|---------|--------|---------|
| `npm start` | `node index.js` | Start the proxy server |
| `npm test` | `node --test tests/*.test.js` | Run test suite |
| `npm run auth` | `scripts/auth.js` | Account management |
| `npm run models:sync` | `scripts/sync_models.js` | Sync model list |
| `npm run smoke` | `scripts/smoke_test.js` | API smoke test |
| `npm run example:simple` | `examples/openai-sdk/simple.js` | Simple request example |
| `npm run example:stream` | `examples/openai-sdk/streaming.js` | Streaming example |
| `npm run example:system` | `examples/openai-sdk/system-message.js` | System message example |
| `npm run example:image` | `examples/openai-sdk/image-analysis.js` | Image analysis example |
| `npm run example:conversation` | `examples/openai-sdk/conversation.js` | Conversation example |
| `npm run example:compatibility` | `examples/openai-sdk/openai-compatibility.js` | Compatibility test |
| `npm run example:direct` | `examples/direct-api/fetch-example.js` | Direct fetch example |
| `npm run example:axios` | `examples/direct-api/axios-example.js` | Axios example |
| `npm run example:file-upload` | `examples/file-upload/upload-example.js` | File upload example |

---

## Related

- [Quick Start](../guides/01-quickstart.md)
- [API Reference](../api/README.md)
- [Troubleshooting](../troubleshooting/README.md)
