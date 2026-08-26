# 01. Frequently Asked Questions

- **Status:** Active
- **Date:** 2026-08-25
- **Owner:** @ForgetMeAI

## Purpose

Answers to the most common questions about FreeQwenApi: what it is, how it works, and its limitations.

## Overview

Questions are grouped by theme. Deep dives live in dedicated docs — follow the links.

## Details

### General

**Q: Is this the official Qwen API?**
A: No. FreeQwenApi is an unofficial, browser-based proxy in front of Qwen Chat web. It is not affiliated with Alibaba/Qwen, and Qwen may change its internal API at any time.

**Q: Does it run a model locally on my GPU?**
A: No. All inference happens on Qwen Chat servers; your machine only runs the proxy (Node.js + headless Chromium).

**Q: Is it free?**
A: The proxy itself is MIT-licensed open source; usage is bound to whatever your Qwen Chat web account allows, including rate limits.

### Setup & usage

**Q: Can I use it with Open WebUI?**
A: Yes — as an OpenAI-compatible backend. See [Open WebUI Setup](../setup/01-openwebui-setup.md).

**Q: Which clients work besides Open WebUI?**
A: Any OpenAI SDK client, LiteLLM, Hermes Agent, OpenCode, Claude Code (via Anthropic shim), Codex CLI (via Responses API), OpenClaw. See [Integrations Overview](../integrations/01-integrations-overview.md).

**Q: Which model should I pick?**
A: `qwen3.7-max` for chat/agents, `qwen3-coder-plus` for coding, `qwen3-vl-plus` for images/video via Qwen Chat. Full list: [Models Reference](../reference/02-models-reference.md).

**Q: How do multiple accounts work?**
A: Round-robin rotation with automatic failover on rate limits; chats/tasks/files stay pinned to the owning account via affinity tracking. See [ADR 02](../adr/02-multi-account-rotation.md).

### Limitations

**Q: Do my chats survive a server restart?**
A: Chat/task/file bindings live only in process memory. After restart an unknown `chatId` is safely replaced with a new chat, and the full OpenAI history is transferred into it. Private files must be re-uploaded; old video task ids cannot be polled.

**Q: Are generated image/video URLs permanent?**
A: No — media URLs from Qwen Chat may be temporary. Download what you need.

**Q: Can I upload files through the Python entrypoint?**
A: No. Python cannot safely verify account ownership of files; use the Node.js entrypoint for uploads. See [Python Entrypoint Reference](../reference/05-python-entrypoint.md).

**Q: Why do tokens expire?**
A: Qwen Chat sessions expire over time. Re-authenticate with `npm run auth -- --relogin`.

**Q: Is it safe for production?**
A: Treat this as a tool for experiments, demos, and local workflows. If you expose it beyond loopback, set client keys (`src/Authorization.txt`) and restrict origins (`CORS_ORIGINS`).

## References

- [Troubleshooting](../troubleshooting/01-common-issues.md)
- [Setup Guides](../setup/README.md)
- [Architecture Decisions](../adr/README.md)

## Status

- **Last updated:** 2026-08-25
- **Owner:** @ForgetMeAI
