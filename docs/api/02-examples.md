# API Usage Examples

## cURL Examples

### Chat Completion
```bash
curl http://localhost:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

### Streaming Chat
```bash
curl http://localhost:3264/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.7-max",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

### Image Generation
```bash
curl http://localhost:3264/api/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Cyberpunk city at night",
    "model": "qwen-image-plus",
    "size": "16:9"
  }'
```

### Video Generation
```bash
curl http://localhost:3264/api/videos/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Ocean waves at sunset",
    "size": "16:9",
    "wait": true
  }'
```

---

## JavaScript (OpenAI SDK)

```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3264/api',
  apiKey: 'dummy-key'
});

// Chat completion
const response = await openai.chat.completions.create({
  model: 'qwen3.7-max',
  messages: [{ role: 'user', content: 'Hello!' }]
});
console.log(response.choices[0].message.content);

// Streaming
const stream = await openai.chat.completions.create({
  model: 'qwen3.7-max',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0].delta.content || '');
}

// Image generation
const image = await openai.images.generate({
  model: 'qwen-image-plus',
  prompt: 'Space station orbiting Mars',
  n: 1,
  size: '1024x1024'
});
console.log(image.data[0].url);
```

---

## Python (OpenAI SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3264/api",
    api_key="dummy-key"
)

# Chat completion
response = client.chat.completions.create(
    model="qwen3.7-max",
    messages=[{"role": "user", "content": "Hello!"}]
)
print(response.choices[0].message.content)

# Streaming
stream = client.chat.completions.create(
    model="qwen3.7-max",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")

# Image generation
image = client.images.generate(
    model="qwen-image-plus",
    prompt="Space station orbiting Mars",
    n=1,
    size="1024x1024"
)
print(image.data[0].url)
```

---

## Python (httpx - Direct API)

```python
import httpx
import asyncio

async def chat():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:3264/api/chat/completions",
            json={
                "model": "qwen3.7-max",
                "messages": [{"role": "user", "content": "Hello!"}],
                "stream": False
            }
        )
        print(response.json()["choices"][0]["message"]["content"])

asyncio.run(chat())
```

---

## Node.js (fetch - Direct API)

```javascript
async function chat() {
  const response = await fetch("http://localhost:3264/api/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen3.7-max",
      messages: [{ role: "user", content: "Hello!" }],
      stream: false
    }),
  });

  const data = await response.json();
  console.log(data.choices[0].message.content);
}

chat();
```

---

## Node.js (axios)

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3264/api',
  headers: { 'Content-Type': 'application/json' }
});

async function chat() {
  const response = await api.post('/chat/completions', {
    model: 'qwen3.7-max',
    messages: [{ role: 'user', content: 'Hello!' }],
    stream: false
  });

  console.log(response.data.choices[0].message.content);
}

chat();
```
