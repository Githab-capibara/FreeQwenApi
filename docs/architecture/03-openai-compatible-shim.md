# 03. Provide OpenAI-Compatible API Shim

- **Status:** Accepted
- **Date:** 2025-08-09
- **Deciders:** @ForgetMeAI
- **Related:** N/A

## Context

Users want to use Qwen Chat with existing AI tools and SDKs: OpenAI SDK, Open WebUI, LiteLLM, Hermes Agent, Claude Code, Codex, OpenClaw. Each of these tools expects a specific API format — mostly OpenAI Chat Completions, but some (Claude Code) expect Anthropic Messages API.

Building native integrations for each tool would be expensive and hard to maintain. Instead, we need a single API surface that all these tools can connect to.

## Decision

We provide an **OpenAI-compatible API shim** that translates between OpenAI/Anthropic request formats and Qwen Chat's internal protocol. The proxy exposes:
- `POST /api/chat/completions` — OpenAI Chat Completions format
- `POST /api/v1/chat/completions` — OpenAI v1 compatibility alias
- `POST /api/messages` — Anthropic Messages API shim (for Claude Code)
- `POST /api/images/generations` — OpenAI Images API format
- `POST /api/videos/generations` — Custom video generation endpoint

For Anthropic compatibility, the shim converts `tools`, `tool_use`, and `tool_result` blocks to/from OpenAI-style `tool_calls` format internally.

## Consequences

- **Easier:** Any OpenAI-compatible client works out of the box; single codebase for all integrations; users can switch AI backends without changing their tool config
- **Harder:** Need to maintain format translations for both OpenAI and Anthropic schemas; tool calling is emulated via prompt engineering rather than native API support
- **Given up:** Native Anthropic features (e.g., thinking blocks, extended thinking); perfect tool call fidelity (Qwen web backend doesn't support structured tool calls)
- **Migration:** If Qwen releases an official API with native tool calling, the shim can be updated to pass through tool calls directly instead of emulating them via prompts

## Alternatives Considered

- **Option A: Build native integrations per tool** — rejected because it would require maintaining 6+ different API adapters
- **Option B: Use LiteLLM as external proxy** — rejected because it adds an extra dependency and deployment step; users prefer a single binary
- **Option C: Only support OpenAI format** — rejected because Claude Code is a major use case and requires Anthropic format compatibility
