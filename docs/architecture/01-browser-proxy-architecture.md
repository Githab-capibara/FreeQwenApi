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

## Decision

We use a **browser-based proxy architecture**: Puppeteer controls a headless Chromium instance that loads Qwen Chat, maintains authenticated sessions, and makes requests through the browser context. The proxy translates OpenAI-compatible API calls into browser actions and returns responses in OpenAI format.

## Consequences

- **Easier:** Natural handling of cookies, sessions, and anti-bot challenges; no need to reverse-engineer internal APIs
- **Harder:** Higher resource usage (Chromium instance per session); slower response times; requires ongoing anti-bot maintenance
- **Given up:** Direct API efficiency; ability to scale horizontally without browser overhead
- **Migration:** If Qwen releases an official API, the browser layer can be replaced with direct HTTP calls while keeping the OpenAI-compatible shim

## Alternatives Considered

- **Option A: Direct API reverse-engineering** — rejected because Qwen's internal API changes frequently and requires complex authentication flows that are easier handled by a real browser
- **Option B: Playwright instead of Puppeteer** — rejected because Puppeteer has better stealth plugin ecosystem for anti-bot evasion
