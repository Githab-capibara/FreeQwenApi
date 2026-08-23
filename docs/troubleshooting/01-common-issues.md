# Common Issues and Solutions

This guide covers the most frequently encountered issues when running FreeQwenApi.

## Anti-Bot / CAPTCHA Issues

### Symptom: "chatId does not exist" or empty responses

**Root Cause:** Qwen's anti-bot system detected automated traffic and blocked the request.

**Solution:**

1. **Reduce request frequency** — Qwen rate-limits aggressive polling:
   ```bash
   # Increase jitter in .env
   REQUEST_JITTER_MIN_MS=3000
   REQUEST_JITTER_MAX_MS=8000
   ```

2. **Use browser-based fetch** (default) — Node.js fetch is more likely to trigger CAPTCHA:
   ```bash
   # Ensure this is set to 0
   QWEN_USE_NODE_FETCH=0
   ```

3. **Add more accounts** for round-robin rotation:
   ```bash
   npm run auth -- --add
   ```

4. **Wait 30-60 minutes** — temporary blocks usually auto-resolve.

### Symptom: Slider CAPTCHA appears (x5sec / baxia)

**Root Cause:** Alibaba Cloud WAF flagged the session for behavioral analysis.

**Solution:**

- The project includes an x5sec solver that attempts automatic CAPTCHA resolution.
- If the solver fails, manually solve the CAPTCHA in the browser window.
- After solving, the session should continue normally.

### Symptom: Puppeteer hangs on navigation

**Root Cause:** Anti-bot challenge caused the page to stall.

**Solution:**

1. Set `QWEN_USE_NODE_FETCH=1` for faster error returns (trade-off: more CAPTCHAs).
2. Increase timeouts in `.env`:
   ```bash
   PAGE_TIMEOUT=180000
   PROTOCOL_TIMEOUT=400000
   ```
3. Restart the server to clear stuck browser sessions.

---

## Rate Limiting Issues

### Symptom: 429 "You've reached the upper limit for today's usage"

**Root Cause:** Qwen Chat account hit daily usage limits.

**Solution:**

1. **Add more accounts** — FreeQwenApi rotates accounts automatically:
   ```bash
   npm run auth -- --add
   ```

2. **Check account status:**
   ```bash
   curl http://localhost:3264/api/status
   ```

3. **Wait for reset** — Qwen limits typically reset every 24 hours.

### Symptom: All accounts show INVALID status

**Root Cause:** Tokens have expired across all accounts.

**Solution:**

```bash
# Re-login to all accounts
npm run auth -- --relogin
```

---

## Token Expiry Issues

### Symptom: "Unauthorized" or 401 errors

**Root Cause:** Qwen Chat session tokens expire after a period of inactivity.

**Solution:**

```bash
# Re-authenticate the affected account
npm run auth -- --relogin
```

**Prevention:** Use the proxy regularly to keep sessions alive. Tokens typically last 7-30 days with active use.

---

## Model-Related Issues

### Symptom: "model not found" or unknown model errors

**Root Cause:** The requested model is not available in the current model list.

**Solution:**

1. **Sync the latest model list:**
   ```bash
   npm run models:sync
   ```

2. **Check available models:**
   ```bash
   curl http://localhost:3264/api/models
   ```

3. **Use a known working model:**
   ```bash
   # Recommended models
   qwen3.7-max      # Best quality
   qwen3.7-plus     # Faster, lighter
   qwen3-coder-plus # Coding tasks
   qwen3-vl-plus    # Images/video
   ```

### Symptom: Model list is empty or outdated

**Root Cause:** Model sync has not been run, or Qwen changed their model metadata format.

**Solution:**

```bash
npm run models:sync
```

If sync fails, check the report at `docs/setup/03-model-sync-summary.md`.

---

## Connection / Network Issues

### Symptom: Server not starting / port in use

**Root Cause:** Another process is using port 3264.

**Solution:**

```bash
# Use a different port
PORT=3265 npm start
```

Or kill the existing process:
```bash
lsof -i :3264
kill <PID>
```

### Symptom: CORS errors from browser clients

**Root Cause:** Browser-based clients require explicit CORS origin allowlisting.

**Solution:**

```bash
# In .env, add your exact origin
CORS_ORIGINS=https://ui.example.com,http://192.168.1.20:3000
```

---

## File Upload Issues

### Symptom: File upload returns error or file_id is invalid

**Root Cause:** File upload requires an authenticated Qwen Chat session. Python entrypoint cannot safely verify account ownership.

**Solution:**

- Use the **Node.js entrypoint** for file uploads.
- Ensure the account used for upload is in `OK` status.
- Re-upload files after server restart — file bindings are in-memory only.

---

## Video Generation Issues

### Symptom: Video task never completes / status stays "processing"

**Root Cause:** Qwen video generation can take 2-10 minutes. If it exceeds `TASK_POLL_MAX_ATTEMPTS`, polling stops.

**Solution:**

1. **Increase poll attempts:**
   ```bash
   TASK_POLL_MAX_ATTEMPTS=180
   TASK_POLL_INTERVAL=3000
   ```

2. **Use client-side polling** instead of server-side wait:
   ```bash
   # Submit without wait
   curl -d '{"wait": false, ...}' http://localhost:3264/api/videos/generations
   
   # Poll manually
   curl http://localhost:3264/api/tasks/status/TASK_ID?wait=true
   ```

---

## Docker Issues

### Symptom: Container starts but API is unreachable

**Root Cause:** Account was not added before container start (no GUI inside container).

**Solution:**

```bash
# Add account on host first
npm run auth

# Then start container with session volume mounted
docker compose up -d
```

### Symptom: "session directory not found" in Docker

**Root Cause:** The `session/` volume is not mounted correctly.

**Solution:**

Ensure `docker-compose.yml` includes:
```yaml
volumes:
  - ./session:/app/session
```

---

## Agent / Tool-Use Issues

### Symptom: Agent responds with text instead of calling tools

**Root Cause:** The `tools` parameter was not sent, or `QWEN_TOOL_PROMPT_MODE` is not set correctly.

**Solution:**

1. **Ensure tools are sent in the request:**
   ```json
   {
     "tools": [{"type": "function", "function": {"name": "my_tool", "parameters": {...}}}],
     "tool_choice": "auto"
   }
   ```

2. **Start server with minimal tool prompt mode:**
   ```bash
   QWEN_TOOL_PROMPT_MODE=minimal npm start
   ```

3. **For heavy agents (OpenClaw, Claude Code), increase system char limit:**
   ```bash
   QWEN_MAX_SYSTEM_CHARS=180000 npm start
   ```

### Symptom: Tool calls are truncated

**Root Cause:** `QWEN_MAX_SYSTEM_CHARS` is too low for the agent's system prompt.

**Solution:**

```bash
QWEN_MAX_SYSTEM_CHARS=180000 npm start
```

---

## Getting Help

If your issue is not covered here:

1. Check the [Security Analysis](../security/README.md) for anti-bot details.
2. Check the [API Reference](../api/README.md) for endpoint details.
3. Run diagnostics:
   ```bash
   curl http://localhost:3264/api/health
   curl http://localhost:3264/api/status
   ```
4. Check server logs in `logs/` directory.
