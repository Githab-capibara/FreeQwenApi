# Node.js Examples

Complete usage examples for FreeQwenApi using Node.js clients.

> **Source files:** All examples are in `/examples/` at the project root.

## Prerequisites

- FreeQwenApi server running at `http://localhost:3264/api`
- Node.js 18+ installed
- At least one Qwen Chat account authenticated (`npm run auth`)

## OpenAI SDK Examples

Install the OpenAI SDK:

```bash
npm install openai
```

### 1. Simple Request (Non-Streaming)

**Source:** `examples/openai-sdk/simple.js`

```bash
npm run example:simple
```

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'http://localhost:3264/api',
    apiKey: 'dummy-key'
});

const completion = await openai.chat.completions.create({
    messages: [{ role: 'user', content: 'Hello!' }],
    model: 'qwen3.7-max'
});

console.log(completion.choices[0].message.content);
```

### 2. Streaming Request

**Source:** `examples/openai-sdk/streaming.js`

```bash
npm run example:stream
```

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
    baseURL: 'http://localhost:3264/api',
    apiKey: 'dummy-key'
});

const stream = await openai.chat.completions.create({
    messages: [{ role: 'user', content: 'Tell me a story' }],
    model: 'qwen3.7-max',
    stream: true
});

for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

### 3. System Message

**Source:** `examples/openai-sdk/system-message.js`

```bash
npm run example:system
```

```javascript
const completion = await openai.chat.completions.create({
    model: 'qwen3.7-max',
    messages: [
        { role: 'system', content: 'You are a helpful coding assistant.' },
        { role: 'user', content: 'Write a Python function to reverse a string' }
    ]
});
```

### 4. Image Analysis (Vision)

**Source:** `examples/openai-sdk/image-analysis.js`

```bash
npm run example:image
```

```javascript
const completion = await openai.chat.completions.create({
    model: 'qwen3-vl-plus',
    messages: [
        {
            role: 'user',
            content: [
                { type: 'text', text: 'What is in this image?' },
                { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } }
            ]
        }
    ]
});
```

### 5. Multi-Turn Conversation

**Source:** `examples/openai-sdk/conversation.js`

```bash
npm run example:conversation
```

```javascript
const messages = [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'What is 2+2?' },
    { role: 'assistant', content: '2+2 equals 4.' },
    { role: 'user', content: 'Now multiply by 3.' }
];

const completion = await openai.chat.completions.create({
    model: 'qwen3.7-max',
    messages: messages
});
```

### 6. OpenAI Compatibility Test

**Source:** `examples/openai-sdk/openai-compatibility.js`

```bash
npm run example:compatibility
```

Full compatibility test covering all OpenAI Chat Completions features.

---

## Direct API Examples (No SDK)

### 7. Native Fetch

**Source:** `examples/direct-api/fetch-example.js`

```bash
npm run example:direct
```

```javascript
const response = await fetch('http://localhost:3264/api/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'qwen3.7-max',
        messages: [{ role: 'user', content: 'Hello!' }],
        stream: false
    })
});

const result = await response.json();
console.log(result.choices[0].message.content);
```

### 8. Axios

**Source:** `examples/direct-api/axios-example.js`

```bash
npm run example:axios
```

```javascript
import axios from 'axios';

const response = await axios.post('http://localhost:3264/api/chat/completions', {
    model: 'qwen3.7-max',
    messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(response.data.choices[0].message.content);
```

---

## File Upload Example

**Source:** `examples/file-upload/upload-example.js`

```bash
npm run example:file-upload
```

```javascript
import FormData from 'form-data';
import fetch from 'node-fetch';

const form = new FormData();
form.append('file', fs.createReadStream('document.pdf'));

const response = await fetch('http://localhost:3264/api/files/upload', {
    method: 'POST',
    body: form
});

const result = await response.json();
console.log(result.file_id);
```

---

## Test Scripts

### Feature Test (Text, Image, Video)

```bash
npm run test:features
```

Tests all three generation modes:
- `t2t` — text chat
- `t2i` — image generation
- `t2v` — video generation

### Video Polling Comparison

```bash
npm run test:video-polling
```

Compares server-side polling (`wait: true`) vs client-side polling (`GET /api/tasks/status/:taskId`).

### Streaming Test

```bash
node examples/streaming-test.js
```

---

## Related

- [Python Examples](02-python-examples.md)
- [API Reference](../api/README.md)
- [Quick Start](../guides/01-quick-start-guide.md)
