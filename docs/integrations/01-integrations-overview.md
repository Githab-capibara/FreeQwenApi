# 01. Integrations Overview

- **Status:** Active
- **Date:** 2026-08-25
- **Owner:** @Githab-capibara

## Purpose

Overview of all third-party integrations supported by FreeQwenApi: chat UIs, LLM gateways, and local coding agents.

## Overview

FreeQwenApi exposes two wire protocols:

| Protocol | Endpoint | Used by |
|----------|----------|---------|
| OpenAI Chat Completions | `/api/chat/completions`, `/api/v1/chat/completions` | Open WebUI, LiteLLM, Hermes, OpenCode, OpenClaw, any OpenAI SDK |
| Anthropic Messages (shim) | `/api/messages`, `/api/v1/messages` | Claude Code |
| OpenAI Responses API | `/api/responses` | Codex CLI (`wire_api = "responses"`) |

Tool calling is emulated via a prompt adapter for Qwen Chat — externally it looks like native OpenAI/Anthropic tool use. Start the server with `QWEN_TOOL_PROMPT_MODE=minimal` and `QWEN_MAX_SYSTEM_CHARS=180000` for agent clients.

## Details

### OpenAI SDK / generic clients

```js
import OpenAI from 'openai';
const openai = new OpenAI({ baseURL: 'http://localhost:3264/api', apiKey: 'dummy-key' });
```

Ready examples: [`examples/openai-sdk/`](../../examples/openai-sdk/) and [`examples/direct-api/`](../../examples/direct-api/). See [Node.js Examples](../examples/01-nodejs-examples.md).

### Open WebUI

```text
Base URL: http://localhost:3264/api   (Docker: http://host.docker.internal:3264/api)
API Key: dummy-key
Model: qwen3.7-max
```

Full walkthrough: [Open WebUI Setup](../setup/01-openwebui-setup.md).

### LiteLLM bridge

```yaml
model_list:
  - model_name: qwen3.7-max
    litellm_params:
      model: openai/qwen3.7-max
      api_base: http://127.0.0.1:3264/api
      api_key: dummy-key
```

Ready config: [`examples/litellm/qwen_litellm.yaml`](../../examples/litellm/qwen_litellm.yaml).

### Hermes Agent

Custom OpenAI-compatible provider:

```yaml
custom_providers:
  - name: qwen-free
    base_url: http://127.0.0.1:3264/api
    model: qwen3.7-max
    api_key: dummy-key
```

Ready snippet: [`examples/hermes/config-snippet.yaml`](../../examples/hermes/config-snippet.yaml). Continuations with `role: "tool"` are folded into a Qwen-understandable prompt.

### OpenCode

Pass a one-shot provider via `OPENCODE_CONFIG_CONTENT` using `@ai-sdk/openai-compatible`:

```bash
export OPENCODE_CONFIG_CONTENT='{"$schema":"https://opencode.ai/config.json","provider":{"freeqwen":{"npm":"@ai-sdk/openai-compatible","name":"FreeQwenApi","options":{"baseURL":"http://127.0.0.1:3264/api","apiKey":"dummy-key"},"models":{"qwen3.7-max":{"name":"qwen3.7-max"}}}}}'

opencode run 'Create smoke.js, run it, and report output' --model freeqwen/qwen3.7-max --agent build --print-logs
```

A successful smoke test must show real `write`/`bash` tool calls, not just text output.

### Claude Code

Claude Code speaks the Anthropic Messages protocol; FreeQwenApi ships a shim at `/api/messages`. The shim converts Anthropic `tools`, `tool_use`, and `tool_result` to/from OpenAI-style history.

```bash
ANTHROPIC_BASE_URL=http://127.0.0.1:3264/api \
ANTHROPIC_API_KEY=dummy-key \
ANTHROPIC_MODEL=qwen3.7-max \
claude --bare -p 'Create smoke.js, run npm run smoke, return the terminal output' \
  --model qwen3.7-max --allowedTools 'Write,Bash' --max-turns 8 --output-format json
```

See [ADR 03](../adr/03-openai-compatible-shim.md) for shim design details.

### Codex CLI

The current Codex CLI no longer supports `wire_api = "chat"`; use Responses API mode against `/api/responses`:

```toml
model = "qwen3.7-max"
model_provider = "freeqwen"

[model_providers.freeqwen]
name = "FreeQwenApi"
base_url = "http://127.0.0.1:3264/api"
wire_api = "responses"
experimental_bearer_token = "dummy-key"
```

Smoke test:

```bash
codex exec 'Create smoke.js, create package.json with script smoke, run npm run smoke, return output' --skip-git-repo-check
```

Endpoint reference: [Responses API](../api/01-api-endpoints-reference.md#responses-api-codex-cli).

### OpenClaw

Run with a large context — its system prompt and tool list are noticeably larger than usual:

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "freeqwen": {
        "baseUrl": "http://127.0.0.1:3264/api",
        "apiKey": "dummy-key",
        "api": "openai-completions",
        "contextTokens": 180000,
        "models": [{ "id": "qwen3.7-max", "name": "qwen3.7-max", "compat": { "supportsTools": true } }]
      }
    }
  }
}
```

Smoke test:

```bash
openclaw --profile freeqwen-smoke agent --local --json \
  --model freeqwen/qwen3.7-max \
  --message 'Create smoke.js, run npm run smoke, return marker if successful' \
  --timeout 240
```

### Caveats for agent integrations

- This is a Qwen Chat web proxy, not an official tool-calling API.
- The upstream sometimes returns `chatId does not exist`; retrying or starting a new chat usually helps.
- Anti-bot/captcha challenges can appear under frequent/long requests.
- Keep `QWEN_MAX_SYSTEM_CHARS=180000` for OpenClaw/Codex/Claude Code, otherwise tool instructions may be truncated.
- If an agent answers with text instead of calling tools, verify the client actually sent `tools` and the server runs with `QWEN_TOOL_PROMPT_MODE=minimal`.

## References

- [API Endpoints Reference](../api/01-api-endpoints-reference.md)
- [ADR 03 — OpenAI-Compatible Shim](../adr/03-openai-compatible-shim.md)
- [Examples Documentation](../examples/README.md)
- [Troubleshooting](../troubleshooting/01-common-issues.md)

## Status

- **Last updated:** 2026-08-25
- **Owner:** @Githab-capibara
