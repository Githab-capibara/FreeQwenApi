# 01. Architecture Overview

- **Status:** Draft
- **Date:** 2026-08-24
- **Owner:** @ForgetMeAI

## Purpose
High-level overview of FreeQwenApi components and data flow.

## Overview
FreeQwenApi provides an OpenAI-compatible proxy to Qwen Chat via a browser automation layer. Core components are the browser proxy, token manager, account affinity tracker, and API shim.

## Components
- **Browser Proxy** – Puppeteer headless Chromium for Qwen Chat interaction
- **Token Manager** – round-robin multi-account rotation
- **API Shim** – OpenAI/Anthropic compatible endpoints
- **Anti-Bot Layer** – stealth plugins and evasion

## References
- [ADR 01](docs/adr/01-browser-proxy-architecture.md)
- [Architecture Diagram](../assets/01-architecture-diagram.svg)

## Status
- **Last updated:** 2026-08-24
- **Owner:** @ForgetMeAI
