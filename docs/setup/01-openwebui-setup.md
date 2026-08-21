# Open WebUI Setup for FreeQwenApi

## 1. Connect to API

### Step 1: Administration
1. Open Open WebUI
2. Log in as administrator
3. Go to **Settings** → **Connections**

### Step 2: Add API Endpoint
- **Base URL**: `http://host.docker.internal:3264/api` (for Docker)
  - Or: `http://localhost:3264/api` (for local run)
- **API Key**: any (if `Authorization.txt` is empty)

## 2. Image Generation Setup

### Step 1: Enable Generation
1. Go to **Settings** → **Images**
2. Enable **Enable Image Generation**

### Step 2: Configure Parameters
- **Engine**: OpenAI Compatible
- **Base URL**: `http://host.docker.internal:3264/api`
- **API Key**: any (if authorization disabled)
- **Model**: `qwen-image-plus`

### Step 3: Test Connection
Click **Test Connection** - should show success.

## 3. Using Image Generation

### In Chat:
1. Open any chat
2. Click the 🎨 (Image Generation) icon
3. Enter prompt: *"Space station orbiting Mars, realism"*
4. Click **Generate**

### Via Command:
```
/imagine cyberpunk style spaceship
```

## 4. Available Chat Models

The following models will be available in Open WebUI:

### Qwen 3.5 (new):
- `qwen3.5-plus` - Flagship model
- `qwen3.5-flash` - Fast lightweight
- `qwen3.5-397b-a17b` - Largest MoE
- `qwen3.5-122b-a10b` - Medium MoE
- `qwen3.5-27b` - 27B parameters
- `qwen3.5-35b-a3b` - 35B MoE

### Qwen 3:
- `qwen3-max` - Flagship
- `qwen3-plus` - Medium
- `qwen3-235b-a22b` - 235B parameters
- `qwen3-30b-a3b` - 30B MoE

### Coder:
- `qwen3-coder-plus` - For programming
- `qwen2.5-coder-32b-instruct` - 32B for code

### Vision:
- `qwen3-vl-plus` - For image analysis
- `qvq-72b-preview-0310` - Visual understanding

## 5. Docker Setup

If Open WebUI runs in Docker, use:

```yaml
# docker-compose.yml for Open WebUI
services:
  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    ports:
      - "3000:8080"
    environment:
      - OPENAI_API_BASE_URLS=http://host.docker.internal:3264/api
      - OPENAI_API_KEYS=dummy-key
    extra_hosts:
      - "host.docker.internal:host-gateway"
```

## 6. Verification

### Chat Test:
```
1. Select model: qwen3.5-flash
2. Message: "Hello! Tell me about yourself"
3. Should receive response from Qwen
```

### Image Generation Test:
```
1. Go to Images section
2. Prompt: "Beautiful sunset over mountains"
3. Model: qwen-image-plus
4. Click Generate
5. Should generate an image
```

## 7. Troubleshooting

### "Connection refused"
- Make sure FreeQwenApi is running
- Check port (default 3264)

### "API key required"
- Add any API key in Open WebUI settings
- Or leave `Authorization.txt` empty

### "Model not found"
- Refresh model list in Open WebUI
- Check that model exists in `AvailableModels.txt`

### Image generation not working
- Check: `GET http://localhost:3264/api/images/status`
- Set `DASHSCOPE_API_KEY` if not set

## 8. Open WebUI Commands

| Command | Description |
|---------|----------|
| `/imagine <prompt>` | Generate image |
| `/model <name>` | Select model |
| `/chat` | New chat |
| `/settings` | Settings |
