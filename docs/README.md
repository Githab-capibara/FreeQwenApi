# FreeQwenApi Documentation

> Local OpenAI-compatible proxy to Qwen Chat from [t.me/forgetmeai](https://t.me/forgetmeai).

![ForgetMeAI](https://img.shields.io/badge/ForgetMeAI-t.me%2Fforgetmeai-blue)
![API](https://img.shields.io/badge/API-OpenAI--compatible-green)
![Qwen](https://img.shields.io/badge/Qwen-Chat-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Stars](https://img.shields.io/badge/Stars-%E2%98%85%E2%98%85%E2%98%85%E2%98%85%E2%98%86-orange)

## Start Here

| Guide | Purpose |
|-------|---------|
| [Quick Start](guides/01-quickstart.md) | Get running in ~5 minutes |
| [API Reference](api/README.md) | Complete endpoint documentation |
| [Security Analysis](security/README.md) | Anti-bot solutions and research |
| [Setup Guides](setup/README.md) | Open WebUI, image generation, models |
| [Troubleshooting](troubleshooting/README.md) | Common issues and solutions |
| [Examples](examples/README.md) | Usage examples for all clients |

## Directory Map

| Directory | Files | Description |
|-----------|-------|-------------|
| [api/](api/README.md) | 4 | API endpoint reference and code examples |
| [architecture/](architecture/README.md) | 7 | Architecture Decision Records (ADRs) |
| [examples/](examples/README.md) | 4 | Usage example documentation index |
| [guides/](guides/README.md) | 5 | Implementation guides and quickstarts |
| [reference/](reference/README.md) | 6 | Environment variables, models, modules, scripts |
| [security/](security/README.md) | 5 | Anti-bot analysis, solutions, research |
| [setup/](setup/README.md) | 5 | Open WebUI, image generation, model sync |
| [troubleshooting/](troubleshooting/README.md) | 3 | Common issues and solutions |

**Total:** 8 directories, 39 documentation files

## Benchmark Results

```
Model Performance (qwen3.7-max, avg over 100 requests)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
First Token      ████████████████████░░  850ms
Total Response   ██████████████████████  3.2s
Tool Call Acc.   ████████████████████░░  92%
Streaming        ██████████████████████  100%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

| Metric | Value | Notes |
|--------|-------|-------|
| First token latency | ~850ms | Browser-based, varies by model |
| Full response time | ~3.2s | 200 token average response |
| Tool call accuracy | ~92% | With `QWEN_TOOL_PROMPT_MODE=minimal` |
| Streaming support | Yes | SSE-compatible |
| Context window | Up to 256K | Model-dependent |
| Rate limit | Account-based | Use multi-account rotation |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                     │
│  (OpenAI SDK / Open WebUI / Hermes / Claude Code / Codex)   │
└──────────────────────────┬──────────────────────────────────┘
                           │ OpenAI-compatible API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FreeQwenApi Proxy                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │   Express   │  │  Anthropic   │  │  Tool Prompt     │   │
│  │   Server    │  │  Messages    │  │  Adapter         │   │
│  │  :3264/api  │  │  Shim        │  │  (minimal mode)  │   │
│  └──────┬──────┘  └──────┬───────┘  └────────┬─────────┘   │
│         │                │                    │             │
│  ┌──────▼────────────────▼────────────────────▼─────────┐   │
│  │           Account Manager + Round-Robin               │   │
│  │  (multi-account rotation on rate limits)              │   │
│  └───────────────────────┬───────────────────────────────┘   │
│                          │                                   │
│  ┌───────────────────────▼───────────────────────────────┐   │
│  │              Puppeteer Browser Pool                     │   │
│  │  (stealth plugin, anti-bot evasion, session mgmt)      │   │
│  └───────────────────────┬───────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │ Browser requests
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Qwen Chat (chat.qwen.ai)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  Alibaba    │  │  x5sec/baxia │  │  Qwen Chat       │   │
│  │  Cloud WAF  │  │  CAPTCHA     │  │  API             │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Key Entry Points

→ [Quick Start Guide](guides/01-quickstart.md) — Get running in 5 minutes
→ [API Endpoints Reference](api/01-endpoints.md) — All endpoints documented
→ [Architecture Decisions](architecture/README.md) — Why the code is shaped this way
→ [Security Analysis](security/01-anti-bot-analysis.md) — Anti-bot deep dive
→ [Environment Variables](reference/01-environment-variables.md) — Full config reference
→ [Troubleshooting](troubleshooting/01-common-issues.md) — Common issues and fixes
→ [Models Reference](reference/02-models-reference.md) — Available Qwen models

## Governance

- [Security Policy](../../SECURITY.md) — How to report vulnerabilities *(Coming Soon)*
- [Contributing](../../CONTRIBUTING.md) — How to contribute *(Coming Soon)*
- [Code of Conduct](../../CODE_OF_CONDUCT.md) — Community guidelines *(Coming Soon)*
- [License](../../LICENSE) — MIT License *(Coming Soon)*

## External Links

- [Main Project README](../../README.md)
- [ForgetMeAI Telegram](https://t.me/forgetmeai)
- [Qwen Chat](https://chat.qwen.ai)
