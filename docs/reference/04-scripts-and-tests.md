# 04. Scripts and Tests Reference

- **Status:** Accepted
- **Date:** 2026-08-25
- **Deciders:** @Githab-capibara

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
3. Writes output to `docs/setup/03-model-sync-summary.md`

**Output includes:**
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

### Security Pipeline Tests

The files in `/tests/security/` guard the CI/CD pipeline itself. They run in
the `Security regression tests` job and locally with:

```bash
node --test tests/security/*.test.js
python -m unittest discover -s tests/security -p 'test_*.py' -v
```

| Test File | What It Tests |
|-----------|---------------|
| `workflowPolicy.test.js` | Workflow hardening: SHA pins, permissions, timeouts, fail-closed gates |
| `securityBaseline.test.js` | Baseline files exist, stay sorted and are compared fail-closed |
| `openapiContract.test.js` | Shape and completeness of the OpenAPI contract |
| `coverageMatrix.test.js` | Ten security areas, each covered by at least three invoked tools |
| `dastSpec.test.js` | The DAST scope is derived from the canonical contract |
| `authProxy.test.js` | The bearer-injecting proxy used by the OWASP ZAP scan |
| `test_ci_pipeline_policy.py` | Pipeline assets, shell helpers and the coverage matrix (standard library only) |

---

## CI Helper Scripts

The files in `/scripts/ci/` implement the security pipeline. They are invoked
by the workflows in `.github/workflows/`, not by the application.

| Script | Purpose |
|--------|---------|
| `baseline-check.sh` | Compares a scanner report with its baseline; exits non-zero on a new finding |
| `update-baselines.sh` | Regenerates the baselines in `.security-baseline/` |
| `run-semgrep.sh` | Runs Semgrep with the rule set that both CI and the baseline generator use |
| `verify-api-auth-enforcement.sh` | Proves that protected routes answer 401 without a credential and 200 with one |
| `verify-api-contract-parity.sh` | Reconciles the OpenAPI contract with the Node router and the Python entrypoint |
| `verify-no-secrets-in-image.sh` | Proves that no credential material is baked into the container image |
| `auth-proxy.js` | Injects the bearer header between OWASP ZAP and the API server |
| `build-dast-spec.js` | Derives the DAST subset of the OpenAPI contract |
| `trufflehog-exclude-paths.txt` | Paths that TruffleHog leaves out, so a local scan and a CI scan describe the same tree |

The container image of every scanner is pinned to a digest in
`.github/scanner-images.env`. The workflows and `update-baselines.sh` read
that file, so a scan always runs against exactly the image that the recorded
baseline describes.

---

## Pipeline Configuration Files

| File | Purpose |
|------|---------|
| `.github/scanner-images.env` | Digest pins of every scanner container image |
| `.github/security-areas.json` | Machine-readable mapping of the ten security areas to their tools |
| `.github/dependabot.yml` | Weekly update proposals for the dependency and action surface |
| `.github/CODEOWNERS` | Mandatory reviewers for the pipeline assets |
| `.semgrep.yml` | Repository-specific Semgrep rules |
| `.spectral.yaml` | Spectral ruleset for the OpenAPI contract |
| `.bandit`, `.njsscan` | Scanner configuration |
| `.gitleaks.toml`, `.gitleaks-baseline.json` | Secret rules and the accepted history findings |
| `schemathesis.toml` | Property-based testing configuration |
| `.security-baseline/` | Accepted pre-existing findings, one JSON array and one readable list per scanner |

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
| `npm run example:streaming-test` | `examples/streaming-test.js` | Streaming latency test |
| `node examples/test-features.js` | `examples/test-features.js` | t2t / t2i / t2v feature smoke |
| `node examples/test-video-polling.js` | `examples/test-video-polling.js` | Video polling mode comparison |

---

## Related

- [Quick Start](../guides/01-quick-start-guide.md)
- [API Reference](../api/README.md)
- [CI/CD Pipeline](../pipeline/01-ci-cd-pipeline.md)
- [Troubleshooting](../troubleshooting/README.md)
