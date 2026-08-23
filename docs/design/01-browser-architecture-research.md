# 01. Browser Proxy Architecture Research

- **Status:** Research note
- **Date:** 2026-08-23
- **Deciders:** @Githab-capibara
- **Researcher:** document_specialist agent
- **Purpose:** Document research on browser-based proxy approaches for Qwen Chat integration
- **Feeds into:** docs/architecture/README.md

## Context

Qwen Chat lacks official API. Browser automation is required to access service while bypassing anti-bot protection.

## Findings

Browser-based proxy provides stable session handling, cookie management, and anti-bot evasion via Puppeteer stealth plugins.

## Recommendation

Continue with Puppeteer-based architecture with multi-account rotation.

## Alternatives considered

- **Option A: Direct API reverse engineering** — rejected because endpoints change frequently.
- **Option B: Playwright** — rejected in favor of Puppeteer ecosystem.
