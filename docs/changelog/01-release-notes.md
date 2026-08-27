# 01. Release Notes

- **Status:** Active
- **Date:** 2026-08-24
- **Owner:** @Githab-capibara

## Purpose

Track project releases, version history, and breaking changes for FreeQwenApi.

## Changelog

### v1.1.0 – 2026-08-27 (current)

**New features:**
- Image generation via Qwen Chat (`POST /api/images/generations`)
- Video generation via Qwen Chat (`POST /api/videos/generations` + task polling)
- Multi-account round-robin rotation with account affinity tracking
- Anthropic Messages API shim for Claude Code compatibility
- Responses API endpoint for Codex CLI
- File upload endpoint (`POST /api/files/upload`)
- User-Agent rotation (18 variants across Windows/Mac/Linux)
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
- **Owner:** @Githab-capibara
