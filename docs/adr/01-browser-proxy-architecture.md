# 01. Use Browser-Based Proxy Architecture

- **Status:** Accepted
- **Date:** 2025-08-09
- **Deciders:** @ForgetMeAI
- **Related:** N/A

## Context

FreeQwenApi needs to provide an OpenAI-compatible API for Qwen Chat. The challenge is that Qwen Chat does not offer an official public API — it is a web application with anti-bot protection. We need a way to interact with Qwen Chat programmatically while bypassing their bot detection.

Two main approaches were considered:
1. Reverse-engineer Qwen's internal API and make direct HTTP requests
2. Use a headless browser (Puppeteer) to interact with Qwen Chat as a real user would

The direct API approach would be more efficient but requires constant maintenance as Qwen changes their internal endpoints. The browser approach is more robust but has higher resource usage.

## Decision

We use a **browser-based proxy architecture**: Puppeteer controls a headless Chromium instance that loads Qwen Chat, maintains authenticated sessions, and makes requests through the browser context. The proxy translates OpenAI-compatible API calls into browser actions and returns responses in OpenAI format.

## Consequences

- **Easier:** Natural handling of cookies, sessions, and anti-bot challenges; no need to reverse-engineer internal APIs; automatic adaptation to Qwen frontend changes
- **Harder:** Higher resource usage (Chromium instance per session); slower response times; requires ongoing anti-bot maintenance; browser management complexity
- **Given up:** Direct API efficiency; ability to scale horizontally without browser overhead; sub-second response times
- **Migration:** If Qwen releases an official API, the browser layer can be replaced with direct HTTP calls while keeping the OpenAI-compatible shim. The abstraction boundary is clean: only the browser transport layer changes.

## Alternatives considered

- **Option A: Direct API reverse-engineering** — rejected because Qwen's internal API changes frequently and requires complex authentication flows that are easier handled by a real browser; would need constant maintenance
- **Option B: Playwright instead of Puppeteer** — rejected because Puppeteer has better stealth plugin ecosystem for anti-bot evasion; Puppeteer's community is larger and has more anti-detection resources
- **Option C: Selenium** — rejected because Selenium is more easily detected by anti-bot systems; slower startup times; less fine-grained control over browser behavior
- **Option D: Hybrid approach (browser for auth, direct HTTP for requests)** — rejected because Qwen's session binding makes this fragile; chat/task/file resources are bound to specific browser sessions
