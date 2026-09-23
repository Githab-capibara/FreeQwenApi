# 01. Release Notes

- **Status:** Active
- **Date:** 2026-08-24
- **Deciders:** @Githab-capibara

## Purpose

Track project releases, version history, and breaking changes for FreeQwenApi.

## Changelog

### v1.1.1 – 2026-09-13 (fix)

**Bug fixes:**
- Fix Qwen page loading blank on Chromium ~148+: removed the `Sec-Fetch-*` header override from `page.setExtraHTTPHeaders()` in `src/browser/browser.js`. Forcing these browser-managed headers made the network service reject every subresource (`net::ERR_INVALID_ARGUMENT`), so the SPA UI never rendered during login/runtime.
- Keep only `Accept-Language` and `Accept`; Chromium sets the remaining request headers itself.

**Documentation:**
- [Common Issues](../troubleshooting/01-common-issues.md): new section for the blank-page/`ERR_INVALID_ARGUMENT` symptom.
- [Internal Modules](../reference/03-internal-modules.md): header-override warning for `browser.js`.

### v1.1.0 – 2026-08-27 (current)

**New features:**
- Image generation via Qwen Chat (`POST /api/images/generations`)
- Video generation via Qwen Chat (`POST /api/videos/generations` + task polling)
- Multi-account round-robin rotation with account affinity tracking
- Anthropic Messages API shim for Claude Code compatibility
- Responses API endpoint for Codex CLI
- File upload endpoint (`POST /api/files/upload`)
- User-Agent rotation (19 variants across Windows/Mac/Linux)
- x5sec slider CAPTCHA solver with human-like trajectory
- Fingerprint randomization (WebGL, canvas, hardwareConcurrency)
- Adaptive request timing with backoff

**Improvements:**
- OpenAI-compatible API shim with full tool-call emulation
- Proxy management for IP rotation
- Improved browser stealth configuration

**Documentation:**
- Full docs organized under `docs/` with 20+ directories
- ADRs documenting core architecture decisions
- Setup guides for Open WebUI, image/video generation
- Troubleshooting guide for common issues

### v1.0.0 – Initial fork

**Initial features:**
- Browser proxy architecture (Puppeteer + Stealth)
- OpenAI-compatible API shim
- Multi-account rotation (basic)

## Migration Notes

- No breaking changes between v1.0.0 and v1.1.0.
- Python entrypoint does not support file uploads (by design).

## References

- [Main README](../../README.md)
- [ADR Index](../adr/README.md)
- [Setup Guides](../setup/README.md)

## Status

- **Last updated:** 2026-08-27
- **Deciders:** @Githab-capibara
