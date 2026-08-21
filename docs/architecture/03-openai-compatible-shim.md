# 03. Provide OpenAI-Compatible API Shim

- **Status:** Accepted
- **Date:** 2025-08-09
- **Deciders:** @ForgetMeAI
- **Related:** [01-browser-proxy-architecture.md](01-browser-proxy-architecture.md)

## Context

Users want to use Qwen Chat with existing AI tools and SDKs: OpenAI SDK, Open WebUI, LiteLLM, Hermes Agent, Claude Code, Codex, OpenClaw. Each of these tools expects a specific API format — mostly OpenAI Chat Completions, but some (Claude Code) expect Anthropic Messages API.

Building native integrations for each tool would be expensive and hard to maintain. Instead, we need a single API surface that all these tools can connect to.

The challenge is compounded by the fact that Qwen Chat doesn't natively support tool calling — tool schemas must be emulated via system prompt engineering.

## Decision

We provide an **OpenAI-compatible API shim** that translates between OpenAI/Anthropic request formats and Qwen Chat's internal protocol. The proxy exposes:
- `POST /api/chat/completions` — OpenAI Chat Completions format
- `POST /api/v1/chat/completions` — OpenAI v1 compatibility alias
- `POST /api/messages` — Anthropic Messages API shim (for Claude Code)
- `POST /api/images/generations` — OpenAI Images API format
- `POST /api/videos/generations` — Custom video generation endpoint

For Anthropic compatibility, the shim converts `tools`, `tool_use`, and `tool_result` blocks to/from OpenAI-style `tool_calls` format internally. Tool schemas are embedded into the system prompt using configurable modes (`compact`, `minimal`, `names`).

## Consequences

- **Easier:** Any OpenAI-compatible client works out of the box; single codebase for all integrations; users can switch AI backends without changing their tool config; no per-client maintenance burden
- **Harder:** Need to maintain format translations for both OpenAI and Anthropic schemas; tool calling is emulated via prompt engineering rather than native API support; imperfect tool call fidelity (Qwen web backend doesn't support structured tool calls)
- **Given up:** Native Anthropic features (thinking blocks, extended thinking, long context windows); perfect tool call accuracy (depends on Qwen's ability to follow prompt-embedded schemas)
- **Migration:** If Qwen releases an official API with native tool calling, the shim can be updated to pass through tool calls directly instead of emulating them via prompts. The API surface remains the same; only the internal translation layer changes.

## Alternatives Considered

- **Option A: Build native integrations per tool** — rejected because it would require maintaining 6+ different API adapters; each tool has different SDK versions and API expectations
- **Option B: Use LiteLLM as external proxy** — rejected because it adds an extra dependency and deployment step; users prefer a single binary; LiteLLM doesn't solve the Anthropic shim problem for Claude Code
- **Option C: Only support OpenAI format** — rejected because Claude Code is a major use case and requires Anthropic format compatibility; excluding it would significantly reduce the project's usefulness
- **Option D: GraphQL-style flexible API** — rejected because no major AI tool uses GraphQL; would require custom client development for every integration
- **Option E: WebSocket streaming API** — rejected because most AI tools expect HTTP request/response; WebSocket would require custom client libraries
