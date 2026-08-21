# Image Generation Setup

> **Note:** By default, FreeQwenApi uses **Qwen Chat** for image generation — no `DASHSCOPE_API_KEY` is required. This guide covers the **optional DashScope provider** for users who want direct API access with higher rate limits or different models.

## Getting DashScope API Key

1. Register on Alibaba Cloud DashScope platform:
   - International: https://dashscope.console.aliyun.com/
   - China: https://dashscope.console.aliyun.com/

2. Create API key in "API Keys" section

3. Set environment variable:

### Windows (cmd):
```cmd
setx DASHSCOPE_API_KEY "your_api_key"
```

### Windows (PowerShell):
```powershell
[System.Environment]::SetEnvironmentVariable('DASHSCOPE_API_KEY', 'your_api_key', 'User')
```

### Linux/Mac:
```bash
export DASHSCOPE_API_KEY="your_api_key"
```

### In Docker Compose:
Add to `docker-compose.yml`:
```yaml
environment:
  - DASHSCOPE_API_KEY=your_api_key
```

## Available Models

| Model | Description |
|--------|----------|
| `qwen-image-max` | Flagship model for complex scenes with text |
| `qwen-image-plus` | Universal model (default) |
| `qwen-image` | Basic model |
| `wan2.6-t2i` | Realistic scenes and photography |
| `wan2.5-t2i-preview` | Fast realistic image generation |
| `wan2.2-t2i-flash` | Fastest model with custom resolution |

## Usage Examples

### Via cURL:
```bash
curl -X POST http://localhost:3264/api/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Beautiful sunset over mountains in anime style",
    "model": "qwen-image-plus",
    "n": 1,
    "size": "1024x1024"
  }'
```

### Via OpenAI SDK:
```javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:3264/api',
  apiKey: 'dummy-key'
});

const response = await openai.images.generate({
  model: 'qwen-image-plus',
  prompt: 'Space station orbiting Mars',
  n: 1,
  size: '1024x1024'
});

console.log(response.data[0].url);
```

### Via Open WebUI:
1. Open Open WebUI settings
2. Go to "Images" section
3. Enable image generation
4. Set:
   - Base URL: `http://localhost:3264/api`
   - API Key: any (if authorization disabled)
   - Model: `qwen-image-plus`

## Check API Status

```bash
curl http://localhost:3264/api/images/status
```

Response:
```json
{
  "available": true,
  "apiKeyConfigured": true,
  "message": "Image generation API is available"
}
```

## Get Model List

```bash
curl http://localhost:3264/api/images/models
```

## Supported Sizes

- `512x512`
- `768x768`
- `960x960`
- `1024x1024` (default)
- `1024x1792` (portrait)
- `1792x1024` (landscape)

## Notes

- Wan models (`wan2.*`) use async mode only with status polling
- Qwen Image models support both sync and async modes
- Maximum generations per request: 4
- Generation time: typically 5-30 seconds depending on model and size
