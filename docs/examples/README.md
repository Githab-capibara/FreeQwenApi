# Examples

This directory contains usage example documentation for the FreeQwenApi Qwen AI proxy.

> **Note:** The actual example source code files remain in `/examples/` at the project root. This documentation directory indexes and describes them.

## Contents

| File | Description |
|------|-------------|
| [01-nodejs-examples.md](01-nodejs-examples.md) | Node.js SDK and direct API examples |
| [02-python-examples.md](02-python-examples.md) | Python SDK and httpx examples |

## Quick Reference

### Node.js Examples (in `/examples/`)

| Script | Purpose |
|--------|---------|
| `openai-sdk/simple.js` | Basic chat completion |
| `openai-sdk/streaming.js` | Streaming response |
| `openai-sdk/system-message.js` | System prompt usage |
| `openai-sdk/image-analysis.js` | Vision/image analysis |
| `openai-sdk/conversation.js` | Multi-turn conversation |
| `openai-sdk/openai-compatibility.js` | Full OpenAI compatibility test |
| `direct-api/fetch-example.js` | Native fetch without SDK |
| `direct-api/axios-example.js` | Axios-based request |
| `file-upload/upload-example.js` | File upload example |

### Python Examples (in `/examples/`)

| Script | Purpose |
|--------|---------|
| `python-sdk/simple.py` | Basic chat completion |
| `python-sdk/streaming.py` | Streaming response |
| `python-sdk/system_message.py` | System prompt usage |
| `python-sdk/image_analysis.py` | Vision/image analysis |
| `python-sdk/conversation.py` | Multi-turn conversation |
| `python-sdk/openai_compatibility.py` | Full OpenAI compatibility test |
| `python-direct/httpx_example.py` | httpx direct API call |
| `python-direct/httpx_streaming.py` | httpx streaming |

## Running Examples

```bash
# From project root
npm install

# Start server first
npm start

# Then run examples
npm run example:simple
npm run example:stream
```

## Template

Use [`template.md`](template.md) as a starting point for new example documents.
