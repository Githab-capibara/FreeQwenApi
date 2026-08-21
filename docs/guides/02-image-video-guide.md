# Image and Video Generation Guide

## Overview

Qwen API Proxy supports three content generation types via the `chatType` parameter:

- **Text chat (t2t)** — standard dialog AI, streaming response (default)
- **Image generation (t2i)** — text-to-image, streaming response (~10–30 sec)
- **Video generation (t2v)** — text-to-video, task polling system (~30–120 sec)

## Key Differences

| Feature | Text (t2t) | Image (t2i) | Video (t2v) |
| -------------------- | ------------------- | ---------------------------- | ------------------------------- |
| **Request type** | `stream: true` | `stream: true` | `stream: false` |
| **Response method** | Streaming SSE | Streaming SSE | Task polling |
| **Execution time** | ~2–5 sec | ~10–30 sec | ~30–120 sec |
| **URL location** | N/A (text) | `choices[0].message.content` | `video_url` / `content` |
| **Server polling** | No | No | Yes (automatic) |
| **Task ID** | No | No | Yes |

---

## Image Generation (t2i)

### How It Works

1. Client sends POST request with `chatType: "t2i"`
2. Server creates chat with `stream: true`
3. Server receives streaming SSE response with image URL
4. Image URL arrives in `content` field of streaming chunks
5. Server returns the URL to the client

### Request Format

```
POST /api/chat
Content-Type: application/json

{
  "message": "Description of the image to generate",
  "model": "qwen3-vl-plus",
  "chatType": "t2i",
  "size": "16:9"
}
```

### Parameters

| Parameter | Required | Description | Example Values |
| ---------- | -------- | ---------------------------------------- | --------------------------------------------- |
| `message` | Yes | Text description of the image | `"Sunset over ocean with purple clouds"` |
| `model` | No | Model for generation (default qwen-max-latest) | `qwen-max-latest`, `qwen3-vl-plus` |
| `chatType` | Yes | Must be `"t2i"` | `"t2i"` |
| `size` | No | Aspect ratio | `"16:9"`, `"9:16"`, `"1:1"`, `"4:3"` |
| `chatId` | No | Existing chat ID for context continuation | UUID from previous response |
| `parentId` | No | Parent message ID | UUID from previous response |

### Expected Response

```json
{
  "id": "response-uuid-here",
  "object": "chat.completion",
  "created": 1771318618,
  "model": "qwen3-vl-plus",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "https://cdn.qwenlm.ai/output/.../t2i/.../image.png?key=***"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0,
    "characters": 0,
    "width": 2688,
    "image_count": 1,
    "height": 1536
  },
  "response_id": "response-uuid-here",
  "chatId": "chat-uuid-here",
  "parentId": "parent-uuid-here"
}
```

The `content` field contains a direct URL to the generated image. URLs are typically hosted on `cdn.qwenlm.ai`.

### Examples

**JavaScript (fetch):**

```javascript
const response = await fetch("http://localhost:3264/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Beautiful landscape: mountains and lake at dawn",
    model: "qwen3-vl-plus",
    chatType: "t2i",
    size: "16:9"
  }),
});

const data = await response.json();
const imageUrl = data.choices[0].message.content;
console.log("Generated image:", imageUrl);
```

**cURL:**

```bash
curl -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Futuristic city at night with neon lights",
    "model": "qwen3-vl-plus",
    "chatType": "t2i",
    "size": "16:9"
  }'
```

**PowerShell:**

```powershell
$body = @{
    message = "Cute cat sitting on a bookshelf"
    model = "qwen3-vl-plus"
    chatType = "t2i"
    size = "1:1"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:3264/api/chat" `
    -Method Post -Body $body -ContentType "application/json"

$imageUrl = $response.choices[0].message.content
Write-Host "Image URL: $imageUrl"
```

---

## Video Generation (t2v)

### How It Works

Video generation supports two polling modes:

#### Mode 1: Server-side polling (default)

Best for simple integrations and short videos (<2 min).

1. Client sends request with `chatType: "t2v"` and `waitForCompletion: true` (default)
2. Server creates task — Qwen API returns `task_id`
3. Server automatically checks status every 2 seconds (up to 90 attempts = 3 min)
4. When task completes, server returns video URL to client

**Pros:** Simple, one request, no client polling logic needed.  
**Cons:** Long HTTP connection, fixed 3-minute timeout.

#### Mode 2: Client-side polling (manual)

Best for long videos (>2 min), custom timeouts, and progress display in UI.

1. Client sends request with `chatType: "t2v"` and `waitForCompletion: false`
2. Server immediately returns `task_id` (~1–2 sec)
3. Client polls `GET /api/tasks/status/:taskId` every 2–5 seconds
4. When task completes, client receives video URL

**Pros:** Flexible timeout, progress tracking, better for long operations.  
**Cons:** Requires client-side polling logic.

### Request Format

```
POST /api/chat
Content-Type: application/json

{
  "message": "Description of the video to generate",
  "model": "qwen3-vl-plus",
  "chatType": "t2v",
  "size": "16:9"
}
```

### Parameters

| Parameter | Required | Description | Example Values |
| ------------------- | -------- | ----------------------------------------------------- | --------------------------------------------- |
| `message` | Yes | Text description of the video | `"Ocean waves on sandy beach at sunset"` |
| `model` | Yes | Model for generation | `qwen3-vl-plus`, `qwen-max-latest` |
| `chatType` | Yes | Must be `"t2v"` | `"t2v"` |
| `size` | No | Aspect ratio (default `"16:9"`) | `"16:9"`, `"9:16"`, `"1:1"`, `"4:3"` |
| `waitForCompletion` | No | Server waits for task completion (default `true`) | `true` / `false` |
| `chatId` | No | Existing chat ID | UUID from previous response |
| `parentId` | No | Parent message ID | UUID from previous response |

**Important:** Video size is specified as aspect ratio (e.g., `"16:9"`), not pixel resolution.

### Expected Response

```json
{
  "id": "task-uuid-here",
  "object": "chat.completion",
  "created": 1771318618,
  "model": "qwen3-vl-plus",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "https://cdn.qwenlm.ai/output/.../t2v/.../video.mp4?key=***"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "output_tokens": 0,
    "total_tokens": 0
  },
  "task_id": "task-uuid-here",
  "video_url": "https://cdn.qwenlm.ai/output/.../t2v/.../video.mp4?key=***",
  "chatId": "chat-uuid-here",
  "parentId": "task-uuid-here"
}
```

### Examples

**Server-side polling (default):**

```javascript
const response = await fetch("http://localhost:3264/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Calm ocean with gentle waves at sunset",
    model: "qwen3-vl-plus",
    chatType: "t2v",
    size: "16:9"
  }),
});

const data = await response.json();
if (data.error) {
  console.error("Failed to generate video:", data.error);
} else {
  const videoUrl = data.video_url || data.choices[0].message.content;
  console.log("Generated video:", videoUrl);
}
```

**Client-side polling:**

```javascript
// Step 1: Create task (response comes immediately)
const taskResponse = await fetch("http://localhost:3264/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    message: "Quiet forest, sun rays through trees",
    model: "qwen3-vl-plus",
    chatType: "t2v",
    size: "16:9",
    waitForCompletion: false
  }),
});

const taskData = await taskResponse.json();
console.log("Task created:", taskData.task_id);

// Step 2: Poll until complete
const taskId = taskData.task_id;
let videoUrl = null;
let attempts = 0;
const maxAttempts = 90; // max 3 minutes

while (attempts < maxAttempts && !videoUrl) {
  attempts++;
  await new Promise(resolve => setTimeout(resolve, 2000));

  const statusResponse = await fetch(`http://localhost:3264/api/tasks/status/${taskId}`);
  const statusData = await statusResponse.json();
  const status = statusData.task_status || statusData.status;

  console.log(`Attempt ${attempts}: ${status}`);

  if (status === 'completed' || status === 'succeeded') {
    videoUrl = statusData.content || statusData.data?.content;
    console.log("Video ready:", videoUrl);
  } else if (status === 'failed' || status === 'error') {
    console.error("Task failed");
    break;
  }
}
```

**cURL (server-side polling):**

```bash
curl -X POST http://localhost:3264/api/chat \
  --max-time 200 \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Bird flying over forest",
    "model": "qwen3-vl-plus",
    "chatType": "t2v",
    "size": "16:9"
  }'
```

**cURL (client-side polling):**

```bash
# Step 1: Create task
TASK_ID=$(curl -s -X POST http://localhost:3264/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Ocean waves at sunset",
    "model": "qwen3-vl-plus",
    "chatType": "t2v",
    "size": "16:9",
    "waitForCompletion": false
  }' | jq -r '.task_id')

echo "Task ID: $TASK_ID"

# Step 2: Poll status
while true; do
  STATUS=$(curl -s "http://localhost:3264/api/tasks/status/$TASK_ID" | jq -r '.task_status')
  echo "Status: $STATUS"
  [ "$STATUS" = "completed" ] && break
  sleep 2
done
```

---

## Comparison: Images vs Video

| Feature | Image (t2i) | Video (t2v) |
| ------------------- | ---------------------------- | ----------------------------------- |
| **Chat type** | `"t2i"` | `"t2v"` |
| **Response method** | Streaming | Task polling |
| **Typical duration** | 10–30 seconds | 30–120 seconds |
| **Response field** | `choices[0].message.content` | `video_url` or `content` |
| **File format** | `.jpg` / `.png` | `.mp4` |
| **Stream** | `true` (automatic) | `false` (automatic) |
| **Polling** | N/A | 90 attempts × 2 sec = max 3 min |
| **Client timeout** | 30–60 seconds | 120–200 seconds |

---

## Recommendations

### Image Generation

1. **Detailed prompts** — specify style, colors, mood, and composition
2. **Recommended models** — `qwen3-vl-plus` (fast, good quality), `qwen-max-latest`
3. **Aspect ratios** — `"1:1"`, `"16:9"`, `"9:16"`, `"4:3"`, `"3:4"`
4. **Client timeout** — minimum 60 seconds

### Video Generation

1. **Describe movement** — write about motion and changes, not just static scenes
2. **Keep it simple** — focus on one main action/movement
3. **Aspect ratios** — `"16:9"` (default), `"9:16"`, `"1:1"`, `"4:3"`
4. **Client timeout** — minimum 200 seconds
5. **Be patient** — generation typically takes 1–2 minutes

---

## Error Handling

### Timeout

```json
{ "error": "Task polling timeout exceeded", "status": "timeout", "task_id": "..." }
```

Retry the request or switch to client-side polling with more attempts.

### Task ID Not Found

```json
{ "error": "Task ID not found in response" }
```

Check Qwen API status — this may be a temporary issue.

### Rate Limit

```json
{ "error": "RateLimited", "detail": "You've reached the upper limit for today's usage." }
```

Wait for daily limit reset or add more accounts.

---

## Testing

Run built-in test scripts:

```bash
# Test all three generation types (chat, image, video)
npm run test:features

# Compare server-side and client-side polling for video
npm run test:video-polling
```

---

## Notes

1. Generated URLs are temporary — download files if needed long-term
2. Higher resolutions take longer to generate
3. Multiple parallel requests work via multi-account system
4. Use `chatId` and `parentId` to generate related images/videos in context

## Related Endpoints

- `POST /api/chat` — text chat (`chatType: "t2t"`, default), image (`"t2i"`), video (`"t2v"`)
- `GET /api/tasks/status/:taskId` — check video generation task status
- `GET /api/models` — get list of available models
- `POST /api/files/upload` — upload files for analysis
