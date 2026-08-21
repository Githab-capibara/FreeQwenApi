# Models Reference

Complete reference for available Qwen Chat models accessible through FreeQwenApi.

> **Note:** The model list is synced from Qwen Chat metadata. Run `npm run models:sync` to update.

## Recommended Models

| Model | Best For | Context Window | Notes |
|-------|----------|----------------|-------|
| `qwen3.7-max` | Regular chat, agents, tool-use | 256K | Best overall quality |
| `qwen3.7-plus` | Faster, lighter workloads | 256K | Good speed/quality balance |
| `qwen3-coder-plus` | Coding tasks | 256K | Optimized for code generation |
| `qwen3-vl-plus` | Image and video generation | 32K | Vision-language model |

## Complete Model List

> Auto-generated from `src/AvailableModels.txt`. Last synced: see `docs/setup/03-model-sync-report.md`.

| # | Model ID | Category |
|---|----------|----------|
| 1 | `qwen3.8-max` | Text |
| 2 | `qwen3.7-plus` | Text |
| 3 | `qwen3.7-max` | Text |
| 4 | `qwen3.6-plus` | Text |
| 5 | `qwen3.5-plus` | Text |
| 6 | `qwen3.5-flash` | Text |
| 7 | `qwen3.5-397b-a17b` | Text |
| 8 | `qwen3.5-122b-a10b` | Text |
| 9 | `qwen3.5-27b` | Text |
| 10 | `qwen3.5-35b-a3b` | Text |
| 11 | `qwen3-max` | Text |
| 12 | `qwen3-vl-plus` | Vision |
| 13 | `qwen3-coder-plus` | Code |
| 14 | `qwen3-omni-flash` | Multimodal |
| 15 | `qwen3-omni-flash-2025-12-01` | Multimodal |
| 16 | `qwen-max-latest` | Text |
| 17 | `qwen-plus-2025-09-11` | Text |
| 18 | `qwen-plus-2025-01-25` | Text |
| 19 | `qwq-32b` | Reasoning |
| 20 | `qwen3-235b-a22b` | Text |
| 21 | `qwen3-30b-a3b` | Text |
| 22 | `qwen3-coder-30b-a3b-instruct` | Code |
| 23 | `qwen-turbo-2025-02-11` | Text |
| 24 | `qwen2.5-omni-7b` | Multimodal |
| 25 | `qvq-72b-preview-0310` | Vision |
| 26 | `qwen2.5-vl-32b-instruct` | Vision |
| 27 | `qwen2.5-14b-instruct-1m` | Text |
| 28 | `qwen2.5-coder-32b-instruct` | Code |
| 29 | `qwen2.5-72b-instruct` | Text |

## Model Categories

### Text Models
General-purpose chat models for conversation, Q&A, and text generation.

- `qwen3.7-max`, `qwen3.7-plus`, `qwen3.6-plus`
- `qwen3.5-plus`, `qwen3.5-flash`, `qwen3.5-397b-a17b`
- `qwen3.5-122b-a10b`, `qwen3.5-27b`, `qwen3.5-35b-a3b`
- `qwen3-max`, `qwen-max-latest`
- `qwen-plus-2025-09-11`, `qwen-plus-2025-01-25`
- `qwen-turbo-2025-02-11`
- `qwen2.5-14b-instruct-1m`, `qwen2.5-72b-instruct`

### Code Models
Optimized for code generation, completion, and understanding.

- `qwen3-coder-plus`
- `qwen3-coder-30b-a3b-instruct`
- `qwen2.5-coder-32b-instruct`

### Vision Models
Support image input and/or generation.

- `qwen3-vl-plus` — image generation, video generation, image analysis
- `qvq-72b-preview-0310` — vision reasoning
- `qwen2.5-vl-32b-instruct` — vision-language understanding

### Multimodal Models
Support multiple modalities (text, image, audio).

- `qwen3-omni-flash`, `qwen3-omni-flash-2025-12-01`
- `qwen2.5-omni-7b`

### Reasoning Models
Optimized for complex reasoning and mathematical tasks.

- `qwq-32b`

## Updating the Model List

```bash
# Sync from Qwen Chat
npm run models:sync

# Check current models via API
curl http://localhost:3264/api/models
```

## Related

- [Environment Variables](01-environment-variables.md)
- [API Reference](../api/README.md)
- [Model Sync Report](../setup/03-model-sync-report.md)
