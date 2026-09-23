# 01. API Endpoints Reference

- **Status:** Active
- **Date:** 2026-08-25
- **Deciders:** @Githab-capibara

## Base URL

```
http://localhost:3264/api
```

## Health & Status

### GET /api/

Root info handle.

**Response:**
```json
{
  "ok": true,
  "service": "FreeQwenApi",
  "baseUrl": "/api"
}
```

`HEAD /api/` returns an empty body with status `200` — useful for liveness probes.

### GET /api/health

Check server health and get basic info.

**Response (from `src/api/routes.js`):**
```json
{
  "ok": true,
  "service": "FreeQwenApi",
  "watermark": false,
  "baseUrl": "/api",
  "models": 29,
  "accounts": {
    "total": 3,
    "available": 2,
    "invalid": 0,
    "waiting": 1
  },
  "timestamp": "2026-09-22T12:34:56.789Z"
}
```

- `models` — number of entries in `src/AvailableModels.txt`.
- `accounts.total` / `available` / `invalid` / `waiting` — aggregated token states; `ok` is `true` when at least one account is available.

### GET /api/status

Get detailed server status including account states.

**Response:**
```json
{
  "ok": true,
  "accounts": [
    { "id": "acc_1", "status": "OK", "model": "qwen3.7-max" },
    { "id": "acc_2", "status": "WAIT", "model": "qwen3.7-plus" },
    { "id": "acc_3", "status": "INVALID", "model": "qwen3.7-max" }
  ]
}
```

### GET /api/models

Get list of available models.

**Response:**
```json
{
  "models": [
    { "id": "qwen3.7-max", "name": "Qwen 3.7 Max", "contextWindow": 256000 },
    { "id": "qwen3.7-plus", "name": "Qwen 3.7 Plus", "contextWindow": 256000 },
    { "id": "qwen3-vl-plus", "name": "Qwen 3 VL Plus", "contextWindow": 32000 }
  ]
}
```

### GET /api/v1/models

OpenAI v1-compatible model list:

```json
{
  "object": "list",
  "data": [
    { "id": "qwen3.7-max", "object": "model", "created": 0, "owned_by": "qwen" }
  ]
}
```

### GET /api/models/:model

Single-model descriptor in OpenAI format (echoes the requested id):

```json
{ "id": "qwen3.7-max", "object": "model", "created": 0, "owned_by": "qwen" }
```

### POST /api/show and POST /api/api/show

No-op compatibility stubs for Ollama-style clients. Always return `200` with an empty JSON object `{}`.

---

## Chat Completions

### POST /api/chat/completions

Standard OpenAI-compatible chat completions endpoint.

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | application/json |
| Authorization | No | Bearer token (if configured) |

**Body:**
```json
{
  "model": "qwen3.7-max",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "stream": false,
  "temperature": 0.7,
  "max_tokens": 2048
}
```

**Success Response:**
```json
{
  "id": "chatcmpl-uuid",
  "object": "chat.completion",
  "created": 1771318618,
  "model": "qwen3.7-max",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 20,
    "completion_tokens": 12,
    "total_tokens": 32
  }
}
```

### POST /api/v1/chat/completions

Alias for `/api/chat/completions` (OpenAI v1 compatibility).

### POST /api/chat

Legacy endpoint supporting `chatType` parameter for different content types:
- `chatType: "t2t"` — text chat (default)
- `chatType: "t2i"` — image generation
- `chatType: "t2v"` — video generation

**Note:** For new integrations, prefer `/api/chat/completions` for text and the dedicated `/api/images/generations` / `/api/videos/generations` endpoints. See [Image and Video Generation Guide](../guides/02-image-video-guide.md) for details.

### POST /api/messages

Anthropic Messages API shim (for Claude Code compatibility).

Converts Anthropic format to OpenAI format internally.

`POST /api/v1/messages` is an alias with identical behavior.

### GET /api/chat/completions

Not supported — returns `405 Method Not Allowed` with a JSON hint body (the server emits the message text in Russian):

```json
{
  "error": "<method not supported>",
  "message": "<use POST /api/chat/completions>"
}
```

### POST /api/chats

Create a new Qwen Chat conversation and bind it to the current client session.

**Body:**
```json
{
  "name": "My chat",
  "model": "qwen3.7-max"
}
```

**Success Response:**
```json
{
  "chatId": "chat-uuid",
  "success": true
}
```

The returned `chatId` is registered in the account-affinity map, so subsequent requests from the same client credentials reuse the same upstream chat.

### POST /api/chats/:chatId/history

Save-point endpoint used by Open WebUI-style clients.

**Body:**
```json
{ "messages": [ { "role": "user", "content": "..." } ] }
```

**Response:**
```json
{ "success": true, "chatId": "chat-uuid", "messagesCount": 1 }
```

### GET /api/chats/:chatId/history

History retrieval endpoint used by Open WebUI-style clients. Currently returns an empty history stub:

```json
{ "success": true, "chatId": "chat-uuid", "messages": [] }
```

---

## Responses API (Codex CLI)

### POST /api/responses

OpenAI **Responses API** compatibility endpoint. This is the wire protocol required by the Codex CLI (`wire_api = "responses"`); see [Integrations Overview](../integrations/01-integrations-overview.md).

Accepts `input` (string or structured items), `instructions`, `tools`, `tool_choice` (`auto` / `required` / `none` / named function), and `stream`.

**Body:**
```json
{
  "model": "qwen3.7-max",
  "input": "Call the write_file tool for smoke.js",
  "instructions": "You are a coding agent.",
  "tools": [
    {
      "type": "function",
      "name": "write_file",
      "description": "Write a file",
      "parameters": { "type": "object", "properties": { "path": { "type": "string" }, "content": { "type": "string" } } }
    }
  ],
  "tool_choice": "auto",
  "stream": false
}
```

**Success Response (non-streaming):**
```json
{
  "id": "resp_uuid",
  "object": "response",
  "created_at": 1771318618,
  "model": "qwen3.7-max",
  "status": "completed",
  "output": [
    {
      "type": "function_call",
      "call_id": "call_...",
      "name": "write_file",
      "arguments": "{\"path\":\"smoke.js\",\"content\":\"...\"}",
      "status": "completed"
    }
  ]
}
```

When no tool call is detected, `output` contains a single assistant message item:
```json
[
  {
    "type": "message",
    "role": "assistant",
    "status": "completed",
    "content": [{ "type": "output_text", "text": "Hello!" }]
  }
]
```

**Streaming:** when `"stream": true`, the server emits SSE events: `response.created` → `response.output_item.added` / `response.output_item.done` per output item → `response.completed`.

Tool calls are extracted from the model text by the same parser used for `/chat/completions`; if the upstream returns an anti-bot challenge the endpoint responds with `429` and `antiBot: true`.

---

## Image Generation

### POST /api/images/generations

Generate images via Qwen Chat or DashScope.

**Body:**
```json
{
  "prompt": "Beautiful sunset over mountains",
  "model": "qwen-image-plus",
  "n": 1,
  "size": "1024x1024",
  "provider": "qwen-chat"
}
```

**Success Response:**
```json
{
  "created": 1770000000,
  "watermark": false,
  "provider": "qwen-chat",
  "model": "qwen-image-plus",
  "data": [
    { "url": "https://cdn.qwenlm.ai/.../image.png", "revised_prompt": "..." }
  ]
}
```

### GET /api/images/status

Check image generation API status.

**Response:**
```json
{
  "watermark": false,
  "qwenChat": {
    "available": true,
    "model": "qwen3-vl-plus",
    "message": "Qwen Chat image generation available"
  },
  "dashscope": {
    "available": true,
    "apiKeyConfigured": true,
    "message": "DashScope image generation API available"
  }
}
```

The `message` strings are returned localized by the server; the field shape above is what you can rely on.

### GET /api/images/models

Get available image generation models.

---

## Video Generation

### POST /api/videos/generations

Generate videos via Qwen Chat.

**Body:**
```json
{
  "prompt": "Camera slowly approaches futuristic city at night",
  "model": "qwen3-vl-plus",
  "size": "16:9",
  "wait": true
}
```

**Success Response (wait: true):**
```json
{
  "created": 1770000000,
  "video_url": "https://cdn.qwenlm.ai/.../video.mp4",
  "task_id": "task-uuid"
}
```

**Success Response (wait: false):**
```json
{
  "task_id": "task-uuid",
  "status": "processing"
}
```

### GET /api/tasks/status/:taskId

Poll video generation task status.

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| wait | Block until completion (default: false) |

**Response:**
```json
{
  "task_id": "task-uuid",
  "task_status": "completed",
  "video_url": "https://cdn.qwenlm.ai/.../video.mp4",
  "content": "https://cdn.qwenlm.ai/.../video.mp4"
}
```

### GET /api/videos/models

Get available video generation models (from `src/api/routes.js`).

**Response:**
```json
{
  "object": "list",
  "watermark": false,
  "data": [
    {
      "id": "qwen3-vl-plus",
      "object": "model",
      "created": 1770000000,
      "owned_by": "qwen-chat",
      "permission": [],
      "capability": "qwen_chat_video_generation",
      "provider": "qwen-chat"
    }
  ]
}
```

### GET /api/videos/status

Check video generation readiness.

**Response:**
```json
{
  "watermark": false,
  "available": true,
  "model": "qwen3-vl-plus",
  "accounts": { "total": 3, "available": 2 },
  "message": "Qwen Chat video generation available"
}
```

The `message` string is returned localized by the server.

---

## File Upload

### POST /api/files/getstsToken

Obtain an STS (Secure Token Service) credential for direct-to-OSS upload. Requires Node.js entrypoint.

**Body:**
```json
{
  "filename": "document.pdf",
  "filesize": 102400,
  "filetype": "application/pdf"
}
```

Returns the STS token payload from Qwen Chat. Returns `400` if any of the three fields is missing.

### POST /api/files/upload

Upload files for Qwen analysis.

**Headers:**
| Header | Required | Description |
|--------|----------|-------------|
| Content-Type | Yes | multipart/form-data |

**Body:**
- `file`: File to upload (max 10MB)

**Success Response:**
```json
{
  "ok": true,
  "file_id": "file-uuid",
  "url": "https://cdn.qwenlm.ai/.../file.pdf",
  "filename": "document.pdf",
  "size": 102400
}
```

---

## Account Management (CLI)

There are **no HTTP endpoints** for account management. Accounts are managed
interactively or non-interactively through the CLI runner `scripts/auth.js`:

| Command | Action |
|---------|--------|
| `npm run auth` | Interactive account menu |
| `npm run auth -- --add` | Add a new Qwen Chat account |
| `npm run auth -- --list` | List configured accounts |
| `npm run auth -- --relogin` | Re-authenticate a login that expired |
| `npm run auth -- --remove` | Remove an account |
| `node scripts/addAccount.js` | Add an account non-interactively |

See [Scripts and Tests Reference](../reference/04-scripts-and-tests.md) for the full CLI reference.

---

## Errors

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - invalid parameters |
| 401 | Unauthorized - invalid/missing API key |
| 429 | Rate Limited - too many requests |
| 500 | Internal Error - server error |
| 503 | Service Unavailable - Qwen API down |

**Error Response:**
```json
{
  "error": {
    "type": "rate_limit",
    "message": "You've reached the upper limit for today's usage.",
    "code": "rate_limited"
  }
}
```
