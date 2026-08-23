# Python Examples

Complete usage examples for FreeQwenApi using Python clients.

> **Source files:** All examples are in `/examples/python-sdk/` and `/examples/python-direct/` at the project root.

## Prerequisites

- FreeQwenApi server running at `http://localhost:3264/api`
- Python 3.10+ installed
- At least one Qwen Chat account authenticated (`npm run auth`)

## OpenAI SDK Examples

Install the OpenAI Python SDK:

```bash
pip install openai
```

### 1. Simple Request (Non-Streaming)

**Source:** `examples/python-sdk/simple.py`

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3264/api",
    api_key="dummy-key"
)

resp = client.chat.completions.create(
    model="qwen3.7-max",
    messages=[{"role": "user", "content": "Hello!"}]
)

print(resp.choices[0].message.content)
```

### 2. Streaming Request

**Source:** `examples/python-sdk/streaming.py`

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3264/api",
    api_key="dummy-key"
)

stream = client.chat.completions.create(
    model="qwen3.7-max",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### 3. System Message

**Source:** `examples/python-sdk/system_message.py`

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3264/api",
    api_key="dummy-key"
)

resp = client.chat.completions.create(
    model="qwen3.7-max",
    messages=[
        {"role": "system", "content": "You are a helpful coding assistant."},
        {"role": "user", "content": "Write a Python function to reverse a string"}
    ]
)

print(resp.choices[0].message.content)
```

### 4. Image Analysis (Vision)

**Source:** `examples/python-sdk/image_analysis.py`

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3264/api",
    api_key="dummy-key"
)

resp = client.chat.completions.create(
    model="qwen3-vl-plus",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What is in this image?"},
                {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}
            ]
        }
    ]
)

print(resp.choices[0].message.content)
```

### 5. Multi-Turn Conversation

**Source:** `examples/python-sdk/conversation.py`

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:3264/api",
    api_key="dummy-key"
)

messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "What is 2+2?"},
    {"role": "assistant", "content": "2+2 equals 4."},
    {"role": "user", "content": "Now multiply by 3."}
]

resp = client.chat.completions.create(
    model="qwen3.7-max",
    messages=messages
)

print(resp.choices[0].message.content)
```

### 6. OpenAI Compatibility Test

**Source:** `examples/python-sdk/openai_compatibility.py`

Full compatibility test covering all OpenAI Chat Completions features.

---

## Direct API Examples (httpx)

Install httpx:

```bash
pip install httpx
```

### 7. Basic Request with httpx

**Source:** `examples/python-direct/httpx_example.py`

```python
import httpx

url = "http://localhost:3264/api/chat/completions"
payload = {
    "model": "qwen3.7-max",
    "messages": [{"role": "user", "content": "Hello!"}]
}

resp = httpx.post(url, json=payload, timeout=120)
resp.raise_for_status()

data = resp.json()
print(data["choices"][0]["message"]["content"])
```

### 8. Streaming with httpx

**Source:** `examples/python-direct/httpx_streaming.py`

```python
import httpx

url = "http://localhost:3264/api/chat/completions"
payload = {
    "model": "qwen3.7-max",
    "messages": [{"role": "user", "content": "Tell me a story"}],
    "stream": True
}

with httpx.stream("POST", url, json=payload, timeout=120) as resp:
    for line in resp.iter_lines():
        if line.startswith("data: "):
            data = line[6:]
            if data == "[DONE]":
                break
            chunk = json.loads(data)
            content = chunk["choices"][0]["delta"].get("content", "")
            if content:
                print(content, end="", flush=True)
```

---

## Using Requests Library

```python
import requests

response = requests.post(
    "http://localhost:3264/api/chat/completions",
    json={
        "model": "qwen3.7-max",
        "messages": [{"role": "user", "content": "Hello!"}]
    },
    timeout=120
)

print(response.json()["choices"][0]["message"]["content"])
```

---

## LangChain Integration

```python
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="http://localhost:3264/api",
    api_key="dummy-key",
    model="qwen3.7-max"
)

response = llm.invoke("What is the capital of France?")
print(response.content)
```

---

## LlamaIndex Integration

```python
from llama_index.llms.openai import OpenAI

llm = OpenAI(
    api_key="dummy-key",
    base_url="http://localhost:3264/api",
    model="qwen3.7-max"
)

response = llm.complete("What is the capital of France?")
print(response)
```

---

## Related

- [Node.js Examples](01-nodejs-examples.md)
- [API Reference](../api/README.md)
- [Quick Start](../guides/01-quick-start-guide.md)
